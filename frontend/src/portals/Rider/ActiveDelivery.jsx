import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Map from '../../components/Map';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

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

const estimateTime = (distanceKm) => {
  const speedKmPerMin = 30 / 60; // 30 km/h = 0.5 km per minute
  const minutes = Math.ceil(distanceKm / speedKmPerMin);
  return minutes;
};

export default function ActiveDelivery() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Chat state
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);

  const headers = { 'x-user-id': user?.id };

  // Fetch rider location (simulated for now, or use navigator.geolocation)
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setRiderLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error(err)
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data));

    const fetchChat = () => axios.get(`http://localhost:5000/chat/${id}`).then(res => setChat(res.data)).catch(err=>console.error(err));
    fetchChat();

    console.log(`[Rider Chat] Connecting to socket for order ${id}`);
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('[Rider Chat] Socket connected:', newSocket.id);
      newSocket.emit('join_order_room', id);
    });

    newSocket.on('disconnect', () => {
      console.log('[Rider Chat] Socket disconnected');
    });

    newSocket.on('new_chat_message', (msg) => {
      console.log('[Rider Chat] Received new_chat_message:', msg);
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
          console.log('[Rider Chat] Ignoring duplicate message');
          return prev;
        }
        return [...prev, msg];
      });
    });

    return () => { newSocket.close(); }
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
      sender_role: 'RIDER',
      message: currentMessage,
      timestamp: new Date()
    };
    
    // Add to local chat immediately
    setChat(prev => [...prev, newMsg]);
    
    try {
      const response = await axios.post(`http://localhost:5000/chat/${id}`, { 
        sender_role: 'RIDER', 
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

  const markDelivered = async () => {
    try {
      await axios.post(`http://localhost:5000/rider/${id}/delivered`, {}, { headers });
      setTimeout(() => navigate('/rider/dashboard'), 1500);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const markers = useMemo(() => {
    const m = [];
    if (riderLocation) {
      m.push({ position: [riderLocation.lat, riderLocation.lng], label: 'You', type: 'rider' });
    }
    if (order?.restaurant_location?.coordinates) {
      m.push({ position: [order.restaurant_location.coordinates[1], order.restaurant_location.coordinates[0]], label: 'Restaurant', type: 'restaurant' });
    }
    if (order?.customer_location) {
      m.push({ position: [order.customer_location.lat, order.customer_location.lng], label: 'Customer', type: 'customer' });
    }
    return m;
  }, [order, riderLocation]);

  const eta = useMemo(() => {
    if (!order || !riderLocation) return null;
    // Calculate from rider's current position to customer if picked up, else to restaurant
    if (order.STATUS === 'PICKED_UP' && order.customer_location) {
      const dist = calculateDistance(
        riderLocation.lat, riderLocation.lng,
        order.customer_location.lat, order.customer_location.lng
      );
      return estimateTime(dist);
    } else if (order.restaurant_location) {
      const dist = calculateDistance(
        riderLocation.lat, riderLocation.lng,
        order.restaurant_location.coordinates[1], order.restaurant_location.coordinates[0]
      );
      return estimateTime(dist);
    }
    return null;
  }, [order, riderLocation]);

  if (!order) return <div>Loading order...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col md:flex-row gap-8">
       <div className="flex-1 space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-[#f97316]">
           <h1 className="text-3xl font-bold mb-2">Delivery #{id}</h1>
           <h2 className="text-xl font-bold text-[#f97316] mb-4">{order.STATUS}</h2>
           
           {eta !== null && (
             <p className="text-lg font-semibold mb-4 text-emerald-600">
               ⏱️ ETA: {eta} minutes
             </p>
           )}

           <div className="space-y-4 mb-8">
             <div className="bg-gray-50 p-4 rounded-xl">
               <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
               <p className="font-bold text-lg">Restaurant {order.RESTAURANT_NAME || order.RESTAURANT_ID}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-xl">
               <p className="text-xs text-gray-500 font-bold uppercase">Dropoff</p>
               <p className="font-bold text-lg">{order.DELIVERY_ADDRESS}</p>
             </div>
           </div>

           <div className="space-y-3">
             {order.STATUS === 'PICKED_UP' && (
               <button onClick={markDelivered} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 transition">
                 Order Delivered
               </button>
             )}
           </div>
         </div>
       </div>
       <div className="w-full md:w-[450px] flex flex-col gap-6">
         <div className="h-[400px] bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
           <Map 
              center={riderLocation || [32.5837, 71.5241]} 
              markers={markers} 
              zoom={14}
            />
         </div>
         {/* Chat Box */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[300px]">
            <div className="p-4 border-b bg-gray-50 rounded-t-2xl font-bold">Chat with Customer</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {chat.map((c, i) => (
                  <div key={i} className={`flex ${c.sender_role === 'RIDER' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${c.sender_role === 'RIDER' ? 'bg-[#4f378a] text-white' : 'bg-gray-200 text-gray-800'}`}>
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
               <button onClick={sendMessage} className="bg-[#4f378a] text-white w-10 h-10 rounded-full font-bold">↑</button>
            </div>
         </div>
       </div>
    </div>
  );
}