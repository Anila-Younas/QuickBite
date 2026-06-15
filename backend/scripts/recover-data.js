
require('dotenv').config();
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

async function recoverData() {
  console.log('=== QuickBite Data Recovery ===\n');
  
  let oracleConn;
  try {
    console.log('Step 1: Connecting to databases...');
    oracleConn = await getConnection();
    await connectMongo();
    const db = mongoose.connection.db;
    console.log('✓ Connected to both Oracle and MongoDB\n');

    // Step 2: Sync Restaurants
    console.log('Step 2: Syncing Restaurants from Oracle to MongoDB...');
    const oracleRestaurants = await oracleConn.execute(`
      SELECT r.*, u.full_name as owner_name, u.email as owner_email
      FROM RESTAURANTS r
      JOIN USERS u ON r.owner_id = u.user_id
    `);
    console.log(`Found ${oracleRestaurants.rows.length} restaurants in Oracle`);
    
    for (const rest of oracleRestaurants.rows) {
      const existing = await db.collection('restaurants').findOne({
        oracle_restaurant_id: rest.RESTAURANT_ID
      });
      
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
          coordinates: rest.RESTAURANT_ID === 1 ? [71.5241, 32.5837] : [71.8100, 32.5900] // Default for Namal Cafe
        },
        menu: existing?.menu || [],
        cuisine: existing?.cuisine || ['Pakistani'],
        avg_rating: existing?.avg_rating || 4.5,
        delivery_fee: existing?.delivery_fee || 50,
        last_synced: new Date()
      };
      
      await db.collection('restaurants').updateOne(
        { oracle_restaurant_id: rest.RESTAURANT_ID },
        { $set: restaurantData },
        { upsert: true }
      );
      console.log(`  ✓ Synced: ${rest.NAME} (ID: ${rest.RESTAURANT_ID})`);
    }
    console.log('✓ Restaurants synced\n');

    // Step 3: Sync Riders
    console.log('Step 3: Syncing Riders from Oracle to MongoDB...');
    const oracleRiders = await oracleConn.execute(`
      SELECT user_id, full_name, email, phone
      FROM USERS
      WHERE role = 'RIDER'
    `);
    console.log(`Found ${oracleRiders.rows.length} riders in Oracle`);
    
    for (const rider of oracleRiders.rows) {
      const existing = await db.collection('riderlocations').findOne({
        oracle_rider_id: rider.USER_ID
      });
      
      const riderData = {
        oracle_rider_id: rider.USER_ID,
        name: rider.FULL_NAME,
        email: rider.EMAIL,
        phone: rider.PHONE,
        status: existing?.status || 'AVAILABLE',
        location: existing?.location || {
          type: 'Point',
          coordinates: [71.5255, 32.585] // Near Namal Cafe
        },
        last_updated: new Date()
      };
      
      await db.collection('riderlocations').updateOne(
        { oracle_rider_id: rider.USER_ID },
        { $set: riderData },
        { upsert: true }
      );
      console.log(`  ✓ Synced: ${rider.FULL_NAME} (ID: ${rider.USER_ID})`);
    }
    console.log('✓ Riders synced\n');

    // Step 4: Sync Orders
    console.log('Step 4: Syncing Orders from Oracle to MongoDB...');
    const oracleOrders = await oracleConn.execute(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email,
             r.name as restaurant_name
      FROM ORDERS o
      JOIN USERS u ON o.customer_id = u.user_id
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id
      ORDER BY o.created_at DESC
    `);
    console.log(`Found ${oracleOrders.rows.length} orders in Oracle`);
    
    for (const order of oracleOrders.rows) {
      // Get order items
      const orderItems = await oracleConn.execute(
        `SELECT * FROM ORDER_ITEMS WHERE order_id = :1`,
        [order.ORDER_ID]
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
        { order_id: order.ORDER_ID },
        { $set: orderData },
        { upsert: true }
      );
      console.log(`  ✓ Synced: Order #${order.ORDER_ID} (Status: ${order.STATUS})`);
    }
    console.log('✓ Orders synced\n');

    // Step 5: Mark all outbox events as dispatched (since we just synced everything)
    console.log('Step 5: Marking all pending outbox events as dispatched...');
    await oracleConn.execute(
      `UPDATE OUTBOX_EVENTS SET IS_DISPATCHED = 1 WHERE IS_DISPATCHED = 0`,
      [],
      { autoCommit: true }
    );
    console.log('✓ Outbox events cleared\n');

    console.log('=== Data Recovery Complete ===');
    console.log('Summary:');
    console.log(`- Restaurants synced: ${oracleRestaurants.rows.length}`);
    console.log(`- Riders synced: ${oracleRiders.rows.length}`);
    console.log(`- Orders synced: ${oracleOrders.rows.length}`);
    
  } catch (err) {
    console.error('❌ Error during data recovery:', err);
    throw err;
  } finally {
    if (oracleConn) await oracleConn.close();
    mongoose.connection.close();
  }
}

recoverData();
