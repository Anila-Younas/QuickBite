import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, Utensils, UtensilsCrossed, ArrowRight, Store, Bike, BarChart } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const openLogin = (roleName, defaultEmail) => {
    setSelectedRole(roleName);
    setEmail(defaultEmail);
    setPassword('password123'); // Assume default seed password
  };

  return (
    <div className="font-sans text-gray-900 overflow-x-hidden min-h-screen bg-[#fdf7ff] transition-colors relative">
      {/* Auth Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
            <button onClick={() => setSelectedRole(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedRole} Login</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to continue to QuickBite</p>
            </div>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4f378a] focus:border-[#4f378a] outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4f378a] focus:border-[#4f378a] outline-none" required />
              </div>
              <button type="submit" className="w-full bg-[#4f378a] text-white rounded-lg py-2.5 font-medium hover:bg-[#3d2a6b] transition-colors">Sign In</button>
            </form>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-8 h-8 text-[#4f378a]"/>
          <h1 className="text-2xl font-bold text-[#4f378a] tracking-tight">QuickBite</h1>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <a className="text-gray-600 hover:text-[#4f378a] transition-colors font-semibold text-sm" href="#">Support</a>
            <a className="text-gray-600 hover:text-[#4f378a] transition-colors font-semibold text-sm" href="#">Global</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32 pb-16 flex flex-col items-center justify-center min-h-screen">
        <section className="text-center mb-16 space-y-4 max-w-2xl">
          <span className="px-4 py-1.5 rounded-full bg-[#4f378a]/10 text-[#4f378a] font-semibold text-xs inline-block">
            Unified Ecosystem
          </span>
          <h2 className="text-5xl font-extrabold text-gray-900">
            Welcome to <span className="text-[#4f378a]">QuickBite Pakistan</span>
          </h2>
          <p className="text-lg text-gray-600">
            Select your role to access your personalized dashboard and streamline your logistics experience.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
          {/* Customer */}
          <div className="group p-6 rounded-[20px] bg-white shadow-lg border border-gray-100 flex flex-col justify-between overflow-hidden relative hover:-translate-y-2 hover:shadow-xl transition-all cursor-pointer" onClick={() => openLogin('Customer', 'ahmed@quickbite.pk')}>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center mb-6">
                <Utensils className="w-8 h-8 text-[#ff6b00]"/>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Customer</h3>
              <p className="text-gray-500 text-sm">Order from your favorite restaurants and get fresh food delivered in minutes.</p>
            </div>
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdo6_fOLVshQllAUAEVwMLGKDO6LmnEGyOxMlbocRE-PAtDnYTuaUFTXOzww47Cd_r7ZiicZ1duJvomIAgKZvWKxbQrMNo0JEY5TPuHmKtGocq9RPr8LUrTgQ7bjmgjWGd3lQwobw4kPm7-A48vivoRIUqzdGjomfEFBc0Q_fawIwolo-DKDbqbiCXZJurH1NUn94Uhxe_6LirN96rbEFVH3QFHrNCH04vZA_ocaodImpRyUXCTgIqBwN79PXtR5zUPZamjmdECiI" alt="Customer" />
              </div>
              <button className="w-full py-3 rounded-xl bg-[#ff6b00] text-white font-semibold flex items-center justify-center gap-2">
                Login / Join <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Rider */}
          <div className="group p-6 rounded-[20px] bg-white shadow-lg border border-gray-100 flex flex-col justify-between overflow-hidden relative hover:-translate-y-2 hover:shadow-xl transition-all cursor-pointer" onClick={() => openLogin('Rider', 'ali@quickbite.pk')}>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#0070f3]/10 flex items-center justify-center mb-6">
                <Bike className="w-8 h-8 text-[#0070f3]"/>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Rider</h3>
              <p className="text-gray-500 text-sm">Deliver orders, earn on your own schedule, and be part of the motion ecosystem.</p>
            </div>
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0ty4p8OfK_QTGF1AIlOizu_GaTKKMlQXTpEEHAhGSOcYyhgV1Nlz1wG-a_K8fOJkbNpy3uimUGZIVtVbicnHft0HPWu7Df2CUr7tgYwhIu2ooimznDxJ2-ZHgr0WR0HeBD6rPrLJa8jRF3XWAhIrLv1iXO_2fzaKg25IcCbUN-_fWizCUNS-mgU-liRN1ufDDVp1llAAcXb27Scit5HNqMQPm_Cqb8CnvYBL3VunGoswguRDVq-PI2b1lcas52Auel744yiltExQ" alt="Rider" />
              </div>
              <button className="w-full py-3 rounded-xl bg-[#0070f3] text-white font-semibold flex items-center justify-center gap-2">
                Login / Join <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Restaurant */}
          <div className="group p-6 rounded-[20px] bg-white shadow-lg border border-gray-100 flex flex-col justify-between overflow-hidden relative hover:-translate-y-2 hover:shadow-xl transition-all cursor-pointer" onClick={() => openLogin('Restaurant', 'grillhouse@quickbite.pk')}>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#e11d48]/10 flex items-center justify-center mb-6">
                <Store className="w-8 h-8 text-[#e11d48]"/>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Restaurant</h3>
              <p className="text-gray-500 text-sm">Manage your menu, track orders in real-time, and grow your digital presence.</p>
            </div>
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXjjfdXU-kPkfJloF67coZFD7T7aNzPA1RxfgjXirgkPROwAIk8d8pUip_chfj31eseFTQIqHgk7nv2oqx98kKlAQyqrVnmqrH2L3YYWDp2pOUXP_Q0VohiakVHZ6NlWhkuPZQDW4hI4UwWajNOfWZvkSThSr7WmESFA92evL_L9XJXSI3eey-kXHaTwmNPdxghGXThGyJbJoBysttPStIYTLv49AUeihHdSCQ1_FeqCdN43ttleFnSY3xuqCHAo7LtudDWT8qMcw" alt="Restaurant" />
              </div>
              <button className="w-full py-3 rounded-xl bg-[#e11d48] text-white font-semibold flex items-center justify-center gap-2">
                Login / Join <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Admin */}
          <div className="group p-6 rounded-[20px] bg-white shadow-lg border border-gray-100 flex flex-col justify-between overflow-hidden relative hover:-translate-y-2 hover:shadow-xl transition-all cursor-pointer" onClick={() => openLogin('Admin', 'admin@quickbite.pk')}>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#4f378a]/10 flex items-center justify-center mb-6">
                <BarChart className="w-8 h-8 text-[#4f378a]"/>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Admin</h3>
              <p className="text-gray-500 text-sm">Orchestrate the entire network, analyze growth data, and manage operations.</p>
            </div>
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaEOcZYjbiCIm29jH7LzewAViMTahy8MYTkQn9My0fSJKMQwFZuNlaZp_ZJRO99gq0J7I2i4DVLNbbhKVI3Ss6HGYF6WYXMu0gFEEBBCXUGu5jc49W5ODp3A3FK-uMgsbTwlrOT2gK7MX9cDwRXgk9rEGoVNycDDpI5SL_TInD7VP0ZCv8Tqcy-eSsTEMq1NdkmrBlUhXdR8X5Pc9plNlZPlRZa5mP26Ofyz1F42jIIoiQTj-jeFrm3jZZYEpjg6KoBPHjBSb7x7A" alt="Admin" />
              </div>
              <button className="w-full py-3 rounded-xl bg-[#4f378a] text-white font-semibold flex items-center justify-center gap-2">
                Login / Join <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
