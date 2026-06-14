const cron = require('node-cron');
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

        // Push real-time event to customer/rider if it's an order status change
        if (row.EVENT_TYPE === 'ORDER_STATUS_CHANGED') {
           const payload = JSON.parse(row.PAYLOAD);
           try {
             const { io } = require('../index'); 
             if (io) {
               io.to(`order_${payload.order_id}`).emit('order_update', { order_id: payload.order_id, new_status: payload.new_status });
             }
           } catch(e) {}
        }
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      if (conn) await conn.close();
    }
  }, parseInt(interval));
}

module.exports = { startOutboxSync };
