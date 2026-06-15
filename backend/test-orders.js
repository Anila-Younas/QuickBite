
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function testOrders() {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM ORDERS`);
    console.log('=== All Orders ===');
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) await conn.close();
  }
}

testOrders();
