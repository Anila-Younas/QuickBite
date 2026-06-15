import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Zap, Bike, TrendingUp, Truck, Clock, FileClock, History, X } from 'lucide-react';
import Map from '../../components/Map';

// Helper function to calculate distance (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Estimate time (assume average speed 30 km/h)
const estimateTime = (distanceKm) => {
  const speedKmPerMin = 30 / 60; // 30 km/h = 0.5 km per minute
  const minutes = Math.ceil(distanceKm / speedKmPerMin);
  return minutes;
};

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('placed'); // placed, confirmed, delivered
  const [stats, setStats] = useState({ total_deliveries: 0, total_earnings: 0 });
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showEarningsHistory, setShowEarningsHistory] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

  const headers = { 'x-user-id': user?.id };

  const fetchEarningsHistory = async () => {
    setEarningsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/rider/earnings', { headers });
      setEarningsHistory(res.data.earnings || []);
    } catch (err) {
      console.error('Failed to fetch earnings history:', err);
    } finally {
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
    
    const socket = io('http://localhost:5000');
    if (user?.id) socket.emit('join_rider_room', user.id);
    
    socket.on('new_delivery_request', (data) => {
       console.log('Real-time: New delivery request', data);
       fetchDashboardData();
    });
    
    socket.on('rider_assigned', (data) => {
       if (data.rider_id == user?.id) {
          console.log('Real-time: Assigned to order', data);
          fetchDashboardData();
       }
    });
    
    socket.on('order_update', (data) => {
       console.log('Real-time: Order update received:', data);
       fetchDashboardData();
    });

    socket.on('earnings_updated', (data) => {
       console.log('Real-time: Earnings updated', data);
       fetchDashboardData();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
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
      const [statsRes, allOrdersRes] = await Promise.all([
        axios.get('http://localhost:5000/rider/dashboard', { headers }),
        axios.get('http://localhost:5000/rider/active-orders', { headers }) // This returns all rider orders
      ]);
      
      setStats(statsRes.data.stats || { total_deliveries: 0, total_earnings: 0 });
      
      // Fetch full order details for all orders
      const ordersWithDetails = await Promise.all(
        (allOrdersRes.data || []).map(async (order) => {
          try {
            const orderDetail = await axios.get(`http://localhost:5000/orders/${order.ORDER_ID}`, { headers });
            return orderDetail.data;
          } catch (err) {
            return order;
          }
        })
      );
      
      setOrders(ordersWithDetails);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching rider data:', err);
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (activeTab === 'placed') {
      return orders.filter(order => order.STATUS === 'WAITING_CONFIRM' || order.STATUS === 'WAITING_FOR_PICKUP');
    } else if (activeTab === 'confirmed') {
      return orders.filter(order => order.STATUS === 'PICKED_UP');
    } else if (activeTab === 'delivered') {
      return orders.filter(order => order.STATUS === 'DELIVERED');
    }
    return [];
  }, [orders, activeTab]);

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
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert('Failed to accept order: ' + errorMsg);
      }
    }
  };

  const declineOrder = async (orderId) => {
    try {
      await axios.post('http://localhost:5000/rider/decline', { order_id: orderId }, { headers });
      fetchDashboardData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert('Failed to decline order: ' + errorMsg);
      }
    }
  };

  const handleMarkPickedUp = async (orderId) => {
    try {
      await axios.post(`http://localhost:5000/rider/${orderId}/picked-up`, {}, { headers });
      fetchDashboardData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert('Failed to mark order as picked up: ' + errorMsg);
      }
    }
  };

  const handleMarkDeliveredClick = (orderId) => {
    setSelectedOrderId(orderId);
    setShowConfirmModal(true);
  };

  const confirmDelivery = async () => {
    if (!selectedOrderId) return;
    try {
      await axios.post(`http://localhost:5000/rider/${selectedOrderId}/delivered`, {}, { headers });
      fetchDashboardData();
      setShowConfirmModal(false);
      setSelectedOrderId(null);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert('Failed to mark order as delivered: ' + errorMsg);
      }
    }
  };

  const cancelDelivery = () => {
    setShowConfirmModal(false);
    setSelectedOrderId(null);
  };

  return (
    <div className="bg-[#fdf7ff] text-gray-900 font-sans min-h-screen overflow-x-hidden">
      <aside className="hidden md:flex flex-col h-full py-6 fixed left-0 h-screen w-[280px] bg-white border-r border-gray-200 z-50">
        <div className="px-6 mb-12">
          <h1 className="text-2xl font-bold text-[#4f378a]">QuickBite</h1>
          <p className="text-xs text-gray-600">Partner Portal</p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'Rider'}</p>
            <p className="text-xs text-gray-500">{user?.email || 'rider@quickbite.com'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('placed')}
            className={`w-full flex items-center gap-4 px-4 py-3 transition-all ${
              activeTab === 'placed' 
                ? 'text-[#4f378a] font-bold border-l-4 border-[#0077B6] bg-white/5' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileClock className="w-5 h-5"/>
            <span className="text-sm">Placed Orders</span>
          </button>
          <button 
            onClick={() => setActiveTab('confirmed')}
            className={`w-full flex items-center gap-4 px-4 py-3 transition-all ${
              activeTab === 'confirmed' 
                ? 'text-[#4f378a] font-bold border-l-4 border-[#0077B6] bg-white/5' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bike className="w-5 h-5"/>
            <span className="text-sm">Confirmed (In Transit)</span>
          </button>
          <button 
            onClick={() => setActiveTab('delivered')}
            className={`w-full flex items-center gap-4 px-4 py-3 transition-all ${
              activeTab === 'delivered' 
                ? 'text-[#4f378a] font-bold border-l-4 border-[#0077B6] bg-white/5' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Truck className="w-5 h-5"/>
            <span className="text-sm">Delivered Orders</span>
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
          <div className="md:col-span-8 h-[350px] md:h-[500px] relative rounded-3xl overflow-hidden bg-white border border-gray-200">
            <Map 
              center={location ? [location.lat, location.lng] : [32.5837, 71.5241]} 
              zoom={15} 
              markers={location ? [{ position: [location.lat, location.lng], label: 'You (Rider)', type: 'rider' }] : []} 
            />
          </div>

          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl flex-1 flex flex-col justify-between border border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-gray-600 text-sm">Total Earnings</h3>
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-4xl font-extrabold text-gray-900 leading-none">Rs. {stats.total_earnings?.toFixed(0) || 0}</p>
                <p className="text-xs text-emerald-400 mt-1">Based on completed deliveries</p>
                <button
                  onClick={() => {
                    fetchEarningsHistory();
                    setShowEarningsHistory(true);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 py-2 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors"
                >
                  <History className="w-4 h-4" />
                  View Earnings History
                </button>
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
                  <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.STATUS !== 'DELIVERED').length}</p>
                  <p className="text-xs text-gray-600">Active Orders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Tab Content */}
          <div className="md:col-span-12">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'placed' && 'Placed Orders'}
                {activeTab === 'confirmed' && 'Confirmed (In Transit) Orders'}
                {activeTab === 'delivered' && 'Delivered Orders'}
              </h2>
            </div>
            
            {/* Mobile Tabs */}
            <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
              <button 
                onClick={() => setActiveTab('placed')}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap ${
                  activeTab === 'placed' ? 'bg-[#4f378a] text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Placed
              </button>
              <button 
                onClick={() => setActiveTab('confirmed')}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap ${
                  activeTab === 'confirmed' ? 'bg-[#4f378a] text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Confirmed
              </button>
              <button 
                onClick={() => setActiveTab('delivered')}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap ${
                  activeTab === 'delivered' ? 'bg-[#4f378a] text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Delivered
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-6 text-center text-gray-600 bg-white rounded-2xl border border-gray-200 animate-pulse">
                    Loading...
                  </div>
                ))
              ) : filteredOrders.length === 0 ? (
                <div className="col-span-full p-6 text-center text-gray-600 bg-white rounded-2xl border border-gray-200">
                  No orders in this category
                </div>
              ) : (
                filteredOrders.map((order) => {
                  let eta = null;
                  if (activeTab === 'confirmed' && location && order.customer_location) {
                    const distance = calculateDistance(
                      location.lat, location.lng,
                      order.customer_location.lat, order.customer_location.lng
                    );
                    eta = estimateTime(distance);
                  }
                  
                  return (
                    <div key={order.ORDER_ID} className="bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img 
                            src="https://images.unsplash.com/photo-1563379091339-03b21ab4a7f8?w=100&h=100&fit=crop" 
                            alt="Food" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Order #{order.ORDER_ID}</p>
                          <p className="text-xs text-gray-600">{order.DELIVERY_ADDRESS?.substring(0,30) || 'Address'}</p>
                          {eta !== null && (
                            <p className="text-xs font-semibold text-green-600 mt-1">
                              ETA: {eta} min
                            </p>
                          )}
                          {activeTab === 'delivered' && (
                            <p className="text-xs text-gray-600 mt-1">Rs. {order.TOTAL_AMOUNT}</p>
                          )}
                        </div>
                      </div>
                      
                      {activeTab === 'placed' && (
                        <div className="mt-4">
                          {order.STATUS === 'WAITING_CONFIRM' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => declineOrder(order.ORDER_ID)}
                                className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg hover:bg-red-600"
                              >
                                Decline
                              </button>
                              <button 
                                onClick={() => acceptOrder(order.ORDER_ID)}
                                className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700"
                              >
                                Accept
                              </button>
                            </div>
                          )}
                          {order.STATUS === 'WAITING_FOR_PICKUP' && (
                            <button 
                              onClick={() => handleMarkPickedUp(order.ORDER_ID)}
                              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
                            >
                              Mark Picked Up
                            </button>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'confirmed' && (
                        <div className="mt-4">
                          <button 
                            onClick={() => handleMarkDeliveredClick(order.ORDER_ID)}
                            disabled={order.STATUS !== 'PICKED_UP'}
                            className={`w-full font-semibold py-2 rounded-lg transition-all ${
                              order.STATUS === 'PICKED_UP' 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Mark Delivered
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Delivery</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to mark Order #{selectedOrderId} as delivered? This action is final.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={cancelDelivery}
                className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelivery}
                className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Earnings History Modal */}
      {showEarningsHistory && (
        <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Earnings History</h3>
              <button 
                onClick={() => setShowEarningsHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {earningsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : earningsHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No earnings recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earningsHistory.map((earning) => (
                  <div key={earning.EARNING_ID} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">Order #{earning.ORDER_ID}</p>
                        <p className="text-sm text-gray-500 mt-1">{earning.DELIVERY_ADDRESS}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(earning.CREATED_AT).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">+Rs. {earning.EARNING_AMOUNT?.toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">Order: Rs. {earning.ORDER_TOTAL?.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
