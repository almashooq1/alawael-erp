/**
 * Document Pro Phase 3 API Service
 * خدمة واجهة برمجة التطبيقات — المرحلة الثالثة
 * التعليقات، المشاركة، الاحتفاظ، المفضلة، التحليلات
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v3';

// ── التعليقات ──────────────────────────────────
export const commentsApi = {
  add: data => apiClient.post(`${BASE}/comments`, data),
  getForDocument: (documentId, params = {}) =>
    apiClient.get(`${BASE}/comments/document/${documentId}`, { params }),
  update: (commentId, data) => apiClient.put(`${BASE}/comments/${commentId}`, data),
  delete: commentId => apiClient.delete(`${BASE}/comments/${commentId}`),
  addReaction: (commentId, emoji) =>
    apiClient.post(`${BASE}/comments/${commentId}/reaction`, { emoji }),
  removeReaction: (commentId, emoji) =>
    apiClient.delete(`${BASE}/comments/${commentId}/reaction`, { data: { emoji } }),
  resolve: commentId => apiClient.post(`${BASE}/comments/${commentId}/resolve`),
  unresolve: commentId => apiClient.post(`${BASE}/comments/${commentId}/unresolve`),
  togglePin: commentId => apiClient.post(`${BASE}/comments/${commentId}/pin`),
  getStats: documentId => apiClient.get(`${BASE}/comments/stats/${documentId}`),
};

// ── المشاركة ──────────────────────────────────
export const sharingApi = {
  shareWithUser: data => apiClient.post(`${BASE}/sharing/user`, data),
  shareWithDepartment: data => apiClient.post(`${BASE}/sharing/department`, data),
  createPublicLink: data => apiClient.post(`${BASE}/sharing/public-link`, data),
  accessByLink: data => apiClient.post(`${BASE}/sharing/access-link`, data),
  getDocumentShares: documentId => apiClient.get(`${BASE}/sharing/document/${documentId}`),
  getSharedWithMe: (params = {}) => apiClient.get(`${BASE}/sharing/shared-with-me`, { params }),
  revokeShare: shareId => apiClient.delete(`${BASE}/sharing/${shareId}`),
  updatePermission: (shareId, permission) =>
    apiClient.put(`${BASE}/sharing/${shareId}/permission`, { permission }),
  getAccessLog: (documentId, params = {}) =>
    apiClient.get(`${BASE}/sharing/access-log/${documentId}`, { params }),
  getStats: documentId => apiClient.get(`${BASE}/sharing/stats/${documentId}`),
};

// ── سياسات الاحتفاظ ──────────────────────────────────
export const retentionApi = {
  getPolicies: (params = {}) => apiClient.get(`${BASE}/retention/policies`, { params }),
  getPolicy: policyId => apiClient.get(`${BASE}/retention/policies/${policyId}`),
  createPolicy: data => apiClient.post(`${BASE}/retention/policies`, data),
  updatePolicy: (policyId, data) => apiClient.put(`${BASE}/retention/policies/${policyId}`, data),
  deletePolicy: policyId => apiClient.delete(`${BASE}/retention/policies/${policyId}`),
  initialize: () => apiClient.post(`${BASE}/retention/initialize`),
  execute: () => apiClient.post(`${BASE}/retention/execute`),
  applyLegalHold: (documentId, reason) =>
    apiClient.post(`${BASE}/retention/legal-hold/${documentId}`, { reason }),
  releaseLegalHold: documentId => apiClient.delete(`${BASE}/retention/legal-hold/${documentId}`),
  getExpiring: (params = {}) => apiClient.get(`${BASE}/retention/expiring`, { params }),
  getLogs: (params = {}) => apiClient.get(`${BASE}/retention/logs`, { params }),
  getStats: () => apiClient.get(`${BASE}/retention/stats`),
};

// ── المفضلة والإشارات ──────────────────────────────────
export const favoritesApi = {
  toggle: documentId => apiClient.post(`${BASE}/favorites/toggle/${documentId}`),
  getAll: (params = {}) => apiClient.get(`${BASE}/favorites`, { params }),
  isFavorite: documentId => apiClient.get(`${BASE}/favorites/check/${documentId}`),
  addBookmark: data => apiClient.post(`${BASE}/bookmarks`, data),
  removeBookmark: bookmarkId => apiClient.delete(`${BASE}/bookmarks/${bookmarkId}`),
  getStats: () => apiClient.get(`${BASE}/favorites/stats`),
};

// ── المجموعات ──────────────────────────────────
export const collectionsApi = {
  getAll: () => apiClient.get(`${BASE}/collections`),
  create: data => apiClient.post(`${BASE}/collections`, data),
  getDocuments: collectionId => apiClient.get(`${BASE}/collections/${collectionId}`),
  addDocument: (collectionId, documentId, note) =>
    apiClient.post(`${BASE}/collections/${collectionId}/add`, { documentId, note }),
  removeDocument: (collectionId, documentId) =>
    apiClient.post(`${BASE}/collections/${collectionId}/remove`, { documentId }),
  delete: collectionId => apiClient.delete(`${BASE}/collections/${collectionId}`),
};

// ── المستندات الأخيرة ──────────────────────────────────
export const recentApi = {
  get: (params = {}) => apiClient.get(`${BASE}/recent`, { params }),
  getMostAccessed: (params = {}) => apiClient.get(`${BASE}/most-accessed`, { params }),
  recordAccess: (documentId, accessType = 'view') =>
    apiClient.post(`${BASE}/recent/record`, { documentId, accessType }),
  clearHistory: () => apiClient.delete(`${BASE}/recent/clear`),
};

// ── التحليلات ──────────────────────────────────
export const analyticsApi = {
  getDashboard: () => apiClient.get(`${BASE}/analytics/dashboard`),
  getUsers: (params = {}) => apiClient.get(`${BASE}/analytics/users`, { params }),
  getStorage: () => apiClient.get(`${BASE}/analytics/storage`),
  getProductivity: (params = {}) => apiClient.get(`${BASE}/analytics/productivity`, { params }),
  getWorkflow: () => apiClient.get(`${BASE}/analytics/workflow`),
  getFullReport: (params = {}) => apiClient.get(`${BASE}/analytics/full-report`, { params }),
};

// ── لوحة التحكم الموحدة ──────────────────────────────────
export const dashboardApi = {
  getV3Dashboard: () => apiClient.get(`${BASE}/v3-dashboard`),
};

export default {
  comments: commentsApi,
  sharing: sharingApi,
  retention: retentionApi,
  favorites: favoritesApi,
  collections: collectionsApi,
  recent: recentApi,
  analytics: analyticsApi,
  dashboard: dashboardApi,
};
