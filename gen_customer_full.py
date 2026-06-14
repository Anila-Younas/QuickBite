import os

customer_backend = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

// Mock auth extraction
const getUserId = (req) => req.headers['x-user-id'] || 2; // Default to Customer Ali

// GET /customer/profile
router.get('/profile', async (req, res) => {
  const customerId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT user_id, full_name, email, phone FROM USERS WHERE user_id = :1`, [customerId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET /customer/orders (Order History)
router.get('/orders', async (req, res) => {
  const customerId = getUserId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, r.name as restaurant_name 
      FROM ORDERS o 
      JOIN RESTAURANTS r ON o.restaurant_id = r.restaurant_id 
      WHERE o.customer_id = :1 
      ORDER BY o.created_at DESC
    `, [customerId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// POST /customer/order/create
router.post('/order/create', async (req, res) => {
  const customerId = getUserId(req);
  const { restaurant_id, items, total_amount, delivery_address } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      INSERT INTO ORDERS (customer_id, restaurant_id, total_amount, delivery_address, status) 
      VALUES (:1, :2, :3, :4, 'PLACED') RETURNING order_id INTO :5
    `, [customerId, restaurant_id, total_amount, delivery_address, { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }], { autoCommit: true });
    
    const orderId = result.outBinds[0][0];

    // Fire socket event for Dispatch system (riders listening)
    const io = req.app.get('io');
    if (io) {
      io.emit('new_delivery_request', { order_id: orderId, delivery_address, total_amount });
    }

    res.json({ success: true, order_id: orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
"""

customer_tracking_ui = """import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import Map from '../../components/Map';
import { io } from 'socket.io-client';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchOrder = () => axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data));
    fetchOrder();

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join_order_room', id);

    newSocket.on('order_update', (data) => {
      if (data.order_id === parseInt(id)) {
        setOrder(prev => ({ ...prev, STATUS: data.new_status }));
      }
    });

    newSocket.on('rider_location_update', (data) => {
      setRiderLocation([data.lat, data.lng]);
    });

    // Auto-poll if socket fails
    const int = setInterval(fetchOrder, 10000);

    return () => { newSocket.close(); clearInterval(int); }
  }, [id]);

  const mapMarkers = [
    { position: [32.5837, 71.5241], label: 'You (Dropoff)' }
  ];
  if (riderLocation) {
    mapMarkers.push({ position: riderLocation, label: 'Rider' });
  }

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-6xl mx-auto px-8 py-12 flex flex-col md:flex-row gap-8">
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm border-2 border-red-100">
          <h1 className="text-3xl font-bold mb-2">Live Order #{id}</h1>
          <h2 className="text-2xl text-red-600 font-bold animate-pulse mb-8">{order?.STATUS || 'TRACKING...'}</h2>
          
          <div className="space-y-6">
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PLACED', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'DELIVERED'].includes(order?.STATUS) ? 'bg-red-600' : 'bg-gray-300'}`}>1</div>
                <p className="font-bold">Order Placed & Confirmed</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PREPARING', 'PICKED_UP', 'DELIVERED'].includes(order?.STATUS) ? 'bg-red-600' : 'bg-gray-300'}`}>2</div>
                <p className="font-bold">Restaurant is Preparing</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PICKED_UP', 'DELIVERED'].includes(order?.STATUS) ? 'bg-red-600' : 'bg-gray-300'}`}>3</div>
                <p className="font-bold">Rider Picked Up</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['DELIVERED'].includes(order?.STATUS) ? 'bg-red-600' : 'bg-gray-300'}`}>4</div>
                <p className="font-bold">Delivered</p>
             </div>
          </div>
        </div>

        <div className="w-full md:w-[500px] h-[600px] bg-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
           <Map center={riderLocation || [32.5837, 71.5241]} markers={mapMarkers} zoom={15} />
        </div>
      </main>
    </div>
  );
}
"""

with open('backend/routes/customer.js', 'w', encoding='utf-8') as f:
    f.write(customer_backend)

with open('frontend/src/portals/Customer/OrderTracking.jsx', 'w', encoding='utf-8') as f:
    f.write(customer_tracking_ui)

print("Customer APIs and Tracking UI updated.")
