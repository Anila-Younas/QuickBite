
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function updateOrder() {
  let conn;
  try {
    conn = await getConnection();
    // Update order 20 to WAITING_CONFIRM and set rider_id to 4!
    await conn.execute(
      `UPDATE ORDERS SET STATUS='WAITING_CONFIRM', RIDER_ID=4 WHERE ORDER_ID=20`,
      [],
      { autoCommit: true }
    );
    console.log('✅ Order 20 updated to WAITING_CONFIRM, rider 4!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) await conn.close();
  }
}

updateOrder();
