const express = require('express');
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
