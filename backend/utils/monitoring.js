
const { mongoose } = require('../db/mongo');
const { getConnection } = require('../db/oracle');

// Collection to log errors
let ErrorLog;

const initMonitoring = async () => {
  try {
    const db = mongoose.connection.db;
    ErrorLog = db.collection('error_logs');
    
    // Create indexes for better query performance
    await ErrorLog.createIndex({ timestamp: -1 });
    await ErrorLog.createIndex({ severity: 1 });
    await ErrorLog.createIndex({ order_id: 1 });
    
    console.log('[Monitoring] Initialized');
  } catch (err) {
    console.error('[Monitoring] Initialization error:', err);
  }
};

// Log an error
const logError = async (error, severity = 'error', metadata = {}) => {
  try {
    if (!ErrorLog) await initMonitoring();
    
    const errorEntry = {
      timestamp: new Date(),
      severity, // debug, info, warning, error, critical
      message: error.message || String(error),
      stack: error.stack,
      metadata: {
        ...metadata,
        // Add any relevant context from the request or system
        // e.g. user_id, order_id, endpoint, method
      }
    };
    
    await ErrorLog.insertOne(errorEntry);
    console.error(`[${severity.toUpperCase()}]`, error.message, metadata);
    
    // For critical errors, send an alert (placeholder for future implementation)
    if (severity === 'critical') {
      await sendAlert(errorEntry);
    }
  } catch (logErr) {
    console.error('[Monitoring] Failed to log error:', logErr);
  }
};

// Placeholder alert function (can be extended to send emails, Slack messages, etc.)
const sendAlert = async (errorEntry) => {
  console.warn('[ALERT] Critical error logged:', JSON.stringify(errorEntry, null, 2));
};

// Auto-recover a single order from Oracle to MongoDB
const recoverOrder = async (orderId, db, oracleConn) => {
  console.log(`[Recovery] Recovering order #${orderId}...`);
  
  const oracleOrder = await oracleConn.execute(`
    SELECT o.*, u.full_name as customer_name, u.email as customer_email,
           r.name as restaurant_name
    FROM ORDERS o
    JOIN USERS u ON o.customer_id = u.user_id
    JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id
    WHERE o.order_id = :1
  `, [orderId]);
  
  if (oracleOrder.rows.length === 0) {
    console.log(`[Recovery] Order #${orderId} not found in Oracle`);
    return;
  }
  
  const order = oracleOrder.rows[0];
  
  // Get order items
  const orderItems = await oracleConn.execute(
    `SELECT * FROM ORDER_ITEMS WHERE order_id = :1`,
    [orderId]
  );
  
  const orderData = {
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
  
  await db.collection('orders').updateOne(
    { order_id: orderId },
    { $set: orderData },
    { upsert: true }
  );
  
  console.log(`[Recovery] ✓ Recovered order #${orderId}`);
};

// Check for data consistency issues between Oracle and MongoDB with full recovery
const checkDataConsistency = async () => {
  console.log('[Monitoring] Starting consistency check');
  try {
    let conn;
    try {
      conn = await getConnection();
      const db = mongoose.connection.db;
      
      // Sync all restaurants first
      console.log('[Monitoring] Checking restaurants...');
      const oracleRestaurants = await conn.execute(`
        SELECT r.*, u.full_name as owner_name, u.email as owner_email
        FROM RESTAURANTS r
        JOIN USERS u ON r.owner_id = u.user_id
      `);
      
      for (const rest of oracleRestaurants.rows) {
        const existing = await db.collection('restaurants').findOne({
          oracle_restaurant_id: rest.RESTAURANT_ID
        });
        
        if (!existing) {
          console.log(`[Monitoring] Missing restaurant: ${rest.NAME}, recovering...`);
          const restaurantData = {
            oracle_restaurant_id: rest.RESTAURANT_ID,
            owner_id: rest.OWNER_ID,
            owner_name: rest.OWNER_NAME,
            owner_email: rest.OWNER_EMAIL,
            name: rest.NAME,
            city_zone: rest.CITY_ZONE || 'Default-Zone',
            is_active: rest.IS_ACTIVE === 1,
            created_at: rest.CREATED_AT,
            location: {
              type: 'Point',
              coordinates: rest.RESTAURANT_ID === 1 ? [71.5241, 32.5837] : [71.8100, 32.5900]
            },
            menu: [],
            cuisine: ['Pakistani'],
            avg_rating: 4.5,
            delivery_fee: 50,
            last_synced: new Date()
          };
          await db.collection('restaurants').insertOne(restaurantData);
        }
      }
      
      // Sync all riders
      console.log('[Monitoring] Checking riders...');
      const oracleRiders = await conn.execute(`
        SELECT user_id, full_name, email, phone
        FROM USERS
        WHERE role = 'RIDER'
      `);
      
      for (const rider of oracleRiders.rows) {
        const existing = await db.collection('riderlocations').findOne({
          oracle_rider_id: rider.USER_ID
        });
        
        if (!existing) {
          console.log(`[Monitoring] Missing rider: ${rider.FULL_NAME}, recovering...`);
          const riderData = {
            oracle_rider_id: rider.USER_ID,
            name: rider.FULL_NAME,
            email: rider.EMAIL,
            phone: rider.PHONE,
            status: 'AVAILABLE',
            location: {
              type: 'Point',
              coordinates: [71.5255, 32.585]
            },
            last_updated: new Date()
          };
          await db.collection('riderlocations').insertOne(riderData);
        }
      }
      
      // Get all orders from Oracle
      console.log('[Monitoring] Checking orders...');
      const allOracleOrders = await conn.execute(`
        SELECT order_id, status, customer_id, restaurant_id, rider_id, created_at
        FROM ORDERS 
        ORDER BY order_id DESC
      `);
      
      let recoveredCount = 0;
      let statusFixedCount = 0;
      
      for (const order of allOracleOrders.rows) {
        // Find corresponding order in MongoDB
        const mongoOrder = await db.collection('orders').findOne({ order_id: order.ORDER_ID });
        
        if (!mongoOrder) {
          await logError(
            new Error(`Order ${order.ORDER_ID} exists in Oracle but not in MongoDB`),
            'warning',
            { order_id: order.ORDER_ID }
          );
          await recoverOrder(order.ORDER_ID, db, conn);
          recoveredCount++;
          continue;
        }
        
        // Check for status mismatch
        if (mongoOrder.status !== order.STATUS) {
          await logError(
            new Error(`Order ${order.ORDER_ID} status mismatch: Oracle=${order.STATUS}, MongoDB=${mongoOrder.status}`),
            'warning',
            { order_id: order.ORDER_ID, oracle_status: order.STATUS, mongo_status: mongoOrder.status }
          );
          
          // Auto-fix status in MongoDB
          await recoverOrder(order.ORDER_ID, db, conn);
          statusFixedCount++;
        }
      }
      
      console.log(`[Monitoring] Consistency check completed: ${recoveredCount} orders recovered, ${statusFixedCount} statuses fixed`);
      
    } finally {
      if (conn) await conn.close();
    }
    
  } catch (err) {
    await logError(err, 'error', { context: 'consistency_check' });
  }
};

module.exports = { initMonitoring, logError, checkDataConsistency };
