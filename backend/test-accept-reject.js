require('dotenv').config();
const { getConnection } = require('./db/oracle');
const oracledb = require('oracledb');

async function createTestOrderForAcceptReject() {
  let conn;
  try {
    conn = await getConnection();
    // Insert a test order in WAITING_CONFIRM status with rider 5
    const result = await conn.execute(
      `INSERT INTO ORDERS (CUSTOMER_ID, RESTAURANT_ID, RIDER_ID, STATUS, TOTAL_AMOUNT, DELIVERY_ADDRESS) 
       VALUES (:1, :2, :3, 'WAITING_CONFIRM', :4, :5) 
       RETURNING ORDER_ID INTO :6`,
      [
        2, // Customer Ali
        1, // Namal Cafe
        5, // Rider Hamza
        500, // Total
        'Test Address for Accept/Reject, Mianwali', // Address
        { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      ],
      { autoCommit: true }
    );

    const newOrderId = result.outBinds[0][0];
    console.log('✅ Test order created for accept/reject testing! Order ID:', newOrderId);
    console.log('   Status: WAITING_CONFIRM');
    console.log('   Rider ID: 5');

  } catch (err) {
    console.error('Error creating test order:', err);
  } finally {
    if (conn) await conn.close();
  }
}

createTestOrderForAcceptReject();
