/**
 * E-Stamp Service — خدمة الختم الإلكتروني
 */
import api from './api.client';

const eStampService = {
  /* ─── Dashboard ────────────────────────────────────────────────── */
  getStats: () => api.get('/e-stamp/stats'),

  /* ─── Stamps CRUD ──────────────────────────────────────────────── */
  getAll: params => api.get('/e-stamp', { params }),
  getById: id => api.get(`/e-stamp/${id}`),
  create: data => api.post('/e-stamp', data),
  update: (id, data) => api.put(`/e-stamp/${id}`, data),
  remove: id => api.delete(`/e-stamp/${id}`),

  /* ─── Workflow Actions ─────────────────────────────────────────── */
  submitForApproval: id => api.post(`/e-stamp/${id}/submit-approval`),
  approve: id => api.post(`/e-stamp/${id}/approve`),
  reject: (id, data) => api.post(`/e-stamp/${id}/reject`, data),
  activate: id => api.post(`/e-stamp/${id}/activate`),
  deactivate: (id, data) => api.post(`/e-stamp/${id}/deactivate`, data),
  revoke: (id, data) => api.post(`/e-stamp/${id}/revoke`, data),
  renew: (id, data) => api.post(`/e-stamp/${id}/renew`, data),

  /* ─── Apply Stamp ──────────────────────────────────────────────── */
  apply: (id, data) => api.post(`/e-stamp/${id}/apply`, data),

  /* ─── History & Audit ──────────────────────────────────────────── */
  getUsageHistory: id => api.get(`/e-stamp/${id}/usage`),
  getAuditTrail: id => api.get(`/e-stamp/${id}/audit`),

  /* ─── Authorization ────────────────────────────────────────────── */
  authorizeUser: (id, data) => api.post(`/e-stamp/${id}/authorize`, data),
  removeAuthorization: (id, userId) => api.delete(`/e-stamp/${id}/authorize/${userId}`),

  /* ─── Verification ─────────────────────────────────────────────── */
  verify: code => api.get(`/e-stamp/verify/${code}`),

  /* ─── Transfer ─────────────────────────────────────────────────── */
  transfer: (id, data) => api.post(`/e-stamp/${id}/transfer`, data),
};

export default eStampService;
