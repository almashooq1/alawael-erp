/**
 * خدمة API لاستبيانات رضا الأسر
 * Family Satisfaction Survey API Service
 */
import api from './api.client';

const familySatisfactionService = {
  // قوالب الاستبيانات
  getTemplates: params => api.get('/family-satisfaction/templates', { params }),
  getTemplate: id => api.get(`/family-satisfaction/templates/${id}`),
  createTemplate: data => api.post('/family-satisfaction/templates', data),
  updateTemplate: (id, data) => api.put(`/family-satisfaction/templates/${id}`, data),
  seedTemplates: () => api.post('/family-satisfaction/templates/seed'),

  // إرسال واستجابات
  sendSurvey: data => api.post('/family-satisfaction/send', data),
  submitResponse: (id, answers) =>
    api.post(`/family-satisfaction/responses/${id}/submit`, { answers }),
  createDirectResponse: data => api.post('/family-satisfaction/responses/direct', data),
  getResponses: params => api.get('/family-satisfaction/responses', { params }),
  getResponse: id => api.get(`/family-satisfaction/responses/${id}`),
  updateFollowUp: (id, data) => api.put(`/family-satisfaction/responses/${id}/follow-up`, data),

  // التحليلات
  getNPS: params => api.get('/family-satisfaction/analytics/nps', { params }),
  generateReport: data => api.post('/family-satisfaction/analytics/generate', data),

  // لوحة المعلومات
  getDashboard: () => api.get('/family-satisfaction/dashboard'),
};

export default familySatisfactionService;
