import React, { createContext, useState, useCallback, useEffect } from 'react';

/**
 * AuthContext
 * سياق المصادقة
 * 
 * Provides:
 * - isAuthenticated: boolean
 * - user: user object
 * - accessToken: JWT token
 * - login: login function
 * - logout: logout function
 * - setAuth: set auth state
 */
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    sessionId: null,
    expiresAt: null
  });

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sso_tokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored);
        if (tokens.accessToken) {
          setAuthState({
            isAuthenticated: true,
            user: tokens.user,
            accessToken: tokens.accessToken,
            sessionId: tokens.sessionId,
            expiresAt: Date.now() + tokens.expiresIn
          });
        }
      } catch (e) {
        console.error('Failed to restore auth:', e);
        localStorage.removeItem('sso_tokens');
      }
    }
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (!auth.expiresAt) return true;
    return Date.now() > auth.expiresAt;
  }, [auth.expiresAt]);

  // Login
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch('http://localhost:3002/api/sso/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const tokens = {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        user: data.data.user,
        sessionId: data.data.sessionId,
        expiresIn: data.data.expiresIn
      };

      localStorage.setItem('sso_tokens', JSON.stringify(tokens));

      setAuthState({
        isAuthenticated: true,
        user: tokens.user,
        accessToken: tokens.accessToken,
        sessionId: tokens.sessionId,
        expiresAt: Date.now() + tokens.expiresIn
      });

      return tokens;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const sessionId = auth.sessionId;
      if (sessionId && auth.accessToken) {
        await fetch('http://localhost:3002/api/sso/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sso_tokens');
      setAuthState({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        sessionId: null,
        expiresAt: null
      });
    }
  }, [auth]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const stored = localStorage.getItem('sso_tokens');
      if (!stored) throw new Error('No stored tokens');

      const tokens = JSON.parse(stored);
      const response = await fetch('http://localhost:3002/api/sso/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newTokens = {
        ...tokens,
        accessToken: data.data.accessToken,
        expiresIn: data.data.expiresIn
      };

      localStorage.setItem('sso_tokens', JSON.stringify(newTokens));

      setAuthState(prev => ({
        ...prev,
        accessToken: newTokens.accessToken,
        expiresAt: Date.now() + newTokens.expiresIn
      }));

      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
      throw error;
    }
  }, [logout]);

  // Set auth manually
  const setAuth = useCallback((newAuth) => {
    setAuthState(newAuth);
  }, []);

  const value = {
    ...auth,
    isTokenExpired,
    login,
    logout,
    refreshToken,
    setAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
