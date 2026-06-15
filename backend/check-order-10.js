
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function checkOrder() {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM ORDERS WHERE order_id = 10`);
    console.log('=== Order 10 ===');
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) await conn.close();
  }
}

checkOrder();
