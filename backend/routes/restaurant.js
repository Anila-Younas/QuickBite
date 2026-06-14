const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const getUserId = (req) => req.headers['x-user-id'] || 6; 
const getRestaurantId = (req) => req.headers['x-restaurant-id'] || 1; 

// Dashboard Stats
router.get('/dashboard', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        COUNT(*) as total_orders,
        NVL(SUM(total_amount), 0) as revenue_today,
        COUNT(CASE WHEN status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP') THEN 1 END) as active_orders,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM ORDERS WHERE rest_id = :1 AND TRUNC(order_date) = TRUNC(SYSDATE)
    `, [restId]);

    const weekly = await conn.execute(`
      SELECT NVL(SUM(total_amount), 0) as revenue_week
      FROM ORDERS WHERE rest_id = :1 AND order_date >= TRUNC(SYSDATE) - 7
    `, [restId]);

    const monthly = await conn.execute(`
      SELECT NVL(SUM(total_amount), 0) as revenue_month
      FROM ORDERS WHERE rest_id = :1 AND order_date >= TRUNC(SYSDATE) - 30
    `, [restId]);

    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_rest_id: parseInt(restId) });
    
    res.json({
      ...result.rows[0],
      REVENUE_WEEK: weekly.rows[0].REVENUE_WEEK,
      REVENUE_MONTH: monthly.rows[0].REVENUE_MONTH,
      avg_rating: rest?.avg_rating || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Live Orders
router.get('/orders', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, u.full_name as customer_name, u.phone
      FROM ORDERS o
      JOIN USERS u ON o.cust_id = u.user_id
      WHERE o.rest_id = :1
      ORDER BY o.order_id DESC
    `, [restId]);

    // Attach items for each order
    for (let i=0; i<result.rows.length; i++) {
        const items = await conn.execute(`SELECT * FROM ORDER_ITEMS WHERE order_id = :1`, [result.rows[i].ORDER_ID]);
        result.rows[i].ITEMS = items.rows;
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Update Order Status
router.put('/order/status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    
    // Call the stored procedure for state machine if it was fully mapped, 
    // or just direct update as required for full control.
    await conn.execute(`UPDATE ORDERS SET status = :1 WHERE order_id = :2 AND rest_id = :3`, [status, id, restId], { autoCommit: true });
    
    // Log outbox event
    const payload = JSON.stringify({ order_id: id, new_status: status });
    await conn.execute(`
      INSERT INTO OUTBOX_EVENTS (order_id, event_type, payload, is_dispatched) 
      VALUES (:1, 'ORDER_STATUS_CHANGED', :2, 0)
    `, [id, payload], { autoCommit: true });

    const io = req.app.get('io');
    if (io) io.to(`order_${id}`).emit('order_update', { order_id: parseInt(id), new_status: status });
    
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Assign Rider
router.post('/order/assign/:id', async (req, res) => {
  const { id } = req.params;
  const { rider_id } = req.body;
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(`UPDATE ORDERS SET rider_id = :1, status = 'PICKED_UP' WHERE order_id = :2 AND rest_id = :3`, [rider_id, id, restId], { autoCommit: true });
    
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('order_update', { order_id: parseInt(id), new_status: 'PICKED_UP' });
      io.emit('rider_assigned', { order_id: id, rider_id });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Menu Management
router.get('/menu', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_rest_id: restId });
    res.json(rest ? rest.menu : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu/item', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const item = req.body; 
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_rest_id: restId },
      { $push: { menu: item } },
      { upsert: true }
    );
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/item/:name', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { name } = req.params;
  const updateFields = {};
  for (let key in req.body) {
    updateFields[`menu.$.${key}`] = req.body[key];
  }
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_rest_id: restId, "menu.name": name },
      { $set: updateFields }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/item/:name', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { name } = req.params;
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_rest_id: restId },
      { $pull: { menu: { name } } }
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Offers
router.get('/offers', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const offers = await db.collection('offers').find({ restaurant_id: restId }).toArray();
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/offers', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const offer = { ...req.body, restaurant_id: restId, is_active: true };
  try {
    const db = mongoose.connection.db;
    await db.collection('offers').insertOne(offer);
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/offers/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    await db.collection('offers').updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { is_active: req.body.is_active } }
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Riders
router.get('/riders', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const riders = await db.collection('riderlocations').find({}).toArray();
    res.json(riders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
