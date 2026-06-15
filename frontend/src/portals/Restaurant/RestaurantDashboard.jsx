import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LayoutDashboard, Receipt, UtensilsCrossed, Tag, Bike, BarChart3, Star, Settings, Trash2, LogOut } from 'lucide-react';
import Map from '../../components/Map';
import { useAuth } from '../../context/AuthContext';

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

const MAX_RADIUS_KM = 5; // Configurable max radius for nearby riders

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [offers, setOffers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileImageData, setProfileImageData] = useState(null);
  const [menuItemImagePreview, setMenuItemImagePreview] = useState(null);
  const [menuItemImageData, setMenuItemImageData] = useState(null);
  const [headers, setHeaders] = useState({ 'x-user-id': user?.id || '', 'x-restaurant-id': '' });
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({});
  const [reviewsFilter, setReviewsFilter] = useState('all');
  const [reviewsSort, setReviewsSort] = useState('created_at');
  const [reviewsSortOrder, setReviewsSortOrder] = useState('desc');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [deleteOfferConfirm, setDeleteOfferConfirm] = useState(null);

  // Split orders into three categories using useMemo
    const activeOrders = useMemo(() => {
      return orders.filter(order => 
        ['PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'WAITING_CONFIRM'].includes(order.STATUS)
      );
    }, [orders]);
  
  const pickedUpOrders = useMemo(() => {
    return orders.filter(order => order.STATUS === 'PICKED_UP');
  }, [orders]);
  
  const deliveredOrders = useMemo(() => {
    return orders.filter(order => order.STATUS === 'DELIVERED');
  }, [orders]);

  // Fetch restaurant data when user loads
  useEffect(() => {
    const loadRestaurant = async () => {
      if (user?.id) {
        try {
          const response = await axios.get('http://localhost:5000/restaurant/my-restaurant', {
            headers: { 'x-user-id': user.id }
          });
          const restData = response.data;
          setRestaurant(restData);
          setHeaders({
            'x-user-id': user.id,
            'x-restaurant-id': restData.oracle_restaurant_id
          });
          
          // Set location from restaurant data
          if (restData.location?.coordinates) {
            setRestaurantLocation({
              lat: restData.location.coordinates[1],
              lng: restData.location.coordinates[0]
            });
          }
        } catch (err) {
          console.error('[RestaurantDashboard] Error loading restaurant:', err);
          // Only set fallback if we have no other option, but show error to user
          setHeaders({ 'x-user-id': user?.id || '', 'x-restaurant-id': '' });
        }
      }
    };
    loadRestaurant();
  }, [user?.id]);

  useEffect(() => {
    if (!restaurant) return; // Wait until restaurant is loaded

    fetchData();
    const int = setInterval(fetchData, 10000);
    
    const socket = io('http://localhost:5000');
    socket.emit('join_restaurant_room', headers['x-restaurant-id']);
    
    socket.on('new_order_restaurant', (data) => {
       console.log('Real-time: New order received', data);
       fetchData();
    });

    socket.on('rider_assigned', (data) => {
      console.log('Real-time: Rider assigned', data);
      fetchData();
    });

    socket.on('rider_status_updated', () => {
      console.log('Real-time: Rider status updated');
      fetchData();
    });
    
    socket.on('order_update', (data) => {
      console.log('Real-time: Order update received:', data);
      fetchData();
    });

    socket.on('new_review', (data) => {
      console.log('Real-time: New review received:', data);
      if (activeTab === 'Reviews') {
        fetchReviews();
      }
    });
    
    return () => {
      clearInterval(int);
      socket.disconnect();
    };
  }, [restaurant, headers, activeTab]);

  // Fetch reviews when activeTab is Reviews or filter/sort/page changes
  useEffect(() => {
    if (activeTab === 'Reviews') {
      fetchReviews();
    }
  }, [activeTab, reviewsFilter, reviewsSort, reviewsSortOrder, reviewsPage, headers]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get('http://localhost:5000/restaurant/reviews', {
        headers,
        params: {
          status: reviewsFilter,
          sort_by: reviewsSort,
          sort_order: reviewsSortOrder,
          page: reviewsPage,
          limit: 10
        }
      });
      setReviews(res.data.reviews);
      setReviewsMeta(res.data);
    } catch (err) {
      console.error('[RestaurantDashboard] fetchReviews failed:', err);
    }
  };

  const fetchData = async () => {
    console.log('[RestaurantDashboard] fetchData called');
    try {
      const [st, ord, mn, off, rid, rest] = await Promise.all([
        axios.get('http://localhost:5000/restaurant/dashboard', { headers }),
        axios.get('http://localhost:5000/restaurant/orders', { headers }),
        axios.get('http://localhost:5000/restaurant/menu', { headers }),
        axios.get('http://localhost:5000/restaurant/offers', { headers }),
        axios.get('http://localhost:5000/restaurant/riders', { headers }),
        axios.get('http://localhost:5000/restaurant/profile', { headers })
      ]);
      console.log('[RestaurantDashboard] Orders loaded:', ord.data);
      console.log('[RestaurantDashboard] Riders loaded:', rid.data);
      setStats(st.data);
      setOrders(ord.data);
      setMenu(mn.data);
      setOffers(off.data);
      setRiders(rid.data);
      setRestaurant(rest.data);
      
      // Also fetch reviews if on reviews tab
      if (activeTab === 'Reviews') {
        await fetchReviews();
      }
    } catch (err) {
      console.error('[RestaurantDashboard] fetchData failed:', err);
    }
  };

  const [assignmentErrors, setAssignmentErrors] = useState({});

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(`http://localhost:5000/restaurant/order/status/${orderId}`, { status }, { headers });
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert(`Failed to update status: ${errorMsg}`);
      }
    }
  };

  const assignRider = async (orderId, riderId) => {
    try {
      setAssignmentErrors(prev => ({ ...prev, [orderId]: null }));
      const response = await axios.post(
        `http://localhost:5000/restaurant/order/assign/${orderId}`,
        { rider_id: riderId },
        { headers }
      );
      fetchData();
      alert(`Successfully assigned rider ${response.data.rider_name} to order ${orderId}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setAssignmentErrors(prev => ({ ...prev, [orderId]: errorMsg }));
      
      // Custom handling for conflict errors
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert(`Failed to assign rider: ${errorMsg}`);
      }
    }
  };

  const [processing, setProcessing] = useState({});

  const markAsPickedUp = async (orderId) => {
    console.log(`[RestaurantDashboard] markAsPickedUp called for order ${orderId}`);
    try {
      setProcessing(prev => ({ ...prev, [orderId]: true }));
      const res = await axios.post(`http://localhost:5000/restaurant/order/${orderId}/picked-up`, {}, { headers });
      console.log('[RestaurantDashboard] markAsPickedUp success:', res.data);
      fetchData();
      alert('Order marked as picked up!');
    } catch (err) {
      console.error('[RestaurantDashboard] markAsPickedUp failed:', err);
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        alert(`Conflict detected: ${errorMsg}\nPlease refresh the page to see the latest order status.`);
      } else {
        alert('Failed to mark as picked up: ' + errorMsg);
      }
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    const item = { 
       name: e.target.name.value, 
       price: parseInt(e.target.price.value), 
       category: e.target.category.value,
       description: e.target.description.value,
       image: menuItemImageData || '',
       available: true
    };
    await axios.post('http://localhost:5000/restaurant/menu/item', item, { headers });
    fetchData();
    e.target.reset();
    setMenuItemImagePreview(null);
    setMenuItemImageData(null);
  };
  
  const toggleMenuItem = async (name, currentStatus) => {
    await axios.put(`http://localhost:5000/restaurant/menu/item/${name}`, { available: !currentStatus }, { headers });
    fetchData();
  };
  
  const deleteMenuItem = async (name) => {
    await axios.delete(`http://localhost:5000/restaurant/menu/item/${name}`, { headers });
    fetchData();
  };

  const addOffer = async (e) => {
    e.preventDefault();
    const offer = {
      title: e.target.title.value,
      discount_pct: parseInt(e.target.discount.value),
      restaurant_name: restaurant?.name || "Restaurant"
    };
    await axios.post('http://localhost:5000/restaurant/offers', offer, { headers });
    fetchData();
    e.target.reset();
  };
  
  const toggleOffer = async (id, status) => {
    await axios.put(`http://localhost:5000/restaurant/offers/${id}`, { is_active: !status }, { headers });
    fetchData();
  };

  const deleteOffer = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/restaurant/offers/${id}`, { headers });
      fetchData();
      setDeleteOfferConfirm(null);
    } catch (err) {
      alert('Failed to delete offer: ' + (err.response?.data?.error || err.message));
    }
  };

  const markReviewStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/restaurant/reviews/${id}/status`, { status }, { headers });
      fetchReviews();
    } catch (err) {
      alert('Failed to update review status');
    }
  };

  const getNearbyRiders = () => {
    console.log('🔍 Calculating nearby riders:');
    console.log('  - Restaurant Location:', restaurantLocation);
    console.log('  - All Riders:', riders);

    if (!restaurantLocation) return [];

    const nearbyRiders = riders.filter(rider => {
      console.log('  - Rider:', rider);
      if (rider.status !== 'AVAILABLE') {
        console.log('    ❌ Not available (status:', rider.status, ')');
        return false;
      }
      
      let riderLat, riderLng;
      if (rider.location?.coordinates) {
        riderLng = rider.location.coordinates[0];
        riderLat = rider.location.coordinates[1];
      } else if (Array.isArray(rider.location) && rider.location.length >= 2) {
        riderLng = rider.location[0];
        riderLat = rider.location[1];
      } else {
        console.log('    ❌ No valid location data');
        return false;
      }

      const distance = calculateDistance(
        restaurantLocation.lat,
        restaurantLocation.lng,
        riderLat,
        riderLng
      );
      console.log('    - Distance:', distance, 'km');
      const isNearby = true; // User requested: online riders should always be available
      console.log(`    - ${isNearby ? '✅ Within radius (forced)' : '❌ Too far'}`);
      return isNearby;
    }).map(rider => {
      let riderLat, riderLng;
      if (rider.location?.coordinates) {
        riderLng = rider.location.coordinates[0];
        riderLat = rider.location.coordinates[1];
      } else {
        riderLng = rider.location[0];
        riderLat = rider.location[1];
      }
      return {
        ...rider,
        lat: riderLat,
        lng: riderLng,
        distance: calculateDistance(
          restaurantLocation.lat,
          restaurantLocation.lng,
          riderLat,
          riderLng
        )
      };
    }).sort((a, b) => a.distance - b.distance);

    console.log('✅ Nearby Riders Found:', nearbyRiders);
    return nearbyRiders;
  };

  const nearbyRiders = getNearbyRiders();

  const mapMarkers = [
    ...(restaurantLocation ? [{ position: [restaurantLocation.lat, restaurantLocation.lng], label: 'Restaurant', type: 'restaurant' }] : []),
    ...nearbyRiders.map(r => ({
      position: [r.lat, r.lng],
      label: `${r.FULL_NAME} (${r.distance.toFixed(1)} km)`,
      type: 'rider'
    }))
  ];

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Orders', icon: Receipt },
    { name: 'Menu', icon: UtensilsCrossed },
    { name: 'Offers', icon: Tag },
    { name: 'Riders', icon: Bike },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Reviews', icon: Star },
    { name: 'Profile', icon: Settings }
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 hidden md:flex">
         <div className="p-6 border-b flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D62828] text-white rounded-xl flex items-center justify-center font-bold">
              {restaurant?.name ? restaurant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NC'}
            </div>
            <div>
               <h2 className="font-bold text-lg leading-tight">{restaurant?.name || 'Namal Cafe'}</h2>
               <p className="text-xs text-gray-500">Merchant Center</p>
            </div>
         </div>
         <nav className="flex-1 p-4 space-y-1">
            {tabs.map(t => (
               <button 
                  key={t.name} onClick={() => setActiveTab(t.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === t.name ? 'bg-[#D62828]/10 text-[#D62828]' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <t.icon className="w-5 h-5" />
                  {t.name}
               </button>
            ))}
         </nav>
         <div className="p-4 border-t">
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
         <header className="bg-white border-b px-8 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <h1 className="text-2xl font-bold">{activeTab}</h1>
            <div className="flex gap-4 items-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold animate-pulse">Store Online</span>
            </div>
         </header>

         <div className="p-8 max-w-7xl mx-auto space-y-8">
            {activeTab === 'Dashboard' && (
               <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">Today's Revenue</p>
                        <h3 className="text-3xl font-bold mt-2">Rs. {stats.REVENUE_TODAY || 0}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">Active Orders</p>
                        <h3 className="text-3xl font-bold mt-2">{stats.ACTIVE_ORDERS || 0}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">Completed Today</p>
                        <h3 className="text-3xl font-bold mt-2">{stats.COMPLETED_ORDERS || 0}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">Average Rating</p>
                        <h3 className="text-3xl font-bold mt-2 text-yellow-500">★ {stats.avg_rating || 'New'}</h3>
                     </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <h2 className="text-xl font-bold mb-4">Live Feed</h2>
                     <div className="space-y-4">
                        {orders.slice(0,5).map(o => (
                           <div key={o.ORDER_ID} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                              <div>
                                 <span className="font-bold text-gray-800">Order #{o.ORDER_ID}</span> • {o.CUSTOMER_NAME}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.STATUS==='PLACED'?'bg-red-100 text-red-800': 'bg-blue-100 text-blue-800'}`}>{o.STATUS}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </>
            )}

            {activeTab === 'Orders' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Panel 1: Active Orders (waiting for processing, rider, etc.) */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Active Orders ({activeOrders.length})</h2>
                    {activeOrders.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                        No active orders
                      </div>
                    ) : (
                      activeOrders.map(o => (
                        <div key={o.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-lg">Order #{o.ORDER_ID}</h3>
                              <p className="text-gray-500 text-sm">{o.CUSTOMER_NAME}</p>
                            </div>
                            <span className="bg-[#D62828]/10 text-[#D62828] px-3 py-1 rounded-full text-xs font-bold">{o.STATUS}</span>
                          </div>
                          
                          <div className="space-y-3">
                            {o.STATUS === 'PLACED' && <button onClick={() => updateStatus(o.ORDER_ID, 'CONFIRMED')} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">Accept Order</button>}
                            {o.STATUS === 'CONFIRMED' && <button onClick={() => updateStatus(o.ORDER_ID, 'PREPARING')} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600">Start Preparing</button>}
                            {o.STATUS === 'PREPARING' && <button onClick={() => updateStatus(o.ORDER_ID, 'PACKED')} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700">Mark as Packed</button>}
                            {o.STATUS === 'PACKED' && <button onClick={() => updateStatus(o.ORDER_ID, 'WAITING_FOR_PICKUP')} className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">Ready for Pickup</button>}
                            {(o.STATUS === 'WAITING_FOR_PICKUP' || o.STATUS === 'PACKED' || o.STATUS === 'WAITING_CONFIRM') && (
                              <div className="space-y-2">
                                <p className="text-sm font-bold">Assign Rider:</p>
                                {nearbyRiders.length === 0 ? (
                                  <p className="text-red-600 text-sm">
                                    No available riders within {MAX_RADIUS_KM}km at the moment.
                                  </p>
                                ) : (
                                  nearbyRiders.map(r => (
                                    <button 
                                      key={r.USER_ID} 
                                      onClick={() => assignRider(o.ORDER_ID, r.USER_ID)} 
                                      className={`w-full border py-2 rounded-lg hover:bg-gray-50 text-left px-4 text-sm ${o.RIDER_ID === r.USER_ID ? 'bg-green-50 border-green-500' : ''}`}
                                      disabled={!!o.RIDER_ID && o.STATUS !== 'WAITING_FOR_PICKUP'}
                                    >
                                      <div className="font-bold">{r.FULL_NAME} {o.RIDER_ID === r.USER_ID ? '(Assigned)' : ''}</div>
                                      <div className="text-xs text-gray-500">
                                        {r.distance.toFixed(1)} km • {estimateTime(r.distance)} min ETA
                                      </div>
                                    </button>
                                  ))
                                )}
                                {assignmentErrors[o.ORDER_ID] && <p className="text-red-600 text-xs font-medium">{assignmentErrors[o.ORDER_ID]}</p>}
                                {/* Only enable Mark as Picked Up if rider has explicitly accepted! */}
                                {o.RIDER_ID && o.STATUS === 'WAITING_FOR_PICKUP' && (
                                  <button 
                                    onClick={() => markAsPickedUp(o.ORDER_ID)} 
                                    disabled={processing[o.ORDER_ID]}
                                    className={`w-full py-2 rounded-lg font-bold text-sm ${processing[o.ORDER_ID] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                  >
                                    {processing[o.ORDER_ID] ? 'Processing...' : 'Mark as Picked Up'}
                                  </button>
                                )}
                                {o.STATUS === 'WAITING_CONFIRM' && (
                        <p className="text-sm text-orange-600 font-semibold">
                          Waiting for rider to confirm order...
                        </p>
                      )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Panel 2: Picked Up */}
                  <div className="space-y-4">
                     <h2 className="text-xl font-bold text-gray-800">Picked Up ({pickedUpOrders.length})</h2>
                     {pickedUpOrders.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                           No picked‑up orders yet
                        </div>
                     ) : (
                        pickedUpOrders.map(o => (
                           <div key={o.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <h3 className="font-bold text-lg">Order #{o.ORDER_ID}</h3>
                                    <p className="text-gray-500 text-sm">{o.CUSTOMER_NAME}</p>
                                 </div>
                                 <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">PICKED UP</span>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                  
                  {/* Panel 3: Delivered */}
                  <div className="space-y-4">
                     <h2 className="text-xl font-bold text-gray-800">Delivered ({deliveredOrders.length})</h2>
                     {deliveredOrders.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                           No delivered orders yet
                        </div>
                     ) : (
                        deliveredOrders.map(o => (
                           <div key={o.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <h3 className="font-bold text-lg">Order #{o.ORDER_ID}</h3>
                                    <p className="text-gray-500 text-sm">{o.CUSTOMER_NAME}</p>
                                 </div>
                                 <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">DELIVERED</span>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-xl">
                                 <div className="flex justify-between text-sm font-bold">
                                    <span>Total</span>
                                    <span>Rs. {o.TOTAL_AMOUNT}</span>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}

            {activeTab === 'Menu' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                     {menu.map(item => (
                        <div key={item.name} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                           <div className="flex items-center gap-4">
                              {item.image_url && (
                                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                              )}
                              <div>
                                 <h4 className="font-bold text-lg">{item.name}</h4>
                                 <p className="text-sm text-gray-500">{item.category} • Rs. {item.price}</p>
                              </div>
                           </div>
                           <div className="flex gap-4 items-center">
                              <button onClick={() => toggleMenuItem(item.name, item.available)} className={`px-4 py-2 rounded-lg font-bold ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                 {item.available ? 'Visible' : 'Hidden'}
                              </button>
                              <button onClick={() => deleteMenuItem(item.name)} className="text-red-500"><Trash2 className="w-5 h-5"/></button>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div>
                     <form onSubmit={addMenuItem} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="font-bold text-lg mb-4">Add Menu Item</h3>
                        <input name="name" required placeholder="Item Name" className="w-full border p-3 rounded-lg mb-3" />
                        <input name="price" type="number" required placeholder="Price (Rs)" className="w-full border p-3 rounded-lg mb-3" />
                        <input name="category" required placeholder="Category (e.g. Fast Food)" className="w-full border p-3 rounded-lg mb-3" />
                        <div className="space-y-2 mb-3">
                          <label className="block text-sm font-bold text-gray-700">Item Image (optional)</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="w-full border p-3 rounded-lg" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setMenuItemImagePreview(reader.result);
                                  setMenuItemImageData(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          {menuItemImagePreview && (
                            <div className="relative">
                              <img 
                                src={menuItemImagePreview} 
                                alt="Preview" 
                                className="w-full h-32 object-cover rounded-lg" 
                              />
                              <button 
                                type="button" 
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600" 
                                onClick={() => {
                                  setMenuItemImagePreview(null);
                                  setMenuItemImageData(null);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea name="description" placeholder="Description" className="w-full border p-3 rounded-lg mb-4" rows="2" />
                        <button type="submit" className="w-full bg-[#D62828] text-white py-3 rounded-xl font-bold hover:bg-red-800">Save Item</button>
                     </form>
                  </div>
               </div>
            )}

            {activeTab === 'Offers' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     {offers.map(off => (
                        <div key={off._id} className="bg-white p-6 rounded-2xl shadow-sm border border-orange-200">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h3 className="text-xl font-bold text-orange-800">{off.title}</h3>
                                 <p className="text-orange-600">{off.discount_pct}% Discount</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => toggleOffer(off._id, off.is_active)} className={`px-4 py-1 rounded-full font-bold text-sm ${off.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                   {off.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button onClick={() => setDeleteOfferConfirm(off)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div>
                     <form onSubmit={addOffer} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="font-bold text-lg mb-4">Create Offer</h3>
                        <input name="title" required placeholder="Offer Title (e.g. Weekend Special)" className="w-full border p-3 rounded-lg mb-3" />
                        <input name="discount" type="number" required placeholder="Discount Percentage (e.g. 20)" className="w-full border p-3 rounded-lg mb-4" />
                        <button type="submit" className="w-full bg-[#D62828] text-white py-3 rounded-xl font-bold hover:bg-red-800">Create Promotion</button>
                     </form>
                  </div>
               </div>
            )}
            
            {/* Delete confirmation modal */}
            {deleteOfferConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-8 rounded-2xl max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold mb-4">Delete Offer</h3>
                  <p className="mb-6 text-gray-700">Are you sure you want to delete this offer? This action is permanent.</p>
                  <div className="flex gap-4">
                    <button onClick={() => setDeleteOfferConfirm(null)} className="flex-1 py-2 border border-gray-300 rounded-lg font-bold">Cancel</button>
                    <button onClick={() => deleteOffer(deleteOfferConfirm._id)} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Delete</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Riders' && (
               <div className="space-y-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                     <h3 className="font-bold text-lg mb-2">Nearby Riders Map ({nearbyRiders.length} available within {MAX_RADIUS_KM} km)</h3>
                     <Map 
                        center={restaurantLocation ? [restaurantLocation.lat, restaurantLocation.lng] : [32.5837, 71.5241]} 
                        zoom={14}
                        markers={mapMarkers} 
                     />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                     {riders.map(r => (
                        <div key={r.USER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                           <div className="flex items-center gap-4 mb-4">
                              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">🛵</div>
                              <div>
                                 <h3 className="font-bold text-lg">{r.FULL_NAME}</h3>
                                 <p className="text-sm text-gray-500">ID: {r.USER_ID}</p>
                              </div>
                           </div>
                           <div className="space-y-2 text-sm">
                              <p className="flex justify-between">
                                 <span className="text-gray-500">Phone:</span>
                                 <span className="font-medium">{r.PHONE}</span>
                              </p>
                              <p className="flex justify-between">
                                 <span className="text-gray-500">Email:</span>
                                 <span className="font-medium">{r.EMAIL}</span>
                              </p>
                              <p className="flex justify-between">
                                 <span className="text-gray-500">Status:</span>
                                 <span className={`font-bold ${r.status==='AVAILABLE'?'text-green-600':'text-orange-600'}`}>{r.status}</span>
                              </p>
                              {r.last_updated && (
                                 <p className="flex justify-between">
                                    <span className="text-gray-500">Last Seen:</span>
                                    <span className="font-medium">{new Date(r.last_updated).toLocaleString()}</span>
                                 </p>
                              )}
                              {r.lat !== undefined && r.lng !== undefined && restaurantLocation && (
                                 <p className="flex justify-between">
                                    <span className="text-gray-500">Distance:</span>
                                    <span className="font-medium">{calculateDistance(restaurantLocation.lat, restaurantLocation.lng, r.lat, r.lng).toFixed(1)} km</span>
                                 </p>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'Analytics' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-lg mb-4">Revenue Trend</h3>
                     <div className="space-y-4">
                        <div className="flex justify-between"><span className="text-gray-500">Today</span><span className="font-bold">Rs. {stats.REVENUE_TODAY || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">This Week</span><span className="font-bold">Rs. {stats.REVENUE_WEEK || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">This Month</span><span className="font-bold">Rs. {stats.REVENUE_MONTH || 0}</span></div>
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-lg mb-4">Order Metrics</h3>
                     <div className="space-y-4">
                        <div className="flex justify-between"><span className="text-gray-500">Total All Time</span><span className="font-bold">{stats.TOTAL_ORDERS || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Completed Today</span><span className="font-bold">{stats.COMPLETED_ORDERS || 0}</span></div>
                        <div className="flex justify-between text-red-500"><span className="">Cancelled Today</span><span className="font-bold">{stats.CANCELLED_ORDERS || 0}</span></div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'Reviews' && (
               <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-xl mb-4">Customer Reviews</h3>
                    
                    {/* Filters and sorting */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
                        <select value={reviewsFilter} onChange={(e) => {setReviewsFilter(e.target.value); setReviewsPage(1);}} className="border p-2 rounded-lg">
                          <option value="all">All</option>
                          <option value="unread">Unread</option>
                          <option value="read">Read</option>
                          <option value="responded">Responded</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                        <select value={reviewsSort} onChange={(e) => {setReviewsSort(e.target.value); setReviewsPage(1);}} className="border p-2 rounded-lg">
                          <option value="created_at">Date</option>
                          <option value="restaurant_rating">Rating</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                        <select value={reviewsSortOrder} onChange={(e) => {setReviewsSortOrder(e.target.value); setReviewsPage(1);}} className="border p-2 rounded-lg">
                          <option value="desc">Newest</option>
                          <option value="asc">Oldest</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Reviews list */}
                  <div className="space-y-4">
                    {reviews.length === 0 ? (
                      <div className="text-center text-gray-500 py-12 border-2 border-dashed rounded-xl bg-white">
                        <Star className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p>No reviews yet.</p>
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold">{review.customer_name || "Anonymous"}</h4>
                                {review.status === "unread" && <span className="bg-orange-500 text-xs font-bold px-2 py-1 rounded-full bg-orange-100">New</span>}
                                {review.status === "read" && <span className="bg-blue-500 text-xs font-bold px-2 py-1 rounded-full bg-blue-100">Read</span>}
                                {review.status === "responded" && <span className="bg-green-500 text-xs font-bold px-2 py-1 rounded-full bg-green-100">Responded</span>}
                              </div>
                              <div className="text-yellow-500 text-sm">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i}>{i < (review.restaurant_rating || 0) ? "★" : "☆"}</span>
                                ))}
                              </div>
                              {review.order_id && <p className="text-xs text-gray-400">Order #{review.order_id}</p>}
                            </div>
                            <p className="text-sm text-gray-500">{new Date(review.created_at).toLocaleString()}</p>
                          </div>
                          <p className="text-gray-700 mb-4">{review.comment}</p>
                          <div className="flex gap-2">
                            {review.status !== "read" && review.status !== "responded" && (
                              <button onClick={() => markReviewStatus(review._id, "read")} className="px-4 py-1 border border-gray-300 rounded-lg text-sm font-bold">Mark as Read</button>
                            )}
                            {review.status !== "responded" && (
                              <button onClick={() => markReviewStatus(review._id, "responded")} className="px-4 py-1 border border-green-300 bg-green-100 rounded-lg text-sm font-bold">Mark as Responded</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Pagination */}
                  {reviewsMeta.total_pages > 1 && (
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                      <button disabled={reviewsPage === 1} onClick={() => setReviewsPage(reviewsPage - 1)} className="px-4 py-1 border border-gray-300 rounded-lg text-sm font-bold">Previous</button>
                      <span className="text-gray-500 text-sm">Page {reviewsPage} / {reviewsMeta.total_pages}</span>
                      <button disabled={reviewsPage === reviewsMeta.total_pages} onClick={() => setReviewsPage(reviewsPage + 1)} className="px-4 py-1 border border-gray-300 rounded-lg text-sm font-bold">Next</button>
                    </div>
                  )}
               </div>
            )}

            {activeTab === 'Profile' && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
                  <h3 className="font-bold text-xl mb-6">Restaurant Profile</h3>
                  <form className="space-y-4" onSubmit={async (e) => { 
                    e.preventDefault(); 
                    try {
                      await axios.put('http://localhost:5000/restaurant/profile/image', 
                        { image_url: profileImageData || restaurant?.image_url || '' }, 
                        { headers }
                      );
                      alert('Profile Saved');
                      fetchData();
                      setProfileImagePreview(null);
                      setProfileImageData(null);
                    } catch(err) {
                      alert('Error saving profile: ' + err.message);
                    }
                  }}>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Profile Image</label>
                          <div className="space-y-2">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="w-full border border-gray-300 p-3 rounded-lg" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProfileImagePreview(reader.result);
                                    setProfileImageData(reader.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {(profileImagePreview || restaurant?.image_url) && (
                              <div className="relative">
                                <img 
                                  src={profileImagePreview || restaurant?.image_url} 
                                  alt="Preview" 
                                  className="w-full h-40 object-cover rounded-lg" 
                                />
                                <button 
                                  type="button" 
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600" 
                                  onClick={() => {
                                    setProfileImagePreview(null);
                                    setProfileImageData(null);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Restaurant Name</label>
                          <input 
                            defaultValue={restaurant?.name || "Restaurant"} 
                            className="w-full border p-3 rounded-lg bg-gray-50" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Cuisine Type</label>
                          <input 
                            defaultValue={restaurant?.cuisine?.join(', ') || "Cuisine"} 
                            className="w-full border p-3 rounded-lg bg-gray-50" 
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Opening Time</label>
                              <input type="time" defaultValue="10:00" className="w-full border p-3 rounded-lg bg-gray-50" />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Closing Time</label>
                              <input type="time" defaultValue="23:00" className="w-full border p-3 rounded-lg bg-gray-50" />
                          </div>
                      </div>
                      <div className="pt-4">
                          <button type="submit" className="w-full bg-[#D62828] text-white py-3 rounded-xl font-bold shadow-md">Save Changes</button>
                      </div>
                  </form>
               </div>
            )}
         </div>
      </main>
    </div>
  );
}
