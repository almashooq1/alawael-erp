import api from './api.client';

const budgetManagementService = {
  getAll: params => api.get('/budget-management', { params }),
  getById: id => api.get(`/budget-management/${id}`),
  create: data => api.post('/budget-management', data),
  update: (id, data) => api.put(`/budget-management/${id}`, data),
  allocate: (id, data) => api.post(`/budget-management/${id}/allocate`, data),
  getVariance: id => api.get(`/budget-management/${id}/variance`),
  getOverview: () => api.get('/budget-management/stats/overview'),
};

export default budgetManagementService;
