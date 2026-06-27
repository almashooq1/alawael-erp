/**
 * Compliance Service — خدمة الامتثال والاعتماد
 * Frontend API layer
 */
import api from './api';

const BASE = '/api/v1/compliance';

const complianceService = {
  /* ── Dashboard Overview ── */
  getDashboard: (branchId, standard) =>
    api.get(`${BASE}/dashboard`, { params: { branchId, standard } }),

  /* ── List Audits ── */
  getAudits: (filters = {}) =>
    api.get(`${BASE}/audits`, { params: filters }),

  /* ── Create Audit ── */
  createAudit: (data) => api.post(`${BASE}/audits`, data),

  /* ── Get Single Audit ── */
  getAuditById: (id) => api.get(`${BASE}/audits/${id}`),

  /* ── Update Status ── */
  updateStatus: (id, status, evidence) =>
    api.patch(`${BASE}/audits/${id}/status`, { status, evidence }),

  /* ── Pending Actions ── */
  getPendingActions: (branchId) =>
    api.get(`${BASE}/pending-actions`, { params: { branchId } }),

  /* ── Upcoming Reviews ── */
  getUpcomingReviews: (branchId, days = 30) =>
    api.get(`${BASE}/upcoming-reviews`, { params: { branchId, days } }),

  /* ── Evidence Registry ── */
  getEvidenceRegistry: (auditId) =>
    api.get(`${BASE}/evidence/${auditId}`),

  /* ── Audit Trail ── */
  getAuditTrail: (standard, startDate, endDate) =>
    api.get(`${BASE}/audit-trail`, { params: { standard, startDate, endDate } }),
};

export default complianceService;
