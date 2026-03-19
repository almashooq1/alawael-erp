/**
 * E-Signature Service — Enhanced
 * خدمة التوقيع الإلكتروني — محسّنة
 */
import api from './api.client';

const eSignatureService = {
  /* ─── Dashboard ────────────────────────────────────────────────── */
  getStats: () => api.get('/e-signature/stats'),

  /* ─── Requests CRUD ────────────────────────────────────────────── */
  getAll: params => api.get('/e-signature', { params }),
  getById: id => api.get(`/e-signature/${id}`),
  create: data => api.post('/e-signature', data),

  /* ─── Signing actions ──────────────────────────────────────────── */
  sign: (id, data) => api.post(`/e-signature/${id}/sign`, data),
  reject: (id, data) => api.post(`/e-signature/${id}/reject`, data),
  delegate: (id, data) => api.post(`/e-signature/${id}/delegate`, data),
  cancel: (id, data) => api.post(`/e-signature/${id}/cancel`, data),
  remind: id => api.post(`/e-signature/${id}/remind`),
  addComment: (id, data) => api.post(`/e-signature/${id}/comment`, data),

  /* ─── Verification ─────────────────────────────────────────────── */
  verify: id => api.get(`/e-signature/${id}/verify`),
  verifyByCode: code => api.get(`/e-signature/verify-code/${code}`),

  /* ─── Audit ────────────────────────────────────────────────────── */
  getAuditTrail: id => api.get(`/e-signature/${id}/audit`),

  /* ─── Batch ────────────────────────────────────────────────────── */
  batchCreate: data => api.post('/e-signature/batch', data),

  /* ─── Templates ────────────────────────────────────────────────── */
  getTemplates: params => api.get('/e-signature/templates/list', { params }),
  createTemplate: data => api.post('/e-signature/templates', data),
  updateTemplate: (id, data) => api.put(`/e-signature/templates/${id}`, data),
  deleteTemplate: id => api.delete(`/e-signature/templates/${id}`),
};

export default eSignatureService;
