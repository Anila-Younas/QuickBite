require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { connectMongo } = require('./db/mongo');
const { startOutboxSync } = require('./jobs/outboxSync');
const { initMonitoring, checkDataConsistency, logError } = require('./utils/monitoring');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});
app.set('io', io);

app.use(cors());
// Increase body parser limits significantly
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Error logging middleware
app.use((err, req, res, next) => {
  logError(err, 'error', {
    endpoint: req.path,
    method: req.method,
    user_id: req.headers['x-user-id'],
    restaurant_id: req.headers['x-restaurant-id']
  });
  res.status(err.statusCode || 500).json({ error: 'Internal server error' });
});

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
  console.log('[Socket] New user connected:', socket.id);
  
  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`[Socket] User ${socket.id} joined order room ${orderId}`);
    const room = io.sockets.adapter.rooms.get(`order_${orderId}`);
    console.log(`[Socket] Room order_${orderId} now has ${room ? room.size : 0} clients`);
  });

  socket.on('join_customer_room', (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`[Socket] User joined customer room ${customerId}`);
  });

  socket.on('join_restaurant_room', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`[Socket] User joined restaurant room ${restaurantId}`);
  });

  socket.on('chat_message', (data) => {
    console.log('[Socket] Received chat_message event:', data);
    // broadcast to everyone in the room (including sender?)
    io.to(`order_${data.order_id}`).emit('new_chat_message', data);
    console.log(`[Socket] Emitted new_chat_message to order_${data.order_id}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await connectMongo();
    console.log('MongoDB connected successfully');
    
    // Initialize monitoring
    await initMonitoring();
    console.log('Monitoring initialized');
    
    // Start outbox sync
    startOutboxSync(io);
    
    // Set up periodic consistency checks (every 15 minutes)
    const CONSISTENCY_CHECK_INTERVAL = 15 * 60 * 1000; // 15 mins
    setInterval(checkDataConsistency, CONSISTENCY_CHECK_INTERVAL);
    console.log('Consistency check scheduled every 15 minutes');
    
    // Run initial consistency check
    setTimeout(checkDataConsistency, 5000); // Wait 5 seconds to start
    
  } catch (err) {
    logError(err, 'critical', { context: 'server_startup' });
    console.error('Startup Error:', err);
  }
});

module.exports = { app, io };
