/**
 * Document Pro Phase 8 — Frontend API Service
 * ترجمة • نماذج • سلاسل موافقات • تشفير/DLP • نسخ احتياطي
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v8';

/* ══════════════════════════════════════════════════════════════
   Translation — ترجمة المستندات
   ══════════════════════════════════════════════════════════════ */
export const translationApi = {
  translate: data => apiClient.post(`${BASE}/translation/translate`, data),
  batchTranslate: data => apiClient.post(`${BASE}/translation/batch`, data),
  detectLanguage: text => apiClient.post(`${BASE}/translation/detect`, { text }),
  getLanguages: () => apiClient.get(`${BASE}/translation/languages`),

  getJobs: params => apiClient.get(`${BASE}/translation/jobs`, { params }),
  getJob: id => apiClient.get(`${BASE}/translation/jobs/${id}`),
  cancelJob: id => apiClient.put(`${BASE}/translation/jobs/${id}/cancel`),
  reviewSegment: (jobId, index, data) =>
    apiClient.put(`${BASE}/translation/jobs/${jobId}/segments/${index}/review`, data),

  getTM: params => apiClient.get(`${BASE}/translation/tm`, { params }),
  addTM: data => apiClient.post(`${BASE}/translation/tm`, data),
  deleteTM: id => apiClient.delete(`${BASE}/translation/tm/${id}`),
  importTM: entries => apiClient.post(`${BASE}/translation/tm/import`, { entries }),

  getGlossaries: params => apiClient.get(`${BASE}/translation/glossaries`, { params }),
  createGlossary: data => apiClient.post(`${BASE}/translation/glossaries`, data),
  updateGlossary: (id, data) => apiClient.put(`${BASE}/translation/glossaries/${id}`, data),
  deleteGlossary: id => apiClient.delete(`${BASE}/translation/glossaries/${id}`),
  addGlossaryEntry: (id, data) =>
    apiClient.post(`${BASE}/translation/glossaries/${id}/entries`, data),
  removeGlossaryEntry: (id, idx) =>
    apiClient.delete(`${BASE}/translation/glossaries/${id}/entries/${idx}`),

  getStats: () => apiClient.get(`${BASE}/translation/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Forms — النماذج والحقول
   ══════════════════════════════════════════════════════════════ */
export const formsApi = {
  getTemplates: params => apiClient.get(`${BASE}/forms/templates`, { params }),
  getTemplate: id => apiClient.get(`${BASE}/forms/templates/${id}`),
  createTemplate: data => apiClient.post(`${BASE}/forms/templates`, data),
  updateTemplate: (id, data) => apiClient.put(`${BASE}/forms/templates/${id}`, data),
  deleteTemplate: id => apiClient.delete(`${BASE}/forms/templates/${id}`),
  publishTemplate: id => apiClient.put(`${BASE}/forms/templates/${id}/publish`),
  cloneTemplate: id => apiClient.post(`${BASE}/forms/templates/${id}/clone`),

  getSubmissions: params => apiClient.get(`${BASE}/forms/submissions`, { params }),
  getSubmission: id => apiClient.get(`${BASE}/forms/submissions/${id}`),
  submitForm: (formId, data, options) =>
    apiClient.post(`${BASE}/forms/${formId}/submit`, { data, options }),
  updateSubmission: (id, data) => apiClient.put(`${BASE}/forms/submissions/${id}`, { data }),
  reviewSubmission: (id, approved, data) =>
    apiClient.put(`${BASE}/forms/submissions/${id}/review`, { approved, ...data }),
  deleteSubmission: id => apiClient.delete(`${BASE}/forms/submissions/${id}`),

  getCustomFields: params => apiClient.get(`${BASE}/forms/custom-fields`, { params }),
  createCustomField: data => apiClient.post(`${BASE}/forms/custom-fields`, data),
  updateCustomField: (id, data) => apiClient.put(`${BASE}/forms/custom-fields/${id}`, data),
  deleteCustomField: id => apiClient.delete(`${BASE}/forms/custom-fields/${id}`),

  getStats: () => apiClient.get(`${BASE}/forms/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Approval Chains — سلاسل الموافقات
   ══════════════════════════════════════════════════════════════ */
export const approvalApi = {
  getChains: params => apiClient.get(`${BASE}/approval/chains`, { params }),
  getChain: id => apiClient.get(`${BASE}/approval/chains/${id}`),
  createChain: data => apiClient.post(`${BASE}/approval/chains`, data),
  updateChain: (id, data) => apiClient.put(`${BASE}/approval/chains/${id}`, data),
  deleteChain: id => apiClient.delete(`${BASE}/approval/chains/${id}`),
  activateChain: id => apiClient.put(`${BASE}/approval/chains/${id}/activate`),

  getRequests: params => apiClient.get(`${BASE}/approval/requests`, { params }),
  getMyPending: () => apiClient.get(`${BASE}/approval/requests/my-pending`),
  getRequest: id => apiClient.get(`${BASE}/approval/requests/${id}`),
  submitRequest: (chainId, data) =>
    apiClient.post(`${BASE}/approval/requests`, { chainId, ...data }),
  processStep: (id, action, comment) =>
    apiClient.put(`${BASE}/approval/requests/${id}/process`, { action, comment }),
  cancelRequest: id => apiClient.put(`${BASE}/approval/requests/${id}/cancel`),
  resubmitRequest: (id, note) =>
    apiClient.put(`${BASE}/approval/requests/${id}/resubmit`, { note }),

  getDelegations: () => apiClient.get(`${BASE}/approval/delegations`),
  createDelegation: data => apiClient.post(`${BASE}/approval/delegations`, data),
  revokeDelegation: id => apiClient.put(`${BASE}/approval/delegations/${id}/revoke`),

  checkSLA: () => apiClient.post(`${BASE}/approval/sla-check`),
  getStats: () => apiClient.get(`${BASE}/approval/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Security — التشفير وحماية البيانات
   ══════════════════════════════════════════════════════════════ */
export const securityApi = {
  encrypt: (documentId, data) => apiClient.post(`${BASE}/security/encrypt/${documentId}`, data),
  decrypt: (documentId, data) => apiClient.post(`${BASE}/security/decrypt/${documentId}`, data),
  getEncryptionStatus: documentId =>
    apiClient.get(`${BASE}/security/encryption-status/${documentId}`),
  batchEncrypt: (documentIds, options) =>
    apiClient.post(`${BASE}/security/batch-encrypt`, { documentIds, options }),

  classify: (documentId, level, options) =>
    apiClient.post(`${BASE}/security/classify/${documentId}`, { level, ...options }),
  autoClassify: documentId => apiClient.post(`${BASE}/security/auto-classify/${documentId}`),
  getClassification: documentId => apiClient.get(`${BASE}/security/classification/${documentId}`),
  getClassifications: params => apiClient.get(`${BASE}/security/classifications`, { params }),

  scanDLP: (content, options) => apiClient.post(`${BASE}/security/dlp/scan`, { content, options }),
  getDLPPolicies: params => apiClient.get(`${BASE}/security/dlp/policies`, { params }),
  createDLPPolicy: data => apiClient.post(`${BASE}/security/dlp/policies`, data),
  updateDLPPolicy: (id, data) => apiClient.put(`${BASE}/security/dlp/policies/${id}`, data),
  deleteDLPPolicy: id => apiClient.delete(`${BASE}/security/dlp/policies/${id}`),

  logAccess: (documentId, action, options) =>
    apiClient.post(`${BASE}/security/access-log`, { documentId, action, ...options }),
  getAccessLogs: params => apiClient.get(`${BASE}/security/access-logs`, { params }),

  getStats: () => apiClient.get(`${BASE}/security/stats`),
};

/* ══════════════════════════════════════════════════════════════
   Backup — النسخ الاحتياطي والاسترداد
   ══════════════════════════════════════════════════════════════ */
export const backupApi = {
  getBackups: params => apiClient.get(`${BASE}/backup/jobs`, { params }),
  getBackup: id => apiClient.get(`${BASE}/backup/jobs/${id}`),
  createBackup: data => apiClient.post(`${BASE}/backup/jobs`, data),
  cancelBackup: id => apiClient.put(`${BASE}/backup/jobs/${id}/cancel`),
  deleteBackup: id => apiClient.delete(`${BASE}/backup/jobs/${id}`),
  verifyBackup: id => apiClient.get(`${BASE}/backup/jobs/${id}/verify`),

  getRecoveries: params => apiClient.get(`${BASE}/backup/recoveries`, { params }),
  getRecovery: id => apiClient.get(`${BASE}/backup/recoveries/${id}`),
  recover: (backupId, data) => apiClient.post(`${BASE}/backup/recover/${backupId}`, data),

  getSnapshots: (documentId, params) =>
    apiClient.get(`${BASE}/backup/snapshots/${documentId}`, { params }),
  getSnapshot: id => apiClient.get(`${BASE}/backup/snapshot/${id}`),
  createSnapshot: (documentId, data) =>
    apiClient.post(`${BASE}/backup/snapshots/${documentId}`, data),
  restoreSnapshot: id => apiClient.post(`${BASE}/backup/snapshots/${id}/restore`),
  deleteSnapshot: id => apiClient.delete(`${BASE}/backup/snapshots/${id}`),
  compareSnapshots: (id1, id2) =>
    apiClient.post(`${BASE}/backup/snapshots/compare`, { snapshotId1: id1, snapshotId2: id2 }),

  getPolicies: params => apiClient.get(`${BASE}/backup/policies`, { params }),
  createPolicy: data => apiClient.post(`${BASE}/backup/policies`, data),
  updatePolicy: (id, data) => apiClient.put(`${BASE}/backup/policies/${id}`, data),
  deletePolicy: id => apiClient.delete(`${BASE}/backup/policies/${id}`),
  runPolicy: id => apiClient.post(`${BASE}/backup/policies/${id}/run`),

  cleanup: () => apiClient.post(`${BASE}/backup/cleanup`),
  getStats: () => apiClient.get(`${BASE}/backup/stats`),
};

/* ─── Dashboard ────────────────────────────────────────────── */
export const getDashboard = () => apiClient.get(`${BASE}/dashboard`);

export default {
  translation: translationApi,
  forms: formsApi,
  approval: approvalApi,
  security: securityApi,
  backup: backupApi,
  getDashboard,
};
