
const { connectMongo, mongoose } = require('./db/mongo');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await connectMongo();
        const db = mongoose.connection.db;
        
        console.log('Checking USERS table in Oracle for riders...');
        const { getConnection } = require('./db/oracle');
        const conn = await getConnection();
        const oracleRiders = await conn.execute(`SELECT user_id, full_name, email, role FROM USERS WHERE role='RIDER'`);
        console.log('Oracle Riders:', oracleRiders.rows);
        
        console.log('Upserting all Oracle riders into MongoDB...');
        for (let r of oracleRiders.rows) {
            await db.collection('riderlocations').updateOne(
                { oracle_rider_id: r.USER_ID },
                {
                    $set: {
                        oracle_rider_id: r.USER_ID,
                        full_name: r.FULL_NAME,
                        email: r.EMAIL,
                        status: 'AVAILABLE',
                        location: { type: 'Point', coordinates: [71.5200, 32.5800] },
                        last_updated: new Date()
                    }
                },
                { upsert: true }
            );
        }
        console.log('✅ Riders upserted!');
        
        process.exit(0);
        
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
