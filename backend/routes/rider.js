const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

// Middleware to extract rider ID from JWT (simulated for now using headers/body if no actual middleware is strictly attached yet)
// Since we have a bypass, we'll expect user_id in headers or query
const getUserId = (req) => req.headers['x-user-id'] || 4; // Default to Rider Hamza

router.get('/dashboard', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        COUNT(*) as total_deliveries,
        NVL(SUM(total_amount * 0.1), 0) as total_earnings
      FROM ORDERS WHERE rider_id = :1 AND status = 'DELIVERED'
    `, [riderId]);

    const db = mongoose.connection.db;
    const location = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(riderId) });

    res.json({
      stats: result.rows[0],
      status: location ? location.status : 'OFFLINE'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/status', async (req, res) => {
  const riderId = getUserId(req);
  const { status, lat, lng } = req.body;
  
  try {
    const db = mongoose.connection.db;
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: parseInt(riderId) },
      { 
        $set: { 
          status, 
          location: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : undefined,
          last_updated: new Date()
        } 
      },
      { upsert: true }
    );
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/location/update', async (req, res) => {
  const riderId = getUserId(req);
  const { lat, lng, active_order_id } = req.body;
  
  try {
    const db = mongoose.connection.db;
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: parseInt(riderId) },
      { 
        $set: { 
          location: { type: 'Point', coordinates: [lng, lat] },
          last_updated: new Date()
        } 
      }
    );
    
    // Broadcast location to tracking room
    if (active_order_id) {
       const io = req.app.get('io');
       if (io) io.to(`order_${active_order_id}`).emit('rider_location_update', { lat, lng });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active-orders', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT * FROM ORDERS 
      WHERE rider_id = :1 AND status IN ('CONFIRMED', 'PREPARING', 'WAITING_FOR_PICKUP', 'PICKED_UP')
    `, [riderId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/requests', async (req, res) => {
  // To simulate the dispatch queue, we look for orders with no rider_id and status='PLACED' or 'CONFIRMED'
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT * FROM ORDERS 
      WHERE rider_id IS NULL AND status IN ('PLACED', 'CONFIRMED')
      FETCH FIRST 5 ROWS ONLY
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/accept', async (req, res) => {
  const riderId = getUserId(req);
  const { order_id } = req.body;
  let conn;
  try {
    conn = await getConnection();
    
    // Check if order is ready for pickup
    const orderCheck = await conn.execute(`SELECT status FROM ORDERS WHERE order_id = :1`, [order_id]);
    if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    const currentStatus = orderCheck.rows[0].STATUS;
    if (currentStatus !== 'WAITING_FOR_PICKUP' && currentStatus !== 'PREPARING') {
      return res.status(400).json({ error: `Order is not ready for pickup. Current status: ${currentStatus}` });
    }
    
    await conn.execute(`
      UPDATE ORDERS SET rider_id = :1, status = 'PICKED_UP' WHERE order_id = :2 AND rider_id IS NULL
    `, [riderId, order_id], { autoCommit: true });
    
    // Insert audit log
    await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'RIDER_ASSIGNED', :2, 'PICKED_UP', :3)`,
      [order_id, currentStatus, riderId], { autoCommit: true });
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order_id}`).emit('order_update', { order_id: parseInt(order_id), new_status: 'PICKED_UP', rider_id: riderId });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Rider accept error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
