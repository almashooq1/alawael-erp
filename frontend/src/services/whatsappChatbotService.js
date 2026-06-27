/**
 * WhatsApp Chatbot Service
 * خدمة روبوت واتساب
 *
 * Maps to backend: /api/v1/whatsapp-chatbot/*
 */

import api from './api.client';

const whatsappChatbotService = {
  // ==================== WEBHOOK / INCOMING ====================
  processIncomingMessage: async (phone, message) =>
    api.post('/whatsapp-chatbot/webhook', { phone, message }),

  // ==================== OUTGOING ====================
  sendMessage: async (phone, message) =>
    api.post('/whatsapp-chatbot/send', { phone, message }),

  sendTemplateMessage: async (phone, templateId, variables) =>
    api.post('/whatsapp-chatbot/send', { phone, templateId, variables }),

  // ==================== CONVERSATIONS ====================
  getConversationHistory: async (phone, limit = 50) =>
    api.get(`/whatsapp-chatbot/conversations/${phone}`, { params: { limit } }),

  // ==================== ANALYTICS ====================
  getAnalytics: async (startDate, endDate) =>
    api.get('/whatsapp-chatbot/analytics', { params: { startDate, endDate } }),

  // ==================== TEMPLATES ====================
  createTemplate: async (data) => api.post('/whatsapp-chatbot/templates', data),
  getTemplates: async (category) =>
    api.get('/whatsapp-chatbot/templates', { params: { category } }),
  updateTemplate: async (id, data) => api.patch(`/whatsapp-chatbot/templates/${id}`, data),
  deleteTemplate: async (id) => api.delete(`/whatsapp-chatbot/templates/${id}`),

  // ==================== SETTINGS ====================
  toggleBotStatus: async (phone, enabled) =>
    api.patch(`/whatsapp-chatbot/settings/${phone}`, { enabled }),
};

export default whatsappChatbotService;
