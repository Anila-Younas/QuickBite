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
      console.log(`[Chat] Fetching messages for order ${req.params.orderId}`);
      const messages = await Chat.find({ order_id: parseInt(req.params.orderId) }).sort({ timestamp: 1 });
      console.log(`[Chat] Found ${messages.length} messages`);
      res.json(messages);
    } catch(err) {
      console.error('[Chat] Error fetching messages:', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:orderId', async (req, res) => {
    try {
      const { sender_role, message } = req.body;
      const order_id = parseInt(req.params.orderId);
      
      if (!sender_role || !message) {
        return res.status(400).json({ error: 'sender_role and message are required' });
      }
      
      const msg = await Chat.create({ order_id, sender_role, message });
      console.log(`[Chat] Message saved for order ${order_id} from ${sender_role}:`, message);
      
      if (io) {
        // Emit to all users in the order room
        const roomName = `order_${order_id}`;
        io.to(roomName).emit('new_chat_message', msg);
        const roomSockets = io.sockets.adapter.rooms.get(roomName);
        console.log(`[Chat] Emitted new_chat_message to ${roomName}, room has ${roomSockets ? roomSockets.size : 0} connected clients`);
      } else {
        console.error('[Chat] io is undefined');
      }
      res.json(msg);
    } catch(err) {
      console.error('[Chat] Error saving message:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
