const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');

const router = express.Router();

// GET KPI and Basic Stats
router.get('/kpi', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM USERS WHERE role='CUSTOMER') as total_customers,
        (SELECT COUNT(*) FROM RESTAURANTS) as total_restaurants,
        (SELECT COUNT(*) FROM USERS WHERE role='RIDER') as total_riders,
        (SELECT COUNT(*) FROM ORDERS WHERE TRUNC(created_at) = TRUNC(SYSDATE)) as orders_today
      FROM DUAL
    `);
    
    const db = mongoose.connection.db;
    const active_riders = await db.collection('riderlocations').countDocuments({ status: 'AVAILABLE' });
    
    res.json({
      ...result.rows[0],
      ACTIVE_RIDERS: active_riders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET System Sync Status
router.get('/sync-status', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    
    // Oracle Stats
    const oracleRest = await conn.execute(`SELECT COUNT(*) as cnt FROM RESTAURANTS`);
    const oracleCust = await conn.execute(`SELECT COUNT(*) as cnt FROM USERS WHERE role='CUSTOMER'`);
    const oracleRiders = await conn.execute(`SELECT COUNT(*) as cnt FROM USERS WHERE role='RIDER'`);
    const oracleOrders = await conn.execute(`SELECT COUNT(*) as cnt FROM ORDERS`);
    const pendingOutbox = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=0`);
    const processedOutbox = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=1`);
    
    // Mongo Stats: count restaurants that have oracle_restaurant_id (to match Oracle count)
    const db = mongoose.connection.db;
    const mongoRest = await db.collection('restaurants').countDocuments({ oracle_restaurant_id: { $exists: true } });
    const mongoOffers = await db.collection('offers').countDocuments();
    const mongoRiders = await db.collection('riderlocations').countDocuments();
    
    res.json({
      oracle: {
        restaurants: oracleRest.rows[0].CNT,
        customers: oracleCust.rows[0].CNT,
        riders: oracleRiders.rows[0].CNT,
        orders: oracleOrders.rows[0].CNT
      },
      mongo: {
        restaurants: mongoRest,
        offers: mongoOffers,
        riders: mongoRiders
      },
      sync: {
        pending_jobs: pendingOutbox.rows[0].CNT,
        processed_jobs: processedOutbox.rows[0].CNT,
        restaurant_mismatch: oracleRest.rows[0].CNT !== mongoRest,
        rider_mismatch: oracleRiders.rows[0].CNT !== mongoRiders
      }
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET Restaurants
router.get('/restaurants', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT r.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM RESTAURANTS r
      JOIN USERS u ON r.owner_id = u.user_id
      ORDER BY r.restaurant_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST Create Restaurant (Full Sync)
router.post('/restaurant', async (req, res) => {
  const { name, owner_name, email, phone, address, lat, lng, cuisine, opening_hours, city_zone } = req.body;
  let conn;
  try {
    conn = await getConnection();
    
    // 1. Create Owner in USERS (use same dummy password hash as seed data)
    const userResult = await conn.execute(`
      INSERT INTO USERS (full_name, email, phone, role, password_hash) 
      VALUES (:1, :2, :3, 'RESTAURANT', '$2b$12$abc123hashed') 
      RETURNING user_id INTO :user_id
    `, {
      1: owner_name,
      2: email,
      3: phone,
      user_id: { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }
    }, { autoCommit: false });
    
    const userId = userResult.outBinds.user_id[0];

    // 2. Create Restaurant in Oracle
    const restResult = await conn.execute(`
      INSERT INTO RESTAURANTS (owner_id, name, city_zone, is_active)
      VALUES (:1, :2, :3, 1)
      RETURNING restaurant_id INTO :restaurant_id
    `, {
      1: userId,
      2: name,
      3: city_zone || 'Default-Zone',
      restaurant_id: { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }
    }, { autoCommit: false });
    
    const restaurantId = restResult.outBinds.restaurant_id[0];
    
    // 3. Create Restaurant in Mongo
    const db = mongoose.connection.db;
    await db.collection('restaurants').insertOne({
      oracle_restaurant_id: restaurantId,
      name: name,
      cuisine: cuisine ? cuisine.split(',').map(c => c.trim()) : [],
      location: lat && lng ? {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      } : null,
      address: address || '',
      city_zone: city_zone || 'Default-Zone',
      opening_hours: opening_hours || '10:00-22:00',
      menu: [],
      avg_rating: 0,
      total_reviews: 0,
      is_active: true
    });

    // Commit Oracle transaction
    await conn.commit();
    
    // Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('restaurant_created', { oracle_restaurant_id: restaurantId, name });
    }

    res.json({ success: true, restaurant_id: restaurantId, user_id: userId });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// DELETE Restaurant
router.delete('/restaurant/:id', async (req, res) => {
  const restaurantId = parseInt(req.params.id);
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(`DELETE FROM RESTAURANTS WHERE restaurant_id = :1`, [restaurantId], { autoCommit: true });
    
    const db = mongoose.connection.db;
    await db.collection('restaurants').deleteOne({ oracle_restaurant_id: restaurantId });
    
    const io = req.app.get('io');
    if (io) io.emit('restaurant_deleted', { restaurant_id: restaurantId });
    
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/audit', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM AUDIT_LOG ORDER BY timestamp DESC FETCH FIRST 50 ROWS ONLY`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/outbox', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const pending = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=0`);
    const processed = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=1`);
    const recent = await conn.execute(`SELECT * FROM OUTBOX_EVENTS ORDER BY created_at DESC FETCH FIRST 20 ROWS ONLY`);
    
    res.json({
      stats: { pending: pending.rows[0].CNT, processed: processed.rows[0].CNT },
      events: recent.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
