import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import Map from '../../components/Map';
import { io } from 'socket.io-client';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [socket, setSocket] = useState(null);
  
  // Chat
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');
  
  // Rating
  const [ratingModal, setRatingModal] = useState(false);
  const [restRating, setRestRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchOrder = () => axios.get(`http://localhost:5000/customer/order/${id}`).then(res => setOrder(res.data)).catch(err=>console.error(err));
    const fetchChat = () => axios.get(`http://localhost:5000/chat/${id}`).then(res => setChat(res.data)).catch(err=>console.error(err));
    
    fetchOrder();
    fetchChat();

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join_order_room', id);

    newSocket.on('order_update', (data) => {
      if (data.order_id === parseInt(id)) {
        setOrder(prev => ({ ...prev, STATUS: data.new_status }));
        if (data.new_status === 'DELIVERED') setRatingModal(true);
      }
    });

    newSocket.on('rider_location_update', (data) => {
      setRiderLocation([data.lat, data.lng]);
    });

    newSocket.on('new_chat_message', (msg) => {
      setChat(prev => [...prev, msg]);
    });

    const int = setInterval(fetchOrder, 15000);
    return () => { newSocket.close(); clearInterval(int); }
  }, [id]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await axios.post(`http://localhost:5000/chat/${id}`, { sender_role: 'CUSTOMER', message });
      setMessage('');
    } catch(err) {
      console.error(err);
    }
  };

  const submitReview = async () => {
    try {
      await axios.post('http://localhost:5000/catalog/review', {
        order_id: id,
        customer_id: order.CUST_ID,
        restaurant_id: order.REST_ID,
        rider_id: order.RIDER_ID,
        restaurant_rating: restRating,
        rider_rating: riderRating,
        comment
      });
      setRatingModal(false);
      alert('Thank you for your review!');
    } catch(err) {
      console.error(err);
    }
  };

  if (!order) return <div>Loading Tracking Data...</div>;

  const mapMarkers = [ { position: [32.5837, 71.5241], label: 'You (Dropoff)' } ];
  if (riderLocation) mapMarkers.push({ position: riderLocation, label: 'Rider Live' });

  const getStatusText = () => {
    if (order.STATUS === 'PLACED') return 'Order Placed, Waiting for Restaurant';
    if (order.STATUS === 'CONFIRMED') return 'Restaurant Accepted Order';
    if (order.STATUS === 'PREPARING') return 'Food is being prepared';
    if (order.STATUS === 'PICKED_UP') return 'Rider has picked up your food';
    if (order.STATUS === 'DELIVERED') return 'Delivered successfully!';
    return order.STATUS;
  };

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h1 className="text-2xl font-bold mb-1">Order #{id}</h1>
          <p className="text-gray-500 mb-6">{order.RESTAURANT_NAME}</p>
          
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-8 text-center">
             <h2 className="text-xl text-orange-600 font-extrabold animate-pulse">{getStatusText()}</h2>
          </div>
          
          {/* Timeline */}
          <div className="space-y-6 flex-1">
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PLACED', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500' : 'bg-gray-300'}`}>✓</div>
                <p className="font-bold">Placed</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PREPARING', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500' : 'bg-gray-300'}`}>🍳</div>
                <p className="font-bold">Preparing</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500' : 'bg-gray-300'}`}>🛵</div>
                <p className="font-bold">On the way</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${['DELIVERED'].includes(order.STATUS) ? 'bg-green-500' : 'bg-gray-300'}`}>🏠</div>
                <p className="font-bold">Delivered</p>
             </div>
          </div>
          
          <button 
             onClick={() => window.print()}
             className="w-full mt-6 py-3 border-2 border-gray-200 font-bold rounded-xl text-gray-700 hover:bg-gray-50">
             Download Receipt
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
            <div className="w-full h-[400px] bg-gray-200 rounded-2xl overflow-hidden shadow-sm relative border">
               <Map center={riderLocation || [32.5837, 71.5241]} markers={mapMarkers} zoom={14} />
            </div>

            {/* Chat Box - Visible after picked up */}
            {['PICKED_UP', 'DELIVERED'].includes(order.STATUS) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[300px]">
                 <div className="p-4 border-b bg-gray-50 rounded-t-2xl font-bold">Chat with Rider</div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chat.map((c, i) => (
                       <div key={i} className={`flex ${c.sender_role === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${c.sender_role === 'CUSTOMER' ? 'bg-[#f97316] text-white' : 'bg-gray-200 text-gray-800'}`}>
                             {c.message}
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="p-3 border-t flex gap-2">
                    <input 
                       value={message} onChange={e=>setMessage(e.target.value)}
                       onKeyPress={e => e.key==='Enter' && sendMessage()}
                       className="flex-1 border rounded-full px-4 py-2 focus:outline-none" 
                       placeholder="Type a message..." 
                    />
                    <button onClick={sendMessage} className="bg-[#f97316] text-white w-10 h-10 rounded-full font-bold">↑</button>
                 </div>
              </div>
            )}
        </div>
      </main>

      {/* Review Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-3xl font-bold mb-2">Order Delivered!</h2>
                <p className="text-gray-500 mb-6">How was your experience?</p>
                
                <div className="mb-4">
                    <p className="font-bold mb-2">Rate {order.RESTAURANT_NAME}</p>
                    <div className="flex justify-center gap-2 text-3xl">
                        {[1,2,3,4,5].map(s => <span key={s} onClick={()=>setRestRating(s)} className={`cursor-pointer ${s <= restRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>)}
                    </div>
                </div>

                <div className="mb-6">
                    <p className="font-bold mb-2">Rate your Rider</p>
                    <div className="flex justify-center gap-2 text-3xl">
                        {[1,2,3,4,5].map(s => <span key={s} onClick={()=>setRiderRating(s)} className={`cursor-pointer ${s <= riderRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>)}
                    </div>
                </div>

                <textarea 
                   value={comment} onChange={e=>setComment(e.target.value)}
                   placeholder="Add a comment (optional)..."
                   className="w-full border p-3 rounded-lg mb-6" rows="3"
                />

                <button onClick={submitReview} className="w-full bg-[#f97316] text-white py-3 rounded-xl font-bold shadow-md">Submit Review</button>
                <button onClick={()=>setRatingModal(false)} className="w-full mt-2 py-3 text-gray-500 font-bold">Skip</button>
            </div>
        </div>
      )}
    </div>
  );
}
