import api from './api.client';

const eInvoicingService = {
  getAll: params => api.get('/e-invoicing', { params }),
  getById: id => api.get(`/e-invoicing/${id}`),
  create: data => api.post('/e-invoicing', data),
  submitToZatca: id => api.post(`/e-invoicing/${id}/submit-zatca`),
  getQR: id => api.get(`/e-invoicing/${id}/qr`),
  getStats: () => api.get('/e-invoicing/stats/summary'),
};

export default eInvoicingService;
