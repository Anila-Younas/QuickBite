const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const { calculateItemFinalPrice } = require('./restaurant');
const router = express.Router();

// We'll use the collection directly instead of a model to avoid schema conflicts

const OfferSchema = new mongoose.Schema({
  restaurant_id: Number,
  restaurant_name: String,
  title: String,
  description: String,
  discount_pct: Number,
  is_active: { type: Boolean, default: true }
});
const Offer = mongoose.model('Offer', OfferSchema);

const ReviewSchema = new mongoose.Schema({
  order_id: Number,
  customer_id: Number,
  restaurant_id: Number,
  rider_id: Number,
  restaurant_rating: Number,
  rider_rating: Number,
  comment: String,
  created_at: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

router.get('/nearby', async (req, res) => {
  const { search } = req.query;
  try {
    const db = mongoose.connection.db;
    let filter = { is_active: true };
    if (search) {
       filter.$or = [
         { name: { $regex: search, $options: 'i' } },
         { 'menu.name': { $regex: search, $options: 'i' } }
       ];
    }
    
    // Get all active restaurants - no location filtering!
    const rests = await db.collection('restaurants').find(filter).toArray();
    
    res.json(rests);
  } catch (err) {
    console.error('Error in nearby:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/offers', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const offers = await db.collection('offers').find({ 
      is_active: true,
      $or: [{ is_deleted: false }, { is_deleted: { $exists: false } }]
    }).toArray();
    // Attach restaurant names for display
    const restaurants = await db.collection('restaurants').find({}).toArray();
    const restaurantMap = new Map(restaurants.map(r => [r.oracle_restaurant_id, r.name]));
    const offersWithNames = offers.map(o => ({
      ...o,
      restaurant_name: restaurantMap.get(o.restaurant_id) || 'Restaurant'
    }));
    res.json(offersWithNames);
  } catch (err) {
    console.error('Error in /offers:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/review', async (req, res) => {
  const { order_id, customer_id, restaurant_id, rider_id, restaurant_rating, rider_rating, comment } = req.body;
  try {
    const db = mongoose.connection.db;
    const insertResult = await db.collection('reviews').insertOne({ 
      order_id, 
      customer_id, 
      restaurant_id, 
      rider_id, 
      restaurant_rating, 
      rider_rating, 
      comment,
      status: 'unread',
      created_at: new Date()
    });

    // Update restaurant average rating
    const restReviews = await db.collection('reviews').find({ restaurant_id }).toArray();
    const validReviews = restReviews.filter(r => r.restaurant_rating);
    const restAvg = validReviews.length > 0
      ? (validReviews.reduce((acc, r) => acc + r.restaurant_rating, 0) / validReviews.length).toFixed(1)
      : 0;

    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: restaurant_id },
      { $set: { avg_rating: parseFloat(restAvg) } }
    );

    // Emit socket event to notify restaurant of new review
    const io = req.app.get('io');
    if (io) {
      console.log(`[Review] Emitting new_review event for restaurant ${restaurant_id}`);
      io.to(`restaurant_${restaurant_id}`).emit('new_review', { review_id: insertResult.insertedId });
    }

    res.json({ success: true });
  } catch(err) {
    console.error('[Review] Error submitting review:', err);
    // Log error to MongoDB for debugging
    try {
      const db = mongoose.connection.db;
      await db.collection('error_logs').insertOne({
        type: 'REVIEW_SUBMIT_ERROR',
        data: { order_id, customer_id, restaurant_id },
        error: err.message,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('[Review] Failed to log error:', logErr);
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const reviews = await db.collection('reviews')
      .find({ restaurant_id: parseInt(req.params.id) })
      .sort({ created_at: -1 })
      .toArray();
    res.json(reviews);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const db = mongoose.connection.db;
  const restaurantId = parseInt(req.params.id);
  const rest = await db.collection('restaurants').findOne({ oracle_restaurant_id: restaurantId });
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });

  // Get active offers for this restaurant
  const offers = await db.collection('offers').find({ 
    restaurant_id: restaurantId, 
    is_active: true 
  }).toArray();

  // Process menu items to apply discounts
  const processedMenu = rest.menu?.map(item => {
    const { finalPrice, appliedOffer } = calculateItemFinalPrice(item, offers, restaurantId);
    return {
      ...item,
      original_price: item.price, // Preserve original price
      final_price: finalPrice
    };
  }) || [];

  res.json({
    ...rest,
    menu: processedMenu
  });
});

module.exports = router;
