import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Users, Bike, Store, ShoppingBag, MapPin, AlertTriangle, RefreshCw, Server, PlusCircle, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [metrics, setMetrics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  
  // New Restaurant State
  const [newRest, setNewRest] = useState({ name: '', owner_name: '', email: '', phone: '', city_zone: '', address: '', lat: '', lng: '', cuisine: '' });
  
  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const [kpiRes, auditRes] = await Promise.all([
          axios.get('http://localhost:5000/admin/kpi', { headers }),
          axios.get('http://localhost:5000/admin/audit', { headers })
        ]);
        setMetrics(kpiRes.data);
        setAuditLogs(auditRes.data || []);
      } else if (activeTab === 'sync') {
        const [syncRes, outboxRes] = await Promise.all([
          axios.get('http://localhost:5000/admin/sync-status', { headers }),
          axios.get('http://localhost:5000/admin/outbox', { headers })
        ]);
        setSyncStatus(syncRes.data);
        setOutboxEvents(outboxRes.data.events || []);
      } else if (activeTab === 'restaurants') {
        const restRes = await axios.get('http://localhost:5000/admin/restaurants', { headers });
        setRestaurants(restRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/admin/restaurant', newRest, { headers });
      setNewRest({ name: '', owner_name: '', email: '', phone: '', address: '', lat: '', lng: '', cuisine: '' });
      fetchData();
      alert('Restaurant created and synced successfully!');
    } catch (err) {
      alert('Failed to create restaurant: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if(!window.confirm('Are you sure you want to delete this restaurant? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/admin/restaurant/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Failed to delete restaurant: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="bg-[#fdf7ff] text-gray-900 font-sans min-h-screen flex overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-full py-6 fixed left-0 h-screen w-[280px] bg-white border-r border-gray-200 z-50">
        <div className="px-6 mb-8">
          <h1 className="text-2xl font-bold text-[#4f378a] tracking-tight">Admin Portal</h1>
          <p className="text-[#494551] text-xs">Master Control Center</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'dashboard' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-5 h-5"/>
            <span className="text-sm">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('restaurants')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'restaurants' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Store className="w-5 h-5"/>
            <span className="text-sm">Restaurants</span>
          </button>
          <button onClick={() => setActiveTab('sync')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'sync' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Server className="w-5 h-5"/>
            <span className="text-sm">System Sync</span>
          </button>
        </nav>
        <div className="px-6 mt-auto">
          <button onClick={() => navigate('/')} className="w-full mb-4 py-3 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5"/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-[280px] h-screen overflow-y-auto p-4 md:p-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">Global Overview</h2>
              <p className="text-gray-600 text-sm">System-wide performance and real-time monitoring.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <Users className="w-6 h-6 text-[#7209B7] mb-2"/>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <h3 className="text-3xl font-bold">{metrics.total_customers || 0}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <Bike className="w-6 h-6 text-blue-500 mb-2"/>
                <p className="text-gray-600 text-sm">Active Riders</p>
                <h3 className="text-3xl font-bold">{metrics.active_riders || 0}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <Store className="w-6 h-6 text-[#7209B7] mb-2"/>
                <p className="text-gray-600 text-sm">Total Restaurants</p>
                <h3 className="text-3xl font-bold">{metrics.total_restaurants || 0}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-[#7209B7]">
                <ShoppingBag className="w-6 h-6 text-[#7209B7] mb-2"/>
                <p className="text-gray-600 text-sm">Orders Today</p>
                <h3 className="text-3xl font-bold">{metrics.orders_today || 0}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                <div className="px-6 py-4 flex items-center gap-2 border-b border-gray-200">
                  <MapPin className="w-5 h-5 text-[#7209B7]"/>
                  <h4 className="text-lg font-bold">Rider Distribution Map</h4>
                </div>
                <div className="w-full h-full bg-gray-100 flex items-center justify-center relative group">
                  <img className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 transition-opacity absolute inset-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEGU7_9P4PI4_TaHDzil8qZVkLCTlT-Ej6wGng3MQimqWNmN4BgvIPRHoJf0b5uzyjihXX3Q-2yI4GoroC1QF1pqjFiS1TUAhpguyn2BmY4BU77YlmO9O7Tfy6aqPbbzR44dCuIi-GeK6rZXh-mMVbYtyOwCHTJo_O96uW2uQ3Jrgcspm8uBG3-T0YHdQGee8Z-3hvCJU4kJ_Oxv22j5TI5rwQfyFPKAC8_HLleftdlF2C6TWCt6eSsilM93lztl3LhOIyK2n88vo" alt="Map" />
                  <span className="relative z-10 bg-white/80 px-4 py-2 rounded-lg font-bold shadow-sm">Live Tracking Active</span>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden max-h-[500px] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500"/>
                    <h4 className="text-lg font-bold">Audit Logs</h4>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-sm">{log.TABLE_NAME}</span>
                        <span className="text-gray-500 text-xs">{new Date(log.TIMESTAMP).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-600 text-xs">{log.ACTION} on #{log.RECORD_ID}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">Restaurant Management</h2>
              <p className="text-gray-600 text-sm">Provision new merchants and sync them across the platform.</p>
            </header>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="text-[#7209B7]"/> Create New Restaurant</h3>
              <form onSubmit={handleCreateRestaurant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Restaurant Name" value={newRest.name} onChange={e=>setNewRest({...newRest, name: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required placeholder="Owner Full Name" value={newRest.owner_name} onChange={e=>setNewRest({...newRest, owner_name: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required type="email" placeholder="Owner Email" value={newRest.email} onChange={e=>setNewRest({...newRest, email: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required placeholder="Phone Number" value={newRest.phone} onChange={e=>setNewRest({...newRest, phone: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required placeholder="City Zone (e.g. Mianwali-Central)" value={newRest.city_zone} onChange={e=>setNewRest({...newRest, city_zone: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none md:col-span-2"/>
                <input placeholder="Address" value={newRest.address} onChange={e=>setNewRest({...newRest, address: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none md:col-span-2"/>
                <input placeholder="Latitude (e.g. 31.5204)" value={newRest.lat} onChange={e=>setNewRest({...newRest, lat: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input placeholder="Longitude (e.g. 74.3587)" value={newRest.lng} onChange={e=>setNewRest({...newRest, lng: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input placeholder="Cuisine Types (comma separated)" value={newRest.cuisine} onChange={e=>setNewRest({...newRest, cuisine: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none md:col-span-2"/>
                <button type="submit" className="md:col-span-2 bg-[#7209B7] text-white font-bold p-3 rounded-xl hover:bg-purple-800 transition-all">Provision Restaurant Account</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Active Restaurants</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Owner</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.RESTAURANT_ID} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">#{r.RESTAURANT_ID}</td>
                      <td className="p-4 font-bold">{r.NAME}</td>
                      <td className="p-4">
                        <div className="text-sm font-bold">{r.OWNER_NAME}</div>
                        <div className="text-xs text-gray-500">{r.OWNER_EMAIL}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{r.CITY_ZONE}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteRestaurant(r.RESTAURANT_ID)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sync' && syncStatus && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">System Synchronization</h2>
              <p className="text-gray-600 text-sm">Monitor data consistency between Oracle (Relational) and MongoDB (Catalog/Search).</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Oracle Stats */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-[#D62828] mb-4 flex items-center gap-2"><Server className="w-5 h-5"/> Oracle (Source of Truth)</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Restaurants</span><span className="font-bold">{syncStatus.oracle.restaurants}</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Customers</span><span className="font-bold">{syncStatus.oracle.customers}</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Riders</span><span className="font-bold">{syncStatus.oracle.riders}</span></li>
                  <li className="flex justify-between pb-2"><span className="text-gray-600">Orders</span><span className="font-bold">{syncStatus.oracle.orders}</span></li>
                </ul>
              </div>

              {/* Mongo Stats */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-[#0077B6] mb-4 flex items-center gap-2"><Server className="w-5 h-5"/> MongoDB (Read/Search)</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Restaurants</span><span className="font-bold">{syncStatus.mongo.restaurants}</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Offers</span><span className="font-bold">{syncStatus.mongo.offers}</span></li>
                  <li className="flex justify-between border-b pb-2"><span className="text-gray-600">Rider Locations</span><span className="font-bold">{syncStatus.mongo.riders}</span></li>
                </ul>
              </div>

              {/* Sync Health */}
              <div className={`p-6 rounded-3xl shadow-sm border ${syncStatus.sync.restaurant_mismatch ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${syncStatus.sync.restaurant_mismatch ? 'text-red-700' : 'text-emerald-700'}`}>
                  <RefreshCw className="w-5 h-5"/> Sync Health
                </h3>
                <ul className="space-y-3">
                  <li className="flex justify-between border-b pb-2 border-black/10"><span className="opacity-80">Pending Outbox Jobs</span><span className="font-bold">{syncStatus.sync.pending_jobs}</span></li>
                  <li className="flex justify-between border-b pb-2 border-black/10"><span className="opacity-80">Processed Outbox Jobs</span><span className="font-bold">{syncStatus.sync.processed_jobs}</span></li>
                  <li className="flex justify-between pb-2 border-black/10">
                    <span className="opacity-80">Restaurant Consistency</span>
                    <span className="font-bold">
                      {syncStatus.sync.restaurant_mismatch ? 'MISMATCH DETECTED' : 'SYNCED'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Outbox Events (Event Queue)</h3>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <th className="p-3 font-semibold">Event ID</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Aggregate</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outboxEvents.map((ev, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">{ev.EVENT_ID}</td>
                        <td className="p-3 font-bold">{ev.EVENT_TYPE}</td>
                        <td className="p-3">{ev.AGGREGATE_TYPE} #{ev.AGGREGATE_ID}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${ev.IS_DISPATCHED ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {ev.IS_DISPATCHED ? 'Dispatched' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{new Date(ev.CREATED_AT).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
