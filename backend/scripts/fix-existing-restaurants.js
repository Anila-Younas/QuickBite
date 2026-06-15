
require('dotenv').config();
const { connectMongo, mongoose } = require('../db/mongo');

async function fixRestaurants() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('Connected!');

    const db = mongoose.connection.db;

    // Update all restaurants: set is_active to true, add missing fields
    await db.collection('restaurants').updateMany(
      {},
      {
        $set: {
          is_active: true,
          cuisine: ['Pakistani', 'Various'],
          avg_rating: 4.0,
          delivery_fee: 50
        }
      }
    );

    // Update Namal Cafe specifically to correct location and details
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: 1 },
      {
        $set: {
          name: 'Namal Cafe',
          city_zone: 'Mianwali-Central',
          location: { type: 'Point', coordinates: [71.5241, 32.5837] },
          cuisine: ['Pakistani', 'Fast Food', 'Beverages'],
          avg_rating: 4.5,
          delivery_fee: 50
        }
      }
    );

    console.log('Restaurants fixed!');

    // Check the result
    const restaurants = await db.collection('restaurants').find({}).toArray();
    console.log('\n--- Updated Restaurants ---');
    restaurants.forEach(r => {
      console.log(`- ${r.name} (oracle_restaurant_id: ${r.oracle_restaurant_id})`);
      console.log(`  is_active: ${r.is_active}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

fixRestaurants();
