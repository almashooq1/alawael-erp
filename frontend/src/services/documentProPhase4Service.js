/**
 * Document Pro Phase 4 API Service
 * خدمة واجهة برمجة التطبيقات — المرحلة الرابعة
 * الربط، الوسوم، الصلاحيات، PDF، التعاون الفوري
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v4';

// ── ربط المستندات ──────────────────────────────────
export const linkingApi = {
  create: data => apiClient.post(`${BASE}/links`, data),
  remove: linkId => apiClient.delete(`${BASE}/links/${linkId}`),
  getForDocument: (documentId, params = {}) =>
    apiClient.get(`${BASE}/links/document/${documentId}`, { params }),
  getGraph: (documentId, depth = 3) =>
    apiClient.get(`${BASE}/links/graph/${documentId}`, { params: { depth } }),
  bulkLink: data => apiClient.post(`${BASE}/links/bulk`, data),
  getTypes: () => apiClient.get(`${BASE}/links/types`),
  getOrphans: (params = {}) => apiClient.get(`${BASE}/links/orphans`, { params }),
  getSuggestions: (documentId, params = {}) =>
    apiClient.get(`${BASE}/links/suggestions/${documentId}`, { params }),
  getStats: documentId =>
    apiClient.get(`${BASE}/links/stats`, { params: documentId ? { documentId } : {} }),
};

// ── الوسوم ──────────────────────────────────
export const tagsApi = {
  initialize: () => apiClient.post(`${BASE}/tags/initialize`),
  getAll: (params = {}) => apiClient.get(`${BASE}/tags`, { params }),
  create: data => apiClient.post(`${BASE}/tags`, data),
  update: (tagId, data) => apiClient.put(`${BASE}/tags/${tagId}`, data),
  delete: (tagId, replacementTagId) =>
    apiClient.delete(`${BASE}/tags/${tagId}`, { data: { replacementTagId } }),
  merge: (sourceTagIds, targetTagId) =>
    apiClient.post(`${BASE}/tags/merge`, { sourceTagIds, targetTagId }),
  getCloud: (params = {}) => apiClient.get(`${BASE}/tags/cloud`, { params }),
  getSuggestions: (documentId, params = {}) =>
    apiClient.get(`${BASE}/tags/suggestions/${documentId}`, { params }),
  bulkTag: (documentIds, tags, operation = 'add') =>
    apiClient.post(`${BASE}/tags/bulk`, { documentIds, tags, operation }),
  getDocuments: (tagId, params = {}) =>
    apiClient.get(`${BASE}/tags/${tagId}/documents`, { params }),
  getAnalytics: (params = {}) => apiClient.get(`${BASE}/tags/analytics`, { params }),
};

// ── فئات الوسوم ──────────────────────────────────
export const tagCategoriesApi = {
  getAll: (activeOnly = true) =>
    apiClient.get(`${BASE}/tag-categories`, { params: { activeOnly } }),
  create: data => apiClient.post(`${BASE}/tag-categories`, data),
  update: (categoryId, data) => apiClient.put(`${BASE}/tag-categories/${categoryId}`, data),
};

// ── قواعد أتمتة الوسوم ──────────────────────────────
export const tagRulesApi = {
  getAll: (activeOnly = true) => apiClient.get(`${BASE}/tag-rules`, { params: { activeOnly } }),
  create: data => apiClient.post(`${BASE}/tag-rules`, data),
};

// ── الصلاحيات (ACL) ──────────────────────────────────
export const aclApi = {
  initialize: () => apiClient.post(`${BASE}/acl/initialize`),
  set: data => apiClient.post(`${BASE}/acl`, data),
  applyTemplate: data => apiClient.post(`${BASE}/acl/apply-template`, data),
  check: (documentId, action, userId) =>
    apiClient.get(`${BASE}/acl/check`, { params: { documentId, action, userId } }),
  getEffective: (documentId, userId) =>
    apiClient.get(`${BASE}/acl/effective`, { params: { documentId, userId } }),
  getForDocument: documentId => apiClient.get(`${BASE}/acl/document/${documentId}`),
  revoke: aclId => apiClient.delete(`${BASE}/acl/${aclId}`),
  revokeAll: (documentId, reason) =>
    apiClient.post(`${BASE}/acl/revoke-all/${documentId}`, { reason }),
  getTemplates: () => apiClient.get(`${BASE}/acl/templates`),
  createTemplate: data => apiClient.post(`${BASE}/acl/templates`, data),
  getActions: () => apiClient.get(`${BASE}/acl/actions`),
  requestAccess: data => apiClient.post(`${BASE}/acl/access-request`, data),
  reviewRequest: (requestId, decision, reviewNote) =>
    apiClient.post(`${BASE}/acl/access-request/${requestId}/review`, { decision, reviewNote }),
  getRequests: (params = {}) => apiClient.get(`${BASE}/acl/access-requests`, { params }),
  getCompliance: documentId => apiClient.get(`${BASE}/acl/compliance/${documentId}`),
  getStats: () => apiClient.get(`${BASE}/acl/stats`),
};

// ── PDF ──────────────────────────────────
export const pdfApi = {
  convert: (documentId, options = {}) =>
    apiClient.post(`${BASE}/pdf/convert/${documentId}`, options),
  merge: (documentIds, options = {}) =>
    apiClient.post(`${BASE}/pdf/merge`, { documentIds, options }),
  split: (documentId, config = {}) => apiClient.post(`${BASE}/pdf/split/${documentId}`, config),
  protect: (documentId, options = {}) =>
    apiClient.post(`${BASE}/pdf/protect/${documentId}`, options),
  addCover: (documentId, options = {}) =>
    apiClient.post(`${BASE}/pdf/cover/${documentId}`, options),
  addPageNumbers: (documentId, options = {}) =>
    apiClient.post(`${BASE}/pdf/page-numbers/${documentId}`, options),
  stamp: (documentId, config = {}) => apiClient.post(`${BASE}/pdf/stamp/${documentId}`, config),
  batchConvert: (documentIds, options = {}) =>
    apiClient.post(`${BASE}/pdf/batch-convert`, { documentIds, options }),
  getJobs: (params = {}) => apiClient.get(`${BASE}/pdf/jobs`, { params }),
  getCoverTemplates: () => apiClient.get(`${BASE}/pdf/cover-templates`),
  getNumberingFormats: () => apiClient.get(`${BASE}/pdf/numbering-formats`),
  getStats: () => apiClient.get(`${BASE}/pdf/stats`),
};

// ── التعاون الفوري ──────────────────────────────────
export const collabApi = {
  join: (documentId, data = {}) => apiClient.post(`${BASE}/collab/join/${documentId}`, data),
  leave: documentId => apiClient.post(`${BASE}/collab/leave/${documentId}`),
  getCollaborators: documentId => apiClient.get(`${BASE}/collab/collaborators/${documentId}`),
  updateStatus: (documentId, status) =>
    apiClient.put(`${BASE}/collab/status/${documentId}`, { status }),
  updateCursor: (documentId, position) =>
    apiClient.put(`${BASE}/collab/cursor/${documentId}`, { position }),
  lockSection: (documentId, sectionId) =>
    apiClient.post(`${BASE}/collab/lock/${documentId}`, { sectionId }),
  unlockSection: (documentId, sectionId) =>
    apiClient.post(`${BASE}/collab/unlock/${documentId}`, { sectionId }),
  heartbeat: documentId => apiClient.post(`${BASE}/collab/heartbeat/${documentId}`),
  broadcast: (documentId, eventType, eventData) =>
    apiClient.post(`${BASE}/collab/broadcast/${documentId}`, { eventType, eventData }),
  getActivity: (documentId, params = {}) =>
    apiClient.get(`${BASE}/collab/activity/${documentId}`, { params }),
  cleanup: () => apiClient.post(`${BASE}/collab/cleanup`),
  getStats: () => apiClient.get(`${BASE}/collab/stats`),
};

// ── لوحة التحكم ──────────────────────────────────
export const dashboardApi = {
  getV4Dashboard: () => apiClient.get(`${BASE}/v4-dashboard`),
};

export default {
  linking: linkingApi,
  tags: tagsApi,
  tagCategories: tagCategoriesApi,
  tagRules: tagRulesApi,
  acl: aclApi,
  pdf: pdfApi,
  collab: collabApi,
  dashboard: dashboardApi,
};
