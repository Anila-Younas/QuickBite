import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

export default function Dashboard({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/');
  };

  return (
    <div>
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">QuickBite {user.role} Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{user.name} ({user.email})</span>
          <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>
      </header>
      <main className="p-8">
        <p className="text-gray-600">Welcome to your dashboard.</p>
        {/* Placeholder for specific role dashboard components */}
        {user.role === 'ADMIN' && (
          <div className="mt-8 p-6 bg-white rounded shadow">
             <h2 className="text-lg font-bold">Simulation Controls</h2>
             <div className="flex gap-4 mt-4">
                <button className="bg-blue-500 text-white px-4 py-2 rounded">Simulate Orders</button>
                <button className="bg-green-500 text-white px-4 py-2 rounded">Simulate Sync</button>
                <button className="bg-purple-500 text-white px-4 py-2 rounded">CAP Demo</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
