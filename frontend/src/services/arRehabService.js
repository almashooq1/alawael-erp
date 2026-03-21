/**
 * AR Rehabilitation Service
 * خدمة التأهيل بالواقع المعزز
 */
import api from './api';

const BASE = '/api/ar-rehab';

// ── Sessions ──
export const sessionsService = {
  create: (data) => api.post(`${BASE}/sessions`, data).then(r => r.data),
  getById: (sessionId) => api.get(`${BASE}/sessions/${sessionId}`).then(r => r.data),
  addObject: (sessionId, data) => api.post(`${BASE}/sessions/${sessionId}/objects`, data).then(r => r.data),
  track: (sessionId, data) => api.post(`${BASE}/sessions/${sessionId}/track`, data).then(r => r.data),
  end: (sessionId) => api.patch(`${BASE}/sessions/${sessionId}/end`).then(r => r.data),
};

// ── Holograms ──
export const hologramsService = {
  create: (data) => api.post(`${BASE}/holograms`, data).then(r => r.data),
  getById: (id) => api.get(`${BASE}/holograms/${id}`).then(r => r.data),
  updateData: (id, data) => api.put(`${BASE}/holograms/${id}/data`, data).then(r => r.data),
  addInteractive: (id, data) => api.post(`${BASE}/holograms/${id}/interactive`, data).then(r => r.data),
  getMetrics: (id) => api.get(`${BASE}/holograms/${id}/metrics`).then(r => r.data),
};

// ── Brain-Computer Interface ──
export const bciService = {
  registerDevice: (data) => api.post(`${BASE}/bci/devices`, data).then(r => r.data),
  calibrate: (deviceId, data) => api.post(`${BASE}/bci/devices/${deviceId}/calibrate`, data).then(r => r.data),
  capture: (deviceId, data) => api.post(`${BASE}/bci/devices/${deviceId}/capture`, data).then(r => r.data),
  decode: (data) => api.post(`${BASE}/bci/decode`, data).then(r => r.data),
  train: (data) => api.post(`${BASE}/bci/train`, data).then(r => r.data),
  getCapabilities: () => api.get(`${BASE}/bci/capabilities`).then(r => r.data).catch(() => ({ data: {} })),
};

// ── Collaboration ──
export const collaborationService = {
  createSession: (data) => api.post(`${BASE}/collaboration/sessions`, data).then(r => r.data),
  join: (sessionId, data) => api.post(`${BASE}/collaboration/sessions/${sessionId}/join`, data).then(r => r.data),
  sync: (sessionId, data) => api.put(`${BASE}/collaboration/sessions/${sessionId}/sync`, data).then(r => r.data),
  broadcast: (sessionId, data) => api.post(`${BASE}/collaboration/sessions/${sessionId}/broadcast`, data).then(r => r.data),
  getMetrics: (sessionId) => api.get(`${BASE}/collaboration/sessions/${sessionId}/metrics`).then(r => r.data),
};

// ── Analytics ──
export const analyticsService = {
  createDashboard: (data) => api.post(`${BASE}/analytics/dashboards`, data).then(r => r.data),
  getDashboard: (id) => api.get(`${BASE}/analytics/dashboards/${id}`).then(r => r.data),
  addWidget: (dashboardId, data) => api.post(`${BASE}/analytics/dashboards/${dashboardId}/widgets`, data).then(r => r.data),
  interactWidget: (dashboardId, widgetId, data) => api.post(`${BASE}/analytics/dashboards/${dashboardId}/widgets/${widgetId}/interact`, data).then(r => r.data),
};

// ── Dashboard ──
export const getDashboard = () => api.get(`${BASE}/dashboard`).then(r => r.data).catch(() => ({ data: {} }));
