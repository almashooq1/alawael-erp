import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

// Use a configurable API base (falls back to port 3001)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data?.user || response.data?.data?.user;
      setCurrentUser(user || null);
    } catch (err) {
      console.error('Error fetching user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      // Fetch user data if token exists
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    try {
      setError('');
      console.log('🔐 Login attempt:', { email, url: `${API_BASE}/auth/login` });

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      console.log('📥 Login response:', response.data);

      // Support both original and simple backend response shapes
      const accessToken =
        response.data?.accessToken ||
        response.data?.token ||
        response.data?.data?.accessToken ||
        response.data?.data?.token;

      const user = response.data?.user || response.data?.data?.user;

      if (!accessToken) {
        throw new Error('Missing access token from login response');
      }

      localStorage.setItem('token', accessToken);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      setCurrentUser(user || null);

      console.log('✅ Login successful:', { user: user.email, role: user.role });
      return { success: true };
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);

      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name, email, password) => {
    try {
      setError('');
      await api.post('/auth/register', {
        fullName: name,
        email,
        password,
      });
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common['Authorization'];
    }
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export default AuthContext;
