import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

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
      const response = await axios.get('http://localhost:3001/api/auth/me');
      setCurrentUser(response.data.user);
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
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
      console.log('🔐 Login attempt:', { email, url: 'http://localhost:3001/api/auth/login' });

      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password,
      });

      console.log('📥 Login response:', response.data);

      const { accessToken, user } = response.data.data;
      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setCurrentUser(user);

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
      await axios.post('http://localhost:3001/api/auth/register', {
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
    delete axios.defaults.headers.common['Authorization'];
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
