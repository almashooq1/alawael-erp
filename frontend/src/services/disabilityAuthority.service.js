/**
 * خدمة API لتقارير الهيئة ومعايير CBAHI
 * Disability Authority & CBAHI API Service
 */
import api from './api.client';

const disabilityAuthorityService = {
  // تقارير الهيئة
  getReports: params => api.get('/disability-authority/reports', { params }),
  getReport: id => api.get(`/disability-authority/reports/${id}`),
  createReport: data => api.post('/disability-authority/reports', data),
  updateReport: (id, data) => api.put(`/disability-authority/reports/${id}`, data),
  reviewReport: (id, data) => api.post(`/disability-authority/reports/${id}/review`, data),
  generateReportData: data => api.post('/disability-authority/reports/generate', data),
  getDashboard: () => api.get('/disability-authority/dashboard'),

  // معايير CBAHI
  getStandards: params => api.get('/disability-authority/cbahi/standards', { params }),
  upsertStandard: data => api.post('/disability-authority/cbahi/standards', data),
  seedStandards: () => api.post('/disability-authority/cbahi/standards/seed'),

  // تقييمات CBAHI
  getAssessments: params => api.get('/disability-authority/cbahi/assessments', { params }),
  getAssessment: id => api.get(`/disability-authority/cbahi/assessments/${id}`),
  createAssessment: data => api.post('/disability-authority/cbahi/assessments', data),
  updateStandardResult: (assessmentId, code, data) =>
    api.put(`/disability-authority/cbahi/assessments/${assessmentId}/standards/${code}`, data),
  completeAssessment: id => api.post(`/disability-authority/cbahi/assessments/${id}/complete`),
  getCBAHIDashboard: () => api.get('/disability-authority/cbahi/dashboard'),
};

export default disabilityAuthorityService;
