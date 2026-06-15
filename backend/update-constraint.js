
require('dotenv').config();
const { getConnection } = require('./db/oracle');

async function updateConstraint() {
  let conn;
  try {
    conn = await getConnection();

    console.log('Dropping existing ORDER_STATUS_CHECK constraint...');
    await conn.execute('ALTER TABLE ORDERS DROP CONSTRAINT ORDER_STATUS_CHECK', [], { autoCommit: true });

    console.log('Adding updated ORDER_STATUS_CHECK constraint...');
    await conn.execute(`
      ALTER TABLE ORDERS ADD CONSTRAINT ORDER_STATUS_CHECK CHECK (
        status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'WAITING_CONFIRM', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
      )
    `, [], { autoCommit: true });

    console.log('Constraint updated successfully!');
  } catch (err) {
    if (err.message.includes('ORA-02443')) {
      console.log('Constraint does not exist, creating it...');
      await conn.execute(`
        ALTER TABLE ORDERS ADD CONSTRAINT ORDER_STATUS_CHECK CHECK (
          status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'WAITING_CONFIRM', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
        )
      `, [], { autoCommit: true });
      console.log('Constraint created successfully!');
    } else {
      console.error('Error updating constraint:', err);
    }
  } finally {
    if (conn) await conn.close();
  }
}

updateConstraint();
