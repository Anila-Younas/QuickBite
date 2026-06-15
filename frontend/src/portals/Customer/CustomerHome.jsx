import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import { Tag } from 'lucide-react';

export default function CustomerHome() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    // Fetch Offers
    axios.get('http://localhost:5000/catalog/offers')
      .then(res => setOffers(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let url = `http://localhost:5000/catalog/nearby?search=${search}`;
        const res = await axios.get(url);
        setRestaurants(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(() => {
      fetchRestaurants();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="bg-[#FCF8F5] min-h-screen text-gray-900 font-sans">
      <Header />

      <main className="pt-24 pb-12 max-w-[1440px] mx-auto px-4 md:px-8">
        
        {/* Search & Hero */}
        <div className="mb-10 text-center">
            <h1 className="text-4xl text-gray-800 font-extrabold mb-4">Discover the best food around you</h1>
            <div className="max-w-2xl mx-auto relative">
                <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    type="text" 
                    placeholder="Search by restaurant name or menu items (e.g. Biryani)..." 
                    className="w-full text-lg p-4 pl-6 border border-gray-300 rounded-full shadow-sm focus:ring-[#f97316] focus:border-[#f97316]"
                />
            </div>
        </div>

        {/* Offers Section - Scrolling Banner */}
        {offers.length > 0 && (
        <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <span className="text-[#f97316]"></span>
                Special Offers
            </h2>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ea580c] shadow-xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-20"></div>
                <div className="relative">
                    <div className="flex animate-scroll" style={{ animationDuration: `${offers.length * 8}s` }}>
                        {[...offers, ...offers, ...(offers.length < 3 ? offers : [])].map((off, idx) => (
                            <div 
                                key={`${off._id || idx}-${idx}`} 
                                className="flex-shrink-0 w-72 mx-3 my-5 cursor-pointer hover:scale-105 transition-all duration-300"
                                onClick={() => navigate(`/customer/restaurant/${off.restaurant_id}`)}
                            >
                                <div className="bg-white rounded-xl p-5 shadow-xl border-3 border-white/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 px-3 py-1 rounded-full text-base font-extrabold shadow-sm">
                                            {off.discount_pct}% OFF
                                        </span>
                                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                            <span>🍴</span>
                                            {off.restaurant_name}
                                        </span>
                                    </div>
                                    <h3 className="font-extrabold text-xl text-gray-900 mb-2">{off.title}</h3>
                                    <p className="text-gray-600 leading-relaxed line-clamp-3">{off.description}</p>
                                    <div className="mt-4 flex items-center gap-2 text-orange-600 font-bold text-sm">
                                        <span>Order Now</span>
                                        <span>→</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <style>{`
                    @keyframes scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-scroll {
                        display: flex;
                        width: max-content; /* Ensure it takes full content width */
                        animation: scroll linear infinite;
                    }
                `}</style>
            </div>
        </section>
        )}

        {/* Restaurants Section */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Nearby Restaurants</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {restaurants.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">No nearby restaurants found.</div>
            ) : (
              restaurants.map(rest => (
                <div 
                  key={rest.oracle_restaurant_id} 
                  onClick={() => navigate(`/customer/restaurant/${rest.oracle_restaurant_id}`)} 
                  className="bg-white group overflow-hidden rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-gray-100 transition-all"
                >
                  <div className="h-48 bg-gray-200 overflow-hidden relative">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                         src={rest.image_url || `https://images.unsplash.com/photo-${1517248135 + rest.oracle_restaurant_id * 100}?w=400&h=300&fit=crop`} 
                         alt={rest.name} 
                         onError={(e) => { 
                           // Use restaurant-specific images based on restaurant ID to ensure uniqueness
                           const restaurantImages = {
                             1: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
                             2: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
                             3: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
                             4: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
                             5: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop'
                           };
                           // Use restaurant ID to get unique image, fallback to cuisine-based image
                           const fallbackImages = {
                             'Fast Food': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
                             'Pakistani': 'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=400&h=300&fit=crop',
                             'BBQ': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
                             'Chinese': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop',
                             'Italian': 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&h=300&fit=crop'
                           };
                           const cuisine = rest.cuisine?.[0];
                           if (restaurantImages[rest.oracle_restaurant_id]) {
                             e.target.src = restaurantImages[rest.oracle_restaurant_id];
                           } else if (cuisine && fallbackImages[cuisine]) {
                             e.target.src = fallbackImages[cuisine];
                           } else {
                             e.target.src = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&sig=${rest.oracle_restaurant_id}`;
                           }
                         }}
                    />
                    <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-lg text-xs font-bold shadow-md">
                        {rest.distance_meters ? `${(rest.distance_meters / 1000).toFixed(1)} km` : (rest.city_zone || 'Local')}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold mb-1">{rest.name}</h3>
                      <div className="flex items-center gap-1 bg-green-100 px-2 rounded">
                          <span className="text-green-700 text-xs font-bold">OPEN</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">
                        {rest.cuisine?.join(', ') || 'Various cuisines'}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{rest.avg_rating || 'New'}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Delivery: Rs. {rest.delivery_fee || 50}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
