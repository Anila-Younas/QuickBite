const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const getUserId = (req) => req.headers['x-user-id'] || 2; 

// Place Order (Oracle T1 ACID Transaction)
router.post('/order/create', async (req, res) => {
  const customerId = getUserId(req);
  const { restaurant_id, items, total_amount, delivery_address, payment_method, lat, lng } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute('SAVEPOINT start_order');
    
    // 1. Create Order
    const orderResult = await conn.execute(`
      INSERT INTO ORDERS (customer_id, restaurant_id, total_amount, status, created_at, delivery_address) 
      VALUES (:1, :2, :3, 'PLACED', SYSDATE, :5) RETURNING order_id INTO :4
    `, [customerId, restaurant_id, total_amount, { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }, delivery_address]);
    const orderId = orderResult.outBinds[0][0];

    // 2. Insert Items
    for (let item of items) {
       await conn.execute(`
         INSERT INTO ORDER_ITEMS (order_id, item_name, quantity, price) 
         VALUES (:1, :2, :3, :4)
       `, [orderId, item.name, item.quantity, item.price]);
    }

    // 3. Payment Record
    await conn.execute(`
      INSERT INTO PAYMENTS (order_id, created_at, amount, payment_method, status) 
      VALUES (:1, SYSDATE, :2, :3, 'PENDING')
    `, [orderId, total_amount, payment_method || 'CASH']);

    // 4. Outbox Event
    const payload = JSON.stringify({ order_id: orderId, status: 'PLACED', total: total_amount, lat, lng });
    await conn.execute(`
      INSERT INTO OUTBOX_EVENTS (aggregate_type, aggregate_id, event_type, payload, is_dispatched) 
      VALUES ('ORDER', :1, 'ORDER_PLACED', :2, 0)
    `, [orderId, payload]);

    await conn.commit();

    const io = req.app.get('io');
    if (io) {
      io.emit('new_order_restaurant', { order_id: orderId, restaurant_id });
      io.emit('new_delivery_request', { order_id: orderId, delivery_address, total_amount, lat, lng });
    }

    res.json({ success: true, order_id: orderId });
  } catch (err) {
    if (conn) await conn.execute('ROLLBACK TO SAVEPOINT start_order');
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Order History
router.get('/orders', async (req, res) => {
  const customerId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, r.name as restaurant_name 
      FROM ORDERS o 
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id 
      WHERE o.customer_id = :1 
      ORDER BY o.order_id DESC
    `, [customerId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/order/:id', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, r.name as restaurant_name 
      FROM ORDERS o 
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id 
      WHERE o.order_id = :1 
    `, [req.params.id]);
    
    if (result.rows.length === 0) return res.status(404).json({error: 'Not found'});
    
    const itemsResult = await conn.execute(`SELECT * FROM ORDER_ITEMS WHERE order_id = :1`, [req.params.id]);
    const payResult = await conn.execute(`SELECT * FROM PAYMENTS WHERE order_id = :1`, [req.params.id]);
    
    res.json({
       ...result.rows[0],
       items: itemsResult.rows,
       payment: payResult.rows[0]
    });
  } catch(err) {
    res.status(500).json({error: err.message});
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
