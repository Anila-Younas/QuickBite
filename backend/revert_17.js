const { getConnection } = require('./db/oracle');

async function revert() {
  const conn = await getConnection();
  try {
    await conn.execute("UPDATE ORDERS SET status = 'WAITING_FOR_PICKUP', rider_id = NULL WHERE order_id = 17", [], { autoCommit: true });
    console.log("Order 17 reverted");
  } catch (e) {
    console.error(e);
  } finally {
    await conn.close();
  }
}
revert();
