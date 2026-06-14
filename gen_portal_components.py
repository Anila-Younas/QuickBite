import os

components = {
    'Customer/CustomerHome.jsx': """import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';

export default function CustomerHome() {
  const [restaurants, setRestaurants] = useState([]);
  
  useEffect(() => {
    axios.get('http://localhost:5000/catalog').then(res => setRestaurants(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-7xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Delivery in Pakistan 🇵🇰</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {restaurants.map(r => (
            <Link to={`/customer/restaurant/${r.oracle_rest_id}`} key={r.oracle_rest_id} className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold">{r.name}</h2>
              <p className="text-gray-500">{r.city_zone}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}""",

    'Customer/RestaurantMenu.jsx': """import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:5000/catalog/${id}`).then(res => setRestaurant(res.data));
  }, [id]);

  const addToCart = (item) => setCart([...cart, item]);
  
  const placeOrder = async () => {
    try {
      const res = await axios.post('http://localhost:5000/orders', {
        restaurant_id: id,
        items: cart.map(i => ({ name: i.name, quantity: 1, price: i.price })),
        total_amount: cart.reduce((sum, i) => sum + i.price, 0),
        delivery_address: '123 Test St, Mianwali'
      });
      navigate(`/customer/tracking/${res.data.order_id}`);
    } catch (err) {
      alert('Order failed');
    }
  };

  if (!restaurant) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-7xl mx-auto px-8 py-12 flex gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-8">{restaurant.name} Menu</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurant.menu?.map((m, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{m.name}</h3>
                  <p className="text-gray-500">Rs. {m.price}</p>
                </div>
                <button onClick={() => addToCart(m)} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold">+</button>
              </div>
            ))}
          </div>
        </div>
        <div className="w-80 bg-white p-6 rounded-2xl shadow-sm h-fit">
          <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
          {cart.map((c, i) => <div key={i} className="mb-2 flex justify-between"><span>{c.name}</span><span>Rs. {c.price}</span></div>)}
          <div className="border-t pt-4 mt-4 font-bold flex justify-between">
            <span>Total</span><span>Rs. {cart.reduce((s, i) => s + i.price, 0)}</span>
          </div>
          <button onClick={placeOrder} disabled={cart.length===0} className="w-full bg-red-600 text-white py-3 rounded-xl mt-6 font-bold disabled:opacity-50">Place Order</button>
        </div>
      </main>
    </div>
  );
}""",

    'Customer/OrderTracking.jsx': """import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import Map from '../../components/Map';
import { io } from 'socket.io-client';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  
  useEffect(() => {
    axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data));
  }, [id]);

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-6xl mx-auto px-8 py-12 flex gap-8">
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm">
          <h1 className="text-3xl font-bold mb-4">Order #{id}</h1>
          <h2 className="text-2xl text-red-600 font-bold">{order?.STATUS || 'PLACED'}</h2>
        </div>
        <div className="w-[450px] h-[500px] bg-gray-200 rounded-2xl overflow-hidden">
           <Map />
        </div>
      </main>
    </div>
  );
}""",

    'Customer/OrderHistory.jsx': 'export default function OrderHistory() { return <div>History</div>; }',

    'Restaurant/RestaurantDashboard.jsx': """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    // Need a specific API to fetch orders by restaurant
    axios.get('http://localhost:5000/orders').then(res => setOrders(res.data));
  }, []);

  const updateStatus = async (id, status) => {
    await axios.put(`http://localhost:5000/orders/${id}/status`, { status });
    setOrders(orders.map(o => o.ORDER_ID === id ? { ...o, STATUS: status } : o));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Restaurant Dashboard</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.map(o => (
          <div key={o.ORDER_ID} className="p-4 border-b flex justify-between items-center">
            <div>
              <p className="font-bold">Order #{o.ORDER_ID}</p>
              <p className="text-sm text-gray-500">Total: Rs. {o.TOTAL_AMOUNT}</p>
              <p className="text-sm text-red-600 font-bold">{o.STATUS}</p>
            </div>
            <div className="flex gap-2">
               {o.STATUS === 'PLACED' && <button onClick={() => updateStatus(o.ORDER_ID, 'CONFIRMED')} className="bg-blue-600 text-white px-4 py-2 rounded">Accept</button>}
               {o.STATUS === 'CONFIRMED' && <button onClick={() => updateStatus(o.ORDER_ID, 'PREPARING')} className="bg-yellow-500 text-white px-4 py-2 rounded">Preparing</button>}
               {o.STATUS === 'PREPARING' && <button onClick={() => updateStatus(o.ORDER_ID, 'PICKED_UP')} className="bg-green-600 text-white px-4 py-2 rounded">Ready for Pickup</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}""",

    'Restaurant/MenuManagement.jsx': 'export default function MenuManagement() { return <div>Menu</div>; }',
    'Restaurant/Earnings.jsx': 'export default function Earnings() { return <div>Earnings</div>; }',

    'Rider/RiderDashboard.jsx': """import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function RiderDashboard() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Should fetch only ready orders
    axios.get('http://localhost:5000/orders').then(res => setOrders(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Available Deliveries</h1>
      <div className="grid gap-4">
        {orders.filter(o => o.STATUS === 'PICKED_UP' || o.STATUS === 'PREPARING').map(o => (
          <div key={o.ORDER_ID} className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
             <div>
               <p className="font-bold">Order #{o.ORDER_ID}</p>
               <p>Delivery: {o.DELIVERY_ADDRESS}</p>
             </div>
             <button onClick={() => navigate(`/rider/delivery/${o.ORDER_ID}`)} className="bg-black text-white px-6 py-3 rounded-xl">View Route</button>
          </div>
        ))}
      </div>
    </div>
  );
}""",

    'Rider/ActiveDelivery.jsx': """import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Map from '../../components/Map';

export default function ActiveDelivery() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data));
  }, [id]);

  const markDelivered = async () => {
    await axios.put(`http://localhost:5000/orders/${id}/status`, { status: 'DELIVERED' });
    setOrder({ ...order, STATUS: 'DELIVERED' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex gap-8">
       <div className="flex-1 space-y-6">
         <h1 className="text-3xl font-bold">Active Delivery #{id}</h1>
         <div className="bg-white p-6 rounded-xl shadow-sm">
           <h2 className="text-xl font-bold text-red-600 mb-4">{order?.STATUS}</h2>
           {order?.STATUS !== 'DELIVERED' && <button onClick={markDelivered} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg">Mark as Delivered</button>}
         </div>
       </div>
       <div className="w-[450px] h-[500px] bg-gray-200 rounded-2xl overflow-hidden">
         <Map />
       </div>
    </div>
  );
}""",

    'Admin/AdminDashboard.jsx': """import React from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const triggerSync = () => axios.post('http://localhost:5000/admin/simulate/sync').then(res => alert(res.data.message));
  const triggerBulk = () => axios.post('http://localhost:5000/admin/simulate/bulk-orders').then(res => alert(res.data.message));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Operations</h1>
      <div className="grid grid-cols-2 gap-6">
        <button onClick={triggerSync} className="bg-purple-600 text-white p-8 rounded-2xl font-bold text-xl hover:bg-purple-700">Trigger Outbox Sync (T6)</button>
        <button onClick={triggerBulk} className="bg-red-600 text-white p-8 rounded-2xl font-bold text-xl hover:bg-red-700">Run 10k Orders (T1)</button>
      </div>
    </div>
  );
}""",

    'Admin/Approvals.jsx': 'export default function Approvals() { return <div>Approvals</div>; }',
    'Admin/OutboxMonitor.jsx': 'export default function OutboxMonitor() { return <div>OutboxMonitor</div>; }',
    'Admin/AuditLog.jsx': 'export default function AuditLog() { return <div>AuditLog</div>; }',
}

for path, content in components.items():
    with open(f'frontend/src/portals/{path}', 'w', encoding='utf-8') as f:
        f.write(content)

print("Generated portal components.")
