import api from './api.client';

const riskAssessmentService = {
  getAll: params => api.get('/risk-assessment', { params }),
  getById: id => api.get(`/risk-assessment/${id}`),
  create: data => api.post('/risk-assessment', data),
  update: (id, data) => api.put(`/risk-assessment/${id}`, data),
  getMatrix: () => api.get('/risk-assessment/matrix/overview'),
  getStats: () => api.get('/risk-assessment/stats/summary'),
};

export default riskAssessmentService;
