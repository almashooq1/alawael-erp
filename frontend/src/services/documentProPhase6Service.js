/**
 * Document Pro Phase 6 — Frontend API Service
 * OCR • Archiving • Reporting • Email Gateway • AI Assistant
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v6';

/* ══════════════════════════════════════════════════════════════
   OCR — استخراج النصوص
   ══════════════════════════════════════════════════════════════ */
export const ocrApi = {
  extract: data => apiClient.post(`${BASE}/ocr/extract`, data),
  batchExtract: data => apiClient.post(`${BASE}/ocr/batch`, data),
  getResult: documentId => apiClient.get(`${BASE}/ocr/result/${documentId}`),
  getJobs: params => apiClient.get(`${BASE}/ocr/jobs`, { params }),
  search: params => apiClient.get(`${BASE}/ocr/search`, { params }),
  extractTables: data => apiClient.post(`${BASE}/ocr/tables`, data),
  getStats: () => apiClient.get(`${BASE}/ocr/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Archiving — الأرشفة والامتثال
   ══════════════════════════════════════════════════════════════ */
export const archiveApi = {
  archiveDocument: data => apiClient.post(`${BASE}/archive/document`, data),
  getRecord: docId => apiClient.get(`${BASE}/archive/record/${docId}`),
  search: params => apiClient.get(`${BASE}/archive/search`, { params }),
  verifyIntegrity: docId => apiClient.get(`${BASE}/archive/verify/${docId}`),

  // Policies
  createPolicy: data => apiClient.post(`${BASE}/archive/policies`, data),
  getPolicies: () => apiClient.get(`${BASE}/archive/policies`),
  updatePolicy: (id, data) => apiClient.put(`${BASE}/archive/policies/${id}`, data),
  deletePolicy: id => apiClient.delete(`${BASE}/archive/policies/${id}`),

  // Legal Holds
  createLegalHold: data => apiClient.post(`${BASE}/archive/legal-holds`, data),
  getLegalHolds: params => apiClient.get(`${BASE}/archive/legal-holds`, { params }),
  releaseLegalHold: id => apiClient.put(`${BASE}/archive/legal-holds/${id}/release`),

  complianceReport: params => apiClient.get(`${BASE}/archive/compliance-report`, { params }),
  createDestruction: data => apiClient.post(`${BASE}/archive/destruction`, data),
  getStats: () => apiClient.get(`${BASE}/archive/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Reporting — محرك التقارير
   ══════════════════════════════════════════════════════════════ */
export const reportApi = {
  generate: data => apiClient.post(`${BASE}/reports/generate`, data),
  runFromTemplate: (templateId, data) => apiClient.post(`${BASE}/reports/run/${templateId}`, data),
  getExecution: id => apiClient.get(`${BASE}/reports/execution/${id}`),
  getHistory: params => apiClient.get(`${BASE}/reports/history`, { params }),
  export: (executionId, format = 'json') =>
    apiClient.get(`${BASE}/reports/export/${executionId}`, { params: { format } }),

  // Templates
  createTemplate: data => apiClient.post(`${BASE}/reports/templates`, data),
  getTemplates: params => apiClient.get(`${BASE}/reports/templates`, { params }),
  updateTemplate: (id, data) => apiClient.put(`${BASE}/reports/templates/${id}`, data),
  deleteTemplate: id => apiClient.delete(`${BASE}/reports/templates/${id}`),

  // Schedules
  createSchedule: data => apiClient.post(`${BASE}/reports/schedules`, data),
  getSchedules: params => apiClient.get(`${BASE}/reports/schedules`, { params }),
  updateSchedule: (id, data) => apiClient.put(`${BASE}/reports/schedules/${id}`, data),
  deleteSchedule: id => apiClient.delete(`${BASE}/reports/schedules/${id}`),
  toggleSchedule: id => apiClient.put(`${BASE}/reports/schedules/${id}/toggle`),

  getStats: () => apiClient.get(`${BASE}/reports/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Email Gateway — بوابة البريد
   ══════════════════════════════════════════════════════════════ */
export const emailApi = {
  send: data => apiClient.post(`${BASE}/email/send`, data),
  getMessages: params => apiClient.get(`${BASE}/email/messages`, { params }),
  getThread: threadId => apiClient.get(`${BASE}/email/thread/${threadId}`),
  getStats: () => apiClient.get(`${BASE}/email/stats`),

  // Templates
  createTemplate: data => apiClient.post(`${BASE}/email/templates`, data),
  getTemplates: params => apiClient.get(`${BASE}/email/templates`, { params }),
  updateTemplate: (id, data) => apiClient.put(`${BASE}/email/templates/${id}`, data),
  deleteTemplate: id => apiClient.delete(`${BASE}/email/templates/${id}`),

  // Forwarding Rules
  createRule: data => apiClient.post(`${BASE}/email/rules`, data),
  getRules: params => apiClient.get(`${BASE}/email/rules`, { params }),
  updateRule: (id, data) => apiClient.put(`${BASE}/email/rules/${id}`, data),
  deleteRule: id => apiClient.delete(`${BASE}/email/rules/${id}`),
  toggleRule: id => apiClient.put(`${BASE}/email/rules/${id}/toggle`),

  processEvent: (event, data) => apiClient.post(`${BASE}/email/process-event`, { event, data }),
};

/* ══════════════════════════════════════════════════════════════
   AI Assistant — المساعد الذكي
   ══════════════════════════════════════════════════════════════ */
export const aiApi = {
  chat: data => apiClient.post(`${BASE}/ai/chat`, data),
  classify: data => apiClient.post(`${BASE}/ai/classify`, data),
  summarize: data => apiClient.post(`${BASE}/ai/summarize`, data),
  extractMetadata: data => apiClient.post(`${BASE}/ai/extract`, data),
  detectDuplicates: data => apiClient.post(`${BASE}/ai/duplicates`, data),
  getSuggestions: data => apiClient.post(`${BASE}/ai/suggestions`, data),
  search: params => apiClient.get(`${BASE}/ai/search`, { params }),
  analyzeContent: data => apiClient.post(`${BASE}/ai/analyze`, data),
  submitFeedback: (interactionId, data) =>
    apiClient.post(`${BASE}/ai/feedback/${interactionId}`, data),
  getHistory: params => apiClient.get(`${BASE}/ai/history`, { params }),
  getStats: () => apiClient.get(`${BASE}/ai/stats`),

  // Knowledge Base
  addKnowledge: data => apiClient.post(`${BASE}/ai/knowledge`, data),
  getKnowledge: params => apiClient.get(`${BASE}/ai/knowledge`, { params }),
  updateKnowledge: (id, data) => apiClient.put(`${BASE}/ai/knowledge/${id}`, data),
  deleteKnowledge: id => apiClient.delete(`${BASE}/ai/knowledge/${id}`),
};

/* ─── Dashboard ────────────────────────────────────────────── */
export const getDashboard = () => apiClient.get(`${BASE}/dashboard`);

export default {
  ocr: ocrApi,
  archive: archiveApi,
  report: reportApi,
  email: emailApi,
  ai: aiApi,
  getDashboard,
};
