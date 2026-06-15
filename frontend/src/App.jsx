import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import RestaurantsPage from './pages/RestaurantsPage';
import OffersPage from './pages/OffersPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Customer Portal
import CustomerHome from './portals/Customer/CustomerHome';
import RestaurantMenu from './portals/Customer/RestaurantMenu';
import OrderTracking from './portals/Customer/OrderTracking';
import OrderHistory from './portals/Customer/OrderHistory';

// Restaurant Portal
import RestaurantDashboard from './portals/Restaurant/RestaurantDashboard';
import MenuManagement from './portals/Restaurant/MenuManagement';
import Earnings from './portals/Restaurant/Earnings';

// Rider Portal
import RiderDashboard from './portals/Rider/RiderDashboard';
import ActiveDelivery from './portals/Rider/ActiveDelivery';

// Admin Portal
import AdminLayout from './portals/Admin/AdminLayout';
import AdminDashboard from './portals/Admin/AdminDashboard';
import Approvals from './portals/Admin/Approvals';
import OutboxMonitor from './portals/Admin/OutboxMonitor';
import AuditLog from './portals/Admin/AuditLog';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Strict role validation - redirect to appropriate portal if role doesn't match
  if (allowedRole && user.role !== allowedRole) {
    // Redirect to the correct portal based on user's actual role
    switch(user.role) {
      case 'CUSTOMER': return <Navigate to="/customer/home" replace />;
      case 'RESTAURANT': return <Navigate to="/restaurant/dashboard" replace />;
      case 'RIDER': return <Navigate to="/rider/dashboard" replace />;
      case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }
  
  return children;
};

const RoleRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  
  switch(user.role) {
    case 'CUSTOMER': return <Navigate to="/customer/home" />;
    case 'RESTAURANT': return <Navigate to="/restaurant/dashboard" />;
    case 'RIDER': return <Navigate to="/rider/dashboard" />;
    case 'ADMIN': return <Navigate to="/admin/dashboard" />;
    default: return <Navigate to="/login" />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/offers" element={<OffersPage />} />

          {/* Customer Portal */}
          <Route path="/customer/home" element={<ProtectedRoute allowedRole="CUSTOMER"><CustomerHome /></ProtectedRoute>} />
          <Route path="/customer/restaurant/:id" element={<ProtectedRoute allowedRole="CUSTOMER"><RestaurantMenu /></ProtectedRoute>} />
          <Route path="/customer/tracking/:id" element={<ProtectedRoute allowedRole="CUSTOMER"><OrderTracking /></ProtectedRoute>} />
          <Route path="/tracking/:id" element={<ProtectedRoute allowedRole="CUSTOMER"><OrderTracking /></ProtectedRoute>} />
          <Route path="/customer/history" element={<ProtectedRoute allowedRole="CUSTOMER"><OrderHistory /></ProtectedRoute>} />

          {/* Restaurant Portal */}
          <Route path="/restaurant/dashboard" element={<ProtectedRoute allowedRole="RESTAURANT"><RestaurantDashboard /></ProtectedRoute>} />
          <Route path="/restaurant/menu" element={<ProtectedRoute allowedRole="RESTAURANT"><MenuManagement /></ProtectedRoute>} />
          <Route path="/restaurant/earnings" element={<ProtectedRoute allowedRole="RESTAURANT"><Earnings /></ProtectedRoute>} />

          {/* Rider Portal */}
          <Route path="/rider/dashboard" element={<ProtectedRoute allowedRole="RIDER"><RiderDashboard /></ProtectedRoute>} />
          <Route path="/rider/delivery/:id" element={<ProtectedRoute allowedRole="RIDER"><ActiveDelivery /></ProtectedRoute>} />

          {/* Admin Portal */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="outbox" element={<OutboxMonitor />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="db-ops" element={<div>Database Operations Center</div>} />
            <Route path="orders" element={<div>Order Management</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
