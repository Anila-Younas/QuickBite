const { getConnection } = require('./db/oracle');

async function test() {
  const conn = await getConnection();
  try {
    const orderId = 17; // The order we tried to assign
    const checkResult = await conn.execute(`SELECT status, rider_id, version FROM ORDERS WHERE order_id = :1`, [orderId]);
    console.log("Current order:", checkResult.rows[0]);
    
    const currentVersion = checkResult.rows[0].VERSION;
    const newStatus = 'WAITING_CONFIRM';
    const riderId = 4; // Rider Hamza (from the user id, maybe? Let's use whatever)
    
    const bindParams = {
      status: newStatus,
      orderId: orderId,
      version: currentVersion,
      riderId: riderId
    };
    const updateSQL = `
        UPDATE ORDERS 
        SET status = :status, rider_id = :riderId 
        WHERE order_id = :orderId AND version = :version
    `;
    
    console.log("SQL:", updateSQL);
    console.log("Params:", bindParams);
    
    const updateResult = await conn.execute(updateSQL, bindParams, { autoCommit: true });
    console.log("Rows affected:", updateResult.rowsAffected);
    
  } catch (e) {
    console.error(e);
  } finally {
    await conn.close();
  }
}
test();
