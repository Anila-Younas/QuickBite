import React, { useEffect, useState } from 'react';
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
