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
  getAll: (params = {}) =>
    api
      .get(`${BASE}/certificates`, { params })
      .then(r => r.data)
      .catch(() => ({ data: [] })),
  getById: id => api.get(`${BASE}/certificates/${id}`).then(r => r.data),
  create: (data, idempotencyKey) =>
    api
      .post(`${BASE}/certificates`, data, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      })
      .then(r => r.data),
  issue: id => api.patch(`${BASE}/certificates/${id}/issue`).then(r => r.data),
  batchIssue: certificateIds =>
    api.post(`${BASE}/certificates/batch-issue`, { certificateIds }).then(r => r.data),
  sign: (id, payload) => api.patch(`${BASE}/certificates/${id}/sign`, payload).then(r => r.data),
  revoke: (id, payload) =>
    api.patch(`${BASE}/certificates/${id}/revoke`, payload).then(r => r.data),
  pdfUrl: id => `${BASE}/certificates/${id}/pdf`,
};

// ── Verification — admin (logs userId) ──
export const verificationService = {
  verifyByHash: hash => api.get(`${BASE}/verify/${hash}`).then(r => r.data),
  verifyByNumber: num => api.get(`${BASE}/verify/number/${num}`).then(r => r.data),
  getLogs: certId => api.get(`${BASE}/verify/${certId}/logs`).then(r => r.data),
  getAllLogs: (params = {}) =>
    api
      .get(`${BASE}/logs`, { params })
      .then(r => r.data)
      .catch(() => ({ data: [], stats: {} })),
};

// ── Verification — public (no auth, used by /verify page + QR landing) ──
export const publicVerificationService = {
  verifyByHash: hash => api.get(`/api/v1/blockchain/public/verify/${hash}`).then(r => r.data),
  verifyByNumber: num =>
    api.get(`/api/v1/blockchain/public/verify/number/${num}`).then(r => r.data),
};

// ── Dashboard ──
export const getDashboard = () =>
  api
    .get(`${BASE}/dashboard`)
    .then(r => r.data)
    .catch(() => ({ data: {} }));
