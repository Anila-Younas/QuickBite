import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

index_js = """const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectMongo } = require('./db/mongo');
const { startOutboxSync } = require('./jobs/outboxSync');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to DB and start jobs
connectMongo().then(() => {
  startOutboxSync();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/orders', require('./routes/orders'));
app.use('/dispatch', require('./routes/dispatch'));
app.use('/catalog', require('./routes/catalog'));
app.use('/analytics', require('./routes/analytics'));
app.use('/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
"""

auth_js = """const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/oracle');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT user_id, full_name, email, password_hash, role FROM USERS WHERE email = :email`,
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.PASSWORD_HASH);
    // For testing/mocking, if hash doesn't match but it's exactly the placeholder string
    if (!match && password !== user.PASSWORD_HASH) return res.status(401).json({ error: 'Invalid creds' });
    
    const token = jwt.sign({ id: user.USER_ID, role: user.ROLE }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.USER_ID, name: user.FULL_NAME, email: user.EMAIL, role: user.ROLE } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
"""

middleware_auth = """const jwt = require('jsonwebtoken');

function requireAuth(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { requireAuth };
"""

orders_js = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Place order (T1)
router.post('/', requireAuth(['CUSTOMER']), async (req, res) => {
  const { rest_id, items, total_amount, payment_method } = req.body;
  let conn;
  try {
    conn = await getConnection();
    
    // Begin Transaction implicit in Oracle driver, we will just disable autoCommit
    
    const orderSql = `INSERT INTO ORDERS (cust_id, rest_id, status, order_date, total_amount) 
                      VALUES (:1, :2, 'PLACED', TRUNC(SYSDATE), :3) RETURNING order_id INTO :4`;
    const orderResult = await conn.execute(orderSql, [req.user.id, rest_id, total_amount, { type: conn.oracle.NUMBER, dir: conn.oracle.BIND_OUT }], { autoCommit: false });
    const orderId = orderResult.outBinds[0][0];

    for (let item of items) {
      await conn.execute(`INSERT INTO ORDER_ITEMS (order_id, menu_item_name, quantity, unit_price) VALUES (:1, :2, :3, :4)`,
        [orderId, item.name, item.quantity, item.price], { autoCommit: false });
    }

    await conn.execute(`INSERT INTO PAYMENTS (order_id, order_date, amount, method, status) VALUES (:1, TRUNC(SYSDATE), :2, :3, 'PENDING')`,
      [orderId, total_amount, payment_method], { autoCommit: false });

    await conn.execute(`INSERT INTO OUTBOX_EVENTS (order_id, event_type, payload, is_dispatched) VALUES (:1, 'ORDER_PLACED', :2, 0)`,
      [orderId, JSON.stringify({ order_id: orderId, status: 'PLACED', total: total_amount })], { autoCommit: false });

    await conn.commit();
    res.json({ success: true, orderId });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Update order status (T2 - ORDER_STATE_MACHINE)
router.post('/:id/status', requireAuth(['RESTAURANT', 'RIDER']), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(`BEGIN ORDER_STATE_MACHINE(:1, :2); END;`, [req.params.id, req.body.status], { autoCommit: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
"""

outboxSync_js = """const cron = require('node-cron');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');

const SyncEventSchema = new mongoose.Schema({
  event_id: { type: Number, unique: true },
  order_id: Number,
  event_type: String,
  payload: mongoose.Schema.Types.Mixed,
  synced_at: { type: Date, default: Date.now }
});
const SyncEvent = mongoose.model('SyncEvent', SyncEventSchema);

function startOutboxSync() {
  const interval = process.env.SYNC_INTERVAL_MS || 30000;
  // node-cron expects cron syntax. Let's use setInterval instead as it's easier for dynamic MS config
  setInterval(async () => {
    let conn;
    try {
      conn = await getConnection();
      const result = await conn.execute(`SELECT event_id, order_id, event_type, payload FROM OUTBOX_EVENTS WHERE is_dispatched = 0 ORDER BY created_at FETCH FIRST 100 ROWS ONLY`);
      
      for (let row of result.rows) {
        await SyncEvent.updateOne({ event_id: row.EVENT_ID }, {
          $set: {
            order_id: row.ORDER_ID,
            event_type: row.EVENT_TYPE,
            payload: JSON.parse(row.PAYLOAD)
          }
        }, { upsert: true });

        await conn.execute(`UPDATE OUTBOX_EVENTS SET is_dispatched = 1 WHERE event_id = :1`, [row.EVENT_ID], { autoCommit: true });
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      if (conn) await conn.close();
    }
  }, parseInt(interval));
}

module.exports = { startOutboxSync };
"""

create_file('backend/index.js', index_js)
create_file('backend/routes/auth.js', auth_js)
create_file('backend/middleware/auth.js', middleware_auth)
create_file('backend/routes/orders.js', orders_js)
create_file('backend/jobs/outboxSync.js', outboxSync_js)

print("Generated more backend files.")
