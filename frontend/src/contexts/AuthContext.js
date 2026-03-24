import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const logout = useCallback(async () => {
    // Call backend to blacklist the token (best-effort)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        await api.post('/auth/logout').catch(() => {});
      }
    } catch {
      // Ignore — clearing local state is enough
    }
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setCurrentUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response?.data || response;
      if (userData) {
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      // Only logout on 401 (unauthorized). Network errors and server
      // errors should NOT destroy the session — the token may still be
      // valid once the server recovers.
      const status = err?.status || err?.response?.status;
      if (status === 401) {
        logout();
      } else {
        console.warn('fetchUser failed (non-auth error, keeping session):', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError('');

      const response = await api.post('/auth/login', { email, password });

      const data = response?.data || response;

      const accessToken = data?.accessToken || data?.token;
      const refreshToken = data?.refreshToken;
      const user = data?.user;

      if (!accessToken) {
        throw new Error('Missing access token from login response');
      }

      localStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      setCurrentUser(user || null);

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage;

      if (!err?.status && (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK')) {
        errorMessage = 'لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم وحاول مرة أخرى.';
      } else {
        const dataMsg = typeof err?.data === 'object' ? err?.data?.message : err?.data;
        errorMessage =
          dataMsg || err?.response?.data?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      setError('');
      await api.post('/auth/register', { fullName: name, email, password });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err?.data?.message || err?.response?.data?.message || 'فشل التسجيل. حاول مرة أخرى.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Check if the current user has a specific permission.
   * @param {string} resource
   * @param {string} action
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (resource, action) => {
      if (!currentUser) return false;
      if (currentUser.role === 'super_admin') return true;
      const perms = currentUser.permissions || [];
      return (
        perms.includes(`${resource}:${action}`) ||
        perms.includes(`${resource}:*`) ||
        perms.includes('*:*')
      );
    },
    [currentUser]
  );

  /**
   * Shorthand: can('finance', 'read')
   */
  const can = hasPermission;

  const value = useMemo(
    () => ({
      currentUser,
      error,
      login,
      register,
      logout,
      hasPermission,
      can,
      fetchUser,
    }),
    [currentUser, error, login, register, logout, hasPermission, can, fetchUser]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export default AuthContext;
