import api from './api.client';

const visitorsService = {
  // ─── CRUD ────────────────────────────────────────────────────────────────
  getAll: params => api.get('/visitors', { params }),
  getById: id => api.get(`/visitors/${id}`),
  register: data => api.post('/visitors', data),
  update: (id, data) => api.put(`/visitors/${id}`, data),

  // ─── Actions ─────────────────────────────────────────────────────────────
  checkIn: (id, data = {}) => api.post(`/visitors/${id}/check-in`, data),
  checkOut: (id, data = {}) => api.post(`/visitors/${id}/check-out`, data),
  cancel: (id, reason) => api.post(`/visitors/${id}/cancel`, { reason }),
  noShow: id => api.post(`/visitors/${id}/no-show`),

  // ─── Stats & Analytics ───────────────────────────────────────────────────
  getTodayStats: () => api.get('/visitors/stats/today'),
  getAnalytics: params => api.get('/visitors/analytics', { params }),
  getCurrentInside: () => api.get('/visitors/currently-inside'),
  getExpectedToday: () => api.get('/visitors/expected-today'),

  // ─── Blacklist ───────────────────────────────────────────────────────────
  getBlacklist: params => api.get('/visitors/blacklist', { params }),
  addToBlacklist: data => api.post('/visitors/blacklist', data),
  removeFromBlacklist: id => api.delete(`/visitors/blacklist/${id}`),

  // ─── Logs ────────────────────────────────────────────────────────────────
  getVisitorLogs: (id, params) => api.get(`/visitors/${id}/logs`, { params }),
  getRecentLogs: params => api.get('/visitors/logs/recent', { params }),

  // ─── Seed ────────────────────────────────────────────────────────────────
  seed: () => api.post('/visitors/seed'),
};

export default visitorsService;
