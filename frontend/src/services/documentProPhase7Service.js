/**
 * Document Pro Phase 7 — Frontend API Service
 * Watermark • Import/Export • Compliance • Knowledge Graph • Automation
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v7';

/* ══════════════════════════════════════════════════════════════
   Watermark — العلامات المائية
   ══════════════════════════════════════════════════════════════ */
export const watermarkApi = {
  apply: data => apiClient.post(`${BASE}/watermark/apply`, data),
  batchApply: data => apiClient.post(`${BASE}/watermark/batch`, data),
  verify: trackingCode => apiClient.get(`${BASE}/watermark/verify/${trackingCode}`),
  trackAccess: (trackingCode, data) =>
    apiClient.post(`${BASE}/watermark/track/${trackingCode}`, data),
  revoke: trackingCode => apiClient.put(`${BASE}/watermark/revoke/${trackingCode}`),
  getLogs: params => apiClient.get(`${BASE}/watermark/logs`, { params }),

  getProfiles: params => apiClient.get(`${BASE}/watermark/profiles`, { params }),
  createProfile: data => apiClient.post(`${BASE}/watermark/profiles`, data),
  updateProfile: (id, data) => apiClient.put(`${BASE}/watermark/profiles/${id}`, data),
  deleteProfile: id => apiClient.delete(`${BASE}/watermark/profiles/${id}`),
  getStats: () => apiClient.get(`${BASE}/watermark/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Import/Export — الاستيراد والتصدير
   ══════════════════════════════════════════════════════════════ */
export const importExportApi = {
  exportDocs: data => apiClient.post(`${BASE}/import-export/export`, data),
  importDocs: data => apiClient.post(`${BASE}/import-export/import`, data),
  getJobs: params => apiClient.get(`${BASE}/import-export/jobs`, { params }),
  getJob: id => apiClient.get(`${BASE}/import-export/jobs/${id}`),
  cancelJob: id => apiClient.put(`${BASE}/import-export/jobs/${id}/cancel`),

  getMappings: params => apiClient.get(`${BASE}/import-export/mappings`, { params }),
  createMapping: data => apiClient.post(`${BASE}/import-export/mappings`, data),
  updateMapping: (id, data) => apiClient.put(`${BASE}/import-export/mappings/${id}`, data),
  deleteMapping: id => apiClient.delete(`${BASE}/import-export/mappings/${id}`),
  getStats: () => apiClient.get(`${BASE}/import-export/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Compliance — مراقبة الامتثال
   ══════════════════════════════════════════════════════════════ */
export const complianceApi = {
  runScan: data => apiClient.post(`${BASE}/compliance/scan`, data),
  getScans: params => apiClient.get(`${BASE}/compliance/scans`, { params }),
  getScan: id => apiClient.get(`${BASE}/compliance/scans/${id}`),

  getAlerts: params => apiClient.get(`${BASE}/compliance/alerts`, { params }),
  resolveAlert: (id, data) => apiClient.put(`${BASE}/compliance/alerts/${id}/resolve`, data),
  dismissAlert: (id, data) => apiClient.put(`${BASE}/compliance/alerts/${id}/dismiss`, data),

  getRules: params => apiClient.get(`${BASE}/compliance/rules`, { params }),
  createRule: data => apiClient.post(`${BASE}/compliance/rules`, data),
  updateRule: (id, data) => apiClient.put(`${BASE}/compliance/rules/${id}`, data),
  toggleRule: id => apiClient.put(`${BASE}/compliance/rules/${id}/toggle`),

  getHealth: () => apiClient.get(`${BASE}/compliance/health`),
  getStats: () => apiClient.get(`${BASE}/compliance/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Knowledge Graph — الرسم البياني المعرفي
   ══════════════════════════════════════════════════════════════ */
export const graphApi = {
  addNode: data => apiClient.post(`${BASE}/graph/nodes`, data),
  addEdge: data => apiClient.post(`${BASE}/graph/edges`, data),
  removeEdge: id => apiClient.delete(`${BASE}/graph/edges/${id}`),
  getDocumentGraph: (docId, params) => apiClient.get(`${BASE}/graph/document/${docId}`, { params }),
  getFullGraph: params => apiClient.get(`${BASE}/graph/full`, { params }),
  autoDiscover: docId => apiClient.post(`${BASE}/graph/auto-discover/${docId}`),
  analyzeImpact: (docId, params) => apiClient.get(`${BASE}/graph/impact/${docId}`, { params }),
  getRecommendations: (docId, params) =>
    apiClient.get(`${BASE}/graph/recommendations/${docId}`, { params }),
  getStats: () => apiClient.get(`${BASE}/graph/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Automation — أتمتة العمليات
   ══════════════════════════════════════════════════════════════ */
export const automationApi = {
  processEvent: (event, data) =>
    apiClient.post(`${BASE}/automation/process-event`, { event, data }),
  executeRule: (ruleId, data) => apiClient.post(`${BASE}/automation/rules/${ruleId}/execute`, data),

  getRules: params => apiClient.get(`${BASE}/automation/rules`, { params }),
  getRule: id => apiClient.get(`${BASE}/automation/rules/${id}`),
  createRule: data => apiClient.post(`${BASE}/automation/rules`, data),
  updateRule: (id, data) => apiClient.put(`${BASE}/automation/rules/${id}`, data),
  deleteRule: id => apiClient.delete(`${BASE}/automation/rules/${id}`),
  toggleRule: id => apiClient.put(`${BASE}/automation/rules/${id}/toggle`),

  getExecutions: params => apiClient.get(`${BASE}/automation/executions`, { params }),
  getExecution: id => apiClient.get(`${BASE}/automation/executions/${id}`),
  getStats: () => apiClient.get(`${BASE}/automation/stats`),
};

/* ─── Dashboard ────────────────────────────────────────────── */
export const getDashboard = () => apiClient.get(`${BASE}/dashboard`);

export default {
  watermark: watermarkApi,
  importExport: importExportApi,
  compliance: complianceApi,
  graph: graphApi,
  automation: automationApi,
  getDashboard,
};
