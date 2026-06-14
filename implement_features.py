import os
import subprocess

def run_cmd(cmd, cwd=None):
    subprocess.run(cmd, shell=True, cwd=cwd)

# 1. Install Backend Dependencies
print("Installing Backend Dependencies...")
run_cmd("npm install socket.io axios", cwd="backend")

# 2. Install Frontend Dependencies
print("Installing Frontend Dependencies...")
run_cmd("npm install socket.io-client leaflet react-leaflet", cwd="frontend")

# 3. Update Backend index.js for Socket.io
backend_index = """require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./db/mongo');
const { startJobs } = require('./jobs/outboxSync');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/orders', require('./routes/orders'));
app.use('/dispatch', require('./routes/dispatch'));
app.use('/catalog', require('./routes/catalog'));
app.use('/analytics', require('./routes/analytics'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat')(io));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_order_room', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`User joined order room ${orderId}`);
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
    startJobs();
  } catch (err) {
    console.error('Startup Error:', err);
  }
});
"""
with open("backend/index.js", "w") as f:
    f.write(backend_index)

print("Setup Complete")
