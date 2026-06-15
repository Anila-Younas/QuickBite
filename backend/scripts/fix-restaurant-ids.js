const { connectMongo, mongoose } = require('../db/mongo');
require('dotenv').config();

async function fixRestaurantIds() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    console.log('=== Fixing Restaurant IDs ===');

    // Rename oracle_rest_id → oracle_restaurant_id for all restaurants
    const updateResult = await db.collection('restaurants').updateMany(
      { oracle_rest_id: { $exists: true } },
      { $rename: { 'oracle_rest_id': 'oracle_restaurant_id' } }
    );
    console.log(`Updated ${updateResult.modifiedCount} restaurants!`);

    console.log('Verification:');
    const restaurants = await db.collection('restaurants').find().toArray();
    restaurants.forEach(r => {
      console.log(`Name: ${r.name}, Oracle ID: ${r.oracle_restaurant_id}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixRestaurantIds();
