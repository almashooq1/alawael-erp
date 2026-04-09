/**
 * Document Pro Phase 9 — Frontend API Service
 * دورة الحياة • التوقيع الرقمي • التصنيف الذكي • تنسيق سير العمل • التحليل الجنائي
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v9';

/* ── 1. Lifecycle — دورة الحياة ──────────────────────── */
export const lifecycleApi = {
  // Policies
  createPolicy: d => apiClient.post(`${BASE}/lifecycle/policies`, d),
  getPolicies: p => apiClient.get(`${BASE}/lifecycle/policies`, { params: p }),
  getPolicy: id => apiClient.get(`${BASE}/lifecycle/policies/${id}`),
  updatePolicy: (id, d) => apiClient.put(`${BASE}/lifecycle/policies/${id}`, d),
  activatePolicy: id => apiClient.post(`${BASE}/lifecycle/policies/${id}/activate`),
  deletePolicy: id => apiClient.delete(`${BASE}/lifecycle/policies/${id}`),

  // Document Lifecycle
  assign: d => apiClient.post(`${BASE}/lifecycle/assign`, d),
  getDocLifecycle: docId => apiClient.get(`${BASE}/lifecycle/document/${docId}`),
  transition: (docId, d) => apiClient.post(`${BASE}/lifecycle/document/${docId}/transition`, d),
  setLegalHold: (docId, d) => apiClient.post(`${BASE}/lifecycle/document/${docId}/legal-hold`, d),
  releaseLegalHold: docId => apiClient.post(`${BASE}/lifecycle/document/${docId}/release-hold`),
  extendRetention: (docId, d) =>
    apiClient.post(`${BASE}/lifecycle/document/${docId}/extend-retention`, d),
  getTimeline: docId => apiClient.get(`${BASE}/lifecycle/document/${docId}/timeline`),

  // Disposition
  requestDisposition: d => apiClient.post(`${BASE}/lifecycle/disposition`, d),
  getDispositions: p => apiClient.get(`${BASE}/lifecycle/disposition`, { params: p }),
  approveDisposition: (id, d) => apiClient.post(`${BASE}/lifecycle/disposition/${id}/approve`, d),
  executeDisposition: id => apiClient.post(`${BASE}/lifecycle/disposition/${id}/execute`),

  // Expiry & Stats
  getExpiring: days => apiClient.get(`${BASE}/lifecycle/expiring`, { params: { days } }),
  getRetExpiring: days =>
    apiClient.get(`${BASE}/lifecycle/retention-expiring`, { params: { days } }),
  autoTransition: () => apiClient.post(`${BASE}/lifecycle/auto-transition`),
  getStats: () => apiClient.get(`${BASE}/lifecycle/stats`),
};

/* ── 2. Digital Certificates — التوقيع الرقمي ────────── */
export const digitalCertApi = {
  generate: d => apiClient.post(`${BASE}/digital-cert/generate`, d),
  getCertificates: p => apiClient.get(`${BASE}/digital-cert/certificates`, { params: p }),
  getCertificate: id => apiClient.get(`${BASE}/digital-cert/certificates/${id}`),
  revoke: (id, d) => apiClient.post(`${BASE}/digital-cert/certificates/${id}/revoke`, d),
  renew: id => apiClient.post(`${BASE}/digital-cert/certificates/${id}/renew`),

  sign: d => apiClient.post(`${BASE}/digital-cert/sign`, d),
  getSignatures: docId => apiClient.get(`${BASE}/digital-cert/document/${docId}/signatures`),
  verify: sigId => apiClient.post(`${BASE}/digital-cert/verify/${sigId}`),
  verifyAll: docId => apiClient.post(`${BASE}/digital-cert/document/${docId}/verify-all`),

  createRequest: d => apiClient.post(`${BASE}/digital-cert/requests`, d),
  getRequests: p => apiClient.get(`${BASE}/digital-cert/requests`, { params: p }),
  processRequest: (id, d) => apiClient.post(`${BASE}/digital-cert/requests/${id}/process`, d),
  getStats: () => apiClient.get(`${BASE}/digital-cert/stats`),
};

