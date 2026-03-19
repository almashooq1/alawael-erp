/**
 * خدمة API لنظام مُدد (حماية الأجور)
 * Mudad API Service
 */
import api from './api.client';

const mudadService = {
  // الإعدادات
  getConfig: () => api.get('/mudad/config'),
  updateConfig: data => api.put('/mudad/config', data),

  // سجلات الرواتب
  generateSalaryRecords: data => api.post('/mudad/salary-records/generate', data),
  getSalaryRecords: params => api.get('/mudad/salary-records', { params }),

  // الدفعات
  createBatch: data => api.post('/mudad/batches', data),
  getBatches: params => api.get('/mudad/batches', { params }),
  validateBatch: id => api.post(`/mudad/batches/${id}/validate`),
  generateFile: id => api.post(`/mudad/batches/${id}/generate-file`),
  uploadBatch: id => api.post(`/mudad/batches/${id}/upload`),

  // الامتثال
  generateCompliance: data => api.post('/mudad/compliance/generate', data),
  getComplianceReports: params => api.get('/mudad/compliance', { params }),

  // لوحة المعلومات
  getDashboard: () => api.get('/mudad/dashboard'),
};

export default mudadService;
