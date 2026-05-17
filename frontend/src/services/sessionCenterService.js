/**
 * Session Center Service — خدمة مركز الجلسات العلاجية
 * جميع المكالمات API الخاصة بـ /api/v1/session-center
 */
import apiClient from './api.client';

const BASE = '/api/v1/session-center';

export const getDashboard = (params = {}) =>
  apiClient.get(`${BASE}/dashboard`, { params }).then(r => r.data);

export const getCalendarSlots = (params = {}) =>
  apiClient.get(`${BASE}/calendar`, { params }).then(r => r.data);

export const getTherapistLoad = (params = {}) =>
  apiClient.get(`${BASE}/therapist-load`, { params }).then(r => r.data);

export const getAttendanceReport = (params = {}) =>
  apiClient.get(`${BASE}/attendance`, { params }).then(r => r.data);

export const getEpisodeSessions = episodeId =>
  apiClient.get(`${BASE}/episode/${episodeId}`).then(r => r.data);

export const getBeneficiarySessions = (beneficiaryId, params = {}) =>
  apiClient.get(`${BASE}/beneficiary/${beneficiaryId}`, { params }).then(r => r.data);

export const getGoalsProgress = episodeId =>
  apiClient.get(`${BASE}/goals/${episodeId}`).then(r => r.data);

export const getSOAPSummary = sessionId =>
  apiClient.get(`${BASE}/soap/${sessionId}`).then(r => r.data);

const sessionCenterService = {
  getDashboard,
  getCalendarSlots,
  getTherapistLoad,
  getAttendanceReport,
  getEpisodeSessions,
  getBeneficiarySessions,
  getGoalsProgress,
  getSOAPSummary,
};

export default sessionCenterService;
