const { connectMongo, mongoose } = require('../db/mongo');
require('dotenv').config();

async function checkReviews() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    console.log('=== Restaurants ===');
    const restaurants = await db.collection('restaurants').find().toArray();
    restaurants.forEach(r => console.log(`ID: ${r.oracle_rest_id}, Name: ${r.name}`));

    console.log('\n=== Reviews ===');
    const reviews = await db.collection('reviews').find().toArray();
    if (reviews.length === 0) {
      console.log('No reviews found, inserting sample reviews...');
      await db.collection('reviews').insertMany([
        {
          order_id: 1,
          customer_id: 2,
          restaurant_id: 1,
          rider_id: 4,
          restaurant_rating: 5,
          rider_rating: 4,
          comment: 'Amazing food, fast delivery!',
          status: 'unread',
          created_at: new Date(Date.now() - 86400000)
        },
        {
          order_id: 2,
          customer_id: 3,
          restaurant_id: 1,
          rider_id: 4,
          restaurant_rating: 4,
          rider_rating: 5,
          comment: 'Good food, great rider!',
          status: 'unread',
          created_at: new Date(Date.now() - 172800000)
        }
      ]);
      console.log('Inserted sample reviews for restaurant 1!');
    } else {
      reviews.forEach(r => console.log(`Order: ${r.order_id}, Rest ID: ${r.restaurant_id}, Rating: ${r.restaurant_rating}`));
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkReviews();
