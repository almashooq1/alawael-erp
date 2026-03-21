/**
 * ICF Assessment Service
 * خدمة تقييمات التصنيف الدولي للأداء الوظيفي (ICF)
 */
import api from './api';

const BASE = '/api/icf-assessments';

// ── Assessments CRUD ──
export const assessmentsService = {
  getAll: () => api.get(BASE).then(r => r.data).catch(() => ({ data: [] })),
  getById: (id) => api.get(`${BASE}/${id}`).then(r => r.data),
  create: (data) => api.post(BASE, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then(r => r.data),
  updateStatus: (id, status) => api.patch(`${BASE}/${id}/status`, { status }).then(r => r.data),
  compare: (id) => api.get(`${BASE}/${id}/compare`).then(r => r.data),
  benchmark: (id) => api.get(`${BASE}/${id}/benchmark`).then(r => r.data),
  getReport: (id) => api.get(`${BASE}/${id}/report`).then(r => r.data),
};

// ── ICF Codes ──
export const codesService = {
  search: (params) => api.get(`${BASE}/codes`, { params }).then(r => r.data).catch(() => ({ data: [] })),
  getTree: (component) => api.get(`${BASE}/codes/tree/${component}`).then(r => r.data),
};

// ── Benchmarks ──
export const benchmarksService = {
  getAll: () => api.get(`${BASE}/benchmarks`).then(r => r.data).catch(() => ({ data: [] })),
  create: (data) => api.post(`${BASE}/benchmarks`, data).then(r => r.data),
  importData: (data) => api.post(`${BASE}/benchmarks/import`, data).then(r => r.data),
};

// ── Reports & Statistics ──
export const reportsService = {
  getStatistics: () => api.get(`${BASE}/statistics`).then(r => r.data).catch(() => ({ data: {} })),
  getDomainDistribution: () => api.get(`${BASE}/domain-distribution`).then(r => r.data).catch(() => ({ data: {} })),
  getOrganizationReport: () => api.get(`${BASE}/organization-report`).then(r => r.data).catch(() => ({ data: {} })),
};

// ── Beneficiary ──
export const beneficiaryService = {
  getTimeline: (beneficiaryId) => api.get(`${BASE}/beneficiary/${beneficiaryId}/timeline`).then(r => r.data),
  getComparativeReport: (beneficiaryId) => api.get(`${BASE}/beneficiary/${beneficiaryId}/comparative-report`).then(r => r.data),
};
