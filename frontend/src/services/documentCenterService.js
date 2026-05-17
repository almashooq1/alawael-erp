/**
 * Document Center Service — خدمة مركز إدارة الوثائق الموحد
 * ════════════════════════════════════════════════════════════
 * Unified API client for /api/v1/document-center
 */

import apiClient from './api.client';

const BASE = '/api/v1/document-center';

async function req(method, url, data = null, params = null) {
  const config = { method, url: `${BASE}${url}` };
  if (data) config.data = data;
  if (params) config.params = params;
  const res = await apiClient(config);
  return res.data;
}

// ── Dashboard ────────────────────────────────────────────────────
export const getDashboard = () => req('GET', '/dashboard');
export const getMetadata = () => req('GET', '/metadata');

// ── Library ──────────────────────────────────────────────────────
export const listDocuments = (p = {}) => req('GET', '/library', null, p);
export const getDocument = id => req('GET', `/library/${id}`);
export const updateDocument = (id, body) => req('PUT', `/library/${id}`, body);
export const deleteDocument = id => req('DELETE', `/library/${id}`);
export const archiveDocument = id => req('POST', `/library/${id}/archive`);
export const restoreDocument = id => req('POST', `/library/${id}/restore`);
export const bulkOperation = (ids, operation) => req('POST', '/library/bulk', { ids, operation });

// ── Search & Expiry ──────────────────────────────────────────────
export const smartSearch = (q, params = {}) => req('GET', '/search', null, { q, ...params });
export const getExpiryRadar = (days = 60) => req('GET', '/expiry-radar', null, { days });

// ── Workflow ─────────────────────────────────────────────────────
export const getWorkflowQueue = (p = {}) => req('GET', '/workflow/queue', null, p);
export const workflowAction = (id, action, comment = '') =>
  req('POST', `/workflow/${id}/action`, { action, comment });

// ── AI ────────────────────────────────────────────────────────────
export const getAIInsights = () => req('GET', '/ai/insights');
export const classifyDocument = id => req('POST', `/ai/${id}/classify`);
export const checkDuplicates = id => req('POST', `/ai/${id}/duplicates`);

// ── Reports ───────────────────────────────────────────────────────
export const getAnalytics = (months = 6) => req('GET', '/reports/analytics', null, { months });

// ── Beneficiary ───────────────────────────────────────────────────
export const linkToBeneficiary = (id, beneficiaryId, episodeId) =>
  req('POST', `/beneficiary/${id}/link`, { beneficiaryId, episodeId });
export const getBeneficiaryDocs = (benefId, p = {}) =>
  req('GET', `/beneficiary/${benefId}/docs`, null, p);

// ── Favorites ─────────────────────────────────────────────────────
export const toggleFavorite = id => req('POST', `/favorite/${id}`);

const documentCenterService = {
  getDashboard,
  getMetadata,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  bulkOperation,
  smartSearch,
  getExpiryRadar,
  getWorkflowQueue,
  workflowAction,
  getAIInsights,
  classifyDocument,
  checkDuplicates,
  getAnalytics,
  linkToBeneficiary,
  getBeneficiaryDocs,
  toggleFavorite,
};

export default documentCenterService;
