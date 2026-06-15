import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null); // { orderId, restaurantId, riderId }
  const [reviewData, setReviewData] = useState({
    restaurant_rating: 5,
    rider_rating: 5,
    comment: ''
  });

  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/customer/orders`, { headers });
      setOrders(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.post(`http://localhost:5000/orders/${orderId}/status`, { status: 'CANCELLED' }, { headers });
      fetchOrders();
    } catch (err) {
      alert('Failed to cancel order: ' + (err.response?.data?.error || err.message));
    }
  };

  const submitReview = async () => {
    try {
      await axios.post('http://localhost:5000/catalog/review', {
        order_id: reviewModal.orderId,
        customer_id: user?.id,
        restaurant_id: reviewModal.restaurantId,
        rider_id: reviewModal.riderId,
        ...reviewData
      }, { headers });
      alert('Review submitted successfully!');
      setReviewModal(null);
      setReviewData({ restaurant_rating: 5, rider_rating: 5, comment: '' });
      fetchOrders();
    } catch (err) {
      alert('Failed to submit review: ' + (err.response?.data?.error || err.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PLACED': 'bg-blue-100 text-blue-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'PREPARING': 'bg-yellow-100 text-yellow-700',
      'PACKED': 'bg-pink-100 text-pink-700',
      'WAITING_FOR_PICKUP': 'bg-purple-100 text-purple-700',
      'PICKED_UP': 'bg-orange-100 text-orange-700',
      'DELIVERED': 'bg-emerald-100 text-emerald-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-24">
        <h1 className="text-3xl font-extrabold mb-8">Order History</h1>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No orders yet</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <div key={order.ORDER_ID} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Order #{index + 1}</h3>
                    <p className="text-sm text-gray-500">{order.RESTAURANT_NAME}</p>
                    <p className="text-xs text-gray-400">{new Date(order.CREATED_AT).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.STATUS)}`}>
                    {order.STATUS}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">Rs. {order.TOTAL_AMOUNT}</p>
                  <div className="flex gap-2">
                    {order.STATUS === 'PLACED' && (
                      <button 
                        onClick={() => cancelOrder(order.ORDER_ID)}
                        className="text-red-500 font-bold text-sm hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                    {order.STATUS === 'DELIVERED' && (
                      <button 
                        onClick={() => setReviewModal({ 
                          orderId: order.ORDER_ID, 
                          restaurantId: order.RESTAURANT_ID, 
                          riderId: order.RIDER_ID 
                        })}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600"
                      >
                        Leave Review
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/tracking/${order.ORDER_ID}`)}
                      className="bg-[#f97316] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">Leave a Review</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Restaurant Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setReviewData(d => ({ ...d, restaurant_rating: star }))}
                    className={`text-2xl ${reviewData.restaurant_rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Rider Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setReviewData(d => ({ ...d, rider_rating: star }))}
                    className={`text-2xl ${reviewData.rider_rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Comment (Optional)</label>
              <textarea 
                className="w-full border rounded-lg p-3 h-24"
                placeholder="Tell us about your experience..."
                value={reviewData.comment}
                onChange={(e) => setReviewData(d => ({ ...d, comment: e.target.value }))}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setReviewModal(null)}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                className="flex-1 py-3 rounded-xl font-bold bg-[#f97316] text-white hover:bg-orange-600"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}