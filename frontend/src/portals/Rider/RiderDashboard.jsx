import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Zap, Bike, TrendingUp, Truck, Clock, FileClock } from 'lucide-react';

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [stats, setStats] = useState({ total_deliveries: 0, total_earnings: 0 });
  const [loading, setLoading] = useState(true);

  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [user, isOnline]);

  useEffect(() => {
    let geoId;
    
    if (isOnline) {
      geoId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          // Update location in backend
          updateRiderLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      );

      return () => {
        if(geoId) navigator.geolocation.clearWatch(geoId);
      };
    }
  }, [isOnline]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activeRes, requestsRes] = await Promise.all([
        axios.get('http://localhost:5000/rider/dashboard', { headers }),
        axios.get('http://localhost:5000/rider/active-orders', { headers }),
        axios.get('http://localhost:5000/rider/requests', { headers })
      ]);
      
      setStats(statsRes.data.stats || { total_deliveries: 0, total_earnings: 0 });
      setActiveOrders(activeRes.data || []);
      setOrders(requestsRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching rider data:', err);
      setLoading(false);
    }
  };

  const updateRiderLocation = async (lat, lng) => {
    try {
      await axios.post('http://localhost:5000/rider/location/update', { lat, lng }, { headers });
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline ? 'AVAILABLE' : 'OFFLINE';
      await axios.post('http://localhost:5000/rider/status', { status: newStatus }, { headers });
      setIsOnline(!isOnline);
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await axios.post('http://localhost:5000/rider/accept', { order_id: orderId }, { headers });
      fetchDashboardData();
    } catch (err) {
      alert('Failed to accept order: ' + (err.response?.data?.error || err.message));
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.post(`http://localhost:5000/orders/${orderId}/status`, { status: newStatus }, { headers });
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update order status: ' + (err.response?.data?.error || err.message));
    }
  };

  const markPickedUp = async (orderId) => {
    try {
      await axios.post('http://localhost:5000/rider/accept', { order_id: orderId }, { headers });
      fetchDashboardData();
    } catch (err) {
      alert('Failed to mark order as picked up: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="bg-[#fdf7ff] text-gray-900 font-sans min-h-screen overflow-x-hidden">
      <aside className="hidden md:flex flex-col h-full py-6 fixed left-0 h-screen w-[280px] bg-white border-r border-gray-200 z-50">
        <div className="px-6 mb-12">
          <h1 className="text-2xl font-bold text-[#4f378a]">QuickBite</h1>
          <p className="text-xs text-gray-600">Partner Portal</p>
        </div>
        <nav className="flex-1 space-y-2">
          <a className="flex items-center gap-4 text-[#4f378a] font-bold border-l-4 border-[#0077B6] px-4 py-3 bg-white/5 transition-all" href="#">
            <LayoutDashboard className="w-5 h-5"/>
            <span className="text-sm">Dashboard</span>
          </a>
        </nav>
        <div className="px-6 mt-auto">
          <button onClick={() => navigate('/')} className="w-full mb-4 py-3 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5"/>
            Logout
          </button>
          <button onClick={toggleOnlineStatus} className={`w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform ${isOnline ? 'bg-red-600' : 'bg-[#4f378a]'}`}>
            <Zap className="w-5 h-5"/>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </aside>

      <main className="ml-0 md:ml-[280px] pt-16 md:pt-6 pb-24 md:pb-6 px-4 md:px-8 min-h-screen">
        <section className="mb-6">
          <div className={`p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 ${isOnline ? 'shadow-[0_0_20px_rgba(0,119,182,0.4)]' : ''} bg-white backdrop-blur-md border border-gray-200`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{isOnline ? 'Currently Online' : 'Offline'}</h2>
                <p className="text-xs text-gray-600">{isOnline ? 'You are visible to nearby customers' : 'You are currently offline'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 h-[350px] md:h-[500px] relative rounded-3xl overflow-hidden bg-white border border-gray-200 group">
            <div className="absolute inset-0 grayscale opacity-60">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBc8tW8kJcCaKbxIBNMiXJqsS09BiyMmn11BoNDUDmLMAHqqKHFSDfvYf8chCQTEwbMZhI7fyI9lNVID4OmYLlIvik0aTo_HOh7MHBIZadOjlWjnNjac8kNR8_aF_Gm8zBFn7dgWCqi_BjRVYDuRvbSKLOKJ4R5KOvoD3TccswSwVLoFobSbnqFJ0EP6EQxkX-ye2hbxCyrwz74gZsymspaIi6jJb2rpUqL5DN97noxmSZmLqm0eWjLciAqK0bLKq9PmXxPmYHyMI" alt="Map" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-12 h-12 bg-[#0077B6] rounded-full border-4 border-white flex items-center justify-center shadow-2xl animate-pulse">
                <Bike className="w-6 h-6 text-gray-900"/>
              </div>
              <div className="mt-2 bg-white px-2 py-1 rounded text-[10px] font-bold text-black uppercase tracking-widest shadow-lg">You</div>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl flex-1 flex flex-col justify-between border border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-gray-600 text-sm">Today's Earnings</h3>
                <TrendingUp className="w-6 h-6 text-emerald-400"/>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-gray-900 leading-none">Rs. {stats.total_earnings?.toFixed(0) || 0}</p>
                <p className="text-xs text-emerald-400 mt-1">Based on completed deliveries</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-white p-4 rounded-3xl flex flex-col justify-between border border-gray-200">
                <Truck className="w-6 h-6 text-[#0077B6]"/>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_deliveries || 0}</p>
                  <p className="text-xs text-gray-600">Deliveries</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl flex flex-col justify-between border border-gray-200">
                <Clock className="w-6 h-6 text-[#0077B6]"/>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
                  <p className="text-xs text-gray-600">Active Orders</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xl font-bold text-gray-900">Live Delivery Requests</h3>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="p-6 text-center text-gray-600 bg-white rounded-2xl border border-gray-200">
                  Loading requests...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-6 text-center text-gray-600 bg-white rounded-2xl border border-gray-200">
                  No active requests. Waiting for dispatch...
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.ORDER_ID} className="bg-white p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <FileClock className="w-6 h-6 text-amber-500"/>
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold">Order #{order.ORDER_ID}</p>
                        <p className="text-xs text-gray-600">Rs. {order.TOTAL_AMOUNT} • {order.DELIVERY_ADDRESS || 'Delivery'}</p>
                      </div>
                    </div>
                    <div className="text-right mt-4 md:mt-0 flex gap-2">
                      <button 
                        onClick={() => acceptOrder(order.ORDER_ID)}
                        className="bg-emerald-600 px-6 py-2 rounded-lg text-white font-bold hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-12 mt-8">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xl font-bold text-gray-900">Active Deliveries</h3>
            </div>
            <div className="space-y-4">
              {activeOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-600 bg-white rounded-2xl border border-gray-200">
                  No active deliveries
                </div>
              ) : (
                activeOrders.map((order) => (
                  <div key={order.ORDER_ID} className="bg-white p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-blue-500"/>
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold">Order #{order.ORDER_ID}</p>
                        <p className="text-xs text-gray-600">Status: {order.STATUS}</p>
                        <p className="text-xs text-gray-600">Rs. {order.TOTAL_AMOUNT} • {order.DELIVERY_ADDRESS || 'Delivery'}</p>
                      </div>
                    </div>
                    <div className="text-right mt-4 md:mt-0 flex gap-2">
                      {order.STATUS === 'READY_FOR_PICKUP' && (
                        <button 
                          onClick={() => markPickedUp(order.ORDER_ID)}
                          className="bg-blue-600 px-6 py-2 rounded-lg text-white font-bold hover:bg-blue-700"
                        >
                          Mark Picked Up
                        </button>
                      )}
                      {order.STATUS === 'PICKED_UP' && (
                        <button 
                          onClick={() => updateOrderStatus(order.ORDER_ID, 'DELIVERED')}
                          className="bg-green-600 px-6 py-2 rounded-lg text-white font-bold hover:bg-green-700"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
