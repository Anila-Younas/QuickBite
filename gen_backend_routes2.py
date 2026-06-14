import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

catalog_js = """const express = require('express');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const RestaurantSchema = new mongoose.Schema({
  oracle_rest_id: Number,
  name: String,
  city_zone: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  menu: [{ item_name: String, price: Number, is_available: Boolean }]
});
RestaurantSchema.index({ location: '2dsphere' });
const Restaurant = mongoose.model('Restaurant', RestaurantSchema);

router.get('/', async (req, res) => {
  const { city_zone } = req.query;
  const filter = city_zone ? { city_zone } : {};
  const rests = await Restaurant.find(filter).read('secondaryPreferred');
  res.json(rests);
});

// Admin/Restaurant Add Menu Item
router.post('/:id/menu', async (req, res) => {
  const { item_name, price } = req.body;
  await Restaurant.updateOne(
    { oracle_rest_id: req.params.id },
    { $push: { menu: { item_name, price, is_available: true } } },
    { upsert: true }
  );
  res.json({ success: true });
});

module.exports = router;
"""

dispatch_js = """const express = require('express');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const RiderLocationSchema = new mongoose.Schema({
  rider_id: Number,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  updated_at: { type: Date, default: Date.now }
});
RiderLocationSchema.index({ location: '2dsphere' });
const RiderLocation = mongoose.model('RiderLocation', RiderLocationSchema);

router.post('/location', async (req, res) => {
  const { rider_id, lat, lng } = req.body;
  await RiderLocation.updateOne(
    { rider_id },
    { location: { type: 'Point', coordinates: [lng, lat] }, updated_at: new Date() },
    { upsert: true }
  );
  res.json({ success: true });
});

router.get('/nearby', async (req, res) => {
  const { lat, lng, maxDistance = 5000 } = req.query;
  const riders = await RiderLocation.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(maxDistance)
      }
    }
  });
  res.json(riders);
});

module.exports = router;
"""

analytics_js = """const express = require('express');
const { mongoose } = require('../db/mongo');
const router = express.Router();

router.get('/eta', async (req, res) => {
  // Simplified T5 aggregation pipeline
  const SyncEvent = mongoose.model('SyncEvent');
  const pipeline = [
    { $match: { event_type: 'ORDER_STATUS_CHANGED' } },
    { $group: { _id: "$order_id", statuses: { $push: "$payload" } } }
    // Full T5 aggregation should compute time between PLACED and DELIVERED
  ];
  const stats = await SyncEvent.aggregate(pipeline);
  res.json(stats);
});

module.exports = router;
"""

admin_js = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const { startOutboxSync } = require('../jobs/outboxSync');
const router = express.Router();

router.post('/simulate/bulk-orders', async (req, res) => {
  const count = req.body.count || 10000;
  // Stub for simulation
  res.json({ message: `Simulated ${count} bulk orders` });
});

router.post('/simulate/gps-flood', async (req, res) => {
  const riders = req.body.count || 10;
  res.json({ message: `Simulated ${riders} riders` });
});

router.post('/simulate/sync', async (req, res) => {
  // Trigger sync outside cron
  res.json({ message: 'Sync triggered' });
});

router.post('/simulate/cap', async (req, res) => {
  // Toggle read pref logic in memory or via config
  res.json({ message: 'CAP demo toggled' });
});

module.exports = router;
"""

create_file('backend/routes/catalog.js', catalog_js)
create_file('backend/routes/dispatch.js', dispatch_js)
create_file('backend/routes/analytics.js', analytics_js)
create_file('backend/routes/admin.js', admin_js)

print("Generated remaining backend routes.")
