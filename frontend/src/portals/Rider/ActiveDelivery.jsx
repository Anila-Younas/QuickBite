import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Map from '../../components/Map';
import { useAuth } from '../../context/AuthContext';

export default function ActiveDelivery() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    // We use the public /orders/:id for now or a protected rider API
    axios.get(`http://localhost:5000/orders/${id}`).then(res => setOrder(res.data));
  }, [id]);

  const updateStatus = async (newStatus) => {
    await axios.put(`http://localhost:5000/orders/${id}/status`, { status: newStatus }, { headers });
    setOrder({ ...order, STATUS: newStatus });
    if (newStatus === 'DELIVERED') {
      setTimeout(() => navigate('/rider/dashboard'), 2000);
    }
  };

  if (!order) return <div>Loading route...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col md:flex-row gap-8">
       <div className="flex-1 space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-black">
           <h1 className="text-3xl font-bold mb-2">Delivery #{id}</h1>
           <h2 className="text-xl font-bold text-red-600 mb-4">{order.STATUS}</h2>
           
           <div className="space-y-4 mb-8">
             <div className="bg-gray-50 p-4 rounded-xl">
               <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
               <p className="font-bold text-lg">Restaurant {order.RESTAURANT_ID}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-xl">
               <p className="text-xs text-gray-500 font-bold uppercase">Dropoff</p>
               <p className="font-bold text-lg">{order.DELIVERY_ADDRESS}</p>
             </div>
           </div>

           <div className="space-y-3">
             {order.STATUS === 'CONFIRMED' && (
               <button onClick={() => updateStatus('PREPARING')} className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg hover:bg-gray-800 transition">
                 I've Arrived at Restaurant
               </button>
             )}
             {order.STATUS === 'PREPARING' && (
               <button onClick={() => updateStatus('PICKED_UP')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-blue-700 transition">
                 Order Picked Up
               </button>
             )}
             {order.STATUS === 'PICKED_UP' && (
               <button onClick={() => updateStatus('DELIVERED')} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 transition">
                 Order Delivered
               </button>
             )}
           </div>
         </div>
       </div>
       <div className="w-full md:w-[450px] h-[500px] bg-gray-200 rounded-2xl overflow-hidden shadow-inner">
         <Map center={[32.5837, 71.5241]} markers={[{ position: [32.5837, 71.5241], label: "Dropoff" }]} />
       </div>
    </div>
  );
}