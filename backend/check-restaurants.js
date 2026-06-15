const { connectMongo, mongoose } = require('./db/mongo');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await connectMongo();
        const db = mongoose.connection.db;
        
        console.log('Checking restaurants collection...');
        const restaurants = await db.collection('restaurants').find({}).limit(1).toArray();
        console.log('Restaurant structure:', JSON.stringify(restaurants[0], null, 2));
        
        console.log('\nChecking menu items...');
        if (restaurants[0] && restaurants[0].menu) {
            console.log('Menu item structure:', JSON.stringify(restaurants[0].menu[0], null, 2));
        }
        
        process.exit(0);
        
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
