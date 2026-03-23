/**
 * Telehealth Service — خدمة الطب عن بُعد
 *
 * API client for the dedicated telehealth routes (/api/telehealth).
 */
import api from './api';

const BASE = '/telehealth';

const telehealthService = {
  // ── Dashboard & Stats ──
  getDashboardOverview: () => api.get(`${BASE}/dashboard/overview`),
  getStats: () => api.get(`${BASE}/stats`),

  // ── Session CRUD ──
  getSessions: (params = {}) => api.get(`${BASE}/sessions`, { params }),
  getSessionById: (id) => api.get(`${BASE}/sessions/${id}`),
  createSession: (data) => api.post(`${BASE}/sessions`, data),
  updateSession: (id, data) => api.put(`${BASE}/sessions/${id}`, data),
  updateSessionStatus: (id, status) =>
    api.patch(`${BASE}/sessions/${id}/status`, { status }),
  deleteSession: (id) => api.delete(`${BASE}/sessions/${id}`),

  // ── Real-time Session Control ──
  startSession: (id) => api.post(`${BASE}/sessions/${id}/start`),
  endSession: (id, data = {}) => api.post(`${BASE}/sessions/${id}/end`, data),

  // ── In-session Actions ──
  recordVitals: (id, vitalData) =>
    api.post(`${BASE}/sessions/${id}/vitals`, vitalData),
  addNote: (id, noteData) =>
    api.post(`${BASE}/sessions/${id}/notes`, noteData),
  sendMessage: (id, messageData) =>
    api.post(`${BASE}/sessions/${id}/messages`, messageData),
  rateSession: (id, rating, comment = '') =>
    api.post(`${BASE}/sessions/${id}/rating`, { rating, comment }),

  // ── AI & Analytics ──
  analyzeEngagement: (id, metrics = {}) =>
    api.post(`${BASE}/sessions/${id}/analyze-engagement`, { metrics }),
  getSessionReport: (id) => api.get(`${BASE}/sessions/${id}/report`),
  getSessionRecording: (id) => api.get(`${BASE}/sessions/${id}/recording`),

  // ── Waiting Room ──
  getWaitingRoom: () => api.get(`${BASE}/waiting-room`),
};

export default telehealthService;
