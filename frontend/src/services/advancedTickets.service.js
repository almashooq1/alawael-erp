import api from './api.client';

const advancedTicketsService = {
  getAll: params => api.get('/advanced-tickets', { params }),
  getById: id => api.get(`/advanced-tickets/${id}`),
  create: data => api.post('/advanced-tickets', data),
  update: (id, data) => api.put(`/advanced-tickets/${id}`, data),
  escalate: (id, data) => api.post(`/advanced-tickets/${id}/escalate`, data),
  addComment: (id, data) => api.post(`/advanced-tickets/${id}/comments`, data),
  getSlaStats: () => api.get('/advanced-tickets/stats/sla'),
};

export default advancedTicketsService;
