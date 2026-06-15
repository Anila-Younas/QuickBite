
const { mongoose } = require('./db/mongo');

async function debug() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    
    const db = mongoose.connection.db;
    
    console.log('\n--- restaurants collection ---');
    const restaurants = await db.collection('restaurants').find({}).toArray();
    console.log(JSON.stringify(restaurants, null, 2));
    
    console.log('\n--- riderlocations collection ---');
    const riderLocs = await db.collection('riderlocations').find({}).toArray();
    console.log(JSON.stringify(riderLocs, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

debug();
