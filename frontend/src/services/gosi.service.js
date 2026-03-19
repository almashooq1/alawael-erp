/**
 * GOSI (التأمينات الاجتماعية) — Frontend Service
 *
 * Social insurance integration:
 * compliance reports, contribution calculation, employee
 * registration, wage management, certificates.
 */
import api from './api.client';

const gosiService = {
  getComplianceReport: () => api.get('/gosi/compliance/report'),
  calculateContributions: data => api.post('/gosi/calculate', data),
  registerEmployee: id => api.post(`/gosi/${id}/register`),
  getEmployeeStatus: id => api.get(`/gosi/${id}/status`),
  updateWage: (id, data) => api.put(`/gosi/${id}/wage`, data),
  cancelRegistration: id => api.post(`/gosi/${id}/cancel`),
  getCertificate: id => api.get(`/gosi/${id}/certificate`),
};

export default gosiService;
