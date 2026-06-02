import api from './api.client';

const qualityService = {
  // Quality
  getQualityRecords: async () => api.get('/quality'),
  getQualityRecord: async id => api.get(`/quality/${id}`),
  createQualityRecord: async data => api.post('/quality', data),
  updateQualityRecord: async (id, data) => api.put(`/quality/${id}`, data),
  deleteQualityRecord: async id => api.delete(`/quality/${id}`),

  // Internal Audit
  getAudits: async () => api.get('/internal-audit'),
  getAudit: async id => api.get(`/internal-audit/${id}`),
  createAudit: async data => api.post('/internal-audit', data),
  updateAudit: async (id, data) => api.put(`/internal-audit/${id}`, data),
  deleteAudit: async id => api.delete(`/internal-audit/${id}`),

  // Case Management
  getCases: async () => api.get('/cases'),
  getCase: async id => api.get(`/cases/${id}`),
  createCase: async data => api.post('/cases', data),
  updateCase: async (id, data) => api.put(`/cases/${id}`, data),
  deleteCase: async id => api.delete(`/cases/${id}`),

  // Support Tickets
  getTickets: async () => api.get('/ticketing-system'),
  getTicket: async id => api.get(`/ticketing-system/${id}`),
  createTicket: async data => api.post('/ticketing-system', data),
  updateTicket: async (id, data) => api.put(`/ticketing-system/${id}/status`, data),
  deleteTicket: async id => api.delete(`/ticketing-system/${id}`),
};

export default qualityService;
