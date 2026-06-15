
require('dotenv').config();
const { connectMongo, mongoose } = require('../db/mongo');

async function fixRiders() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongo();
    console.log('Connected!');

    const db = mongoose.connection.db;

    // Update rider 4: ~0.15 km from Namal Cafe
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: 4 },
      {
        $set: {
          location: { type: 'Point', coordinates: [71.5255, 32.5850] },
          last_updated: new Date()
        }
      }
    );

    // Update rider 5: ~0.2 km from Namal Cafe
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: 5 },
      {
        $set: {
          location: { type: 'Point', coordinates: [71.5220, 32.5820] },
          last_updated: new Date()
        }
      }
    );

    console.log('Rider locations fixed!');

    // Check the result
    const riders = await db.collection('riderlocations').find({}).toArray();
    console.log('\n--- Updated Riders ---');
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

fixRiders();
