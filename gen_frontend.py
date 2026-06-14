import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

tailwind_config = """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
"""

postcss_config = """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""

index_css = """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
  font-family: 'Inter', sans-serif;
}
"""

app_jsx = """import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
          <Route path="/dashboard/*" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
"""

login_jsx = """import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('anila@quickbite.pk');
  const [password, setPassword] = useState('$2b$12$abc123hashed');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/auth/login', { email, password });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">QuickBite Login</h2>
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">Login</button>
      </form>
    </div>
  );
}
"""

dashboard_jsx = """import React from 'react';
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
"""

create_file('frontend/tailwind.config.js', tailwind_config)
create_file('frontend/postcss.config.js', postcss_config)
create_file('frontend/src/index.css', index_css)
create_file('frontend/src/App.jsx', app_jsx)
create_file('frontend/src/pages/Login.jsx', login_jsx)
create_file('frontend/src/pages/Dashboard.jsx', dashboard_jsx)

print("Generated frontend skeleton.")
