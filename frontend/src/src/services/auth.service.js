/**
 * خدمة الصلاحيات الأمان والمصادقة
 * تسجيل الدخول، تسجيل الخروج، إدارة التوكن
 */

import apiClient from './api.client';

const authService = {
  // ==================== المصادقة ====================
  login: (email, password, portal) =>
    apiClient.post('/auth/login', { email, password, portal }),

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('portal');
    return Promise.resolve();
  },

  register: (userData) =>
    apiClient.post('/auth/register', userData),

  // ==================== التحقق ====================
  verifyEmail: (token) =>
    apiClient.post('/auth/verify-email', { token }),

  resendVerificationEmail: (email) =>
    apiClient.post('/auth/resend-verification', { email }),

  sendPasswordResetEmail: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  // ==================== التحقق الثنائي ====================
  enableTwoFactor: () =>
    apiClient.post('/auth/2fa/enable'),

  disableTwoFactor: (password) =>
    apiClient.post('/auth/2fa/disable', { password }),

  verifyTwoFactor: (code) =>
    apiClient.post('/auth/2fa/verify', { code }),

  // ==================== الجلسة ====================
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getAuthToken: () =>
    localStorage.getItem('authToken'),

  isAuthenticated: () =>
    !!localStorage.getItem('authToken'),

  getPortal: () =>
    localStorage.getItem('portal') || null,

  // ==================== تحديث البيانات ====================
  refreshToken: () =>
    apiClient.post('/auth/refresh-token'),

  // ==================== الأمان ====================
  getSecuritySettings: () =>
    apiClient.get('/account/security'),

  updateSecuritySettings: (settings) =>
    apiClient.put('/account/security', settings),

  getSessions: () =>
    apiClient.get('/account/sessions'),

  logoutSession: (sessionId) =>
    apiClient.delete(`/account/sessions/${sessionId}`),

  logoutAllOtherSessions: () =>
    apiClient.post('/account/sessions/logout-all'),
};

export default authService;
