import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/catalog/${id}`)
      .then(res => setRestaurant(res.data))
      .catch(err => console.error(err));
      
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [id]);

  const addToCart = (item) => {
    setCart(prev => {
      const exist = prev.find(i => i.name === item.name);
      if (exist) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (name, amount) => {
    setCart(prev => {
      const mapped = prev.map(i => i.name === name ? { ...i, quantity: i.quantity + amount } : i);
      return mapped.filter(i => i.quantity > 0);
    });
  };

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const deliveryFee = restaurant?.delivery_fee || 50;
  const total = subtotal + (cart.length > 0 ? deliveryFee : 0);

  const placeOrder = async () => {
    if (!address) return alert('Address is required');
    try {
      const res = await axios.post('http://localhost:5000/customer/order/create', {
        restaurant_id: parseInt(id),
        items: cart,
        total_amount: total,
        delivery_address: address,
        payment_method: paymentMethod,
        lat: userLoc?.lat || 32.5967,
        lng: userLoc?.lng || 71.8234
      }, { headers: { 'x-user-id': '2' } }); // Mock logged in user 2
      
      if (res.data.success) {
        navigate(`/customer/tracking/${res.data.order_id}`);
      }
    } catch(err) {
      alert('Error placing order: ' + err.response?.data?.error || err.message);
    }
  };

  if (!restaurant) return <div>Loading...</div>;

  return (
    <div className="bg-[#FCF8F5] min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="bg-white p-8 rounded-2xl shadow-sm mb-8">
             <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
             <p className="text-gray-600 mb-4">{restaurant.cuisine?.join(', ')} • {restaurant.city_zone}</p>
             <div className="flex gap-4">
                 <span className="bg-gray-100 px-3 py-1 rounded text-sm font-bold">★ {restaurant.avg_rating || 'New'}</span>
                 <span className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-700">Delivery: Rs. {deliveryFee}</span>
             </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-6">Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {restaurant.menu?.map(item => (
                <div key={item.name} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between">
                    <div>
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                        <p className="font-bold text-[#f97316]">Rs. {item.price}</p>
                    </div>
                    <button 
                       onClick={() => addToCart(item)}
                       disabled={!item.available}
                       className="bg-[#f97316] text-white px-4 py-2 rounded-lg font-bold self-start disabled:opacity-50">
                       Add
                    </button>
                </div>
             ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-full lg:w-96">
            <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-24">
                <h2 className="text-2xl font-bold mb-6 border-b pb-4">Your Cart</h2>
                {cart.length === 0 ? <p className="text-gray-500">Cart is empty</p> : (
                    <>
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {cart.map(item => (
                                <div key={item.name} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-sm text-gray-500">Rs. {item.price} x {item.quantity}</p>
                                    </div>
                                    <div className="flex gap-2 items-center bg-gray-100 rounded p-1">
                                        <button onClick={() => updateQty(item.name, -1)} className="px-2 font-bold">-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQty(item.name, 1)} className="px-2 font-bold">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-gray-600"><p>Subtotal</p><p>Rs. {subtotal}</p></div>
                            <div className="flex justify-between text-gray-600"><p>Delivery Fee</p><p>Rs. {deliveryFee}</p></div>
                            <div className="flex justify-between font-bold text-lg"><p>Total</p><p>Rs. {total}</p></div>
                        </div>
                        <button 
                            onClick={() => setCheckoutModal(true)}
                            className="w-full bg-[#f97316] text-white font-bold py-3 rounded-xl mt-6 hover:bg-orange-600">
                            Go To Checkout
                        </button>
                    </>
                )}
            </div>
        </div>
      </main>

      {/* Checkout Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Checkout</h2>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Address *</label>
                    <textarea 
                       className="w-full border border-gray-300 p-3 rounded-lg" 
                       rows="3" 
                       value={address} 
                       onChange={(e) => setAddress(e.target.value)}
                       placeholder="Enter full delivery address"
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Payment Method</label>
                    <select 
                       className="w-full border border-gray-300 p-3 rounded-lg"
                       value={paymentMethod}
                       onChange={(e) => setPaymentMethod(e.target.value)}>
                       <option value="CASH">Cash on Delivery</option>
                       <option value="WALLET">Wallet</option>
                       <option value="CARD">Credit/Debit Card</option>
                    </select>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mb-6 border">
                    <span className="font-bold">Grand Total:</span>
                    <span className="font-bold text-xl text-[#f97316]">Rs. {total}</span>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setCheckoutModal(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancel</button>
                    <button onClick={placeOrder} className="flex-1 bg-[#f97316] text-white py-3 rounded-xl font-bold shadow-md">Place Order</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
