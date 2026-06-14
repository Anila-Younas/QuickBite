import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Clock, Info, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import Map from '../components/Map';

const OrderTrackingPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  // Mianwali defaults
  const [markers, setMarkers] = useState([
    { position: [32.5837, 71.5241], label: 'You' },
    { position: [32.5967, 71.8234], label: 'Restaurant' }
  ]);

  useEffect(() => {
    // Fetch order details
    axios.get(`http://localhost:5000/orders/${id}`)
      .then(res => setOrder(res.data))
      .catch(console.error);

    // Fetch chat history
    axios.get(`http://localhost:5000/chat/${id}`)
      .then(res => setMessages(res.data))
      .catch(console.error);

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join_order_room', id);

    newSocket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => newSocket.close();
  }, [id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await axios.post('http://localhost:5000/chat/message', {
        order_id: id,
        sender_id: user.id,
        sender_role: user.role,
        message: newMessage
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Tracking</h1>
            <p className="text-gray-500">Order #{id} <span className="font-medium text-red-600">Active</span></p>
          </div>
          <div className="bg-red-50 text-red-600 font-medium px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Live Tracking
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Status Column */}
          <div className="flex-1 flex flex-col gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Status</p>
                  <h2 className="text-2xl font-bold text-gray-900">{order?.STATUS || 'PREPARING'}</h2>
                </div>
              </div>
              <div className="bg-[#FCF8F5] rounded-xl p-4 flex gap-3 border border-gray-100">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your order is actively tracked via Oracle acid transactions & MongoDB geospatial queues.
                </p>
              </div>
            </div>

            {/* Chat UI */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-[400px]">
              <h3 className="font-bold text-lg mb-4 border-b pb-2">Live Chat</h3>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${m.sender_id === user.id ? 'bg-red-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                      <p className="text-sm">{m.message}</p>
                      <span className={`text-[10px] mt-1 block ${m.sender_id === user.id ? 'text-red-200' : 'text-gray-400'}`}>
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-red-300"
                  placeholder="Message your rider..."
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column (Map) */}
          <div className="w-full lg:w-[450px] flex flex-col gap-4">
            <div className="bg-gray-200 rounded-2xl overflow-hidden h-[500px] relative border border-gray-100 shadow-sm">
              <Map center={[32.5837, 71.5241]} markers={markers} />
              
              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 shadow-md flex items-center gap-3 z-[400]">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">R</div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Rider Assigned</p>
                  <p className="text-[10px] text-gray-500">Mianwali Delivery Network</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderTrackingPage;
