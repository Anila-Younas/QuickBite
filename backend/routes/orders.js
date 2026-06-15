const express = require('express');
const { getConnection } = require('../db/oracle');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Place order (T1)
router.post('/', async (req, res) => {
  const { restaurant_id, items, total_amount, payment_method } = req.body;
  const userId = req.headers['x-user-id'] || req.user?.id;
  let conn;
  try {
    conn = await getConnection();
    
    const orderSql = `INSERT INTO ORDERS (customer_id, restaurant_id, status, total_amount) 
                      VALUES (:1, :2, 'PLACED', :3) RETURNING order_id INTO :4`;
    const orderResult = await conn.execute(orderSql, [userId, restaurant_id, total_amount, { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }], { autoCommit: false });
    const orderId = orderResult.outBinds[0][0];

    for (let item of items) {
      await conn.execute(`INSERT INTO ORDER_ITEMS (order_id, item_name, quantity, price) VALUES (:1, :2, :3, :4)`,
        [orderId, item.name, item.quantity, item.price], { autoCommit: false });
    }

    await conn.execute(`INSERT INTO PAYMENTS (order_id, amount, payment_method, status) VALUES (:1, :2, :3, 'PENDING')`,
      [orderId, total_amount, payment_method], { autoCommit: false });

    await conn.execute(`INSERT INTO OUTBOX_EVENTS (aggregate_type, aggregate_id, event_type, payload, is_dispatched) VALUES ('ORDER', :1, 'ORDER_PLACED', :2, 0)`,
      [orderId, JSON.stringify({ order_id: orderId, status: 'PLACED', total: total_amount })], { autoCommit: false });

    await conn.commit();
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant_${restaurant_id}`).emit('new_order', { order_id: orderId, customer_id: userId });
      io.to(`customer_${userId}`).emit('order_placed', { order_id: orderId });
    }
    
    res.json({ success: true, orderId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Order placement error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Get Order Details
router.get('/:id', requireAuth(['CUSTOMER', 'RESTAURANT', 'RIDER', 'ADMIN']), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const orderResult = await conn.execute(`SELECT o.*, r.name as restaurant_name FROM ORDERS o JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id WHERE o.order_id = :1`, [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const itemsResult = await conn.execute(`SELECT item_name, quantity, price FROM ORDER_ITEMS WHERE order_id = :1`, [req.params.id]);
    
    // Get additional data from MongoDB
    const db = require('../db/mongo').mongoose.connection.db;
    let mongoOrder = null;
    let restaurant = null;
    let riderLocation = null;
    
    mongoOrder = await db.collection('orders').findOne({ order_id: parseInt(req.params.id) });
    restaurant = await db.collection('restaurants').findOne({ oracle_restaurant_id: orderResult.rows[0].RESTAURANT_ID });
    if (orderResult.rows[0].RIDER_ID) {
      riderLocation = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(orderResult.rows[0].RIDER_ID) });
    }
    
    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
      customer_location: mongoOrder ? { lat: mongoOrder.customer_lat, lng: mongoOrder.customer_lng } : null,
      restaurant_location: restaurant?.location,
      rider_location: riderLocation?.location
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Get customer orders
router.get('/customer/:customerId', requireAuth(['CUSTOMER', 'ADMIN']), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, r.name as restaurant_name 
      FROM ORDERS o 
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id 
      WHERE o.customer_id = :1 
      ORDER BY o.created_at DESC
    `, [req.params.customerId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Get restaurant orders
router.get('/restaurant/:restaurantId', requireAuth(['RESTAURANT', 'ADMIN']), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, u.full_name as customer_name 
      FROM ORDERS o 
      JOIN USERS u ON o.customer_id = u.user_id 
      WHERE o.restaurant_id = :1 
      ORDER BY o.created_at DESC
    `, [req.params.restaurantId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Get rider orders
router.get('/rider/:riderId', requireAuth(['RIDER', 'ADMIN']), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, r.name as restaurant_name, u.full_name as customer_name 
      FROM ORDERS o 
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id 
      JOIN USERS u ON o.customer_id = u.user_id 
      WHERE o.rider_id = :1 
      ORDER BY o.created_at DESC
    `, [req.params.riderId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Update order status (T2 - ORDER_STATE_MACHINE)
router.post('/:id/status', async (req, res) => {
  const { status } = req.body;
  const userId = req.headers['x-user-id'] || req.user?.id;
  let conn;
  try {
    conn = await getConnection();
    
    // Get the order to find restaurant_id for socket emission
    const orderResult = await conn.execute(`SELECT restaurant_id, customer_id, status FROM ORDERS WHERE order_id = :1`, [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = orderResult.rows[0];
    
    // Validate status transitions
    const validTransitions = {
      'PLACED': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['PACKED', 'CANCELLED'],
      'PACKED': ['WAITING_FOR_PICKUP', 'CANCELLED'],
      'WAITING_FOR_PICKUP': ['PICKED_UP', 'CANCELLED'],
      'PICKED_UP': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': []
    };
    
    const currentStatus = order.STATUS;
    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${status}` });
    }
    
    // Update order status directly (simplified state machine)
    await conn.execute(`UPDATE ORDERS SET status = :1 WHERE order_id = :2`, [status, req.params.id], { autoCommit: true });
    
    // Insert audit log
    await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'STATUS_UPDATE', :2, :3, :4)`,
      [req.params.id, currentStatus, status, userId], { autoCommit: true });
    
    // Insert outbox event for cross-DB sync
    await conn.execute(`INSERT INTO OUTBOX_EVENTS (aggregate_type, aggregate_id, event_type, payload, is_dispatched) VALUES ('ORDER', :1, 'ORDER_STATUS_CHANGED', :2, 0)`,
      [req.params.id, JSON.stringify({ order_id: req.params.id, old_status: currentStatus, new_status: status })], { autoCommit: true });
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.id}`).emit('order_status_update', { order_id: req.params.id, new_status: status });
      io.to(`customer_${order.CUSTOMER_ID}`).emit('order_status_update', { order_id: req.params.id, new_status: status });
      io.to(`restaurant_${order.RESTAURANT_ID}`).emit('order_status_update', { order_id: req.params.id, new_status: status });
    }
    
    res.json({ success: true, status });
  } catch (err) {
    console.error('Order status update error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Cancel order
router.post('/:id/cancel', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.user?.id;
  let conn;
  try {
    conn = await getConnection();
    
    // Get the order
    const orderResult = await conn.execute(`SELECT customer_id, status FROM ORDERS WHERE order_id = :1`, [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const order = orderResult.rows[0];
    
    // Only customer can cancel their own order
    if (order.CUSTOMER_ID !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Only PLACED or CONFIRMED orders can be cancelled
    if (order.STATUS !== 'PLACED' && order.STATUS !== 'CONFIRMED') {
      return res.status(400).json({ error: `Cannot cancel order in ${order.STATUS} status` });
    }
    
    await conn.execute(`UPDATE ORDERS SET status = 'CANCELLED' WHERE order_id = :1`, [req.params.id], { autoCommit: true });
    
    // Insert audit log
    await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'CANCEL', :2, 'CANCELLED', :3)`,
      [req.params.id, order.STATUS, userId], { autoCommit: true });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.id}`).emit('order_status_update', { order_id: req.params.id, new_status: 'CANCELLED' });
      io.to(`customer_${order.CUSTOMER_ID}`).emit('order_status_update', { order_id: req.params.id, new_status: 'CANCELLED' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Order cancel error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Assign rider to order
router.post('/:id/assign-rider', requireAuth(['ADMIN']), async (req, res) => {
  const { rider_id } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(`UPDATE ORDERS SET rider_id = :1 WHERE order_id = :2`, [rider_id, req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
