
const oracledb = require('oracledb');
const { getConnection } = require('./db/oracle');

async function run() {
    let conn;
    try {
        console.log('Connecting to Oracle...');
        conn = await getConnection();
        
        console.log('Connected! Now querying constraints...');
        const constraints = await conn.execute(`
            SELECT constraint_name, search_condition
            FROM user_constraints
            WHERE table_name = 'ORDERS' AND constraint_type = 'C'
        `);
        
        for (let row of constraints.rows) {
            if (row.SEARCH_CONDITION && row.SEARCH_CONDITION.includes('status')) {
                console.log(`Found status constraint: ${row.CONSTRAINT_NAME}, dropping it...`);
                await conn.execute(`ALTER TABLE ORDERS DROP CONSTRAINT ${row.CONSTRAINT_NAME}`);
            }
        }
        
        console.log('Creating new check constraint with all statuses...');
        await conn.execute(`
            ALTER TABLE ORDERS 
            ADD CONSTRAINT ORDER_STATUS_CHECK 
            CHECK (status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'CANCELLED'))
        `);
        
        await conn.commit();
        console.log('✅ Constraint updated successfully! Now all statuses are allowed!');
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

run();
