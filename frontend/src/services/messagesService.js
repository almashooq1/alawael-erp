/**
 * Messaging Service
 * خدمة الرسائل
 *
 * Maps to backend: /api/messages/*
 */

import api from './api.client';

const messagesService = {
  // ==================== MESSAGES CRUD ====================
  getAll: async (params = {}) => api.get('/messages', { params }),
  getById: async id => api.get(`/messages/${id}`),
  create: async data => api.post('/messages', data),
  send: async data => api.post('/messages/send', data),
  update: async (id, data) => api.put(`/messages/${id}`, data),
  delete: async id => api.delete(`/messages/${id}`),
  deleteBulk: async ids => api.post('/messages/delete-bulk', { ids }),

  // ==================== UNREAD / READ ====================
  getUnreadCount: async () => api.get('/messages/unread/count'),
  getUnread: async () => api.get('/messages/unread'),
  markAsRead: async id => api.post(`/messages/${id}/mark-as-read`),
  markRead: async id => api.patch(`/messages/${id}/read`),
  markBulkRead: async ids => api.patch('/messages/mark-read', { ids }),
  clearUnread: async () => api.post('/messages/clear-unread'),

  // ==================== SEARCH ====================
  search: async query => api.get('/messages/search', { params: { query } }),

  // ==================== STATS ====================
  getStats: async () => api.get('/messages/stats'),

  // ==================== CONVERSATIONS ====================
  getConversation: async id => api.get(`/messages/conversation/${id}`),
  markConversationRead: async conversationId => api.post(`/messages/mark-read/${conversationId}`),

  // ==================== GROUP / SCHEDULE ====================
  sendGroup: async data => api.post('/messages/group', data),
  schedule: async data => api.post('/messages/schedule', data),

  // ==================== REACTIONS / FORWARD ====================
  react: async (id, reaction) => api.post(`/messages/${id}/react`, { reaction }),
  forward: async (id, data) => api.post(`/messages/${id}/forward`, data),

  // ==================== THREADS ====================
  createThread: async data => api.post('/messages/threads', data),
  getThreads: async () => api.get('/messages/threads'),
};

export default messagesService;
