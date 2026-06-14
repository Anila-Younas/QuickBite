import React from 'react';
import Header from '../components/Header';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const categories = [
    { name: 'Fast Food', icon: '🍔' },
    { name: 'Pakistani', icon: '🥘' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Italian', icon: '🍕' },
    { name: 'Asian', icon: '🍜' },
    { name: 'Ice Cream', icon: '🍦' },
    { name: 'Burgers', icon: '🍔' },
    { name: 'Beverages', icon: '🥤' },
  ];

  const featured = [
    { id: 1, name: 'The Pizza Artisan', tags: 'Italian • Artisanal • $$', time: '20-30 min', minOrder: '$15', rating: '4.8', image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&q=80', badge: 'Free Delivery' },
    { id: 2, name: 'Lazzat Mughlai', tags: 'Pakistani • Traditional • $$$', time: '35-45 min', minOrder: '$20', rating: '4.5', image: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=500&q=80', badge: 'Popular' },
    { id: 3, name: 'Burger Station', tags: 'Burgers • Fast Food • $', time: '15-25 min', minOrder: '$10', rating: '4.2', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
  ];

  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="flex items-center justify-between mb-16">
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
              Order food, fast and reliable
            </h1>
            <p className="text-gray-500 text-lg mb-8">
              Satisfy your cravings with our high-speed concierge delivery service from the finest local restaurants.
            </p>
            <div className="flex gap-4">
              <Link to="/restaurants" className="btn-primary">Browse Nearby</Link>
              <button className="btn-secondary">Explore Offers</button>
            </div>
          </div>
          <div className="relative">
            {/* Using a placeholder for the complex image layout in the screenshot */}
            <div className="w-[450px] h-[450px] bg-[#FDE8E8] rounded-full absolute -top-10 -left-10 -z-10"></div>
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80" alt="Food Spread" className="w-[400px] h-[450px] object-cover rounded-3xl shadow-xl" />
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">What's on your mind?</h2>
            <button className="text-[#E53E3E] font-medium text-sm hover:underline">VIEW ALL &rarr;</button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {categories.map((cat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md transition-shadow border border-gray-100">
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Restaurants Section */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold">Featured Restaurants</h2>
              <p className="text-gray-500 text-sm mt-1">The best rated spots around you right now</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm hover:bg-gray-50">
                Sort by <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm hover:bg-gray-50">
                Filter <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featured.map(restaurant => (
              <Link to="/restaurants" key={restaurant.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 block group">
                <div className="h-48 relative overflow-hidden">
                  <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {restaurant.badge && (
                    <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-[#E53E3E] text-xs font-bold px-3 py-1 rounded-full">
                      {restaurant.badge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg">{restaurant.name}</h3>
                    <div className="flex items-center gap-1 text-sm font-bold text-[#E53E3E]">
                      ★ {restaurant.rating}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{restaurant.tags}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">⏱ {restaurant.time}</span>
                    <span className="flex items-center gap-1">💰 Min. {restaurant.minOrder}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
