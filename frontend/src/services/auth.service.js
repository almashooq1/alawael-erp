/**
 * خدمة الصلاحيات الأمان والمصادقة
 * تسجيل الدخول، تسجيل الخروج، إدارة التوكن
 */

import apiClient from './api.client';
import { getToken, getUserData, clearAuthData } from 'utils/tokenStorage';
import { getPortal, removePortal } from 'utils/storageService';

const authService = {
  // ==================== المصادقة ====================
  login: (email, password, portal) =>
    apiClient.post('/api/v1/auth/login', { email, password, portal }),

  logout: async () => {
    // Best-effort: tell backend to blacklist the current token
    try {
      const token = getToken();
      if (token) {
        await apiClient.post('/api/v1/auth/logout').catch(_err => {
          // Logout API call failed — continuing with local cleanup
        });
      }
    } catch (_err) {
      // Logout error — clearing local state silently
    }
    clearAuthData();
    removePortal();
    return Promise.resolve();
  },

  register: userData => apiClient.post('/api/v1/auth/register', userData),

  // ==================== التحقق ====================
  verifyEmail: token => apiClient.post('/api/v1/auth/verify-email', { token }),

  resendVerificationEmail: email => apiClient.post('/api/v1/auth/resend-verification', { email }),

  sendPasswordResetEmail: email => apiClient.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    apiClient.post('/api/v1/auth/reset-password', { token, newPassword }),

  // ==================== التحقق الثنائي ====================
  enableTwoFactor: () => apiClient.post('/api/v1/auth/2fa/enable'),

  disableTwoFactor: password => apiClient.post('/api/v1/auth/2fa/disable', { password }),

  verifyTwoFactor: code => apiClient.post('/api/v1/auth/2fa/verify', { code }),

  // ==================== الجلسة ====================
  getCurrentUser: () => {
    return getUserData();
  },

  getAuthToken: () => getToken(),

  isAuthenticated: () => !!getToken(),

  getPortal: () => getPortal(),

  // ==================== تحديث البيانات ====================
  refreshToken: () => apiClient.post('/api/v1/auth/refresh'),

  // ==================== الأمان ====================
  getSecuritySettings: () => apiClient.get('/api/v1/account/security'),

  updateSecuritySettings: settings => apiClient.put('/api/v1/account/security', settings),

  getSessions: () => apiClient.get('/api/v1/account/sessions'),

  logoutSession: sessionId => apiClient.delete(`/api/v1/account/sessions/${sessionId}`),

  logoutAllOtherSessions: () => apiClient.post('/api/v1/account/sessions/logout-all'),
};

export default authService;
