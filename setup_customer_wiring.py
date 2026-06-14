import os

# Update Rider Location to Emit Socket
rider_location_update = """
router.post('/location/update', async (req, res) => {
  const riderId = getUserId(req);
  const { lat, lng, active_order_id } = req.body;
  
  try {
    const db = mongoose.connection.db;
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: parseInt(riderId) },
      { 
        $set: { 
          location: { type: 'Point', coordinates: [lng, lat] },
          last_updated: new Date()
        } 
      }
    );
    
    // Broadcast location to the customer's order tracking room
    if (active_order_id) {
       const io = req.app.get('io');
       if (io) io.to(`order_${active_order_id}`).emit('rider_location_update', { lat, lng });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
"""

# Insert customer route into index.js
index_js_update = """
const customerRoutes = require('./routes/customer');
app.use('/customer', customerRoutes);

// Save IO to app so routes can access it
app.set('io', io);
"""

# We'll use multi_replace to safely inject these without breaking everything.
