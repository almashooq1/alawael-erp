/**
 * administration.service.js — خدمة نظام الإدارة
 * Frontend API service for the Administration Management module.
 */
import api from './api';

const BASE = '/administration';

const administrationService = {
  /* ── Dashboard ──────────────────────────────────────────────────────────── */
  getStats: () => api.get(`${BASE}/stats`),

  /* ── Decisions / Memos / Circulars ──────────────────────────────────────── */
  getDecisions: params => api.get(`${BASE}/decisions`, { params }),
  getDecision: id => api.get(`${BASE}/decisions/${id}`),
  createDecision: data => api.post(`${BASE}/decisions`, data),
  updateDecision: (id, data) => api.put(`${BASE}/decisions/${id}`, data),
  deleteDecision: id => api.delete(`${BASE}/decisions/${id}`),
  submitDecision: id => api.post(`${BASE}/decisions/${id}/submit`),
  approveDecision: id => api.post(`${BASE}/decisions/${id}/approve`),
  rejectDecision: (id, data) => api.post(`${BASE}/decisions/${id}/reject`, data),
  publishDecision: id => api.post(`${BASE}/decisions/${id}/publish`),
  archiveDecision: id => api.post(`${BASE}/decisions/${id}/archive`),
  revokeDecision: (id, data) => api.post(`${BASE}/decisions/${id}/revoke`, data),
  acknowledgeDecision: id => api.post(`${BASE}/decisions/${id}/acknowledge`),
  addDecisionComment: (id, data) => api.post(`${BASE}/decisions/${id}/comments`, data),

  /* ── Correspondence ─────────────────────────────────────────────────────── */
  getCorrespondence: params => api.get(`${BASE}/correspondence`, { params }),
  getCorrespondenceById: id => api.get(`${BASE}/correspondence/${id}`),
  createCorrespondence: data => api.post(`${BASE}/correspondence`, data),
  updateCorrespondence: (id, data) => api.put(`${BASE}/correspondence/${id}`, data),
  deleteCorrespondence: id => api.delete(`${BASE}/correspondence/${id}`),
  forwardCorrespondence: (id, data) => api.post(`${BASE}/correspondence/${id}/forward`, data),
  completeCorrespondence: (id, data) => api.post(`${BASE}/correspondence/${id}/complete`, data),
  archiveCorrespondence: id => api.post(`${BASE}/correspondence/${id}/archive`),
  replyCorrespondence: (id, data) => api.post(`${BASE}/correspondence/${id}/reply`, data),
  addFollowUp: (id, data) => api.post(`${BASE}/correspondence/${id}/follow-up`, data),

  /* ── Delegations ────────────────────────────────────────────────────────── */
  getDelegations: params => api.get(`${BASE}/delegations`, { params }),
  getDelegation: id => api.get(`${BASE}/delegations/${id}`),
  createDelegation: data => api.post(`${BASE}/delegations`, data),
  updateDelegation: (id, data) => api.put(`${BASE}/delegations/${id}`, data),
  deleteDelegation: id => api.delete(`${BASE}/delegations/${id}`),
  activateDelegation: id => api.post(`${BASE}/delegations/${id}/activate`),
  suspendDelegation: (id, data) => api.post(`${BASE}/delegations/${id}/suspend`, data),
  revokeDelegation: (id, data) => api.post(`${BASE}/delegations/${id}/revoke`, data),
  extendDelegation: (id, data) => api.post(`${BASE}/delegations/${id}/extend`, data),
  useDelegation: (id, data) => api.post(`${BASE}/delegations/${id}/use`, data),
};

export default administrationService;
