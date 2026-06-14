import React from 'react';
import Header from '../components/Header';
import { Clock, Info } from 'lucide-react';

const OrderTrackingPage = () => {
  return (
    <div className="min-h-screen bg-[#FCF8F5]">
      <Header />
      
      <main className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Tracking</h1>
            <p className="text-gray-500">Order #QB-82910 from <span className="font-medium text-[#E53E3E]">The Burger Haven</span></p>
          </div>
          <div className="bg-[#FEE2E2] text-[#E53E3E] font-medium px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Arriving in 15 mins
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Status Column */}
          <div className="flex-1 flex flex-col gap-8">
            
            {/* Status Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Current Status</p>
                  <h2 className="text-2xl font-bold text-gray-900">Preparing your meal</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E53E3E] text-xl">
                  👨‍🍳
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative mb-12 px-2">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2"></div>
                {/* Active portion of line */}
                <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-[#E53E3E] -translate-y-1/2"></div>
                
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E53E3E] text-white flex items-center justify-center text-xs">✓</div>
                    <span className="text-xs font-medium text-gray-900">Placed</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E53E3E] text-white flex items-center justify-center text-xs">✓</div>
                    <span className="text-xs font-medium text-gray-900">Confirmed</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border-4 border-[#E53E3E] -mt-1 flex items-center justify-center"></div>
                    <span className="text-xs font-bold text-[#E53E3E]">Preparing</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"></div>
                    <span className="text-xs font-medium text-gray-400">Picked Up</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"></div>
                    <span className="text-xs font-medium text-gray-400">Delivered</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FCF8F5] rounded-xl p-4 flex gap-3 border border-gray-100">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  The restaurant is hand-crafting your order now. Our courier will arrive at the venue in approximately 5 minutes.
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-lg mb-6">Order Summary</h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-50 text-[#E53E3E] font-medium px-2 py-0.5 rounded text-xs">2x</span>
                    <span className="text-gray-700">Classic Cheeseburger</span>
                  </div>
                  <span className="text-gray-600">$24.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-50 text-[#E53E3E] font-medium px-2 py-0.5 rounded text-xs">1x</span>
                    <span className="text-gray-700">Truffle Fries</span>
                  </div>
                  <span className="text-gray-600">$8.50</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total (Incl. delivery)</span>
                <span className="font-bold text-[#E53E3E] text-xl">$35.42</span>
              </div>
            </div>

          </div>

          {/* Right Column (Map) */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="bg-gray-200 rounded-2xl overflow-hidden h-80 relative border border-gray-100 shadow-sm flex items-center justify-center">
              {/* Placeholder for map */}
              <div className="text-gray-400 text-sm flex flex-col items-center">
                <span className="text-4xl mb-2">🗺️</span>
                Map View
              </div>
              
              {/* Courier floating card */}
              <div className="absolute top-4 left-4 right-4 bg-white rounded-xl p-3 shadow-md flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80" alt="Courier" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-bold text-gray-900">David W.</p>
                  <p className="text-[10px] text-gray-500">★ 4.9 (2.1k)</p>
                </div>
              </div>
            </div>
            <button className="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors">
              Contact Courier
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default OrderTrackingPage;
