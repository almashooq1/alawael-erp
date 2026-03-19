/**
 * خدمة API لإذن العلاج
 * Treatment Authorization API Service
 */
import api from './api.client';

const treatmentAuthorizationService = {
  // الطلبات
  getRequests: params => api.get('/treatment-authorization', { params }),
  getRequest: id => api.get(`/treatment-authorization/${id}`),
  createRequest: data => api.post('/treatment-authorization', data),
  updateRequest: (id, data) => api.put(`/treatment-authorization/${id}`, data),

  // سير العمل
  submitForReview: id => api.post(`/treatment-authorization/${id}/submit-review`),
  submitToInsurer: id => api.post(`/treatment-authorization/${id}/submit-insurer`),
  recordInsurerResponse: (id, data) =>
    api.post(`/treatment-authorization/${id}/insurer-response`, data),

  // الاستئناف
  submitAppeal: (id, data) => api.post(`/treatment-authorization/${id}/appeal`, data),
  recordAppealDecision: (id, data) =>
    api.post(`/treatment-authorization/${id}/appeal-decision`, data),

  // الجلسات والمتابعة
  recordSession: (id, serviceCode, data) =>
    api.post(`/treatment-authorization/${id}/sessions/${serviceCode}`, data),
  addFollowUp: (id, data) => api.post(`/treatment-authorization/${id}/follow-ups`, data),

  // لوحة المعلومات
  getDashboard: () => api.get('/treatment-authorization/dashboard'),
  getExpiring: () => api.get('/treatment-authorization/expiring'),
};

export default treatmentAuthorizationService;
