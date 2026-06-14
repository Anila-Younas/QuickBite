const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const RestaurantSchema = new mongoose.Schema({
  oracle_restaurant_id: { type: Number, unique: true },
  name: String,
  city_zone: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  menu: [{ 
    name: String, 
    price: Number, 
    category: String,
    available: Boolean,
    description: String,
    rating: { type: Number, default: 0 }
  }],
  cuisine: [String],
  avg_rating: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  opening_hours: { open: String, close: String },
  delivery_fee: { type: Number, default: 50 }
});
RestaurantSchema.index({ location: '2dsphere' });
RestaurantSchema.index({ city_zone: 1, cuisine: 1, is_active: 1 });
RestaurantSchema.index({ name: 'text', 'menu.name': 'text' });
const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

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
  const { lat, lng, search } = req.query;
  try {
    let filter = { is_active: true };
    if (search) {
       filter.$or = [
         { name: { $regex: search, $options: 'i' } },
         { 'menu.name': { $regex: search, $options: 'i' } }
       ];
    }
    
    if (lat && lng) {
      const rests = await Restaurant.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: 'distance_meters',
            spherical: true,
            query: filter
          }
        }
      ]);
      res.json(rests);
    } else {
      const rests = await Restaurant.find(filter);
      res.json(rests);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/offers', async (req, res) => {
  try {
    const offers = await Offer.find({ is_active: true });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/review', async (req, res) => {
  const { order_id, customer_id, restaurant_id, rider_id, restaurant_rating, rider_rating, comment } = req.body;
  try {
    await Review.create({ order_id, customer_id, restaurant_id, rider_id, restaurant_rating, rider_rating, comment });
    // Update averages
    const restReviews = await Review.find({ restaurant_id });
    const restAvg = restReviews.reduce((acc, r) => acc + (r.restaurant_rating||0), 0) / restReviews.filter(r=>r.restaurant_rating).length;
    await Restaurant.updateOne({ oracle_restaurant_id: restaurant_id }, { $set: { avg_rating: restAvg.toFixed(1) } });
    
    // Also update rider rating logic here ideally
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const rest = await Restaurant.findOne({ oracle_restaurant_id: parseInt(req.params.id) });
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(rest);
});

module.exports = router;
