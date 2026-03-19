/**
 * 🔐 Security Service — خدمة أمان الواجهة الأمامية
 * AlAwael ERP
 */
import apiClient from './api.client';

const BASE = '/security';

const securityService = {
  /* ── Security Profile ── */
  getProfile: () => apiClient.get(`${BASE}/profile`),

  /* ── MFA ── */
  getMfaStatus: () => apiClient.get(`${BASE}/mfa/status`),
  setupMfa: () => apiClient.post(`${BASE}/mfa/setup`),
  enableMfa: (token, secret) => apiClient.post(`${BASE}/mfa/enable`, { token, secret }),
  disableMfa: password => apiClient.post(`${BASE}/mfa/disable`, { password }),
  regenerateBackupCodes: () => apiClient.post(`${BASE}/mfa/backup-codes`),

  /* ── Sessions ── */
  getSessions: () => apiClient.get(`${BASE}/sessions`),
  terminateSession: id => apiClient.delete(`${BASE}/sessions/${id}`),
  logoutAllSessions: () => apiClient.post(`${BASE}/sessions/logout-all`),

  /* ── Password ── */
  changePassword: (currentPassword, newPassword) =>
    apiClient.post(`${BASE}/password/change`, { currentPassword, newPassword }),

  /* ── Security Logs ── */
  getMyLogs: (params = {}) => apiClient.get(`${BASE}/logs/me`, { params }),
  getAllLogs: (params = {}) => apiClient.get(`${BASE}/logs`, { params }),
  getLoginAttempts: (params = {}) => apiClient.get(`${BASE}/login-attempts`, { params }),

  /* ── Security Policy ── */
  getPolicy: () => apiClient.get(`${BASE}/policy`),
  updatePolicy: updates => apiClient.put(`${BASE}/policy`, updates),

  /* ── IP Management ── */
  addIpWhitelist: ip => apiClient.post(`${BASE}/ip/whitelist`, { ip }),
  removeIpWhitelist: ip => apiClient.delete(`${BASE}/ip/whitelist`, { data: { ip } }),
  addIpBlacklist: ip => apiClient.post(`${BASE}/ip/blacklist`, { ip }),
  removeIpBlacklist: ip => apiClient.delete(`${BASE}/ip/blacklist`, { data: { ip } }),

  /* ── Analytics ── */
  getOverview: () => apiClient.get(`${BASE}/overview`),
  getStats: () => apiClient.get(`${BASE}/stats`),
};

export default securityService;
