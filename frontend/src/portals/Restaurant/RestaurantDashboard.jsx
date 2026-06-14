import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Receipt, UtensilsCrossed, Tag, Bike, BarChart3, Star, Settings, Trash2 } from 'lucide-react';

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [offers, setOffers] = useState([]);
  const [riders, setRiders] = useState([]);

  const headers = { 'x-user-id': '6', 'x-restaurant-id': '1' }; // Mock auth for Namal Cafe

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 10000);
    return () => clearInterval(int);
  }, []);

  const fetchData = async () => {
    try {
      const [st, ord, mn, off, rid] = await Promise.all([
        axios.get('http://localhost:5000/restaurant/dashboard', { headers }),
        axios.get('http://localhost:5000/restaurant/orders', { headers }),
        axios.get('http://localhost:5000/restaurant/menu', { headers }),
        axios.get('http://localhost:5000/restaurant/offers', { headers }),
        axios.get('http://localhost:5000/restaurant/riders', { headers })
      ]);
      setStats(st.data);
      setOrders(ord.data);
      setMenu(mn.data);
      setOffers(off.data);
      setRiders(rid.data);
    } catch(err) {
      console.error(err);
    }
  };

  const updateStatus = async (id, status) => {
    await axios.put(`http://localhost:5000/restaurant/order/status/${id}`, { status }, { headers });
    fetchData();
  };

  const assignRider = async (orderId, riderId) => {
    await axios.post(`http://localhost:5000/restaurant/order/assign/${orderId}`, { rider_id: riderId }, { headers });
    fetchData();
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    const item = { 
       name: e.target.name.value, 
       price: parseInt(e.target.price.value), 
       category: e.target.category.value,
       description: e.target.description.value,
       available: true
    };
    await axios.post('http://localhost:5000/restaurant/menu/item', item, { headers });
    fetchData();
    e.target.reset();
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
      restaurant_name: "Namal Cafe" // In reality, get from profile
    };
    await axios.post('http://localhost:5000/restaurant/offers', offer, { headers });
    fetchData();
    e.target.reset();
  };
  
  const toggleOffer = async (id, status) => {
    await axios.put(`http://localhost:5000/restaurant/offers/${id}`, { is_active: !status }, { headers });
    fetchData();
  };

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
            <div className="w-10 h-10 bg-[#D62828] text-white rounded-xl flex items-center justify-center font-bold">NC</div>
            <div>
               <h2 className="font-bold text-lg leading-tight">Namal Cafe</h2>
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
               <div className="space-y-6">
                  {orders.length === 0 ? <p className="text-gray-500">No active orders</p> : orders.map(o => (
                     <div key={o.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h3 className="text-xl font-bold">Order #{o.ORDER_ID}</h3>
                                 <p className="text-gray-500">{o.CUSTOMER_NAME} • {o.PHONE}</p>
                                 <p className="text-gray-500 text-sm">{o.DELIVERY_ADDRESS}</p>
                              </div>
                              <span className="bg-[#D62828]/10 text-[#D62828] px-3 py-1 rounded-full text-sm font-bold">{o.STATUS}</span>
                           </div>
                           
                           <div className="bg-gray-50 p-4 rounded-xl mb-4">
                              {o.ITEMS?.map((item, idx) => (
                                 <div key={idx} className="flex justify-between text-sm">
                                    <span>{item.QUANTITY}x {item.MENU_ITEM_NAME}</span>
                                    <span>Rs. {item.UNIT_PRICE * item.QUANTITY}</span>
                                 </div>
                              ))}
                              <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                                 <span>Total</span>
                                 <span>Rs. {o.TOTAL_AMOUNT}</span>
                              </div>
                           </div>
                        </div>

                        <div className="w-full md:w-64 flex flex-col gap-3 justify-center border-l pl-6">
                           {o.STATUS === 'PLACED' && <button onClick={() => updateStatus(o.ORDER_ID, 'CONFIRMED')} className="bg-blue-600 text-white py-3 rounded-xl font-bold w-full hover:bg-blue-700">Accept Order</button>}
                           {o.STATUS === 'CONFIRMED' && <button onClick={() => updateStatus(o.ORDER_ID, 'PREPARING')} className="bg-orange-500 text-white py-3 rounded-xl font-bold w-full hover:bg-orange-600">Start Preparing</button>}
                           {o.STATUS === 'PREPARING' && <button onClick={() => updateStatus(o.ORDER_ID, 'PACKED')} className="bg-green-600 text-white py-3 rounded-xl font-bold w-full hover:bg-green-700">Mark as Packed</button>}
                           {o.STATUS === 'PACKED' && <button onClick={() => updateStatus(o.ORDER_ID, 'WAITING_FOR_PICKUP')} className="bg-purple-600 text-white py-3 rounded-xl font-bold w-full hover:bg-purple-700">Ready for Pickup</button>}
                           {o.STATUS === 'WAITING_FOR_PICKUP' && (
                              <div className="space-y-2">
                                 <p className="text-sm font-bold">Assign Rider:</p>
                                 {riders.filter(r => r.status === 'AVAILABLE').map(r => (
                                    <button key={r.oracle_rider_id} onClick={() => assignRider(o.ORDER_ID, r.oracle_rider_id)} className="w-full border py-2 rounded-lg hover:bg-gray-50">Assign #{r.oracle_rider_id}</button>
                                 ))}
                              </div>
                           )}
                           <button onClick={() => updateStatus(o.ORDER_ID, 'CANCELLED')} className="text-red-500 font-bold py-2 mt-2">Cancel Order</button>
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {activeTab === 'Menu' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                     {menu.map(item => (
                        <div key={item.name} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                           <div>
                              <h4 className="font-bold text-lg">{item.name}</h4>
                              <p className="text-sm text-gray-500">{item.category} • Rs. {item.price}</p>
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
                              <button onClick={() => toggleOffer(off._id, off.is_active)} className={`px-4 py-1 rounded-full font-bold text-sm ${off.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                 {off.is_active ? 'Active' : 'Inactive'}
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div>
                     <form onSubmit={addOffer} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4">Create Offer</h3>
                        <input name="title" required placeholder="Offer Title (e.g. Weekend Special)" className="w-full border p-3 rounded-lg mb-3" />
                        <input name="discount" type="number" required placeholder="Discount Percentage (e.g. 20)" className="w-full border p-3 rounded-lg mb-4" />
                        <button type="submit" className="w-full bg-[#D62828] text-white py-3 rounded-xl font-bold hover:bg-red-800">Create Promotion</button>
                     </form>
                  </div>
               </div>
            )}

            {activeTab === 'Riders' && (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {riders.map(r => (
                     <div key={r.oracle_rider_id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">🛵</div>
                        <h3 className="font-bold text-lg">Rider #{r.oracle_rider_id}</h3>
                        <p className={`text-sm font-bold mt-2 ${r.status==='AVAILABLE'?'text-green-600':'text-orange-600'}`}>{r.status}</p>
                     </div>
                  ))}
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
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-xl mb-6">Customer Reviews</h3>
                  <div className="text-center text-gray-500 py-12 border-2 border-dashed rounded-xl">
                      <Star className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p>Reviews will appear here once customers rate their delivered orders.</p>
                  </div>
               </div>
            )}

            {activeTab === 'Profile' && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
                  <h3 className="font-bold text-xl mb-6">Restaurant Profile</h3>
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Profile Saved'); }}>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Restaurant Name</label>
                          <input defaultValue="Namal Cafe" className="w-full border p-3 rounded-lg bg-gray-50" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Cuisine Type</label>
                          <input defaultValue="Fast Food, Pakistani" className="w-full border p-3 rounded-lg bg-gray-50" />
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
