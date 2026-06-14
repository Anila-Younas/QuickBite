const express = require('express');
const { mongoose } = require('../db/mongo');

const ChatSchema = new mongoose.Schema({
  order_id: Number,
  sender_role: String, // 'CUSTOMER' or 'RIDER'
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

module.exports = function(io) {
  const router = express.Router();
  
  router.get('/:orderId', async (req, res) => {
    try {
      const messages = await Chat.find({ order_id: req.params.orderId }).sort({ timestamp: 1 });
      res.json(messages);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:orderId', async (req, res) => {
    try {
      const { sender_role, message } = req.body;
      const order_id = req.params.orderId;
      const msg = await Chat.create({ order_id, sender_role, message });
      
      if (io) {
        io.to(`order_${order_id}`).emit('new_chat_message', msg);
      }
      res.json(msg);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
