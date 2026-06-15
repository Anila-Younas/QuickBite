
require('dotenv').config();
const { connectMongo } = require('./db/mongo');

async function fixTestRestaurant() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    console.log('Updating test restaurant location...');
    const result = await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: 6 },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [71.5241, 32.5837]
          },
          delivery_fee: 50
        }
      }
    );
    console.log('Update result:', result);
    console.log('Test restaurant fixed!');
  } catch (err) {
    console.error('Error fixing test restaurant:', err);
  } finally {
    const mongoose = require('mongoose');
    mongoose.connection.close();
  }
}

fixTestRestaurant();
