import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, ClipboardList, LogOut, Users, Bike, Store, ShoppingBag, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    total_customers: 0,
    total_restaurants: 0,
    total_riders: 0,
    orders_today: 0,
    active_riders: 0
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { 'x-user-id': user?.id };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [kpiRes, auditRes, outboxRes] = await Promise.all([
        axios.get('http://localhost:5000/admin/kpi', { headers }),
        axios.get('http://localhost:5000/admin/audit', { headers }),
        axios.get('http://localhost:5000/admin/outbox', { headers })
      ]);
      
      setMetrics(kpiRes.data);
      setAuditLogs(auditRes.data || []);
      setOutboxEvents(outboxRes.data.events || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdf7ff] text-gray-900 font-sans min-h-screen flex overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col h-full py-6 fixed left-0 h-screen w-[280px] bg-white border-r border-gray-200 z-50">
        <div className="px-6 mb-8">
          <h1 className="text-2xl font-bold text-[#4f378a] tracking-tight">Partner Portal</h1>
          <p className="text-[#494551] text-xs">Restaurant Management</p>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="flex items-center gap-4 text-[#4f378a] font-bold border-l-4 border-[#7209B7] px-4 py-3 bg-[#7209B7]/10 transition-all" href="#">
            <LayoutDashboard className="w-5 h-5"/>
            <span className="text-sm">Dashboard</span>
          </a>
          <a className="flex items-center gap-4 text-gray-600 px-4 py-3 hover:bg-white/5 transition-all" href="#">
            <ClipboardList className="w-5 h-5"/>
            <span className="text-sm">Orders</span>
          </a>
        </nav>
        <div className="px-6 mt-auto">
          <button onClick={() => navigate('/')} className="w-full mb-4 py-3 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5"/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-[280px] h-screen overflow-y-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Global Overview</h2>
            <p className="text-gray-600 text-sm">System-wide performance and real-time monitoring.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="md:hidden text-red-500 p-2 hover:bg-red-50 rounded-full"><LogOut className="w-5 h-5"/></button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#7209B7]/20">
              <img alt="Admin Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk3m9p2RtCa23h3NQ75Io2P5_kfNw-P19FCkDIUPHKQfYCD0F4Cxz_ZzA00R4TaE5WDDGDa-aVX7fqIBGXXBWmK5UoUqHMihor7w7S23zRp5VyimWMdIxFvIjpumBV2ePPeRCXvqnPo4o62hqnkGYPW77pV6IyXQZO4csIdImXZ6FSHsG9p44SnMii9CcBC-nhZXlxJJ-0e0ILo30c8-YanxK_qtLRXgqbZIoHWBeI3coeZqAigi9EGqPjSFIkmIPlWFP13LcVClg" />
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-[#7209B7]/10 rounded-lg">
                <Users className="w-6 h-6 text-[#7209B7]"/>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Total Customers</p>
            <h3 className="text-3xl font-bold">{metrics.total_customers || 0}</h3>
          </div>
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Bike className="w-6 h-6 text-blue-500"/>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Active Riders</p>
            <h3 className="text-3xl font-bold">{metrics.active_riders || 0}</h3>
          </div>
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 p-6 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-[#7209B7]/10 rounded-lg">
                <Store className="w-6 h-6 text-[#7209B7]"/>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Total Restaurants</p>
            <h3 className="text-3xl font-bold">{metrics.total_restaurants || 0}</h3>
          </div>
          <div className="bg-white/70 backdrop-blur-md border border-gray-200 p-6 rounded-2xl flex flex-col gap-2 border-l-4 border-[#7209B7]">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-[#7209B7]/10 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-[#7209B7]"/>
              </div>
              <span className="animate-pulse text-[#7209B7] text-xs">LIVE</span>
            </div>
            <p className="text-gray-600 text-sm">Orders Today</p>
            <h3 className="text-3xl font-bold">{metrics.orders_today || 0}</h3>
          </div>
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white/70 border border-gray-200 rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-6 py-4 flex justify-between items-center bg-white/5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#7209B7]"/>
                <h4 className="text-lg font-bold">Rider Distribution Map</h4>
              </div>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-white/10 rounded text-xs">Pakistan</span>
                <span className="px-2 py-1 bg-[#7209B7]/20 text-[#7209B7] rounded text-xs">Real-time</span>
              </div>
            </div>
            <div className="flex-1 relative group">
              <img className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEGU7_9P4PI4_TaHDzil8qZVkLCTlT-Ej6wGng3MQimqWNmN4BgvIPRHoJf0b5uzyjihXX3Q-2yI4GoroC1QF1pqjFiS1TUAhpguyn2BmY4BU77YlmO9O7Tfy6aqPbbzR44dCuIi-GeK6rZXh-mMVbYtyOwCHTJo_O96uW2uQ3Jrgcspm8uBG3-T0YHdQGee8Z-3hvCJU4kJ_Oxv22j5TI5rwQfyFPKAC8_HLleftdlF2C6TWCt6eSsilM93lztl3LhOIyK2n88vo" alt="Map" />
            </div>
          </div>
          
          <div className="bg-white/70 border border-gray-200 rounded-3xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="px-6 py-4 bg-white/5 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500"/>
                <h4 className="text-lg font-bold">Recent Audit Logs</h4>
              </div>
              <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-full text-xs">{auditLogs.length} entries</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No audit logs</div>
              ) : (
                auditLogs.slice(0, 10).map((log, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900 text-sm">{log.TABLE_NAME} - {log.ACTION}</span>
                      <span className="text-gray-600 text-xs">{new Date(log.TIMESTAMP).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-600 text-xs">Record ID: {log.RECORD_ID} • {log.OLD_STATUS || 'N/A'} → {log.NEW_STATUS || 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Outbox Events Section */}
        <div className="mt-8 bg-white/70 border border-gray-200 rounded-3xl overflow-hidden">
          <div className="px-6 py-4 bg-white/5 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500"/>
              <h4 className="text-lg font-bold">Outbox Events (Cross-DB Sync)</h4>
            </div>
            <span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded-full text-xs">{outboxEvents.length} events</span>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 font-bold">Event ID</th>
                    <th className="pb-3 font-bold">Type</th>
                    <th className="pb-3 font-bold">Aggregate</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-4 text-gray-500">Loading...</td></tr>
                  ) : outboxEvents.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-4 text-gray-500">No outbox events</td></tr>
                  ) : (
                    outboxEvents.slice(0, 10).map((event, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3">{event.EVENT_ID}</td>
                        <td className="py-3">{event.EVENT_TYPE}</td>
                        <td className="py-3">{event.AGGREGATE_TYPE} #{event.AGGREGATE_ID}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${event.IS_DISPATCHED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {event.IS_DISPATCHED ? 'Dispatched' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3">{new Date(event.CREATED_AT).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
