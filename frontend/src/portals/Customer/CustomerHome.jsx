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
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    // Fetch Offers
    axios.get('http://localhost:5000/catalog/offers')
      .then(res => setOffers(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let url = `http://localhost:5000/catalog/nearby?search=${search}`;
        if (location) {
          url += `&lat=${location.lat}&lng=${location.lng}`;
        } else {
          // Default Mianwali location if no permission
          url += `&lat=32.5967&lng=71.8234`;
        }
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
  }, [search, location]);

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
            {location && <p className="text-sm text-gray-500 mt-2">Using your real-time location to find nearby spots.</p>}
        </div>

        {/* Offers Section */}
        {offers.length > 0 && (
        <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Active Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map(off => (
                    <div key={off._id} className="bg-orange-100 p-6 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-between cursor-pointer" onClick={() => navigate(`/customer/restaurant/${off.restaurant_id}`)}>
                        <div>
                            <h3 className="font-bold text-lg text-orange-800">{off.title}</h3>
                            <p className="text-orange-600">{off.restaurant_name} • {off.discount_pct}% OFF</p>
                        </div>
                        <Tag className="w-10 h-10 text-orange-500"/>
                    </div>
                ))}
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
                  key={rest.oracle_rest_id} 
                  onClick={() => navigate(`/customer/restaurant/${rest.oracle_rest_id}`)} 
                  className="bg-white group overflow-hidden rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border border-gray-100 transition-all"
                >
                  <div className="h-48 bg-gray-200 overflow-hidden relative">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                         src={`https://source.unsplash.com/random/400x300/?restaurant,food&sig=${rest.oracle_rest_id}`} 
                         alt={rest.name} 
                         onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Food'; }}
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
