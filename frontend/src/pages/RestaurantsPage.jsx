import React from 'react';
import Header from '../components/Header';
import { SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

const RestaurantsPage = () => {
  const filters = ['Cuisine', 'Rating 4.5+', 'Delivery Time', 'Pure Veg', 'Offers', 'Price Range'];
  
  const restaurants = [
    { id: 1, name: 'Bella Napoli', tags: 'Italian • Pizzas • Mediterranean', desc: 'Free delivery on orders above $20', time: '25-35 min', rating: '4.8', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80' },
    { id: 2, name: 'The Green Sprout', tags: 'Salads • Healthy • Vegan', desc: 'Trending #1 in Healthy', time: '15-25 min', rating: '4.6', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80' },
    { id: 3, name: 'Kyo Sushi', tags: 'Japanese • Seafood • Asian', desc: 'Featured Michelin Selection', time: '30-40 min', rating: '4.9', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&q=80' },
    { id: 4, name: 'Stack & Sizzle', tags: 'Burgers • American • Grill', desc: 'Bestseller in your area', time: '20-30 min', rating: '4.5', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
    { id: 5, name: 'Olive & Oregano', tags: 'Greek • Mediterranean • Healthy', desc: '10% OFF on your first order', time: '25-35 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&q=80' },
    { id: 6, name: 'Wok Hei Central', tags: 'Chinese • Noodles • Stir Fry', desc: 'Fastest delivery award 2023', time: '20-30 min', rating: '4.4', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80' },
    { id: 7, name: 'Le Petit Patisserie', tags: 'Desserts • Bakery • French', desc: 'Handcrafted daily', time: '10-20 min', rating: '4.9', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80' },
    { id: 8, name: 'Taco Theory', tags: 'Mexican • Tacos • Latin', desc: 'Fresh salsas made every hour', time: '15-25 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80' },
  ];

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurants in San Francisco</h1>
          <p className="text-gray-500">Discover 240+ premium dining options delivered fast to your door.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {restaurants.map(r => (
            <Link to="/tracking/1" key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 block group flex flex-col">
              <div className="h-40 relative overflow-hidden">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                  {r.time}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 truncate pr-2">{r.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#E53E3E] bg-red-50 px-1.5 py-0.5 rounded">
                    ★ {r.rating}
                  </div>
                </div>
                <p className="text-gray-400 text-xs mb-2 truncate">{r.tags}</p>
                <p className="text-gray-500 text-xs font-medium mt-auto">{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <button className="border border-gray-300 text-[#E53E3E] font-medium bg-white px-8 py-3 rounded-full hover:bg-gray-50 transition-colors">
            Show More Restaurants
          </button>
        </div>
      </main>
    </div>
  );
};

export default RestaurantsPage;
