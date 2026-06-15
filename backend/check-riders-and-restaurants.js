
require('dotenv').config();
const { connectMongo, mongoose } = require('./db/mongo');

async function checkData() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('Connected!');

    const db = mongoose.connection.db;

    // Check restaurants
    console.log('\n--- Restaurants ---');
    const restaurants = await db.collection('restaurants').find({}).toArray();
    restaurants.forEach(r => {
      console.log(`- ${r.name} (oracle_restaurant_id: ${r.oracle_restaurant_id})`);
      console.log(`  Location: ${r.location?.coordinates[1]}, ${r.location?.coordinates[0]}`);
    });

    // Check riders
    console.log('\n--- Riders ---');
    const riders = await db.collection('riderlocations').find({}).toArray();
    riders.forEach(r => {
      console.log(`- Rider ID: ${r.oracle_rider_id}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Location: ${r.location?.coordinates[1]}, ${r.location?.coordinates[0]}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
