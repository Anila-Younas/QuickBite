import React from 'react';
import { Search, MapPin, ShoppingBag, Bell, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-[#FCF8F5] py-4 px-8 flex items-center justify-between border-b border-gray-100">
      <div className="flex items-center gap-10">
        <Link to="/" className="text-[#E53E3E] font-bold text-xl flex items-center gap-1">
          QuickBite
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link to="/" className={`${location.pathname === '/' ? 'text-[#E53E3E] border-b-2 border-[#E53E3E]' : 'text-gray-500 hover:text-gray-800'} pb-1`}>Home</Link>
          <Link to="/restaurants" className={`${location.pathname === '/restaurants' ? 'text-[#E53E3E] border-b-2 border-[#E53E3E]' : 'text-gray-500 hover:text-gray-800'} pb-1`}>Restaurants</Link>
          <Link to="/offers" className="text-gray-500 hover:text-gray-800 pb-1">Offers</Link>
        </nav>
      </div>

      <div className="flex-1 max-w-xl mx-8 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#E53E3E] focus:border-[#E53E3E] sm:text-sm"
          placeholder="Search for restaurants or dishes..."
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-[#E53E3E]" />
          <span>San Francisco, CA</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/tracking/1" className="text-gray-600 hover:text-gray-900">
            <ShoppingBag className="h-5 w-5" />
          </Link>
          <button className="text-gray-600 hover:text-gray-900">
            <Bell className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 ml-4 border-l pl-4 border-gray-200">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user?.full_name || 'Guest'}</span>
              <span className="text-xs text-gray-500">{user?.role}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
