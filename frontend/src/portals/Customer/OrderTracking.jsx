import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import Map from '../../components/Map';
import { io } from 'socket.io-client';

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

  const eta = useMemo(() => {
    if (!order || order.STATUS !== 'PICKED_UP') return null;
    
    // Get locations
    const customerLoc = order.customer_location;
    const riderLoc = riderLocation ? [riderLocation[0], riderLocation[1]] : 
                    (order.rider_location ? [order.rider_location.coordinates[1], order.rider_location.coordinates[0]] : null);
                    
    if (!customerLoc || !riderLoc) return null;
    
    const distance = calculateDistance(customerLoc.lat, customerLoc.lng, riderLoc[0], riderLoc[1]);
    const minutes = estimateTime(distance);
    return minutes;
  }, [order, riderLocation]);

  // Determine initial map center and markers (ALL HOOKS BEFORE EARLY RETURN!)
  const mapCenter = useMemo(() => {
    if (riderLocation) return riderLocation;
    if (order?.customer_location) return [order.customer_location.lat, order.customer_location.lng];
    return [32.5837, 71.5241];
  }, [riderLocation, order]);

  const mapMarkers = useMemo(() => {
    const markers = [];
    if (order?.customer_location) {
      markers.push({ position: [order.customer_location.lat, order.customer_location.lng], label: 'You (Dropoff)', type: 'customer' });
    }
    if (order?.restaurant_location) {
      markers.push({ position: [order.restaurant_location.coordinates[1], order.restaurant_location.coordinates[0]], label: 'Restaurant', type: 'restaurant' });
    }
    if (riderLocation) {
      markers.push({ position: riderLocation, label: 'Rider Live', type: 'rider' });
    } else if (order?.rider_location) {
      markers.push({ position: [order.rider_location.coordinates[1], order.rider_location.coordinates[0]], label: 'Rider Last', type: 'rider' });
    }
    return markers;
  }, [order, riderLocation]);

  useEffect(() => {
    const fetchOrder = () => axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data)).catch(err=>console.error(err));
    const fetchChat = () => axios.get(`http://localhost:5000/chat/${id}`).then(res => setChat(res.data)).catch(err=>console.error(err));
    
    fetchOrder();
    fetchChat();

    console.log(`[Customer Chat] Connecting to socket for order ${id}`);
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('[Customer Chat] Socket connected:', newSocket.id);
      newSocket.emit('join_order_room', id);
    });

    newSocket.on('disconnect', () => {
      console.log('[Customer Chat] Socket disconnected');
    });

    newSocket.on('order_update', (data) => {
      if (data.order_id === parseInt(id)) {
        setOrder(prev => prev ? ({ ...prev, STATUS: data.new_status, RIDER_ID: data.rider_id || prev.RIDER_ID }) : null);
        if (data.new_status === 'DELIVERED') setRatingModal(true);
      }
    });

    newSocket.on('rider_location_update', (data) => {
      setRiderLocation([data.lat, data.lng]);
    });

    newSocket.on('new_chat_message', (msg) => {
      console.log('[Customer Chat] Received new_chat_message:', msg);
      setChat(prev => {
        // Check if message already exists (by _id first, then tempId)
        const isDuplicate = prev.some(m => 
          (m._id && msg._id && m._id === msg._id) || 
          (m._tempId && (msg._tempId && m._tempId === msg._tempId))
        );
        if (isDuplicate) {
          // If it's a temp message being replaced, update it
          if (msg._id) {
            return prev.map(m => 
              m._tempId ? msg : m
            );
          }
          console.log('[Customer Chat] Ignoring duplicate message');
          return prev;
        }
        return [...prev, msg];
      });
    });

    const int = setInterval(fetchOrder, 15000);
    return () => { newSocket.close(); clearInterval(int); }
  }, [id]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const currentMessage = message;
    setMessage(''); // Clear input immediately
    
    // Generate unique client-side ID to prevent duplicates
    const tempId = Date.now().toString() + Math.random().toString(36);
    const newMsg = {
      _tempId: tempId,
      order_id: parseInt(id),
      sender_role: 'CUSTOMER',
      message: currentMessage,
      timestamp: new Date()
    };
    
    // Add to local chat immediately
    setChat(prev => [...prev, newMsg]);
    
    try {
      const response = await axios.post(`http://localhost:5000/chat/${id}`, { 
        sender_role: 'CUSTOMER', 
        message: currentMessage 
      });
      
      // Replace temporary message with the server's response
      setChat(prev => prev.map(msg => 
        msg._tempId === tempId ? response.data : msg
      ));
    } catch(err) {
      console.error(err);
      // If error, remove the temporary message
      setChat(prev => prev.filter(msg => msg._tempId !== tempId));
      alert('Failed to send message');
    }
  };

  const submitReview = async () => {
    if (!order) return;
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

  // Calculate customer-friendly order number (simplified)
  const customerOrderNumber = 1;

  const getStatusText = () => {
    if (order.STATUS === 'PLACED') return 'Order Placed, Waiting for Restaurant';
    if (order.STATUS === 'CONFIRMED') return 'Restaurant Accepted Order';
    if (order.STATUS === 'PREPARING') return 'Food is being prepared';
    if (order.STATUS === 'PACKED') return 'Food is packed and ready for rider';
    if (order.STATUS === 'WAITING_FOR_PICKUP') return 'Waiting for rider to pick up';
    if (order.STATUS === 'PICKED_UP') return 'Rider has picked up your food and is on the way!';
    if (order.STATUS === 'DELIVERED') return 'Delivered successfully!';
    return order.STATUS;
  };

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h1 className="text-2xl font-bold mb-1">Order #{customerOrderNumber}</h1>
              <p className="text-gray-500 mb-6">{order.RESTAURANT_NAME}</p>
              
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4 text-center">
                 <h2 className="text-xl text-orange-600 font-extrabold animate-pulse">{getStatusText()}</h2>
              </div>
              
              {eta !== null && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8 text-center">
                  <h3 className="text-lg text-blue-700 font-bold">
                    {eta <= 1 ? 'Arriving any minute now!' : `Arriving in ${eta} minutes`}
                  </h3>
                </div>
              )}
          
          {/* Timeline */}
          <div className="space-y-4 flex-1">
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
                <p className="font-bold">Order Received</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
                <p className="font-bold">Preparing</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
                <p className="font-bold">Packed</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
                <p className="font-bold">Waiting For Pickup</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? 'bg-orange-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['WAITING_FOR_PICKUP', 'PICKED_UP', 'DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
                <p className="font-bold">On The Way</p>
             </div>
             <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['DELIVERED'].includes(order.STATUS) ? 'bg-green-500 text-white' : 'border-2 border-gray-300'}`}>
                  {['DELIVERED'].includes(order.STATUS) ? '✔' : ''}
                </div>
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
               <Map center={mapCenter} markers={mapMarkers} zoom={14} />
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
