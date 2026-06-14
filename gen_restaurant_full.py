import os

restaurant_backend = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

const getUserId = (req) => req.headers['x-user-id'] || 6; // Default to Namal Cafe Owner
const getRestaurantId = (req) => req.headers['x-restaurant-id'] || 1; // Default to Namal Cafe oracle_rest_id

router.get('/dashboard', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        COUNT(*) as total_orders,
        NVL(SUM(total_amount * 0.9), 0) as total_earnings,
        COUNT(CASE WHEN status IN ('PLACED', 'CONFIRMED', 'PREPARING') THEN 1 END) as active_orders
      FROM ORDERS WHERE restaurant_id = :1 AND TRUNC(created_at) = TRUNC(SYSDATE)
    `, [restId]);
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/orders', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, u.full_name as customer_name
      FROM ORDERS o
      JOIN USERS u ON o.customer_id = u.user_id
      WHERE o.restaurant_id = :1 AND o.status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP')
      ORDER BY o.created_at DESC
    `, [restId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.put('/order/status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    // Validate that order belongs to restaurant
    const verify = await conn.execute(`SELECT status FROM ORDERS WHERE order_id = :1 AND restaurant_id = :2`, [id, restId]);
    if (verify.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });
    
    await conn.execute(`UPDATE ORDERS SET status = :1 WHERE order_id = :2`, [status, id], { autoCommit: true });
    
    // Broadcast status to the order room (for customer)
    const io = req.app.get('io');
    if (io) io.to(`order_${id}`).emit('order_update', { order_id: id, new_status: status });
    
    // If READY_FOR_PICKUP, we could dispatch rider logic here or just let riders poll for CONFIRMED/PREPARING/READY
    
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/menu', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_rest_id: restId });
    res.json(rest ? rest.menu : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu/item', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const item = req.body; // { name, price, category, available }
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_rest_id: restId },
      { $push: { menu: item } }
    );
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/item/:name', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { name } = req.params;
  const { available } = req.body;
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_rest_id: restId, "menu.name": name },
      { $set: { "menu.$.available": available } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
"""

restaurant_dashboard = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const headers = { 'x-user-id': user?.id, 'x-restaurant-id': 1 }; // Default to 1 for demo purposes if ID map missing

  const fetchData = () => {
    axios.get('http://localhost:5000/restaurant/dashboard', { headers }).then(res => setStats(res.data));
    axios.get('http://localhost:5000/restaurant/orders', { headers }).then(res => setOrders(res.data));
  };

  useEffect(() => {
    fetchData();
    const socket = io('http://localhost:5000');
    // Listen for new orders targeted at this restaurant room or global broadcast
    socket.on('new_delivery_request', () => {
      // In a real app, verify restaurant ID
      fetchData();
    });
    return () => socket.close();
  }, []);

  const updateStatus = async (id, status) => {
    await axios.put(`http://localhost:5000/restaurant/order/status/${id}`, { status }, { headers });
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Restaurant Operations Panel</h1>
        <button className="bg-green-600 text-white px-6 py-2 rounded-full font-bold">🟢 OPEN FOR ORDERS</button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-bold uppercase text-xs">Today's Orders</p>
          <h2 className="text-4xl font-bold mt-2">{stats.TOTAL_ORDERS || 0}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-bold uppercase text-xs">Active Prep</p>
          <h2 className="text-4xl font-bold mt-2 text-red-600">{stats.ACTIVE_ORDERS || 0}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-bold uppercase text-xs">Net Revenue (PKR)</p>
          <h2 className="text-4xl font-bold mt-2 text-green-600">Rs. {stats.TOTAL_EARNINGS || 0}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">Live Order Queue</h2>
          <span className="text-sm font-bold text-gray-500">Auto-sync active via WebSockets</span>
        </div>
        <div className="p-0">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-bold text-gray-600">ID</th>
                <th className="p-4 font-bold text-gray-600">Customer</th>
                <th className="p-4 font-bold text-gray-600">Status</th>
                <th className="p-4 font-bold text-gray-600">Total (PKR)</th>
                <th className="p-4 font-bold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.ORDER_ID} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-bold">#{o.ORDER_ID}</td>
                  <td className="p-4">{o.CUSTOMER_NAME}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.STATUS === 'PLACED' ? 'bg-yellow-100 text-yellow-700' : o.STATUS === 'PREPARING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {o.STATUS}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-900">Rs. {o.TOTAL_AMOUNT}</td>
                  <td className="p-4 text-right space-x-2">
                    {o.STATUS === 'PLACED' && (
                      <button onClick={() => updateStatus(o.ORDER_ID, 'CONFIRMED')} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">Accept Order</button>
                    )}
                    {o.STATUS === 'CONFIRMED' && (
                      <button onClick={() => updateStatus(o.ORDER_ID, 'PREPARING')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Start Cooking</button>
                    )}
                    {o.STATUS === 'PREPARING' && (
                      <button onClick={() => updateStatus(o.ORDER_ID, 'READY_FOR_PICKUP')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold animate-pulse">Mark Ready</button>
                    )}
                    {o.STATUS === 'READY_FOR_PICKUP' && (
                      <span className="text-gray-400 text-sm italic font-medium">Waiting for Rider...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"""

menu_management = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function MenuManagement() {
  const [menu, setMenu] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Main', available: true });
  const { user } = useAuth();
  const headers = { 'x-user-id': user?.id, 'x-restaurant-id': 1 };

  const fetchMenu = () => axios.get('http://localhost:5000/restaurant/menu', { headers }).then(res => setMenu(res.data));
  useEffect(() => { fetchMenu(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/restaurant/menu/item', newItem, { headers });
    setNewItem({ name: '', price: '', category: 'Main', available: true });
    fetchMenu();
  };

  const toggleStatus = async (name, currentStatus) => {
    await axios.put(`http://localhost:5000/restaurant/menu/item/${name}`, { available: !currentStatus }, { headers });
    fetchMenu();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Menu Management</h1>
      <div className="flex gap-8">
        <div className="w-1/3 bg-white p-6 rounded-2xl shadow-sm h-fit">
          <h2 className="text-xl font-bold mb-4">Add Menu Item</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" placeholder="Item Name (e.g. Zinger Burger)" required className="w-full border p-3 rounded-lg" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})}/>
            <input type="number" placeholder="Price in PKR" required className="w-full border p-3 rounded-lg" value={newItem.price} onChange={e=>setNewItem({...newItem, price: Number(e.target.value)})}/>
            <select className="w-full border p-3 rounded-lg" value={newItem.category} onChange={e=>setNewItem({...newItem, category: e.target.value})}>
               <option>Main</option><option>Sides</option><option>Drinks</option><option>Dessert</option>
            </select>
            <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700">Save Item</button>
          </form>
        </div>

        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">Live Menu Status</h2>
          <div className="grid gap-4">
            {menu.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-4 border rounded-xl">
                <div>
                  <h3 className="font-bold text-lg">{m.name}</h3>
                  <p className="text-gray-500">Rs. {m.price} • {m.category}</p>
                </div>
                <button 
                  onClick={() => toggleStatus(m.name, m.available)}
                  className={`px-4 py-2 font-bold rounded-lg ${m.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {m.available ? 'IN STOCK' : 'SOLD OUT'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
"""

os.makedirs('backend/routes', exist_ok=True)
with open('backend/routes/restaurant.js', 'w', encoding='utf-8') as f:
    f.write(restaurant_backend)

os.makedirs('frontend/src/portals/Restaurant', exist_ok=True)
with open('frontend/src/portals/Restaurant/RestaurantDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(restaurant_dashboard)

with open('frontend/src/portals/Restaurant/MenuManagement.jsx', 'w', encoding='utf-8') as f:
    f.write(menu_management)

print("Restaurant Backend and Frontend written.")
