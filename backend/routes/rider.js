const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const { updateOrderStatus, isValidTransition } = require('../utils/orderHelpers');

const router = express.Router();

// Retry wrapper function
async function withRetry(fn, maxRetries = 2, delayMs = 300) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err.message.includes('No rows updated') && i < maxRetries) {
        console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Middleware to extract rider ID from JWT (simulated for now using headers/body if no actual middleware is strictly attached yet)
// Since we have a bypass, we'll expect user_id in headers or query
const getUserId = (req) => req.headers['x-user-id'] || 4; // Default to Rider Hamza

router.get('/dashboard', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    // Calculate total earnings from RIDER_EARNINGS for reliability
    const statsResult = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM ORDERS WHERE rider_id = :1 AND status = 'DELIVERED') as total_deliveries,
        NVL(SUM(earning_amount), 0) as total_earnings
      FROM RIDER_EARNINGS WHERE rider_id = :1
    `, [riderId]);

    const db = mongoose.connection.db;
    const location = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(riderId) });

    res.json({
      stats: statsResult.rows[0],
      status: location ? location.status : 'OFFLINE'
    });
  } catch (err) {
    console.error('[Rider Dashboard] Error:', err);
    // Fallback to original calculation if RIDER_EARNINGS is missing
    try {
      const fallbackResult = await conn.execute(`
        SELECT 
          COUNT(*) as total_deliveries,
          NVL(SUM(total_amount * 0.1), 0) as total_earnings
        FROM ORDERS WHERE rider_id = :1 AND status = 'DELIVERED'
      `, [riderId]);
      const db = mongoose.connection.db;
      const location = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(riderId) });
      res.json({
        stats: fallbackResult.rows[0],
        status: location ? location.status : 'OFFLINE'
      });
    } catch (fallbackErr) {
      res.status(500).json({ error: err.message });
    }
  } finally {
    if (conn) await conn.close();
  }
});

// Endpoint to get rider earnings history (last 90 days)
router.get('/earnings', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        re.earning_id,
        re.order_id,
        re.order_total,
        re.earning_amount,
        re.created_at,
        o.delivery_address
      FROM RIDER_EARNINGS re
      JOIN ORDERS o ON re.order_id = o.order_id
      WHERE re.rider_id = :1
        AND re.created_at >= CURRENT_TIMESTAMP - INTERVAL '90' DAY
      ORDER BY re.created_at DESC
    `, [riderId]);

    res.json({ earnings: result.rows });
  } catch (err) {
    console.error('[Rider Earnings History] Error:', err);
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

    const io = req.app.get('io');
    if (io) {
      io.emit('rider_status_updated');
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/location/update', async (req, res) => {
  const riderId = getUserId(req);
  const { lat, lng } = req.body;
  
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
    
    // Find active orders for this rider and broadcast location
    const conn = await getConnection();
    const ordersResult = await conn.execute(
      `SELECT order_id FROM ORDERS WHERE rider_id = :1 AND status IN ('PICKED_UP')`,
      [riderId]
    );
    
    const io = req.app.get('io');
    if (io && ordersResult.rows.length > 0) {
      for (let row of ordersResult.rows) {
        io.to(`order_${row.ORDER_ID}`).emit('rider_location_update', { lat, lng });
      }
    }

    if (io) {
      io.emit('rider_status_updated');
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
      WHERE rider_id = :1 AND status IN ('WAITING_CONFIRM', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED')
    `, [riderId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/requests', async (req, res) => {
  // Only show orders assigned to this rider, status WAITING_CONFIRM
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT * FROM ORDERS 
      WHERE rider_id = :1 AND status = 'WAITING_CONFIRM'
    `, [riderId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Helper to calculate distance (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Add endpoint for rider to decline order
router.post('/decline', async (req, res) => {
  const riderId = getUserId(req);
  const { order_id } = req.body;
  let conn;
  try {
    await withRetry(async () => {
      conn = await getConnection();
      
      // Check if version column exists first
      let orderCheck;
      let hasVersionColumn = false;
      let currentVersion = null;
      
      try {
        orderCheck = await conn.execute(`SELECT status, rider_id, restaurant_id, version FROM ORDERS WHERE order_id = :1`, [order_id]);
        hasVersionColumn = true;
        currentVersion = orderCheck.rows[0].VERSION;
      } catch (err) {
        console.log('[Rider Decline] Version column not found, falling back to old behavior');
        orderCheck = await conn.execute(`SELECT status, rider_id, restaurant_id FROM ORDERS WHERE order_id = :1`, [order_id]);
        hasVersionColumn = false;
      }
      
      if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      if (orderCheck.rows[0].RIDER_ID != riderId) {
        return res.status(403).json({ error: 'Order not assigned to you' });
      }
      const currentStatus = orderCheck.rows[0].STATUS;
      if (currentStatus !== 'WAITING_CONFIRM') {
        return res.status(400).json({ error: 'Cannot decline order in this status' });
      }
      const restaurantId = orderCheck.rows[0].RESTAURANT_ID;
      
      // Get restaurant location from MongoDB restaurants collection
      const db = mongoose.connection.db;
      const restaurantDoc = await db.collection('restaurants').findOne({ oracle_restaurant_id: restaurantId });
      const restaurantLat = restaurantDoc?.location?.coordinates[1] || 32.5837;
      const restaurantLng = restaurantDoc?.location?.coordinates[0] || 71.5241;
      
      // Find all available riders
      const allRiders = await db.collection('riderlocations').find({
        status: 'AVAILABLE',
        oracle_rider_id: { $ne: riderId } // exclude the rider who just declined
      }).toArray();
      
      // Calculate distance for each, sort by nearest
      const sortedRiders = allRiders.map(rider => {
        if (!rider.location?.coordinates) return null;
        const distance = calculateDistance(
          restaurantLat, restaurantLng,
          rider.location.coordinates[1], rider.location.coordinates[0]
        );
        return { ...rider, distance };
      }).filter(Boolean).sort((a, b) => a.distance - b.distance);
      
      const io = req.app.get('io');
      let updateResult;
      
      if (sortedRiders.length > 0) {
        // Assign to the next nearest rider
        const nextRider = sortedRiders[0];
        console.log(`[Rider Decline] Auto-assigning order ${order_id} to rider ${nextRider.oracle_rider_id}`);
        
        if (hasVersionColumn) {
          updateResult = await conn.execute(
            `UPDATE ORDERS SET rider_id = :1 WHERE order_id = :2 AND version = :3`,
            [nextRider.oracle_rider_id, order_id, currentVersion],
            { autoCommit: true }
          );
          if (updateResult.rowsAffected === 0) {
            throw new Error('No rows updated - order might have been modified by another user');
          }
        } else {
          updateResult = await conn.execute(
            `UPDATE ORDERS SET rider_id = :1 WHERE order_id = :2`,
            [nextRider.oracle_rider_id, order_id],
            { autoCommit: true }
          );
        }
        
        // Update MongoDB
        await db.collection('orders').updateOne(
          { order_id: parseInt(order_id) },
          { $set: { rider_id: nextRider.oracle_rider_id } },
          { upsert: true }
        );
        
        // Insert audit log
        await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'RIDER_REASSIGNED', :2, :3, :4)`,
          [order_id, currentStatus, currentStatus, riderId], { autoCommit: true });
        
        // Emit to the new rider's room
        if (io) io.to(`rider_${nextRider.oracle_rider_id}`).emit('new_delivery_request', { order_id });
      } else {
        // No more available riders, just clear assignment
        if (hasVersionColumn) {
          updateResult = await conn.execute(
            `UPDATE ORDERS SET rider_id = NULL, status = 'WAITING_FOR_PICKUP' WHERE order_id = :1 AND version = :2`,
            [order_id, currentVersion],
            { autoCommit: true }
          );
          if (updateResult.rowsAffected === 0) {
            throw new Error('No rows updated - order might have been modified by another user');
          }
        } else {
          updateResult = await conn.execute(
            `UPDATE ORDERS SET rider_id = NULL, status = 'WAITING_FOR_PICKUP' WHERE order_id = :1`,
            [order_id],
            { autoCommit: true }
          );
        }
        
        await db.collection('orders').updateOne(
          { order_id: parseInt(order_id) },
          { $set: { rider_id: null, status: 'WAITING_FOR_PICKUP' } },
          { upsert: true }
        );
      }
      
      // Emit socket events
      if (io) {
        io.emit('rider_status_updated');
        io.to(`restaurant_${restaurantId}`).emit('order_update', { order_id });
      }
      
      res.json({ success: true });
    });
  } catch (err) {
    console.error('[Rider] Decline error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
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
    await withRetry(async () => {
      conn = await getConnection();
      
      // Check if version column exists
      let orderCheck;
      let hasVersionColumn = false;
      let currentVersion = null;
      
      try {
        orderCheck = await conn.execute(`SELECT status, rider_id, restaurant_id, version FROM ORDERS WHERE order_id = :1`, [order_id]);
        hasVersionColumn = true;
        currentVersion = orderCheck.rows[0].VERSION;
      } catch (err) {
        console.log('[Rider Accept] Version column not found, falling back to old behavior');
        orderCheck = await conn.execute(`SELECT status, rider_id, restaurant_id FROM ORDERS WHERE order_id = :1`, [order_id]);
        hasVersionColumn = false;
      }
      
      if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      
      const currentStatus = orderCheck.rows[0].STATUS;
      const currentRiderId = orderCheck.rows[0].RIDER_ID;
      const restaurantId = orderCheck.rows[0].RESTAURANT_ID;
      
      if (currentRiderId != riderId) {
        return res.status(403).json({ error: 'Order is not assigned to you' });
      }
      
      if (currentStatus !== 'WAITING_CONFIRM') {
        return res.status(400).json({ error: `Order is not available for acceptance. Current status: ${currentStatus}` });
      }
      
      // Update order
      let updateResult;
      if (hasVersionColumn) {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'WAITING_FOR_PICKUP' WHERE order_id = :1 AND version = :2`, [order_id, currentVersion], { autoCommit: true });
        if (updateResult.rowsAffected === 0) {
          throw new Error('No rows updated - order might have been modified by another user');
        }
      } else {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'WAITING_FOR_PICKUP' WHERE order_id = :1`, [order_id], { autoCommit: true });
      }
      
      // Insert audit log
      await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'STATUS_UPDATE', :2, 'WAITING_FOR_PICKUP', :3)`,
        [order_id, currentStatus, riderId], { autoCommit: true });
      
      // Update MongoDB
      const db = mongoose.connection.db;
      await db.collection('orders').updateOne(
        { order_id: parseInt(order_id) },
        { $set: { status: 'WAITING_FOR_PICKUP' } },
        { upsert: true }
      );
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order_id}`).emit('order_update', { order_id: order_id, new_status: 'WAITING_FOR_PICKUP' });
        io.to(`restaurant_${restaurantId}`).emit('order_update', { order_id: order_id, new_status: 'WAITING_FOR_PICKUP' });
        io.to(`rider_${riderId}`).emit('order_update', { order_id: order_id, new_status: 'WAITING_FOR_PICKUP' });
      }
      
      res.json({ success: true });
    });
  } catch (err) {
    console.error('[Rider] Accept error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Rider marks order as picked up
router.post('/:orderId/picked-up', async (req, res) => {
  const riderId = getUserId(req);
  const { orderId } = req.params;
  let conn;
  try {
    await withRetry(async () => {
      conn = await getConnection();
      
      // Check version column
      let orderCheck;
      let hasVersionColumn = false;
      let currentVersion = null;
      
      try {
        orderCheck = await conn.execute(`SELECT status, rider_id, version FROM ORDERS WHERE order_id = :1`, [orderId]);
        hasVersionColumn = true;
        currentVersion = orderCheck.rows[0].VERSION;
      } catch (err) {
        console.log('[Rider Pickup] Version column not found, falling back to old behavior');
        orderCheck = await conn.execute(`SELECT status, rider_id FROM ORDERS WHERE order_id = :1`, [orderId]);
        hasVersionColumn = false;
      }
      
      if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      
      if (orderCheck.rows[0].RIDER_ID != riderId) {
        return res.status(403).json({ error: 'You are not assigned to this order' });
      }
      
      const currentStatus = orderCheck.rows[0].STATUS;
      if (!isValidTransition(currentStatus, 'PICKED_UP')) {
        return res.status(400).json({ error: `Cannot mark as picked up from status: ${currentStatus}` });
      }
      
      // Update order
      let updateResult;
      if (hasVersionColumn) {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'PICKED_UP' WHERE order_id = :1 AND version = :2`, [orderId, currentVersion], { autoCommit: true });
        if (updateResult.rowsAffected === 0) {
          throw new Error('No rows updated - order might have been modified by another user');
        }
      } else {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'PICKED_UP' WHERE order_id = :1`, [orderId], { autoCommit: true });
      }
      
      // Insert audit log
      await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'STATUS_UPDATE', :2, 'PICKED_UP', :3)`,
        [orderId, currentStatus, riderId], { autoCommit: true });
      
      // Update MongoDB
      const db = mongoose.connection.db;
      await db.collection('orders').updateOne(
        { order_id: parseInt(orderId) },
        { $set: { status: 'PICKED_UP' } },
        { upsert: true }
      );
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${orderId}`).emit('order_update', { order_id: orderId, new_status: 'PICKED_UP' });
        io.to(`rider_${riderId}`).emit('order_update', { order_id: orderId, new_status: 'PICKED_UP' });
      }
      
      res.json({ success: true });
    });
  } catch (err) {
    console.error('[Rider] Pick up error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Rider marks order as delivered
router.post('/:orderId/delivered', async (req, res) => {
  const riderId = getUserId(req);
  const { orderId } = req.params;
  let conn;
  try {
    await withRetry(async () => {
      conn = await getConnection();
      
      // Check version column and get order details (including total_amount)
      let orderCheck;
      let hasVersionColumn = false;
      let currentVersion = null;
      let totalAmount = 0;
      
      try {
        orderCheck = await conn.execute(`SELECT status, rider_id, version, total_amount FROM ORDERS WHERE order_id = :1`, [orderId]);
        hasVersionColumn = true;
        currentVersion = orderCheck.rows[0].VERSION;
        totalAmount = orderCheck.rows[0].TOTAL_AMOUNT;
      } catch (err) {
        console.log('[Rider Deliver] Version column not found, falling back to old behavior');
        orderCheck = await conn.execute(`SELECT status, rider_id, total_amount FROM ORDERS WHERE order_id = :1`, [orderId]);
        hasVersionColumn = false;
        totalAmount = orderCheck.rows[0].TOTAL_AMOUNT;
      }
      
      if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
      
      if (orderCheck.rows[0].RIDER_ID != riderId) {
        return res.status(403).json({ error: 'You are not assigned to this order' });
      }
      
      const currentStatus = orderCheck.rows[0].STATUS;
      if (!isValidTransition(currentStatus, 'DELIVERED')) {
        return res.status(400).json({ error: `Cannot mark as delivered from status: ${currentStatus}` });
      }
      
      // Update order
      let updateResult;
      if (hasVersionColumn) {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'DELIVERED' WHERE order_id = :1 AND version = :2`, [orderId, currentVersion], { autoCommit: true });
        if (updateResult.rowsAffected === 0) {
          throw new Error('No rows updated - order might have been modified by another user');
        }
      } else {
        updateResult = await conn.execute(`UPDATE ORDERS SET status = 'DELIVERED' WHERE order_id = :1`, [orderId], { autoCommit: true });
      }
      
      // Insert audit log for order status change
      await conn.execute(`INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('ORDERS', :1, 'STATUS_UPDATE', :2, 'DELIVERED', :3)`,
        [orderId, currentStatus, riderId], { autoCommit: true });
      
      // Calculate and insert rider earnings (10% of order total) - IDEMPOTENCY check: unique order_id in RIDER_EARNINGS
      const earningAmount = totalAmount * 0.1;
      try {
        await conn.execute(
          `INSERT INTO RIDER_EARNINGS (order_id, rider_id, order_total, earning_amount) VALUES (:1, :2, :3, :4)`,
          [orderId, riderId, totalAmount, earningAmount],
          { autoCommit: true }
        );
        // Insert audit log for earnings
        await conn.execute(
          `INSERT INTO AUDIT_LOG (table_name, record_id, action, old_status, new_status, changed_by) VALUES ('RIDER_EARNINGS', :1, 'EARNINGS_ADDED', NULL, NULL, :2)`,
          [orderId, riderId],
          { autoCommit: true }
        );
      } catch (insertErr) {
        // Check if error is unique constraint violation (earnings already added for this order)
        if (insertErr.errorNum === 1) { // ORA-00001: unique constraint violated
          console.log(`[Rider Earnings] Earnings already recorded for order ${orderId}, skipping...`);
        } else {
          // Log other errors but don't fail the entire delivery
          console.error('[Rider Earnings] Failed to record earnings:', insertErr);
          const db = mongoose.connection.db;
          await db.collection('error_logs').insertOne({
            type: 'RIDER_EARNINGS_ERROR',
            order_id: orderId,
            rider_id: riderId,
            error: insertErr.message,
            timestamp: new Date()
          });
        }
      }
      
      // Update MongoDB with delivered timestamp
      const db = mongoose.connection.db;
      await db.collection('orders').updateOne(
        { order_id: parseInt(orderId) },
        { $set: { status: 'DELIVERED', delivered_at: new Date().toUTCString() } },
        { upsert: true }
      );
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${orderId}`).emit('order_update', { order_id: orderId, new_status: 'DELIVERED' });
        io.to(`rider_${riderId}`).emit('order_update', { order_id: orderId, new_status: 'DELIVERED' });
        io.to(`rider_${riderId}`).emit('earnings_updated', { amount: earningAmount, order_id: orderId });
      }
      
      res.json({ success: true, earnings_added: earningAmount });
    });
  } catch (err) {
    console.error('[Rider] Deliver error:', err);
    // Log error to MongoDB for debugging
    try {
      const db = mongoose.connection.db;
      await db.collection('error_logs').insertOne({
        type: 'RIDER_DELIVERY_ERROR',
        order_id: orderId,
        rider_id: riderId,
        error: err.message,
        stack: err.stack,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;