
require('dotenv').config();
const { getConnection } = require('../db/oracle');
const { connectMongo } = require('../db/mongo');

async function syncRiders() {
  let conn;
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    console.log('Fetching all riders from Oracle...');
    conn = await getConnection();
    const oracleRiders = await conn.execute(`
      SELECT user_id, full_name, email
      FROM USERS
      WHERE role = 'RIDER'
    `);
    console.log(`Found ${oracleRiders.rows.length} riders in Oracle.`);

    for (const rider of oracleRiders.rows) {
      const existing = await db.collection('riderlocations').findOne({ oracle_rider_id: rider.USER_ID });
      if (!existing) {
        console.log(`Creating MongoDB entry for rider: ${rider.FULL_NAME} (ID: ${rider.USER_ID})`);
        await db.collection('riderlocations').insertOne({
          oracle_rider_id: rider.USER_ID,
          name: rider.FULL_NAME,
          location: {
            type: 'Point',
            coordinates: [71.5255, 32.585] // Default nearby
          },
          status: 'AVAILABLE',
          last_updated: new Date()
        });
      } else {
        console.log(`Rider ${rider.FULL_NAME} (ID: ${rider.USER_ID}) already exists.`);
      }
    }

    console.log('Rider sync complete!');
  } catch (err) {
    console.error('Error syncing riders:', err);
  } finally {
    if (conn) await conn.close();
    const mongoose = require('mongoose');
    mongoose.connection.close();
  }
}

syncRiders();
