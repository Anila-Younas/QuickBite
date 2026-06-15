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

// Sync order from Oracle to MongoDB
const syncOrderFromOracle = async (orderId, conn) => {
  console.log(`[Sync] Syncing order #${orderId} from Oracle...`);
  
  const oracleOrder = await conn.execute(`
    SELECT o.*, u.full_name as customer_name, u.email as customer_email,
           r.name as restaurant_name
    FROM ORDERS o
    JOIN USERS u ON o.customer_id = u.user_id
    JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id
    WHERE o.order_id = :1
  `, [orderId]);
  
  if (oracleOrder.rows.length === 0) {
    console.log(`[Sync] Order #${orderId} not found in Oracle`);
    return null;
  }
  
  const order = oracleOrder.rows[0];
  
  // Get order items
  const orderItems = await conn.execute(
    `SELECT * FROM ORDER_ITEMS WHERE order_id = :1`,
    [orderId]
  );
  
  return {
    order_id: order.ORDER_ID,
    customer_id: order.CUSTOMER_ID,
    customer_name: order.CUSTOMER_NAME,
    customer_email: order.CUSTOMER_EMAIL,
    restaurant_id: order.RESTAURANT_ID,
    oracle_restaurant_id: order.RESTAURANT_ID,
    restaurant_name: order.RESTAURANT_NAME,
    rider_id: order.RIDER_ID,
    status: order.STATUS,
    total_amount: order.TOTAL_AMOUNT,
    delivery_address: order.DELIVERY_ADDRESS,
    items: orderItems.rows,
    created_at: order.CREATED_AT,
    last_synced: new Date()
  };
};

function startOutboxSync(io) {
  const interval = process.env.SYNC_INTERVAL_MS || 10000; // Sync every 10 seconds instead of 30
  console.log(`[Sync] Starting outbox sync job with interval ${interval}ms`);
  
  setInterval(async () => {
    let conn;
    try {
      conn = await getConnection();
      const db = mongoose.connection.db;
      
      const result = await conn.execute(`SELECT event_id, aggregate_id, event_type, payload FROM OUTBOX_EVENTS WHERE is_dispatched = 0 ORDER BY created_at FETCH FIRST 100 ROWS ONLY`);
      console.log(`[Sync] Found ${result.rows.length} pending outbox events`);
      
      for (let row of result.rows) {
        let parsedPayload;
        try {
          // Clean up payload: stringify and parse to remove any circular structures
          let rawPayload = row.PAYLOAD;
          if (typeof rawPayload === 'object') {
            rawPayload = JSON.stringify(rawPayload);
          }
          parsedPayload = JSON.parse(rawPayload);
        } catch (e) {
          parsedPayload = { raw: String(row.PAYLOAD) };
        }
        
        // Log the sync event
        await SyncEvent.updateOne({ event_id: row.EVENT_ID }, {
          $set: {
            event_type: row.EVENT_TYPE,
            payload: parsedPayload
          }
        }, { upsert: true });

        // Handle different event types
        const orderId = parsedPayload.order_id || parseInt(row.AGGREGATE_ID);
        
        if (orderId) {
          const orderData = await syncOrderFromOracle(orderId, conn);
          if (orderData) {
            await db.collection('orders').updateOne(
              { order_id: orderId },
              { $set: orderData },
              { upsert: true }
            );
            console.log(`[Sync] Synced order #${orderId} to MongoDB`);
            
            // Emit socket events
            if (io) {
              if (row.EVENT_TYPE === 'ORDER_PLACED') {
                io.to(`restaurant_${orderData.restaurant_id}`).emit('new_order', { order_id: orderId, ...orderData });
                io.to(`customer_${orderData.customer_id}`).emit('order_placed', { order_id: orderId, ...orderData });
                console.log(`[Sync] Emitted new_order event for order #${orderId}`);
              } else if (row.EVENT_TYPE === 'ORDER_STATUS_CHANGED') {
                io.to(`order_${orderId}`).emit('order_update', { order_id: orderId, new_status: parsedPayload.new_status, ...orderData });
                if (orderData.restaurant_id) {
                  io.to(`restaurant_${orderData.restaurant_id}`).emit('order_update', { order_id: orderId, new_status: parsedPayload.new_status, ...orderData });
                }
                console.log(`[Sync] Emitted order_update event for order #${orderId}`);
              }
            }
          }
        }

        // Mark event as dispatched
        await conn.execute(`UPDATE OUTBOX_EVENTS SET is_dispatched = 1 WHERE event_id = :1`, [row.EVENT_ID], { autoCommit: true });
      }
    } catch (err) {
      console.error('[Sync] Error:', err);
    } finally {
      if (conn) await conn.close();
    }
  }, parseInt(interval));
  console.log('[Sync] Outbox sync job started');
}

module.exports = { startOutboxSync };
