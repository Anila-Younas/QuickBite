
require('dotenv').config();
const { getConnection } = require('../db/oracle');
const { connectMongo } = require('../db/mongo');

async function syncRestaurants() {
  let conn;
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    console.log('Fetching all restaurants from Oracle...');
    conn = await getConnection();
    const oracleRestaurants = await conn.execute(`
      SELECT r.*, u.full_name as owner_name
      FROM RESTAURANTS r
      JOIN USERS u ON r.owner_id = u.user_id
    `);
    console.log(`Found ${oracleRestaurants.rows.length} restaurants in Oracle.`);

    for (const rest of oracleRestaurants.rows) {
      // Check if exists in MongoDB
      const existing = await db.collection('restaurants').findOne({ oracle_restaurant_id: rest.RESTAURANT_ID });
      if (!existing) {
        console.log(`Creating MongoDB entry for restaurant: ${rest.NAME} (ID: ${rest.RESTAURANT_ID})`);
        await db.collection('restaurants').insertOne({
          oracle_restaurant_id: rest.RESTAURANT_ID,
          name: rest.NAME,
          cuisine: [],
          location: {
            type: 'Point',
            coordinates: [71.5241, 32.5837] // Default location
          },
          address: '',
          city_zone: rest.CITY_ZONE || 'Default-Zone',
          opening_hours: '10:00-22:00',
          menu: [],
          avg_rating: 0,
          total_reviews: 0,
          is_active: rest.IS_ACTIVE === 1 ? true : false,
          delivery_fee: 50
        });
      } else {
        console.log(`Restaurant ${rest.NAME} (ID: ${rest.RESTAURANT_ID}) exists in MongoDB, checking for issues...`);
        // Fix any missing fields or null location
        const updates = {};
        if (!existing.location || !existing.location.coordinates) {
          updates.location = {
            type: 'Point',
            coordinates: [71.5241, 32.5837]
          };
        }
        if (!existing.delivery_fee) {
          updates.delivery_fee = 50;
        }
        if (existing.is_active === undefined) {
          updates.is_active = rest.IS_ACTIVE === 1 ? true : false;
        }
        if (Object.keys(updates).length > 0) {
          console.log(`Updating restaurant ${rest.NAME} with fixes:`, updates);
          await db.collection('restaurants').updateOne(
            { oracle_restaurant_id: rest.RESTAURANT_ID },
            { $set: updates }
          );
        }
      }
    }

    console.log('Restaurant sync complete!');
  } catch (err) {
    console.error('Error syncing restaurants:', err);
  } finally {
    if (conn) await conn.close();
    const mongoose = require('mongoose');
    mongoose.connection.close();
  }
}

syncRestaurants();
