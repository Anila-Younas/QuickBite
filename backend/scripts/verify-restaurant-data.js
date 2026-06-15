const { connectMongo, mongoose } = require('../db/mongo');
const { getConnection } = require('../db/oracle');
require('dotenv').config();

async function verifyData() {
  let conn;
  try {
    console.log('=== Step 1: Connecting to Oracle ===');
    conn = await getConnection();
    console.log('Connected to Oracle!');
    
    console.log('\n=== Oracle RESTAURANTS Table ===');
    const oracleRest = await conn.execute(`SELECT * FROM RESTAURANTS`, [], { outFormat: 4002 });
    console.log(`Found ${oracleRest.rows.length} restaurants in Oracle`);
    oracleRest.rows.forEach(r => {
      console.log(`  - ID: ${r.RESTAURANT_ID}, Name: ${r.NAME}, Owner ID: ${r.OWNER_ID}`);
    });

    console.log('\n=== Step 2: Connecting to MongoDB ===');
    await connectMongo();
    console.log('Connected to MongoDB!');
    const db = mongoose.connection.db;

    console.log('\n=== MongoDB restaurants Collection ===');
    const mongoRest = await db.collection('restaurants').find().toArray();
    console.log(`Found ${mongoRest.length} restaurants in MongoDB`);
    mongoRest.forEach(r => {
      console.log(`  - Oracle ID: ${r.oracle_restaurant_id}, Name: ${r.name}`);
    });

    console.log('\n=== Verification Complete ===');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) await conn.close();
    if (mongoose.connection) await mongoose.connection.close();
    process.exit(0);
  }
}

verifyData();
