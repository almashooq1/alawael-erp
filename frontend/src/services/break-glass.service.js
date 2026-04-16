/**
 * Break-glass API wrappers.
 */

import apiClient from './api.client';

const base = '/break-glass';

export const listMine = async () => (await apiClient.get(`${base}/my`)).data;
export const listPending = async () => (await apiClient.get(`${base}/pending`)).data;
export const listFlagged = async () => (await apiClient.get(`${base}/flagged`)).data;

export const activate = async payload => (await apiClient.post(`${base}/activate`, payload)).data;

export const coSign = async (id, note) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/cosign`, { note })).data;

export const close = async (id, reason) =>
  (await apiClient.post(`${base}/${encodeURIComponent(id)}/close`, { reason })).data;

export default { listMine, listPending, listFlagged, activate, coSign, close };
