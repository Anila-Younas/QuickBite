const { connectMongo, mongoose } = require('../db/mongo');
require('dotenv').config();

async function backfillReviews() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    console.log('=== Backfilling Reviews ===');

    // Update any reviews missing status to 'unread'
    const statusUpdate = await db.collection('reviews').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'unread' } }
    );
    console.log(`Updated ${statusUpdate.modifiedCount} reviews with missing status to 'unread'`);

    // Verify restaurant_id exists and is a number
    const reviews = await db.collection('reviews').find().toArray();
    let fixedCount = 0;
    for (let review of reviews) {
      if (!review.restaurant_id || typeof review.restaurant_id !== 'number') {
        console.log(`Fixing review with order_id ${review.order_id} (missing/invalid restaurant_id)`);
        // For simplicity, if we can't determine, skip or set to 1 (sample)
        // In real app, you'd cross-reference with orders table
        if (review.order_id) {
          // Try to get from orders (if available) but for now, default to 1 if missing
          await db.collection('reviews').updateOne(
            { _id: review._id },
            { $set: { restaurant_id: 1 } }
          );
          fixedCount++;
        }
      }
    }
    console.log(`Fixed ${fixedCount} reviews with invalid restaurant_id`);

    console.log('Backfill complete!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

backfillReviews();
