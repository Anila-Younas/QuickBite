import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Store, Bike, ShoppingBag, Activity, FileText, Database, Settings } from 'lucide-react';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col">
        <div className="h-16 flex items-center px-6 bg-black text-white font-bold text-xl">QuickBite Admin</div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><LayoutDashboard size={20}/> Dashboard</Link>
          <Link to="/admin/approvals" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><Store size={20}/> Approvals</Link>
          <Link to="/admin/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><ShoppingBag size={20}/> Orders</Link>
          <Link to="/admin/outbox" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><Activity size={20}/> Outbox Monitor</Link>
          <Link to="/admin/audit" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><FileText size={20}/> Audit Logs</Link>
          <Link to="/admin/db-ops" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white"><Database size={20}/> Database Ops</Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
