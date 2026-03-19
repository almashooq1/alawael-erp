/**
 * Beneficiary Portal Service
 * خدمة بوابة المستفيدين
 *
 * Maps to backend: /api/beneficiary-portal/*
 */

import api from './api.client';

const beneficiaryService = {
  // ==================== AUTH ====================
  register: async data => api.post('/beneficiary-portal/auth/register', data),
  login: async credentials => api.post('/beneficiary-portal/auth/login', credentials),

  // ==================== BENEFICIARIES (CRUD) ====================
  getAll: async (params = {}) => api.get('/beneficiary-portal/profile', { params }),
  getById: async id => api.get(`/beneficiary-portal/profile/${id || ''}`),

  // ==================== SCHEDULE ====================
  getSchedule: async () => api.get('/beneficiary-portal/schedule'),
  markAttendance: async scheduleItemId =>
    api.post(`/beneficiary-portal/schedule/${scheduleItemId}/attend`),

  // ==================== PROGRESS ====================
  getProgress: async () => api.get('/beneficiary-portal/progress'),
  getProgressAnalytics: async () => api.get('/beneficiary-portal/progress/analytics'),

  // ==================== MESSAGES ====================
  getConversations: async () => api.get('/beneficiary-portal/messages/conversations'),
  getConversation: async conversationId =>
    api.get(`/beneficiary-portal/messages/conversation/${conversationId}`),
  sendMessage: async data => api.post('/beneficiary-portal/messages/send', data),

  // ==================== SURVEYS ====================
  getSurveys: async () => api.get('/beneficiary-portal/surveys'),
  getSurvey: async surveyId => api.get(`/beneficiary-portal/surveys/${surveyId}`),
  submitSurvey: async (surveyId, data) =>
    api.post(`/beneficiary-portal/surveys/${surveyId}/submit`, data),

  // ==================== PROFILE ====================
  getProfile: async () => api.get('/beneficiary-portal/profile'),
  updateProfile: async data => api.put('/beneficiary-portal/profile', data),
  changePassword: async data => api.post('/beneficiary-portal/profile/change-password', data),

  // ==================== DOCUMENTS ====================
  getDocuments: async () => api.get('/beneficiary-portal/documents'),
  uploadDocument: async formData =>
    api.post('/beneficiary-portal/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ==================== NOTIFICATIONS ====================
  getNotifications: async () => api.get('/beneficiary-portal/notifications'),
  markNotificationRead: async notificationId =>
    api.patch(`/beneficiary-portal/notifications/${notificationId}/read`),
};

export default beneficiaryService;
