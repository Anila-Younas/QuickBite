const express = require('express');
const { mongoose } = require('../db/mongo');
const router = express.Router();

const RiderLocationSchema = new mongoose.Schema({
  oracle_rider_id: Number,
  status: { type: String, default: 'AVAILABLE' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  last_updated: { type: Date, default: Date.now }
});
RiderLocationSchema.index({ location: '2dsphere' });
const RiderLocation = mongoose.model('RiderLocation', RiderLocationSchema);

router.post('/location', async (req, res) => {
  const { rider_id, lat, lng, status } = req.body;
  await RiderLocation.updateOne(
    { oracle_rider_id: rider_id },
    { 
      location: { type: 'Point', coordinates: [lng, lat] }, 
      last_updated: new Date(),
      status: status || 'AVAILABLE'
    },
    { upsert: true }
  );
  res.json({ success: true });
});

router.get('/nearby', async (req, res) => {
  const { lat, lng, maxDistance = 5000, status = 'AVAILABLE' } = req.query;
  const riders = await RiderLocation.find({
    status: status,
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
