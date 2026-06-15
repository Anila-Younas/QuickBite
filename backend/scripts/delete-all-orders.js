
require('dotenv').config();
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

async function deleteAllOrders() {
  let oracleConn = null;
  try {
    console.log('=== Deleting All Orders ===');
    
    // Step 1: Connect to Oracle and MongoDB
    console.log('Connecting to Oracle...');
    oracleConn = await getConnection();
    console.log('Oracle connected');

    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('MongoDB connected');

    // Step 2: Delete from Oracle tables (order matters for foreign keys)
    console.log('\n--- Deleting Oracle Data ---');

    // Delete from AUDIT_LOG first (depends on ORDERS)
    const auditResult = await oracleConn.execute(`DELETE FROM AUDIT_LOG WHERE table_name = 'ORDERS'`, [], { autoCommit: true });
    console.log(`Deleted ${auditResult.rowsAffected} rows from AUDIT_LOG`);

    // Delete from OUTBOX_EVENTS
    const outboxResult = await oracleConn.execute(`DELETE FROM OUTBOX_EVENTS WHERE aggregate_type = 'ORDER'`, [], { autoCommit: true });
    console.log(`Deleted ${outboxResult.rowsAffected} rows from OUTBOX_EVENTS`);

    // Delete from ORDER_ITEMS
    const orderItemsResult = await oracleConn.execute(`DELETE FROM ORDER_ITEMS`, [], { autoCommit: true });
    console.log(`Deleted ${orderItemsResult.rowsAffected} rows from ORDER_ITEMS`);

    // Delete from PAYMENTS
    const paymentsResult = await oracleConn.execute(`DELETE FROM PAYMENTS`, [], { autoCommit: true });
    console.log(`Deleted ${paymentsResult.rowsAffected} rows from PAYMENTS`);

    // Delete from ORDERS
    const ordersResult = await oracleConn.execute(`DELETE FROM ORDERS`, [], { autoCommit: true });
    console.log(`Deleted ${ordersResult.rowsAffected} rows from ORDERS`);

    // Step 3: Delete from MongoDB
    console.log('\n--- Deleting MongoDB Data ---');
    const db = mongoose.connection.db;

    // Delete from orders collection
    const mongoOrdersResult = await db.collection('orders').deleteMany({});
    console.log(`Deleted ${mongoOrdersResult.deletedCount} documents from MongoDB orders`);

    // Delete from chats (if linked to orders)
    const mongoChatsResult = await db.collection('chats').deleteMany({});
    console.log(`Deleted ${mongoChatsResult.deletedCount} documents from MongoDB chats`);

    console.log('\n=== All Orders Deleted Successfully ===');

  } catch (err) {
    console.error('\nError deleting orders:', err);
  } finally {
    if (oracleConn) {
      try { await oracleConn.close(); } catch (e) { console.error('Error closing Oracle connection:', e); }
    }
    try { await mongoose.disconnect(); } catch (e) { console.error('Error closing MongoDB connection:', e); }
    process.exit(0);
  }
}

deleteAllOrders();
