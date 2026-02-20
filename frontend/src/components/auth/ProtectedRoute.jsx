import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 * مسار محمي يتطلب مصادقة
 */
const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { isAuthenticated, user, isTokenExpired, refreshToken, logout } = useContext(AuthContext);

  useEffect(() => {
    // Check token expiration
    if (isAuthenticated && isTokenExpired()) {
      // Try to refresh token
      refreshToken().catch(() => {
        // If refresh fails, logout
        logout();
      });
    }
  }, [isAuthenticated, isTokenExpired, refreshToken, logout]);

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f7fafc'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check permission
  if (requiredPermission && !user?.permissions?.includes(requiredPermission)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f7fafc'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2>Permission Denied</h2>
          <p>You do not have the required permission for this action.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
