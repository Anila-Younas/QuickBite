import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const OffersPage = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    // Fetch Offers
    axios.get('http://localhost:5000/catalog/offers')
      .then(res => setOffers(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Special Offers</h1>
          <p className="text-gray-500">Discover amazing discounts and deals from local restaurants.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {offers.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">No offers available at the moment.</div>
            ) : (
              offers.map(off => (
                <div 
                    key={off._id || off.restaurant_id} 
                    onClick={() => navigate(`/customer/restaurant/${off.restaurant_id}`)} 
                    className="bg-white group overflow-hidden rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-gray-100 transition-all"
                >
                    <div className="h-48 bg-gradient-to-r from-[#f97316] to-[#ea580c] overflow-hidden relative p-6 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-20"></div>
                        <div className="relative text-center">
                            <div className="text-6xl font-black text-white drop-shadow-lg">
                                {off.discount_pct}%
                            </div>
                            <div className="text-white font-bold text-xl mt-2">OFF</div>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                <span>🍴</span>
                                {off.restaurant_name}
                            </span>
                        </div>
                        <h3 className="font-extrabold text-xl text-gray-900 mb-2">{off.title}</h3>
                        <p className="text-gray-600 leading-relaxed line-clamp-3">{off.description}</p>
                        <div className="mt-4 flex items-center gap-2 text-[#E53E3E] font-bold text-sm">
                            <span>View Restaurant</span>
                            <span>→</span>
                        </div>
                    </div>
                </div>
              ))
            )}
        </div>
      </main>
    </div>
  );
};

export default OffersPage;