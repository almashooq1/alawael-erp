/**
 * Quality Management API Service — خدمة API إدارة الجودة
 * Phase 20 — ISO / CBAHI
 */

import api from './api';

const BASE = '/api/quality-management';

const qualityManagementService = {
  /* ── Dashboard & Reference ── */
  getDashboard: () => api.get(`${BASE}/dashboard`),
  getStatistics: () => api.get(`${BASE}/statistics`),
  getReference: () => api.get(`${BASE}/reference`),

  /* ── Audits ── */
  listAudits: (params) => api.get(`${BASE}/audits`, { params }),
  getAudit: (id) => api.get(`${BASE}/audits/${id}`),
  createAudit: (data) => api.post(`${BASE}/audits`, data),
  updateAudit: (id, data) => api.put(`${BASE}/audits/${id}`, data),
  deleteAudit: (id) => api.delete(`${BASE}/audits/${id}`),

  /* ── Findings ── */
  listFindings: (params) => api.get(`${BASE}/findings`, { params }),
  getFinding: (id) => api.get(`${BASE}/findings/${id}`),
  createFinding: (data) => api.post(`${BASE}/findings`, data),
  updateFinding: (id, data) => api.put(`${BASE}/findings/${id}`, data),
  closeFinding: (id) => api.post(`${BASE}/findings/${id}/close`),

  /* ── Non-Conformances ── */
  listNonConformances: (params) => api.get(`${BASE}/non-conformances`, { params }),
  getNonConformance: (id) => api.get(`${BASE}/non-conformances/${id}`),
  createNonConformance: (data) => api.post(`${BASE}/non-conformances`, data),
  updateNonConformance: (id, data) => api.put(`${BASE}/non-conformances/${id}`, data),
  deleteNonConformance: (id) => api.delete(`${BASE}/non-conformances/${id}`),

  /* ── CAPA ── */
  listCAPAs: (params) => api.get(`${BASE}/capa`, { params }),
  getCAPA: (id) => api.get(`${BASE}/capa/${id}`),
  createCAPA: (data) => api.post(`${BASE}/capa`, data),
  updateCAPA: (id, data) => api.put(`${BASE}/capa/${id}`, data),
  verifyCAPA: (id) => api.post(`${BASE}/capa/${id}/verify`),

  /* ── Quality Indicators ── */
  listIndicators: (params) => api.get(`${BASE}/indicators`, { params }),
  getIndicator: (id) => api.get(`${BASE}/indicators/${id}`),
  createIndicator: (data) => api.post(`${BASE}/indicators`, data),
  updateIndicator: (id, data) => api.put(`${BASE}/indicators/${id}`, data),
  deleteIndicator: (id) => api.delete(`${BASE}/indicators/${id}`),

  /* ── Indicator Records ── */
  getIndicatorRecords: (id, params) => api.get(`${BASE}/indicators/${id}/records`, { params }),
  addIndicatorRecord: (id, data) => api.post(`${BASE}/indicators/${id}/records`, data),
  getIndicatorTrend: (id) => api.get(`${BASE}/indicators/${id}/trend`),

  /* ── Documents ── */
  listDocuments: (params) => api.get(`${BASE}/documents`, { params }),
  getDocument: (id) => api.get(`${BASE}/documents/${id}`),
  createDocument: (data) => api.post(`${BASE}/documents`, data),
  updateDocument: (id, data) => api.put(`${BASE}/documents/${id}`, data),
  approveDocument: (id) => api.post(`${BASE}/documents/${id}/approve`),
  deleteDocument: (id) => api.delete(`${BASE}/documents/${id}`),

  /* ── Risk Register ── */
  listRisks: (params) => api.get(`${BASE}/risks`, { params }),
  getRisk: (id) => api.get(`${BASE}/risks/${id}`),
  createRisk: (data) => api.post(`${BASE}/risks`, data),
  updateRisk: (id, data) => api.put(`${BASE}/risks/${id}`, data),
  deleteRisk: (id) => api.delete(`${BASE}/risks/${id}`),

  /* ── Accreditation Reports ── */
  listAccreditationReports: (params) => api.get(`${BASE}/accreditation-reports`, { params }),
  getAccreditationReport: (id) => api.get(`${BASE}/accreditation-reports/${id}`),
  generateAccreditationReport: (data) => api.post(`${BASE}/accreditation-reports/generate`, data),
  exportAccreditationReport: (id, format) => api.get(`${BASE}/accreditation-reports/${id}/export`, { params: { format } }),

  /* ── Compliance Matrix ── */
  getComplianceMatrix: (standardId) => api.get(`${BASE}/compliance-matrix/${standardId}`),

  /* ── Audit Log ── */
  getAuditLog: (params) => api.get(`${BASE}/audit-log`, { params }),
};

export default qualityManagementService;
