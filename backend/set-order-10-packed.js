
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function updateOrder() {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE ORDERS SET STATUS='PACKED' WHERE ORDER_ID=10`,
      [],
      { autoCommit: true }
    );
    console.log('✅ Order 10 updated to PACKED');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) await conn.close();
  }
}

updateOrder();
