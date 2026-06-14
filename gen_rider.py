import os

rider_routes = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

// Middleware to extract rider ID from JWT (simulated for now using headers/body if no actual middleware is strictly attached yet)
// Since we have a bypass, we'll expect user_id in headers or query
const getUserId = (req) => req.headers['x-user-id'] || 4; // Default to Rider Hamza

router.get('/dashboard', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        COUNT(*) as total_deliveries,
        NVL(SUM(total_amount * 0.1), 0) as total_earnings
      FROM ORDERS WHERE rider_id = :1 AND status = 'DELIVERED'
    `, [riderId]);

    const db = mongoose.connection.db;
    const location = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(riderId) });

    res.json({
      stats: result.rows[0],
      status: location ? location.status : 'OFFLINE'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/status', async (req, res) => {
  const riderId = getUserId(req);
  const { status, lat, lng } = req.body;
  
  try {
    const db = mongoose.connection.db;
    await db.collection('riderlocations').updateOne(
      { oracle_rider_id: parseInt(riderId) },
      { 
        $set: { 
          status, 
          location: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : undefined,
          last_updated: new Date()
        } 
      },
      { upsert: true }
    );
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/location/update', async (req, res) => {
  const riderId = getUserId(req);
  const { lat, lng } = req.body;
  
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active-orders', async (req, res) => {
  const riderId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT * FROM ORDERS 
      WHERE rider_id = :1 AND status IN ('CONFIRMED', 'PREPARING', 'PICKED_UP')
    `, [riderId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/requests', async (req, res) => {
  // To simulate the dispatch queue, we look for orders with no rider_id and status='PLACED' or 'CONFIRMED'
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT * FROM ORDERS 
      WHERE rider_id IS NULL AND status IN ('PLACED', 'CONFIRMED')
      FETCH FIRST 5 ROWS ONLY
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/accept', async (req, res) => {
  const riderId = getUserId(req);
  const { order_id } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(`
      UPDATE ORDERS SET rider_id = :1 WHERE order_id = :2 AND rider_id IS NULL
    `, [riderId, order_id], { autoCommit: true });
    
    // Also trigger State Machine if needed, or just let it be.
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
"""

rider_dashboard = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

export default function RiderDashboard() {
  const [data, setData] = useState({ stats: {}, status: 'OFFLINE' });
  const [requests, setRequests] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const headers = { 'x-user-id': user?.id };

  const fetchDashboard = () => {
    axios.get('http://localhost:5000/rider/dashboard', { headers }).then(res => setData(res.data));
    axios.get('http://localhost:5000/rider/active-orders', { headers }).then(res => setActiveOrders(res.data));
    axios.get('http://localhost:5000/rider/requests', { headers }).then(res => setRequests(res.data));
  };

  useEffect(() => {
    fetchDashboard();
    
    // Simulate live GPS tracking every 10s if online
    const locInterval = setInterval(() => {
      if (data.status === 'AVAILABLE') {
        navigator.geolocation.getCurrentPosition(pos => {
          axios.post('http://localhost:5000/rider/location/update', {
            lat: pos.coords.latitude, lng: pos.coords.longitude
          }, { headers });
        });
      }
    }, 10000);

    const socket = io('http://localhost:5000');
    socket.on('new_delivery_request', () => {
      fetchDashboard();
    });

    return () => { clearInterval(locInterval); socket.close(); }
  }, [data.status]);

  const toggleStatus = async () => {
    const newStatus = data.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    // Get location first
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await axios.post('http://localhost:5000/rider/status', {
        status: newStatus,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }, { headers });
      fetchDashboard();
    }, async () => {
      // Fallback without GPS
      await axios.post('http://localhost:5000/rider/status', { status: newStatus }, { headers });
      fetchDashboard();
    });
  };

  const acceptOrder = async (orderId) => {
    await axios.post('http://localhost:5000/rider/accept', { order_id: orderId }, { headers });
    fetchDashboard();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Rider Zone</h1>
        <button 
          onClick={toggleStatus}
          className={`px-8 py-3 rounded-full font-bold text-white transition-colors ${data.status === 'AVAILABLE' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
        >
          {data.status === 'AVAILABLE' ? '🟢 ONLINE' : '⚫ OFFLINE'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <p className="text-gray-500">Total Earnings</p>
          <h2 className="text-3xl font-bold text-gray-900">Rs. {data.stats?.TOTAL_EARNINGS || 0}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <p className="text-gray-500">Deliveries</p>
          <h2 className="text-3xl font-bold text-gray-900">{data.stats?.TOTAL_DELIVERIES || 0}</h2>
        </div>
      </div>

      {data.status === 'AVAILABLE' && requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-red-600 animate-pulse">🔔 Incoming Requests!</h2>
          <div className="grid gap-4">
            {requests.map(req => (
              <div key={req.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-lg border-2 border-red-200">
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="font-bold text-lg">Order #{req.ORDER_ID}</p>
                    <p className="text-gray-500">{req.DELIVERY_ADDRESS}</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">Rs. {(req.TOTAL_AMOUNT * 0.1).toFixed(0)}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => acceptOrder(req.ORDER_ID)} className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800">ACCEPT</button>
                  <button className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300">DECLINE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Active Deliveries</h2>
        <div className="grid gap-4">
          {activeOrders.map(o => (
            <div key={o.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center border border-blue-100 border-l-4 border-l-blue-500">
              <div>
                <p className="font-bold text-lg">Order #{o.ORDER_ID}</p>
                <p className="text-gray-500 text-sm">Status: {o.STATUS}</p>
              </div>
              <button onClick={() => navigate(`/rider/delivery/${o.ORDER_ID}`)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700">Open Map</button>
            </div>
          ))}
          {activeOrders.length === 0 && <p className="text-gray-500">No active deliveries.</p>}
        </div>
      </div>
    </div>
  );
}
"""

os.makedirs('backend/routes', exist_ok=True)
with open('backend/routes/rider.js', 'w') as f:
    f.write(rider_routes)

os.makedirs('frontend/src/portals/Rider', exist_ok=True)
with open('frontend/src/portals/Rider/RiderDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(rider_dashboard)

print("Rider backend and frontend completed.")
