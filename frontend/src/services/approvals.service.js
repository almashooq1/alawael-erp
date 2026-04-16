/**
 * Approvals API wrappers.
 */

import apiClient from './api.client';

const base = '/approvals';

export const listChains = async () => (await apiClient.get(`${base}/chains`)).data;
export const listInbox = async () => (await apiClient.get(`${base}/inbox`)).data;
export const listRequests = async (params = {}) => (await apiClient.get(base, { params })).data;
export const getRequest = async id =>
  (await apiClient.get(`${base}/${encodeURIComponent(id)}`)).data;

export const startRequest = async payload => (await apiClient.post(base, payload)).data;

export const approveRequest = async (id, note) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/approve`, { note })).data;

export const rejectRequest = async (id, note) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/reject`, { note })).data;

export const cancelRequest = async (id, note) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/cancel`, { note })).data;

export const escalateRequest = async (id, note) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/escalate`, { note })).data;

export default {
  listChains,
  listInbox,
  listRequests,
  getRequest,
  startRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  escalateRequest,
};
