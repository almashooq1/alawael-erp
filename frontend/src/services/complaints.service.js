/**
 * 📋 Complaints Service — خدمة الشكاوى والتظلمات الموحدة
 * AlAwael ERP — Unified complaints management
 *
 * Primary API: /api/complaints (unified backend)
 * Fallback sources preserved for legacy compatibility
 */
import api from './api.client';

const BASE = '/complaints';

const complaintsService = {
  // ── Unified CRUD (جميع الشكاوى الموحدة) ─────────────────────
  getAll: params => api.get(BASE, { params }),
  getById: id => api.get(`${BASE}/${id}`),
  create: data => api.post(BASE, data),
  update: (id, data) => api.put(`${BASE}/${id}`, data),
  remove: id => api.delete(`${BASE}/${id}`),

  // ── Actions (إجراءات) ────────────────────────────────────────
  respond: (id, data) => api.post(`${BASE}/${id}/respond`, data),
  escalate: (id, data) => api.post(`${BASE}/${id}/escalate`, data),
  resolve: (id, data) => api.post(`${BASE}/${id}/resolve`, data),
  rate: (id, data) => api.post(`${BASE}/${id}/rate`, data),

  // ── Stats (الإحصائيات) ───────────────────────────────────────
  getStats: () => api.get(`${BASE}/stats`),

  // ── Source-filtered shortcuts ────────────────────────────────
  getEmployeeComplaints: params => api.get(BASE, { params: { ...params, source: 'employee' } }),
  getStudentComplaints: params => api.get(BASE, { params: { ...params, source: 'student' } }),
  getCustomerComplaints: params => api.get(BASE, { params: { ...params, source: 'customer' } }),
  getParentComplaints: params => api.get(BASE, { params: { ...params, source: 'parent' } }),

  // ── Legacy aliases (توافق عكسي) ─────────────────────────────
  createEmployeeComplaint: data => api.post(BASE, { ...data, source: 'employee' }),
  createStudentComplaint: data => api.post(BASE, { ...data, source: 'student' }),
  createCustomerComplaint: data => api.post(BASE, { ...data, source: 'customer' }),
  updateEmployeeComplaint: (id, data) => api.put(`${BASE}/${id}`, data),
  updateStudentComplaint: (id, data) => api.put(`${BASE}/${id}`, data),
  resolveComplaint: (id, data) => api.post(`${BASE}/${id}/resolve`, data),
};

export default complaintsService;
