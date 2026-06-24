/**
 * Session Center Service — خدمة مركز الجلسات العلاجية
 * ════════════════════════════════════════════════════════════════════════════
 * Compatibility wrapper over the unified DDD Sessions Session-Center surface
 * (/api/v1/sessions/session-center/*). Keeps the existing method signatures so
 * SessionCenterPage callers continue to work.
 */
import { sessionCenterAPI } from './ddd';

const unwrap = res => res?.data?.data ?? res?.data;

export const getDashboard = (params = {}) =>
  sessionCenterAPI.dashboard(params).then(r => unwrap(r));

export const getCalendarSlots = (params = {}) =>
  sessionCenterAPI.calendar(params).then(r => unwrap(r) || []);

export const getTherapistLoad = (params = {}) =>
  sessionCenterAPI.therapistLoad(params).then(r => unwrap(r) || []);

export const getAttendanceReport = (params = {}) =>
  sessionCenterAPI.attendance(params).then(r => unwrap(r));

export const getEpisodeSessions = episodeId =>
  sessionCenterAPI.episodeSessions(episodeId).then(r => unwrap(r));

export const getBeneficiarySessions = (beneficiaryId, params = {}) =>
  sessionCenterAPI.beneficiarySessions(beneficiaryId, params).then(r => unwrap(r));

export const getGoalsProgress = episodeId =>
  sessionCenterAPI.goalsProgress(episodeId).then(r => unwrap(r) || []);

export const getSOAPSummary = sessionId => sessionCenterAPI.soap(sessionId).then(r => unwrap(r));

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
