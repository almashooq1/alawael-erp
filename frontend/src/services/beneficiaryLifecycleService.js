/**
 * Beneficiary Lifecycle Service — خدمة دورة حياة المستفيد
 *
 * Unified API client for /api/v1/beneficiary-lifecycle
 * W0-LifecycleAlign: frontend surface for request/approve/execute/cancel/reverse
 * transitions and allowed-transitions discovery.
 */

import apiClient from './api.client';

const BASE = '/api/v1/beneficiary-lifecycle';

async function req(method, url, data = null, params = null) {
  const config = { method, url: `${BASE}${url}` };
  if (data) config.data = data;
  if (params) config.params = params;
  const res = await apiClient(config);
  return res.data;
}

// ── Transitions ──────────────────────────────────────────────────────────────
export const requestTransition = body => req('POST', '/transitions', body);
export const approveTransition = (id, body) => req('POST', `/transitions/${id}/approve`, body);
export const executeTransition = id => req('POST', `/transitions/${id}/execute`);
export const cancelTransition = (id, reason = null) =>
  req('POST', `/transitions/${id}/cancel`, reason ? { reason } : {});
export const reverseTransition = (id, reason = null) =>
  req('POST', `/transitions/${id}/reverse`, reason ? { reason } : {});

// ── Reads ────────────────────────────────────────────────────────────────────
export const getTransition = id => req('GET', `/transitions/${id}`);
export const getTransitionHistory = beneficiaryId =>
  req('GET', `/beneficiaries/${beneficiaryId}/transitions`);
export const getAllowedTransitions = (beneficiaryId, currentState) =>
  req('GET', `/beneficiaries/${beneficiaryId}/allowed-transitions`, null, { currentState });
export const getSideEffectsSummary = id => req('GET', `/transitions/${id}/side-effects-summary`);

// ── Default export ───────────────────────────────────────────────────────────
const beneficiaryLifecycleService = {
  requestTransition,
  approveTransition,
  executeTransition,
  cancelTransition,
  reverseTransition,
  getTransition,
  getTransitionHistory,
  getAllowedTransitions,
  getSideEffectsSummary,
};

export default beneficiaryLifecycleService;
