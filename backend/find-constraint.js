
const oracledb = require('oracledb');
require('dotenv').config();

async function run() {
    let conn;
    try {
        console.log('Connecting to Oracle...');
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECTSTRING
        });
        
        console.log('Connected! Now querying constraints for ORDERS table...');
        
        const result = await conn.execute(`
            SELECT constraint_name, search_condition
            FROM user_constraints
            WHERE table_name = 'ORDERS' AND constraint_type = 'C'
        `);
        
        console.log('Constraints found:');
        result.rows.forEach(row => {
            console.log(`Name: ${row[0]}, Condition: ${row[1]}`);
        });
        
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
