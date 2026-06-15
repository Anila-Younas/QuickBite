import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import LocationPicker from '../../components/LocationPicker';

// Helper function to get image based on item name and category
const getImageForItem = (name, category, idx) => {
  const itemName = name.toLowerCase();
  
  // Specific food images
  const foodImages = {
    'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a7f8?w=300&h=200&fit=crop',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop',
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop',
    'paratha': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop',
    'karahi': 'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=300&h=200&fit=crop',
    'chai': 'https://images.unsplash.com/photo-1563822249366-3efb23b9e3c5?w=300&h=200&fit=crop',
    'tea': 'https://images.unsplash.com/photo-1563822249366-3efb23b9e3c5?w=300&h=200&fit=crop',
    'cold drink': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'coke': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'pepsi': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop',
    'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop',
    'ice cream': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop',
    'fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
    'chicken': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&h=200&fit=crop',
    'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=200&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1536304993881-ff6909a3178c?w=300&h=200&fit=crop'
  };
  
  // Check if item name matches any specific food
  for (const key in foodImages) {
    if (itemName.includes(key)) {
      return foodImages[key];
    }
  }
  
  // Fallback to category-based images
  const categoryImages = {
    'Main': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
    'Sides': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
    'Drinks': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'Dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop',
    'Starters': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'BBQ': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop',
    'Breakfast': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop'
  };
  
  return categoryImages[category] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop';
};

const getFallbackImage = (category) => {
  const categoryImages = {
    'Main': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
    'Sides': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop',
    'Drinks': 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop',
    'Dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop',
    'Starters': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'BBQ': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop',
    'Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop',
    'Breakfast': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=200&fit=crop'
  };
  return categoryImages[category] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop';
};

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [cart, setCart] = useState([]);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [address, setAddress] = useState('');
  const [userLoc, setUserLoc] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/catalog/${id}`)
      .then(res => {
        setRestaurant(res.data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load restaurant');
      });
      
    axios.get(`http://localhost:5000/catalog/${id}/reviews`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err));
      
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [id]);

  const addToCart = (item) => {
    const finalPrice = item.final_price !== undefined ? item.final_price : item.price;
    setCart(prev => {
      const exist = prev.find(i => i.name === item.name);
      if (exist) {
        return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, price: finalPrice, original_price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (name, amount) => {
    setCart(prev => {
      const mapped = prev.map(i => i.name === name ? { ...i, quantity: i.quantity + amount } : i);
      return mapped.filter(i => i.quantity > 0);
    });
  };

  // Calculate original subtotal (without discounts)
  const originalSubtotal = cart.reduce((acc, curr) => {
    const itemOriginalPrice = curr.original_price !== undefined ? curr.original_price : curr.price;
    return acc + (itemOriginalPrice * curr.quantity);
  }, 0);
  
  // Calculate subtotal with discounts
  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  
  // Calculate discount amount
  const discountAmount = originalSubtotal - subtotal;
  
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

  if (error) return <div className="min-h-screen flex items-center justify-center text-2xl text-red-500">{error}</div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-2xl">Loading...</div>;

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
             {restaurant.menu?.map((item, idx) => {
               const displayPrice = item.final_price !== undefined ? item.final_price : item.price;
               const hasDiscount = item.original_price !== undefined && item.original_price !== displayPrice;
               return (
                <div key={item.name} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                    <div className="w-32 h-24 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                            className="w-full h-full object-cover"
                            src={item.image_url || getImageForItem(item.name, item.category, idx)}
                            alt={item.name}
                            onError={(e) => { 
                              e.target.src = getFallbackImage(item.category);
                            }}
                        />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                              {hasDiscount ? (
                                <div className="flex items-center gap-2">
                                  <span className="line-through text-gray-400 text-sm">Rs. {item.original_price}</span>
                                  <span className="font-bold text-[#f97316]">Rs. {displayPrice.toFixed(0)}</span>
                                </div>
                              ) : (
                                <p className="font-bold text-[#f97316]">Rs. {displayPrice}</p>
                              )}
                            </div>
                            <button 
                               onClick={() => addToCart(item)}
                               disabled={!item.available}
                               className="bg-[#f97316] text-white px-4 py-2 rounded-lg font-bold self-start disabled:opacity-50">
                               Add
                            </button>
                        </div>
                    </div>
                </div>
               );
             })}
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
             <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
             {reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> : (
                <div className="space-y-4">
                   {reviews.map((r, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                                    {r.customer_id ? `C${r.customer_id}` : 'U'}
                                 </div>
                                 <div>
                                    <p className="font-bold">Customer {r.customer_id}</p>
                                    <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                                 </div>
                             </div>
                             <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-bold text-sm">
                                 ★ {r.restaurant_rating || 'N/A'}
                             </div>
                         </div>
                         {r.comment && <p className="text-gray-700 mt-3">{r.comment}</p>}
                      </div>
                   ))}
                </div>
             )}
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
                            <div className="flex justify-between text-gray-600"><p>Original Subtotal</p><p>Rs. {originalSubtotal}</p></div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <p>Discount</p>
                                    <p>- Rs. {discountAmount}</p>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600"><p>Subtotal (after discount)</p><p>Rs. {subtotal}</p></div>
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
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">Checkout</h2>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Location *</label>
                    <LocationPicker
                      value={userLoc}
                      onChange={(newLoc) => setUserLoc(newLoc)}
                      address={address}
                      onAddressChange={setAddress}
                      placeholder="Enter address or pick from map"
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
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Original Subtotal:</span>
                        <span>Rs. {originalSubtotal}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600 font-medium">
                            <span>Discount:</span>
                            <span>- Rs. {discountAmount}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span>Delivery Fee:</span>
                        <span>Rs. {deliveryFee}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="font-bold">Grand Total:</span>
                        <span className="font-bold text-xl text-[#f97316]">Rs. {total}</span>
                    </div>
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
