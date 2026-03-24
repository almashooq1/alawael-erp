/**
 * خدمة الصلاحيات الأمان والمصادقة
 * تسجيل الدخول، تسجيل الخروج، إدارة التوكن
 */

import apiClient from './api.client';
import { removeToken, getToken, getUserData, removeUserData, clearAuthData } from 'utils/tokenStorage';
import { getPortal, removePortal } from 'utils/storageService';

const authService = {
  // ==================== المصادقة ====================
  login: (email, password, portal) => apiClient.post('/auth/login', { email, password, portal }),

  logout: async () => {
    // Best-effort: tell backend to blacklist the current token
    try {
      const token = getToken();
      if (token) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } catch {
      // Ignore — clearing local state is enough
    }
    clearAuthData();
    removePortal();
    return Promise.resolve();
  },

  register: userData => apiClient.post('/auth/register', userData),

  // ==================== التحقق ====================
  verifyEmail: token => apiClient.post('/auth/verify-email', { token }),

  resendVerificationEmail: email => apiClient.post('/auth/resend-verification', { email }),

  sendPasswordResetEmail: email => apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  // ==================== التحقق الثنائي ====================
  enableTwoFactor: () => apiClient.post('/auth/2fa/enable'),

  disableTwoFactor: password => apiClient.post('/auth/2fa/disable', { password }),

  verifyTwoFactor: code => apiClient.post('/auth/2fa/verify', { code }),

  // ==================== الجلسة ====================
  getCurrentUser: () => {
    return getUserData();
  },

  getAuthToken: () => getToken(),

  isAuthenticated: () => !!getToken(),

  getPortal: () => getPortal(),

  // ==================== تحديث البيانات ====================
  refreshToken: () => apiClient.post('/auth/refresh'),

  // ==================== الأمان ====================
  getSecuritySettings: () => apiClient.get('/account/security'),

  updateSecuritySettings: settings => apiClient.put('/account/security', settings),

  getSessions: () => apiClient.get('/account/sessions'),

  logoutSession: sessionId => apiClient.delete(`/account/sessions/${sessionId}`),

  logoutAllOtherSessions: () => apiClient.post('/account/sessions/logout-all'),
};

export default authService;
