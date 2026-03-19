import api from './api.client';

const noorService = {
  // Config
  getConfig: () => api.get('/noor/config'),
  updateConfig: data => api.put('/noor/config', data),

  // Dashboard
  getDashboard: academicYear => api.get('/noor/dashboard', { params: { academicYear } }),

  // Students
  getStudents: params => api.get('/noor/students', { params }),
  createStudent: data => api.post('/noor/students', data),
  getStudent: id => api.get(`/noor/students/${id}`),
  updateStudent: (id, data) => api.put(`/noor/students/${id}`, data),
  syncStudent: id => api.post(`/noor/students/${id}/sync`),
  bulkSync: academicYear => api.post('/noor/students/bulk-sync', { academicYear }),

  // IEPs
  getIEPs: params => api.get('/noor/ieps', { params }),
  createIEP: data => api.post('/noor/ieps', data),
  getIEP: id => api.get(`/noor/ieps/${id}`),
  updateIEP: (id, data) => api.put(`/noor/ieps/${id}`, data),
  submitIEPToNoor: id => api.post(`/noor/ieps/${id}/submit-noor`),
  updateGoalProgress: (iepId, goalIndex, data) =>
    api.put(`/noor/ieps/${iepId}/goals/${goalIndex}/progress`, data),

  // Progress Reports
  getProgressReports: params => api.get('/noor/progress-reports', { params }),
  createProgressReport: data => api.post('/noor/progress-reports', data),
  submitReportToNoor: id => api.post(`/noor/progress-reports/${id}/submit-noor`),
};

export default noorService;
