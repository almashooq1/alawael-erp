/**
 * Blockchain Certificates Service
 * خدمة شهادات البلوكتشين
 */
import api from './api';

const BASE = '/api/blockchain';

// ── Templates ──
export const templatesService = {
  getAll: () =>
    api
      .get(`${BASE}/templates`)
      .then(r => r.data)
      .catch(() => ({ data: [] })),
  create: data => api.post(`${BASE}/templates`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/templates/${id}`, data).then(r => r.data),
};

// ── Certificates ──
export const certificatesService = {
  getAll: () =>
    api
      .get(`${BASE}/certificates`)
      .then(r => r.data)
      .catch(() => ({ data: [] })),
  getById: id => api.get(`${BASE}/certificates/${id}`).then(r => r.data),
  create: data => api.post(`${BASE}/certificates`, data).then(r => r.data),
  issue: id => api.patch(`${BASE}/certificates/${id}/issue`).then(r => r.data),
  sign: id => api.patch(`${BASE}/certificates/${id}/sign`).then(r => r.data),
  revoke: id => api.patch(`${BASE}/certificates/${id}/revoke`).then(r => r.data),
};

// ── Verification ──
export const verificationService = {
  verifyByHash: hash => api.get(`${BASE}/verify/${hash}`).then(r => r.data),
  verifyByNumber: num => api.get(`${BASE}/verify/number/${num}`).then(r => r.data),
  getLogs: certId => api.get(`${BASE}/verify/${certId}/logs`).then(r => r.data),
};

// ── Dashboard ──
export const getDashboard = () =>
  api
    .get(`${BASE}/dashboard`)
    .then(r => r.data)
    .catch(() => ({ data: {} }));
