import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Users, Bike, Store, ShoppingBag, MapPin, AlertTriangle, RefreshCw, Server, PlusCircle, Trash2, Edit } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [metrics, setMetrics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // New Restaurant State
  const [newRest, setNewRest] = useState({ name: '', owner_name: '', email: '', phone: '', city_zone: '', address: '', lat: '', lng: '', cuisine: '' });
  const [newRestLocation, setNewRestLocation] = useState(null);
  
  // New Customer & Rider States
  const [newCustomer, setNewCustomer] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [newRider, setNewRider] = useState({ full_name: '', email: '', phone: '', password: '' });
  
  // Edit Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, type: '', data: null });
  
  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    if (newRestLocation) {
      setNewRest(prev => ({
        ...prev,
        lat: newRestLocation.lat,
        lng: newRestLocation.lng
      }));
    }
  }, [newRestLocation]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      // Always fetch dashboard metrics to keep dashboard cards up-to-date
      const [kpiRes, auditRes] = await Promise.all([
        axios.get('http://localhost:5000/admin/kpi', { headers }),
        axios.get('http://localhost:5000/admin/audit', { headers })
      ]);
      setMetrics(kpiRes.data);
      setAuditLogs(auditRes.data || []);

      // Fetch tab-specific data
      if (activeTab === 'sync') {
        const [syncRes, outboxRes] = await Promise.all([
          axios.get('http://localhost:5000/admin/sync-status', { headers }),
          axios.get('http://localhost:5000/admin/outbox', { headers })
        ]);
        setSyncStatus(syncRes.data);
        setOutboxEvents(outboxRes.data.events || []);
      } else if (activeTab === 'restaurants') {
        const restRes = await axios.get('http://localhost:5000/admin/restaurants', { headers });
        setRestaurants(restRes.data || []);
      } else if (activeTab === 'customers') {
        const custRes = await axios.get('http://localhost:5000/admin/customers', { headers });
        setCustomers(custRes.data || []);
      } else if (activeTab === 'riders') {
        const riderRes = await axios.get('http://localhost:5000/admin/riders', { headers });
        setRiders(riderRes.data || []);
      } else if (activeTab === 'orders') {
        const orderRes = await axios.get('http://localhost:5000/admin/orders', { headers });
        setOrders(orderRes.data || []);
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

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/admin/customer', newCustomer, { headers });
      setNewCustomer({ full_name: '', email: '', phone: '', password: '' });
      fetchData();
      alert('Customer created and synced successfully!');
    } catch (err) {
      alert('Failed to create customer: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateRider = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/admin/rider', newRider, { headers });
      setNewRider({ full_name: '', email: '', phone: '', password: '' });
      fetchData();
      alert('Rider created and synced successfully!');
    } catch (err) {
      alert('Failed to create rider: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { type, data } = editModal;
      if (type === 'customer') {
        await axios.put(`http://localhost:5000/admin/customer/${data.USER_ID}`, { full_name: data.FULL_NAME, email: data.EMAIL, phone: data.PHONE }, { headers });
      } else if (type === 'rider') {
        await axios.put(`http://localhost:5000/admin/rider/${data.USER_ID}`, { full_name: data.FULL_NAME, email: data.EMAIL, phone: data.PHONE, status: data.status }, { headers });
      } else if (type === 'restaurant') {
        await axios.put(`http://localhost:5000/admin/restaurant/${data.RESTAURANT_ID}`, { name: data.NAME, city_zone: data.CITY_ZONE, cuisine: data.CUISINE, is_active: data.IS_ACTIVE }, { headers });
      }
      setEditModal({ isOpen: false, type: '', data: null });
      fetchData();
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
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

  const handleDeleteCustomer = async (id) => {
    if(!window.confirm('Are you sure you want to delete this customer? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/admin/customer/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Failed to delete customer: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteRider = async (id) => {
    if(!window.confirm('Are you sure you want to delete this rider? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/admin/rider/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Failed to delete rider: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteOrder = async (id) => {
    if(!window.confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/admin/order/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Failed to delete order: ' + (err.response?.data?.error || err.message));
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
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'customers' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users className="w-5 h-5"/>
            <span className="text-sm">Customers</span>
          </button>
          <button onClick={() => setActiveTab('riders')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'riders' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Bike className="w-5 h-5"/>
            <span className="text-sm">Riders</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'orders' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ShoppingBag className="w-5 h-5"/>
            <span className="text-sm">Orders</span>
          </button>
          <button onClick={() => setActiveTab('sync')} className={`w-full flex items-center gap-4 px-4 py-3 font-bold transition-all ${activeTab === 'sync' ? 'text-[#4f378a] border-l-4 border-[#7209B7] bg-[#7209B7]/10' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Server className="w-5 h-5"/>
            <span className="text-sm">System Sync</span>
          </button>
        </nav>
        <div className="px-6 mt-auto">
          <button onClick={() => {
            logout();
            navigate('/login');
          }} className="w-full mb-4 py-3 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5"/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-[280px] h-screen overflow-y-auto p-3 md:pl-4 md:pr-4 md:py-5">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
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

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
              <div className="hidden lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
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
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Restaurant Location</label>
                    <LocationPicker
                        value={newRestLocation}
                        onChange={(newLoc) => setNewRestLocation(newLoc)}
                        address={newRest.address}
                        onAddressChange={(newAddress) => setNewRest({ ...newRest, address: newAddress })}
                        placeholder="Select restaurant location from map or enter address"
                    />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Latitude</label>
                        <input readOnly value={newRest.lat} placeholder="Auto-filled from map" className="border p-3 rounded-xl bg-gray-50 w-full"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Longitude</label>
                        <input readOnly value={newRest.lng} placeholder="Auto-filled from map" className="border p-3 rounded-xl bg-gray-50 w-full"/>
                    </div>
                </div>
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
                        <button onClick={() => setEditModal({ isOpen: true, type: 'restaurant', data: { ...r, CUISINE: r.CUISINE || '' } })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                          <Edit className="w-5 h-5"/>
                        </button>
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

        {activeTab === 'customers' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">Customer Management</h2>
              <p className="text-gray-600 text-sm">View and manage all customer accounts.</p>
            </header>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="text-[#7209B7]"/> Create New Customer</h3>
              <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required placeholder="Full Name" value={newCustomer.full_name} onChange={e=>setNewCustomer({...newCustomer, full_name: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required type="email" placeholder="Email" value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer, email: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input placeholder="Phone" value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer, phone: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input type="password" placeholder="Password (Optional)" value={newCustomer.password} onChange={e=>setNewCustomer({...newCustomer, password: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <button type="submit" className="md:col-span-4 bg-[#7209B7] text-white font-bold p-3 rounded-xl hover:bg-purple-800 transition-all">Create Customer</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Customers</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.USER_ID} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">#{c.USER_ID}</td>
                      <td className="p-4 font-bold">{c.FULL_NAME}</td>
                      <td className="p-4 text-sm text-gray-600">{c.EMAIL}</td>
                      <td className="p-4 text-sm text-gray-600">{c.PHONE}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => setEditModal({ isOpen: true, type: 'customer', data: c })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                          <Edit className="w-5 h-5"/>
                        </button>
                        <button onClick={() => handleDeleteCustomer(c.USER_ID)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

        {activeTab === 'riders' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">Rider Management</h2>
              <p className="text-gray-600 text-sm">View and manage all rider accounts.</p>
            </header>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="text-[#7209B7]"/> Create New Rider</h3>
              <form onSubmit={handleCreateRider} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input required placeholder="Full Name" value={newRider.full_name} onChange={e=>setNewRider({...newRider, full_name: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input required type="email" placeholder="Email" value={newRider.email} onChange={e=>setNewRider({...newRider, email: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input placeholder="Phone" value={newRider.phone} onChange={e=>setNewRider({...newRider, phone: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <input type="password" placeholder="Password (Optional)" value={newRider.password} onChange={e=>setNewRider({...newRider, password: e.target.value})} className="border p-3 rounded-xl focus:ring-2 outline-none"/>
                <button type="submit" className="md:col-span-4 bg-[#7209B7] text-white font-bold p-3 rounded-xl hover:bg-purple-800 transition-all">Create Rider</button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Riders</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {riders.map(r => (
                    <tr key={r.USER_ID} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">#{r.USER_ID}</td>
                      <td className="p-4 font-bold">{r.FULL_NAME}</td>
                      <td className="p-4 text-sm text-gray-600">{r.EMAIL}</td>
                      <td className="p-4 text-sm text-gray-600">{r.PHONE}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{r.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => setEditModal({ isOpen: true, type: 'rider', data: r })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                          <Edit className="w-5 h-5"/>
                        </button>
                        <button onClick={() => handleDeleteRider(r.USER_ID)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

        {activeTab === 'orders' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-3xl font-bold text-gray-900">Order Management</h2>
              <p className="text-gray-600 text-sm">View and manage all orders.</p>
            </header>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Orders</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Restaurant</th>
                    <th className="p-4 font-semibold">Rider</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Total</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.ORDER_ID} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">#{o.ORDER_ID}</td>
                      <td className="p-4 font-bold">{o.CUSTOMER_NAME}</td>
                      <td className="p-4 text-sm text-gray-600">{o.RESTAURANT_NAME}</td>
                      <td className="p-4 text-sm text-gray-600">{o.RIDER_NAME || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          o.STATUS === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                          o.STATUS === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>{o.STATUS}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-900">Rs. {o.TOTAL_AMOUNT}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteOrder(o.ORDER_ID)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
          <div className="space-y-6 animate-fade-in">
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

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-xl animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Edit {editModal.type.charAt(0).toUpperCase() + editModal.type.slice(1)}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              {editModal.type === 'customer' || editModal.type === 'rider' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input required value={editModal.data.FULL_NAME} onChange={e=>setEditModal(p => ({...p, data: {...p.data, FULL_NAME: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input required type="email" value={editModal.data.EMAIL} onChange={e=>setEditModal(p => ({...p, data: {...p.data, EMAIL: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input value={editModal.data.PHONE || ''} onChange={e=>setEditModal(p => ({...p, data: {...p.data, PHONE: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  {editModal.type === 'rider' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                      <select value={editModal.data.status || 'OFFLINE'} onChange={e=>setEditModal(p => ({...p, data: {...p.data, status: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none">
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="BUSY">BUSY</option>
                        <option value="OFFLINE">OFFLINE</option>
                      </select>
                    </div>
                  )}
                </>
              ) : editModal.type === 'restaurant' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Restaurant Name</label>
                    <input required value={editModal.data.NAME} onChange={e=>setEditModal(p => ({...p, data: {...p.data, NAME: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">City Zone</label>
                    <input required value={editModal.data.CITY_ZONE} onChange={e=>setEditModal(p => ({...p, data: {...p.data, CITY_ZONE: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Cuisine</label>
                    <input placeholder="Comma separated" value={editModal.data.CUISINE || ''} onChange={e=>setEditModal(p => ({...p, data: {...p.data, CUISINE: e.target.value}}))} className="w-full border p-3 rounded-xl focus:ring-2 outline-none"/>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <input type="checkbox" id="rest_active" checked={editModal.data.IS_ACTIVE === 1} onChange={e=>setEditModal(p => ({...p, data: {...p.data, IS_ACTIVE: e.target.checked ? 1 : 0}}))} className="w-5 h-5 accent-[#7209B7]"/>
                    <label htmlFor="rest_active" className="font-bold cursor-pointer">Active / Visible on platform</label>
                  </div>
                </>
              ) : null}
              
              <div className="flex gap-4 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setEditModal({isOpen: false, type: '', data: null})} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#7209B7] text-white rounded-xl font-bold hover:bg-purple-800">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
