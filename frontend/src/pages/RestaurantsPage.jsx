import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RestaurantsPage = () => {
  const navigate = useNavigate();
  const filters = ['Cuisine', 'Rating 4.5+', 'Delivery Time', 'Pure Veg', 'Offers', 'Price Range'];
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');

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
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurants</h1>
          <p className="text-gray-500">Discover premium dining options delivered fast to your door.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-10">
            <div className="max-w-2xl relative">
                <input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    type="text" 
                    placeholder="Search by restaurant name or menu items (e.g. Biryani)..." 
                    className="w-full text-lg p-4 pl-6 border border-gray-300 rounded-full shadow-sm focus:ring-[#E53E3E] focus:border-[#E53E3E]"
                />
            </div>
        </div>

        {/* Filters Row */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
          <button className="flex items-center gap-2 bg-[#E53E3E] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#C53030] transition-colors shrink-0">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <div className="w-px h-8 bg-gray-300 mx-1 shrink-0 self-center"></div>
          {filters.map(f => (
            <button key={f} className="filter-chip shrink-0">{f}</button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {restaurants.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">No restaurants found.</div>
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
                           const cuisine = rest.cuisine?.[0];
                           if (restaurantImages[rest.oracle_restaurant_id]) {
                             e.target.src = restaurantImages[rest.oracle_restaurant_id];
                           } else {
                             e.target.src = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop&sig=${rest.oracle_restaurant_id}`;
                           }
                         }}
                    />
                    <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-lg text-xs font-bold shadow-md">
                        {rest.city_zone || 'Local'}
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
      </main>
    </div>
  );
};

export default RestaurantsPage;
