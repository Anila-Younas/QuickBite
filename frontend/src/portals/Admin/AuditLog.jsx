import React, { useEffect, useState } from 'react';
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