/* ── 3. Classification — التصنيف الذكي ───────────────── */
export const classificationApi = {
  // Models
  createModel: d => apiClient.post(`${BASE}/classification/models`, d),
  getModels: p => apiClient.get(`${BASE}/classification/models`, { params: p }),
  getModel: id => apiClient.get(`${BASE}/classification/models/${id}`),
  updateModel: (id, d) => apiClient.put(`${BASE}/classification/models/${id}`, d),
  activateModel: id => apiClient.post(`${BASE}/classification/models/${id}/activate`),
  trainModel: (id, d) => apiClient.post(`${BASE}/classification/models/${id}/train`, d),

  // Classification
  classify: d => apiClient.post(`${BASE}/classification/classify`, d),
  batchClassify: d => apiClient.post(`${BASE}/classification/batch-classify`, d),
  getResult: docId => apiClient.get(`${BASE}/classification/document/${docId}`),
  getHistory: docId => apiClient.get(`${BASE}/classification/document/${docId}/history`),
  feedback: (id, d) => apiClient.post(`${BASE}/classification/${id}/feedback`, d),

  // Clustering
  createCluster: d => apiClient.post(`${BASE}/classification/clusters`, d),
  getClusters: p => apiClient.get(`${BASE}/classification/clusters`, { params: p }),
  getCluster: id => apiClient.get(`${BASE}/classification/clusters/${id}`),
  addToCluster: (id, d) => apiClient.post(`${BASE}/classification/clusters/${id}/add`, d),
  removeFromCluster: (id, d) => apiClient.post(`${BASE}/classification/clusters/${id}/remove`, d),
  autoCluster: d => apiClient.post(`${BASE}/classification/auto-cluster`, d),
  findSimilar: (docId, d) => apiClient.post(`${BASE}/classification/similar/${docId}`, d),
  getStats: () => apiClient.get(`${BASE}/classification/stats`),
};

/* ── 4. Workflow Orchestration — تنسيق سير العمل ─────── */
export const workflowOrchApi = {
  // Definitions
  createDef: d => apiClient.post(`${BASE}/workflow-orch/definitions`, d),
  getDefs: p => apiClient.get(`${BASE}/workflow-orch/definitions`, { params: p }),
  getDef: id => apiClient.get(`${BASE}/workflow-orch/definitions/${id}`),
  updateDef: (id, d) => apiClient.put(`${BASE}/workflow-orch/definitions/${id}`, d),
  activateDef: id => apiClient.post(`${BASE}/workflow-orch/definitions/${id}/activate`),
  cloneDef: id => apiClient.post(`${BASE}/workflow-orch/definitions/${id}/clone`),
  validateDef: id => apiClient.post(`${BASE}/workflow-orch/definitions/${id}/validate`),
  deleteDef: id => apiClient.delete(`${BASE}/workflow-orch/definitions/${id}`),

  // Instances
  start: d => apiClient.post(`${BASE}/workflow-orch/start`, d),
  getInstances: p => apiClient.get(`${BASE}/workflow-orch/instances`, { params: p }),
  getInstance: id => apiClient.get(`${BASE}/workflow-orch/instances/${id}`),
  completeTask: (id, d) => apiClient.post(`${BASE}/workflow-orch/instances/${id}/complete-task`, d),
  suspend: (id, d) => apiClient.post(`${BASE}/workflow-orch/instances/${id}/suspend`, d),
  resume: id => apiClient.post(`${BASE}/workflow-orch/instances/${id}/resume`),
  cancel: (id, d) => apiClient.post(`${BASE}/workflow-orch/instances/${id}/cancel`, d),
  retry: (id, nodeId) => apiClient.post(`${BASE}/workflow-orch/instances/${id}/retry/${nodeId}`),
  getMyTasks: () => apiClient.get(`${BASE}/workflow-orch/my-tasks`),
  getStats: () => apiClient.get(`${BASE}/workflow-orch/stats`),
};

/* ── 5. Forensics — التحليل الجنائي ──────────────────── */
export const forensicsApi = {
  checkIntegrity: d => apiClient.post(`${BASE}/forensics/integrity-check`, d),
  computeHashes: d => apiClient.post(`${BASE}/forensics/compute-hashes`, d),

  addCustody: d => apiClient.post(`${BASE}/forensics/custody`, d),
  getCustody: docId => apiClient.get(`${BASE}/forensics/custody/${docId}`),
  verifyCustody: docId => apiClient.post(`${BASE}/forensics/custody/${docId}/verify`),

  analyze: docId => apiClient.post(`${BASE}/forensics/analyze/${docId}`),
  getHistory: docId => apiClient.get(`${BASE}/forensics/history/${docId}`),
  getTimeline: docId => apiClient.get(`${BASE}/forensics/timeline/${docId}`),

  getAlerts: p => apiClient.get(`${BASE}/forensics/alerts`, { params: p }),
  updateAlert: (id, d) => apiClient.put(`${BASE}/forensics/alerts/${id}`, d),

  createPolicy: d => apiClient.post(`${BASE}/forensics/policies`, d),
  getPolicies: () => apiClient.get(`${BASE}/forensics/policies`),
  updatePolicy: (id, d) => apiClient.put(`${BASE}/forensics/policies/${id}`, d),
  deletePolicy: id => apiClient.delete(`${BASE}/forensics/policies/${id}`),
  getStats: () => apiClient.get(`${BASE}/forensics/stats`),
};

/* ── Dashboard ───────────────────────────────────────── */
export const getDashboard = () => apiClient.get(`${BASE}/dashboard`);

export default {
  lifecycleApi,
  digitalCertApi,
  classificationApi,
  workflowOrchApi,
  forensicsApi,
  getDashboard,
};
