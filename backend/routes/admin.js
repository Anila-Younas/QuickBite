const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

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
    
    // Add MongoDB data
    const db = mongoose.connection.db;
    const active_riders = await db.collection('riderlocations').countDocuments({ status: 'AVAILABLE' });
    
    const kpi = {
      ...result.rows[0],
      ACTIVE_RIDERS: active_riders
    };
    
    res.json(kpi);
  } catch (err) {
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
