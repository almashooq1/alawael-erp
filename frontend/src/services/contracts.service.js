import api from './api.client';

const contractsService = {
  getAll: params => api.get('/contracts', { params }),
  getById: id => api.get(`/contracts/${id}`),
  create: data => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: id => api.delete(`/contracts/${id}`),
  renew: id => api.post(`/contracts/${id}/renew`),
  getStats: () => api.get('/contracts/stats/summary'),
  getStatsSummary: () => api.get('/contracts/stats/summary'),
};

export default contractsService;
