
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function createTestOrder() {
  let conn;
  try {
    conn = await getConnection();
    // Insert a new test order in AWAITING_RIDER_CONFIRMATION status with rider 4!
    const result = await conn.execute(
      `INSERT INTO ORDERS (CUSTOMER_ID, RESTAURANT_ID, RIDER_ID, STATUS, TOTAL_AMOUNT, DELIVERY_ADDRESS) 
       VALUES (:1, :2, :3, 'AWAITING_RIDER_CONFIRMATION', :4, :5) 
       RETURNING ORDER_ID INTO :6`,
      [
        2, // Customer Ali
        1, // Namal Cafe
        4, // Rider Hamza
        500, // Total
        'Test Address, Mianwali', // Address
        { dir: 1005, type: oracledb.NUMBER } // OUT parameter for ORDER_ID
      ],
      { autoCommit: true }
    );

    const newOrderId = result.outBinds[0][0];
    console.log('✅ Test order created! Order ID:', newOrderId);
    console.log('   Status: AWAITING_RIDER_CONFIRMATION');
    console.log('   Rider ID: 4');

  } catch (err) {
    console.error('Error creating test order:', err);
  } finally {
    if (conn) await conn.close();
  }
}

// Import oracledb to handle the OUT parameter!
const oracledb = require('oracledb');

createTestOrder();
