import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      // Use sessionStorage for session isolation across tabs
      const stored = sessionStorage.getItem('user');
      const parsedUser = stored ? JSON.parse(stored) : null;
      // Validate that the user has a role
      if (parsedUser && !parsedUser.role) {
        console.warn('[AuthContext] User data missing role, clearing sessionStorage');
        sessionStorage.removeItem('user');
        return null;
      }
      console.log('[AuthContext] Loaded user from sessionStorage:', parsedUser?.role, parsedUser?.email);
      return parsedUser;
    } catch (err) {
      console.error('[AuthContext] Error parsing user from sessionStorage:', err);
      sessionStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(sessionStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/login', { email, password });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      // Use sessionStorage for session isolation across tabs
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (full_name, email, password, role) => {
    try {
      await axios.post('http://localhost:5000/auth/register', { full_name, email, password, role });
      // After successful registration, log them in
      return await login(email, password);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Clear sessionStorage instead of localStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
