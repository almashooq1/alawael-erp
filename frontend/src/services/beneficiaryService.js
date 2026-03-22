/**
 * Beneficiary Service — خدمة المستفيدين
 *
 * Admin CRUD routes:      /api/beneficiaries/*
 * Portal self-service:    /api/beneficiary-portal/*
 *
 * @version 2.0.0
 * @date 2026-03-22
 */

import api from './api.client';

const beneficiaryService = {
  // ==================== ADMIN CRUD ====================
  getAll: async (params = {}) => api.get('/beneficiaries', { params }),
  getById: async id => api.get(`/beneficiaries/${id}`),
  create: async data => api.post('/beneficiaries', data),
  update: async (id, data) => api.put(`/beneficiaries/${id}`, data),
  remove: async (id, reason) => api.delete(`/beneficiaries/${id}`, { data: { reason } }),
  restore: async id => api.patch(`/beneficiaries/${id}/restore`),
  updateStatus: async (id, status) => api.patch(`/beneficiaries/${id}/status`, { status }),
  bulkAction: async (action, ids, data) =>
    api.post('/beneficiaries/bulk-action', { action, ids, data }),

  // ==================== STATISTICS & REPORTS ====================
  getStatistics: async () => api.get('/beneficiaries/statistics'),
  getRecent: async (limit = 5) => api.get('/beneficiaries/recent', { params: { limit } }),
  exportData: async (params = {}) =>
    api.get('/beneficiaries/export', { params, responseType: 'blob' }),

  // ==================== PROGRESS TRACKING ====================
  getProgressHistory: async (id, limit = 12) =>
    api.get(`/beneficiaries/${id}/progress`, { params: { limit } }),
  addProgress: async (id, data) => api.post(`/beneficiaries/${id}/progress`, data),

  // ==================== PORTAL AUTH ====================
  register: async data => api.post('/beneficiary-portal/auth/register', data),
  login: async credentials => api.post('/beneficiary-portal/auth/login', credentials),

  // ==================== PORTAL SELF-SERVICE ====================
  getSchedule: async () => api.get('/beneficiary-portal/schedule'),
  markAttendance: async scheduleItemId =>
    api.post(`/beneficiary-portal/schedule/${scheduleItemId}/attend`),

  getProgress: async () => api.get('/beneficiary-portal/progress'),
  getProgressAnalytics: async () => api.get('/beneficiary-portal/progress/analytics'),

  getConversations: async () => api.get('/beneficiary-portal/messages/conversations'),
  getMessages: async () => api.get('/beneficiary-portal/messages/conversations'),
  getConversation: async conversationId =>
    api.get(`/beneficiary-portal/messages/conversation/${conversationId}`),
  sendMessage: async data => api.post('/beneficiary-portal/messages/send', data),

  getSurveys: async () => api.get('/beneficiary-portal/surveys'),
  getSurvey: async surveyId => api.get(`/beneficiary-portal/surveys/${surveyId}`),
  submitSurvey: async (surveyId, data) =>
    api.post(`/beneficiary-portal/surveys/${surveyId}/submit`, data),

  getProfile: async () => api.get('/beneficiary-portal/profile'),
  updateProfile: async data => api.put('/beneficiary-portal/profile', data),
  changePassword: async data => api.post('/beneficiary-portal/profile/change-password', data),

  getDocuments: async () => api.get('/beneficiary-portal/documents'),
  uploadDocument: async formData =>
    api.post('/beneficiary-portal/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getNotifications: async () => api.get('/beneficiary-portal/notifications'),
  markNotificationRead: async notificationId =>
    api.patch(`/beneficiary-portal/notifications/${notificationId}/read`),
};

export default beneficiaryService;
