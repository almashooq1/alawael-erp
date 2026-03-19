import api from './api.client';

const meetingsService = {
  getAll: params => api.get('/meetings', { params }),
  getById: id => api.get(`/meetings/${id}`),
  create: data => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: id => api.delete(`/meetings/${id}`),
  saveMinutes: (id, data) => api.post(`/meetings/${id}/minutes`, data),
  rsvp: (id, status) => api.post(`/meetings/${id}/rsvp`, { rsvpStatus: status }),
};

export default meetingsService;
