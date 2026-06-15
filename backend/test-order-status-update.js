
require('dotenv').config();
const { getConnection } = require('./db/oracle');
const { mongoose } = require('./db/mongo');
const { updateOrderStatus } = require('./utils/orderHelpers');

async function testOrderUpdate() {
  let conn;
  try {
    conn = await getConnection();
    console.log('Starting update...');
    // Test order ID 10, from PACKED to WAITING_CONFIRM, rider 4
    const result = await updateOrderStatus(
      10,
      'WAITING_CONFIRM',
      conn,
      null, // No socket for test
      { restaurantId: 1, riderId: 4 }
    );
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) await conn.close();
    mongoose.connection.close();
  }
}

testOrderUpdate();
