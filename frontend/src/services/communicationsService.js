/**
 * Communications Service
 * خدمة المراسلات والتواصل
 *
 * Maps to backend: /api/communications/*
 */

import api from './api.client';

const communicationsService = {
  // ==================== STATS ====================
  getStats: async () => api.get('/communications/stats'),

  // ==================== CRUD ====================
  getAll: async (params = {}) => api.get('/communications', { params }),
  getByTherapist: async () => api.get('/communications/therapist'),
  create: async data => api.post('/communications', data),
  update: async (id, data) => api.patch(`/communications/${id}`, data),
  delete: async id => api.delete(`/communications/${id}`),

  // ==================== AI COMMUNICATIONS ====================
  getAIDashboard: async () => api.get('/ai-communications/dashboard'),
  sendAIMessage: async data => api.post('/ai-communications/send-message', data),
};

export default communicationsService;
