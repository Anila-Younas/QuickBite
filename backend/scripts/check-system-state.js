
require('dotenv').config();
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

async function checkSystemState() {
  console.log('=== QuickBite System State Check ===\n');
  
  let oracleConn;
  try {
    // Check Oracle DB
    console.log('1. Checking Oracle Database...');
    oracleConn = await getConnection();
    console.log('   ✓ Oracle connected successfully');

    const tableCounts = [
      { name: 'USERS', query: 'SELECT COUNT(*) as cnt FROM USERS' },
      { name: 'RESTAURANTS', query: 'SELECT COUNT(*) as cnt FROM RESTAURANTS' },
      { name: 'ORDERS', query: 'SELECT COUNT(*) as cnt FROM ORDERS' },
      { name: 'OUTBOX_EVENTS', query: 'SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE IS_DISPATCHED = 0' }
    ];

    for (const table of tableCounts) {
      const result = await oracleConn.execute(table.query);
      console.log(`   • ${table.name}: ${result.rows[0].CNT} records`);
    }

    // Check MongoDB
    console.log('\n2. Checking MongoDB...');
    await connectMongo();
    const db = mongoose.connection.db;
    console.log('   ✓ MongoDB connected successfully');

    const collCounts = [
      { name: 'restaurants', key: 'oracle_restaurant_id' },
      { name: 'riderlocations', key: 'oracle_rider_id' },
      { name: 'orders', key: 'order_id' }
    ];

    for (const coll of collCounts) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`   • ${coll.name}: ${count} records`);
    }

    // Check for Namal Cafe specifically
    console.log('\n3. Checking Namal Cafe Data...');
    const namalOracle = await oracleConn.execute(
      `SELECT * FROM RESTAURANTS WHERE NAME LIKE '%Namal%'`
    );
    console.log(`   • Oracle Namal Cafe: ${namalOracle.rows.length ? 'Found' : 'NOT FOUND'}`);
    if (namalOracle.rows.length > 0) {
      console.log(`     ID: ${namalOracle.rows[0].RESTAURANT_ID}, Name: ${namalOracle.rows[0].NAME}`);
    }

    const namalMongo = await db.collection('restaurants').findOne({
      $or: [{ oracle_restaurant_id: 1 }, { name: /Namal/i }]
    });
    console.log(`   • MongoDB Namal Cafe: ${namalMongo ? 'Found' : 'NOT FOUND'}`);
    if (namalMongo) {
      console.log(`     ID: ${namalMongo.oracle_restaurant_id}, Name: ${namalMongo.name}`);
    }

    // Check for orders for Namal Cafe
    console.log('\n4. Checking Orders for Namal Cafe...');
    if (namalOracle.rows.length > 0) {
      const restId = namalOracle.rows[0].RESTAURANT_ID;
      const oracleOrders = await oracleConn.execute(
        `SELECT * FROM ORDERS WHERE RESTAURANT_ID = :1 ORDER BY CREATED_AT DESC`,
        [restId]
      );
      console.log(`   • Oracle Orders: ${oracleOrders.rows.length}`);
      
      const mongoOrders = await db.collection('orders').countDocuments({
        $or: [{ restaurant_id: restId }, { oracle_restaurant_id: restId }]
      });
      console.log(`   • MongoDB Orders: ${mongoOrders}`);
    }

    // Check pending outbox events
    console.log('\n5. Checking Outbox Sync Queue...');
    const pendingEvents = await oracleConn.execute(
      `SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE IS_DISPATCHED = 0`
    );
    console.log(`   • Pending events: ${pendingEvents.rows[0].CNT}`);

  } catch (err) {
    console.error('❌ Error checking system state:', err);
  } finally {
    if (oracleConn) await oracleConn.close();
    mongoose.connection.close();
    console.log('\n=== Check Complete ===');
  }
}

checkSystemState();
