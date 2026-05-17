/**
 * Episode Center Service — خدمة مركز الحلقة العلاجية
 * جميع المكالمات API الخاصة بـ /api/v1/episode-center
 */
import apiClient from './api.client';

const BASE = '/api/v1/episode-center';

export const getDashboard = (params = {}) =>
  apiClient.get(`${BASE}/dashboard`, { params }).then(r => r.data);

export const listEpisodes = (params = {}) => apiClient.get(BASE, { params }).then(r => r.data);

export const createEpisode = data => apiClient.post(BASE, data).then(r => r.data);

export const getFullEpisode = id => apiClient.get(`${BASE}/${id}`).then(r => r.data);

export const advancePhase = (id, notes = '') =>
  apiClient.post(`${BASE}/${id}/advance-phase`, { notes }).then(r => r.data);

export const updateStatus = (id, status, reason = '') =>
  apiClient.patch(`${BASE}/${id}/status`, { status, reason }).then(r => r.data);

export const addTeamMember = (id, member) =>
  apiClient.post(`${BASE}/${id}/team-member`, member).then(r => r.data);

export const getEpisodesByBeneficiary = (beneficiaryId, params = {}) =>
  apiClient.get(`${BASE}/beneficiary/${beneficiaryId}`, { params }).then(r => r.data);

const episodeCenterService = {
  getDashboard,
  listEpisodes,
  createEpisode,
  getFullEpisode,
  advancePhase,
  updateStatus,
  addTeamMember,
  getEpisodesByBeneficiary,
};

export default episodeCenterService;
