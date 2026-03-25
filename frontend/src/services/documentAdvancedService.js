/**
 * Document Advanced Service — خدمة المستندات المتقدمة
 *
 * Frontend API client for all advanced document management features:
 * Favorites, Audit, Watermarks, Approvals, Expiry, Trash,
 * Annotations, Comparison, Export/Import, QR Codes
 *
 * Uses the shared apiClient (axios) for consistent auth, retry,
 * deduplication, and base URL configuration.
 */

import apiClient from './api.client';

const api = {
  get: path => apiClient.get(path).then(r => r.data),
  post: (path, body) => apiClient.post(path, body).then(r => r.data),
  put: (path, body) => apiClient.put(path, body).then(r => r.data),
  del: (path, body) =>
    apiClient.delete(path, body ? { data: body } : undefined).then(r => r.data),
};

const documentAdvancedService = {
  // ═══════════════════════════════════════════════════════════
  //  Overview — نظرة عامة
  // ═══════════════════════════════════════════════════════════
  getOverview: () => api.get('/documents-advanced/overview'),

  // ═══════════════════════════════════════════════════════════
  //  1. Favorites — المفضلة
  // ═══════════════════════════════════════════════════════════
  favorites: {
    toggle: (documentId, options = {}) =>
      api.post('/documents-advanced/favorites/toggle', { documentId, ...options }),
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/favorites?${qs}`);
    },
    check: documentId => api.get(`/documents-advanced/favorites/check/${documentId}`),
    stats: () => api.get('/documents-advanced/favorites/stats'),
    createCollection: data => api.post('/documents-advanced/favorites/collections', data),
    getCollections: () => api.get('/documents-advanced/favorites/collections'),
    addToCollection: (collectionId, documentId) =>
      api.post(`/documents-advanced/favorites/collections/${collectionId}/add`, { documentId }),
    removeFromCollection: (collectionId, documentId) =>
      api.post(`/documents-advanced/favorites/collections/${collectionId}/remove`, { documentId }),
  },

  // ═══════════════════════════════════════════════════════════
  //  2. Audit Trail — سجل التدقيق
  // ═══════════════════════════════════════════════════════════
  audit: {
    log: eventData => api.post('/documents-advanced/audit/log', eventData),
    getTrail: (documentId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/trail/${documentId}?${qs}`);
    },
    getUserActivity: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/user-activity?${qs}`);
    },
    getCompliance: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/compliance?${qs}`);
    },
    exportTrail: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/export?${qs}`);
    },
    verifyChain: documentId =>
      api.get(`/documents-advanced/audit/verify-chain?documentId=${documentId}`),
    detectSuspicious: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/suspicious?${qs}`);
    },
    stats: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/audit/stats?${qs}`);
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  3. Watermarks — العلامات المائية
  // ═══════════════════════════════════════════════════════════
  watermarks: {
    apply: (documentId, options = {}) =>
      api.post('/documents-advanced/watermarks/apply', { documentId, options }),
    remove: documentId => api.del(`/documents-advanced/watermarks/${documentId}`),
    getPresets: () => api.get('/documents-advanced/watermarks/presets'),
    getDocumentWatermarks: documentId => api.get(`/documents-advanced/watermarks/${documentId}`),
    generateDynamic: documentId =>
      api.post('/documents-advanced/watermarks/dynamic', { documentId }),
    saveTemplate: template => api.post('/documents-advanced/watermarks/templates', template),
    getTemplates: orgId =>
      api.get(`/documents-advanced/watermarks/templates${orgId ? `?orgId=${orgId}` : ''}`),
  },

  // ═══════════════════════════════════════════════════════════
  //  4. Approval Workflows — سير عمل الموافقات
  // ═══════════════════════════════════════════════════════════
  approvals: {
    create: (documentId, template) =>
      api.post('/documents-advanced/approvals/create', { documentId, template }),
    decide: (workflowId, decision) =>
      api.post(`/documents-advanced/approvals/${workflowId}/decide`, decision),
    getStatus: workflowId => api.get(`/documents-advanced/approvals/${workflowId}`),
    getPending: () => api.get('/documents-advanced/approvals/pending/me'),
    getTemplates: () => api.get('/documents-advanced/approvals/templates/list'),
    delegate: (workflowId, toUserId, reason) =>
      api.post(`/documents-advanced/approvals/${workflowId}/delegate`, { toUserId, reason }),
    cancel: (workflowId, reason) =>
      api.post(`/documents-advanced/approvals/${workflowId}/cancel`, { reason }),
    stats: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/approvals/stats/overview?${qs}`);
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  5. Expiry & Retention — الصلاحية والاحتفاظ
  // ═══════════════════════════════════════════════════════════
  expiry: {
    set: (documentId, data) => api.post('/documents-advanced/expiry/set', { documentId, ...data }),
    check: documentId => api.get(`/documents-advanced/expiry/check/${documentId}`),
    getUpcoming: (days = 30) => api.get(`/documents-advanced/expiry/upcoming?days=${days}`),
    renew: (documentId, data = {}) =>
      api.post(`/documents-advanced/expiry/renew/${documentId}`, data),
    getPolicies: () => api.get('/documents-advanced/expiry/policies'),
    applyPolicy: (documentId, policyId) =>
      api.post('/documents-advanced/expiry/policies/apply', { documentId, policyId }),
    getAlerts: () => api.get('/documents-advanced/expiry/alerts'),
    stats: () => api.get('/documents-advanced/expiry/stats'),
  },

  // ═══════════════════════════════════════════════════════════
  //  6. Trash / Recycle Bin — سلة المحذوفات
  // ═══════════════════════════════════════════════════════════
  trash: {
    moveToTrash: (documentId, reason) =>
      api.post('/documents-advanced/trash/move', { documentId, reason }),
    restore: documentId => api.post(`/documents-advanced/trash/restore/${documentId}`),
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/trash?${qs}`);
    },
    permanentDelete: (documentId, confirmString) =>
      api.del(`/documents-advanced/trash/permanent/${documentId}`, { confirmString }),
    bulkRestore: documentIds => api.post('/documents-advanced/trash/bulk-restore', { documentIds }),
    empty: () => api.del('/documents-advanced/trash/empty'),
    stats: () => api.get('/documents-advanced/trash/stats'),
  },

  // ═══════════════════════════════════════════════════════════
  //  7. Annotations & Comments — التعليقات التوضيحية
  // ═══════════════════════════════════════════════════════════
  annotations: {
    add: (documentId, data) => api.post('/documents-advanced/annotations', { documentId, ...data }),
    getAll: (documentId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/annotations/${documentId}?${qs}`);
    },
    update: (annotationId, data) =>
      api.put(`/documents-advanced/annotations/${annotationId}`, data),
    remove: annotationId => api.del(`/documents-advanced/annotations/${annotationId}`),
    addComment: (annotationId, data) =>
      api.post(`/documents-advanced/annotations/${annotationId}/comments`, data),
    addReaction: (annotationId, emoji) =>
      api.post(`/documents-advanced/annotations/${annotationId}/reactions`, { emoji }),
    resolve: annotationId => api.post(`/documents-advanced/annotations/${annotationId}/resolve`),
    getStamps: () => api.get('/documents-advanced/annotations/stamps/list'),
    stats: documentId => api.get(`/documents-advanced/annotations/stats/${documentId}`),
  },

  // ═══════════════════════════════════════════════════════════
  //  8. Comparison / Diff — المقارنة
  // ═══════════════════════════════════════════════════════════
  comparison: {
    compare: (documentIdA, documentIdB, options = {}) =>
      api.post('/documents-advanced/compare', { documentIdA, documentIdB, options }),
    compareVersions: (documentId, versionA, versionB, options = {}) =>
      api.post('/documents-advanced/compare/versions', { documentId, versionA, versionB, options }),
    batchCompare: (documentId, versions) =>
      api.post('/documents-advanced/compare/batch', { documentId, versions }),
    compareMetadata: (documentIdA, documentIdB) =>
      api.post('/documents-advanced/compare/metadata', { documentIdA, documentIdB }),
    getHistory: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/compare/history?${qs}`);
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  9. Export / Import — التصدير والاستيراد
  // ═══════════════════════════════════════════════════════════
  exportImport: {
    exportDocs: (documentIds, options = {}) =>
      api.post('/documents-advanced/export', { documentIds, options }),
    importDocs: (data, options = {}) => api.post('/documents-advanced/import', { data, options }),
    getJobs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/export-import/jobs?${qs}`);
    },
    getJobStatus: jobId => api.get(`/documents-advanced/export-import/jobs/${jobId}`),
    exportCSV: (documentIds, options = {}) =>
      api.post('/documents-advanced/export/csv', { documentIds, options }),
  },

  // ═══════════════════════════════════════════════════════════
  //  10. QR Codes — رموز الاستجابة السريعة
  // ═══════════════════════════════════════════════════════════
  qr: {
    generate: (documentId, options = {}) =>
      api.post('/documents-advanced/qr/generate', { documentId, options }),
    scan: (qrId, password) => api.post('/documents-advanced/qr/scan', { qrId, password }),
    disable: qrId => api.post(`/documents-advanced/qr/disable/${qrId}`),
    getDocumentQRCodes: documentId => api.get(`/documents-advanced/qr/${documentId}`),
    batchGenerate: (documentIds, options = {}) =>
      api.post('/documents-advanced/qr/batch', { documentIds, options }),
    getAnalytics: (documentId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/documents-advanced/qr/analytics/${documentId}?${qs}`);
    },
    stats: () => api.get('/documents-advanced/qr/stats'),
  },
};

export default documentAdvancedService;
