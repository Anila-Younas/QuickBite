import os

# Backend Admin Routes
admin_routes = """const express = require('express');
const { getConnection } = require('../db/oracle');
const { connectMongo, mongoose } = require('../db/mongo');

const router = express.Router();

router.get('/kpi', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM USERS WHERE role='CUSTOMER') as total_customers,
        (SELECT COUNT(*) FROM RESTAURANTS) as total_restaurants,
        (SELECT COUNT(*) FROM USERS WHERE role='RIDER') as total_riders,
        (SELECT COUNT(*) FROM ORDERS WHERE TRUNC(created_at) = TRUNC(SYSDATE)) as orders_today
      FROM DUAL
    `);
    
    // Add MongoDB data
    const db = mongoose.connection.db;
    const active_riders = await db.collection('riderlocations').countDocuments({ status: 'AVAILABLE' });
    
    const kpi = {
      ...result.rows[0],
      ACTIVE_RIDERS: active_riders
    };
    
    res.json(kpi);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/audit', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM AUDIT_LOG ORDER BY timestamp DESC FETCH FIRST 50 ROWS ONLY`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/outbox', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const pending = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=0`);
    const processed = await conn.execute(`SELECT COUNT(*) as cnt FROM OUTBOX_EVENTS WHERE is_dispatched=1`);
    const recent = await conn.execute(`SELECT * FROM OUTBOX_EVENTS ORDER BY created_at DESC FETCH FIRST 20 ROWS ONLY`);
    
    res.json({
      stats: { pending: pending.rows[0].CNT, processed: processed.rows[0].CNT },
      events: recent.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
"""

os.makedirs('backend/routes', exist_ok=True)
with open('backend/routes/admin.js', 'w') as f:
    f.write(admin_routes)

# Frontend Admin Layout and Pages
admin_layout = """import React from 'react';
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
"""

admin_dashboard = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [kpi, setKpi] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/admin/kpi').then(res => setKpi(res.data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Platform Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Total Customers</p>
          <h2 className="text-4xl font-bold mt-2">{kpi?.TOTAL_CUSTOMERS || '-'}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Total Restaurants</p>
          <h2 className="text-4xl font-bold mt-2">{kpi?.TOTAL_RESTAURANTS || '-'}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Orders Today</p>
          <h2 className="text-4xl font-bold mt-2">{kpi?.ORDERS_TODAY || '-'}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Active Riders (Mongo)</p>
          <h2 className="text-4xl font-bold mt-2 text-green-600">{kpi?.ACTIVE_RIDERS || '0'}</h2>
        </div>
      </div>
      
      {/* Simulation Controls embedded here for evaluation */}
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Advanced DB Demonstrations</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => axios.post('http://localhost:5000/admin/simulate/bulk-orders').then(res=>alert(res.data.message))} className="bg-gray-900 text-white p-6 rounded-xl font-bold hover:bg-black transition-colors text-left">
          <span className="block text-2xl mb-2">🚀</span>
          10k Bulk Orders (T1)
        </button>
        <button onClick={() => axios.post('http://localhost:5000/admin/simulate/sync').then(res=>alert(res.data.message))} className="bg-purple-600 text-white p-6 rounded-xl font-bold hover:bg-purple-700 transition-colors text-left">
          <span className="block text-2xl mb-2">🔄</span>
          Force Outbox Sync
        </button>
        <button className="bg-blue-600 text-white p-6 rounded-xl font-bold hover:bg-blue-700 transition-colors text-left">
          <span className="block text-2xl mb-2">📍</span>
          GPS Rider Flood (Mongo)
        </button>
        <button className="bg-red-600 text-white p-6 rounded-xl font-bold hover:bg-red-700 transition-colors text-left">
          <span className="block text-2xl mb-2">⚡</span>
          Trigger Partition (CAP)
        </button>
      </div>
    </div>
  );
}
"""

audit_log = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/admin/audit').then(res => setLogs(res.data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Oracle Audit Logs</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-gray-600">ID</th>
              <th className="p-4 font-bold text-gray-600">Action</th>
              <th className="p-4 font-bold text-gray-600">Table/Record</th>
              <th className="p-4 font-bold text-gray-600">Transition</th>
              <th className="p-4 font-bold text-gray-600">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-mono text-sm">{log.AUDIT_ID}</td>
                <td className="p-4 font-bold text-gray-900">{log.ACTION}</td>
                <td className="p-4">{log.TABLE_NAME} #{log.RECORD_ID}</td>
                <td className="p-4"><span className="text-gray-400">{log.OLD_STATUS}</span> &rarr; <span className="text-green-600 font-bold">{log.NEW_STATUS}</span></td>
                <td className="p-4 text-gray-500 text-sm">{new Date(log.TIMESTAMP).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""

outbox_monitor = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function OutboxMonitor() {
  const [data, setData] = useState({ stats: {}, events: [] });

  useEffect(() => {
    const fetch = () => axios.get('http://localhost:5000/admin/outbox').then(res => setData(res.data));
    fetch();
    const int = setInterval(fetch, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Polyglot Outbox Monitor (T6)</h1>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Pending Sync Events</p>
          <h2 className="text-4xl font-bold mt-2 text-yellow-600">{data.stats.pending}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium">Successfully Synced</p>
          <h2 className="text-4xl font-bold mt-2 text-green-600">{data.stats.processed}</h2>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-bold text-gray-600">Event ID</th>
              <th className="p-4 font-bold text-gray-600">Type</th>
              <th className="p-4 font-bold text-gray-600">Status</th>
              <th className="p-4 font-bold text-gray-600">Payload Preview</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((ev, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="p-4 font-mono text-sm">{ev.EVENT_ID}</td>
                <td className="p-4 font-bold">{ev.EVENT_TYPE}</td>
                <td className="p-4">
                  {ev.IS_DISPATCHED === 1 ? 
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">SYNCED</span> : 
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">PENDING</span>
                  }
                </td>
                <td className="p-4 font-mono text-xs text-gray-500 truncate max-w-xs">{ev.PAYLOAD}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""

os.makedirs('frontend/src/portals/Admin', exist_ok=True)
with open('frontend/src/portals/Admin/AdminLayout.jsx', 'w', encoding='utf-8') as f: f.write(admin_layout)
with open('frontend/src/portals/Admin/AdminDashboard.jsx', 'w', encoding='utf-8') as f: f.write(admin_dashboard)
with open('frontend/src/portals/Admin/AuditLog.jsx', 'w', encoding='utf-8') as f: f.write(audit_log)
with open('frontend/src/portals/Admin/OutboxMonitor.jsx', 'w', encoding='utf-8') as f: f.write(outbox_monitor)

print("Admin portal files created.")
