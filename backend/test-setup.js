const { connectMongo, mongoose } = require('./db/mongo');

async function setupTestData() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB successfully');
    const db = mongoose.connection.db;

    console.log('Setting up test rider locations...');
    // Rider 4: Hamza (near Namal, ~1km)
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: 4 },
      {
        $set: {
          status: 'AVAILABLE',
          location: {
            type: 'Point',
            coordinates: [71.5300, 32.5880] // (lng, lat)
          },
          last_updated: new Date()
        }
      },
      { upsert: true }
    );

    // Rider 5: Ali (near Namal, ~2km)
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: 5 },
      {
        $set: {
          status: 'AVAILABLE',
          location: {
            type: 'Point',
            coordinates: [71.5200, 32.5800] // (lng, lat)
          },
          last_updated: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ Test rider locations added!');

    // Ensure Namal Cafe has a location
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: 1 },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [71.5241, 32.5837] // (lng, lat)
          },
          last_updated: new Date()
        }
      },
      { upsert: true }
    );
    console.log('✅ Namal Cafe location set!');

    process.exit(0);
  } catch (err) {
    console.error('Error setting up test data:', err);
    process.exit(1);
  }
}

setupTestData();
