import os

# Create backend routes for chat
chat_route = """const express = require('express');
const { connectMongo, mongoose } = require('../db/mongo');

module.exports = function(io) {
  const router = express.Router();

  router.post('/message', async (req, res) => {
    const { order_id, sender_id, sender_role, message } = req.body;
    try {
      const db = mongoose.connection.db;
      await db.collection('chats').insertOne({
        order_id, sender_id, sender_role, message, timestamp: new Date()
      });
      io.to(`order_${order_id}`).emit('new_message', { order_id, sender_id, sender_role, message, timestamp: new Date() });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:order_id', async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const chats = await db.collection('chats').find({ order_id: req.params.order_id }).sort({ timestamp: 1 }).toArray();
      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
"""
os.makedirs('backend/routes', exist_ok=True)
with open('backend/routes/chat.js', 'w') as f:
    f.write(chat_route)

print("Created backend routes.")
