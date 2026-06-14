const express = require('express');
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
