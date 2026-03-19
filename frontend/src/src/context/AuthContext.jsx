/**
 * Authentication Context & Service
 * سياق وخدمة المصادقة
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// API Base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('userData');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // Clear auth on error
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call - replace with actual API call
      await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      // For demo, simulate successful login
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'USR-001',
            username: credentials.username || credentials.nationalId || credentials.phone,
            name: 'محمد أحمد',
            email: 'mohammed@example.com',
            role: 'admin',
            centerId: credentials.centerId || 'CTR-001',
            centerName: 'مركز التأهيل الشامل - الرياض',
            permissions: [
              'dashboard.view',
              'students.view',
              'students.create',
              'students.edit',
              'transport.view',
              'reports.view',
              'settings.view',
            ],
          },
          token: 'mock-jwt-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        },
      };
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (mockResponse.success) {
        const { user, token, refreshToken, expiresAt } = mockResponse.data;
        
        // Store in localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tokenExpiry', expiresAt.toString());
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Update state
        setToken(token);
        setUser(user);
        
        return { success: true };
      }
      
      throw new Error(mockResponse.message || 'فشل تسجيل الدخول');
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API if needed
      // await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear storage and state
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('userData');
      
      setToken(null);
      setUser(null);
      
      navigate('/login');
    }
  }, [navigate]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token');
      }
      
      // Simulate API call
      const mockResponse = {
        success: true,
        data: {
          token: 'new-mock-jwt-token-' + Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        },
      };
      
      if (mockResponse.success) {
        localStorage.setItem('authToken', mockResponse.data.token);
        localStorage.setItem('tokenExpiry', mockResponse.data.expiresAt.toString());
        setToken(mockResponse.data.token);
        return true;
      }
      
      throw new Error('Token refresh failed');
    } catch (err) {
      logout();
      return false;
    }
  }, [logout]);

  // Check permission function
  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  }, [user]);

  // Check role function
  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  }, [user]);

  // Forgot password function
  const forgotPassword = useCallback(async (identifier, method) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { 
        success: true, 
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور' 
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { 
        success: true, 
        message: 'تم إعادة تعيين كلمة المرور بنجاح' 
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password function
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { 
        success: true, 
        message: 'تم تغيير كلمة المرور بنجاح' 
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Context value
  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    forgotPassword,
    resetPassword,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = (Component) => {
  return (props) => {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
      if (!loading && !isAuthenticated) {
        navigate('/login');
      }
    }, [loading, isAuthenticated, navigate]);
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    return isAuthenticated ? <Component {...props} /> : null;
  };
};

export default AuthContext;