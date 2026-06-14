require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./db/mongo');
const { startOutboxSync } = require('./jobs/outboxSync');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT'] }
});
app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/orders', require('./routes/orders'));
app.use('/dispatch', require('./routes/dispatch'));
app.use('/catalog', require('./routes/catalog'));
app.use('/analytics', require('./routes/analytics'));
app.use('/admin', require('./routes/admin'));
app.use('/rider', require('./routes/rider'));
app.use('/restaurant', require('./routes/restaurant'));
app.use('/customer', require('./routes/customer'));
app.use('/chat', require('./routes/chat')(io));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`User joined order room ${orderId}`);
  });

  socket.on('join_customer_room', (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`User joined customer room ${customerId}`);
  });

  socket.on('join_restaurant_room', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`User joined restaurant room ${restaurantId}`);
  });

  socket.on('chat_message', (data) => {
    // broadcast to everyone else in the room
    socket.to(`order_${data.order_id}`).emit('chat_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await connectMongo();
    console.log('MongoDB connected successfully');
    startOutboxSync();
  } catch (err) {
    console.error('Startup Error:', err);
  }
});

module.exports = { app, io };
