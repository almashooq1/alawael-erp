import api from './api.client';

const smartNotificationsService = {
  getAll: params => api.get('/smart-notifications', { params }),
  markAsRead: id => api.put(`/smart-notifications/${id}/read`),
  markAllAsRead: () => api.put('/smart-notifications/read-all'),
  delete: id => api.delete(`/smart-notifications/${id}`),
  getPreferences: () => api.get('/smart-notifications/preferences'),
  updatePreferences: data => api.put('/smart-notifications/preferences', data),
  send: data => api.post('/smart-notifications/send', data),
  getTemplates: () => api.get('/smart-notifications/templates'),
};

export default smartNotificationsService;
