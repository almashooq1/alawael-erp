/**
 * DDD Unified API Service Layer — طبقة خدمات API الموحدة
 *
 * توفر واجهة مركزية للتواصل مع جميع مجالات DDD في الباك إند
 * تستخدم api.client.js الموجود كعميل HTTP
 */

import apiClient from '../api.client';

/* ═══════════════════════════════════════════════════════════
 *  1. CORE — نواة المستفيد
 * ═══════════════════════════════════════════════════════════ */
export const coreAPI = {
  // Beneficiaries
  create: data => apiClient.post('/api/v1/core/beneficiaries', data),
  list: params => apiClient.get('/api/v1/core/beneficiaries', { params }),
  get: id => apiClient.get(`/api/v1/core/beneficiaries/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/core/beneficiaries/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/core/beneficiaries/${id}`),
  search: params => apiClient.get('/api/v1/core/beneficiaries/search', { params }),
  getStats: params => apiClient.get('/api/v1/core/beneficiaries/stats', { params }),
  // Admin operations
  updateStatus: (id, status, reason = '') =>
    apiClient.patch(`/api/v1/core/beneficiaries/${id}/status`, { status, reason }),
  bulkAction: (action, ids, payload = {}) =>
    apiClient.post('/api/v1/core/beneficiaries/bulk-action', { action, ids, payload }),
  getRecent: (limit = 5) =>
    apiClient.get('/api/v1/core/beneficiaries/recent', { params: { limit } }),
  export: params =>
    apiClient.get('/api/v1/core/beneficiaries/export', { params, responseType: 'blob' }),
  archive: (id, reason) => apiClient.post(`/api/v1/core/beneficiaries/${id}/archive`, { reason }),
  unarchive: id => apiClient.post(`/api/v1/core/beneficiaries/${id}/unarchive`),
  getAtRisk: (limit = 50) =>
    apiClient.get('/api/v1/core/beneficiaries/at-risk', { params: { limit } }),
  getCities: () => apiClient.get('/api/v1/core/beneficiaries/cities'),
  // Episode-center compatibility (legacy facade /api/v1/beneficiary-core)
  getDashboard: () => apiClient.get('/api/v1/core/beneficiaries/dashboard'),
  listEpisodeCenter: params =>
    apiClient.get('/api/v1/core/beneficiaries/episode-center', { params }),
  getEpisodeCenterProfile: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/episode-center`),
  // 360° Profile — paths match domains/core/routes/beneficiary360.routes.js
  get360: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360`),
  get360Widget: (id, widget) =>
    apiClient.get(`/api/v1/core/beneficiaries/${id}/360/widget/${widget}`),
  get360Summary: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/summary`),
  get360Clinical: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/clinical`),
  get360Operational: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/operational`),
  get360Family: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/family`),
  // Focused widget aliases — each uses the dedicated widget param / sub-route
  get360Timeline: (id, params) =>
    apiClient.get(`/api/v1/core/beneficiaries/${id}/360/widget/timeline`, { params }),
  get360Risks: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/widget/alerts`),
  get360Recommendations: id => apiClient.get(`/api/v1/core/beneficiaries/${id}/360/widget/goals`),
};

/* ═══════════════════════════════════════════════════════════
 *  2. EPISODES — حلقات الرعاية
 * ═══════════════════════════════════════════════════════════ */
export const episodesAPI = {
  create: data => apiClient.post('/api/v1/episodes', data),
  list: params => apiClient.get('/api/v1/episodes', { params }),
  get: id => apiClient.get(`/api/v1/episodes/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/episodes/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/episodes/${id}`),
  advancePhase: (id, notes = '') =>
    apiClient.post(`/api/v1/episodes/${id}/advance-phase`, { notes }),
  updateStatus: (id, status, reason = '') =>
    apiClient.patch(`/api/v1/episodes/${id}/status`, { status, reason }),
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/episodes/beneficiary/${beneficiaryId}`, { params }),
  getActiveEpisode: beneficiaryId =>
    apiClient.get(`/api/v1/episodes/beneficiary/${beneficiaryId}/active`),
  getStatistics: params => apiClient.get('/api/v1/episodes/statistics', { params }),
  getDashboard: params => apiClient.get('/api/v1/episodes/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  3. TIMELINE — الخط الزمني
 * ═══════════════════════════════════════════════════════════ */
export const timelineAPI = {
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/timeline/beneficiary/${beneficiaryId}`, { params }),
  getByEpisode: (episodeId, params) =>
    apiClient.get(`/api/v1/timeline/episode/${episodeId}`, { params }),
  addEvent: data => apiClient.post('/api/v1/timeline', data),
  getEvent: id => apiClient.get(`/api/v1/timeline/${id}`),
};

/* ═══════════════════════════════════════════════════════════
 *  4. ASSESSMENTS — التقييمات السريرية
 * ═══════════════════════════════════════════════════════════ */
export const assessmentsAPI = {
  create: data => apiClient.post('/api/v1/assessments', data),
  list: params => apiClient.get('/api/v1/assessments', { params }),
  get: id => apiClient.get(`/api/v1/assessments/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/assessments/${id}`, data),
  complete: (id, data) => apiClient.put(`/api/v1/assessments/${id}/complete`, data),
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/assessments/beneficiary/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/api/v1/assessments/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  5. CARE PLANS — خطط الرعاية
 * ═══════════════════════════════════════════════════════════ */
export const carePlansAPI = {
  create: data => apiClient.post('/api/v1/care-plans', data),
  list: params => apiClient.get('/api/v1/care-plans', { params }),
  get: id => apiClient.get(`/api/v1/care-plans/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/care-plans/${id}`, data),
  activate: id => apiClient.put(`/api/v1/care-plans/${id}/activate`),
  complete: id => apiClient.put(`/api/v1/care-plans/${id}/complete`),
  addGoal: (id, data) => apiClient.post(`/api/v1/care-plans/${id}/goals`, data),
  getByBeneficiary: beneficiaryId =>
    apiClient.get(`/api/v1/care-plans/beneficiary/${beneficiaryId}`),
  getDashboard: params => apiClient.get('/api/v1/care-plans/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  6. SESSIONS — الجلسات السريرية
 * ═══════════════════════════════════════════════════════════ */
export const sessionsAPI = {
  create: data => apiClient.post('/api/v1/sessions', data),
  list: params => apiClient.get('/api/v1/sessions', { params }),
  get: id => apiClient.get(`/api/v1/sessions/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/sessions/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/sessions/${id}`),
  complete: (id, data) => apiClient.put(`/api/v1/sessions/${id}/complete`, data),
  cancel: (id, data) => apiClient.put(`/api/v1/sessions/${id}/cancel`, data),
  updateStatus: (id, status, reason = '') =>
    apiClient.patch(`/api/v1/sessions/${id}/status`, { status, reason }),
  attend: id => apiClient.post(`/api/v1/sessions/${id}/attend`),
  start: id => apiClient.post(`/api/v1/sessions/${id}/start`),
  noShow: (id, reason = '') => apiClient.post(`/api/v1/sessions/${id}/no-show`, { reason }),
  reschedule: (id, data) => apiClient.patch(`/api/v1/sessions/${id}/reschedule`, data),
  bulkReschedule: body => apiClient.post('/api/v1/sessions/bulk-reschedule', body),
  getDocumentation: id => apiClient.get(`/api/v1/sessions/${id}/documentation`),
  saveDocumentation: (id, data) => apiClient.put(`/api/v1/sessions/${id}/documentation`, data),
  getStats: params => apiClient.get('/api/v1/sessions/stats', { params }),
  getToday: params => apiClient.get('/api/v1/sessions/today', { params }),
  getStatistics: params => apiClient.get('/api/v1/sessions/statistics', { params }),
  getAvailability: (therapistId, params) =>
    apiClient.get(`/api/v1/sessions/availability/${therapistId}`, { params }),
  getUpcoming: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/sessions/upcoming/${beneficiaryId}`, { params }),
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/sessions/beneficiary/${beneficiaryId}`, { params }),
  getByTherapist: (therapistId, params) =>
    apiClient.get(`/api/v1/sessions/therapist/${therapistId}`, { params }),
  getEpisodeSessions: (episodeId, params) =>
    apiClient.get(`/api/v1/sessions/episode/${episodeId}`, { params }),
  getTherapistSchedule: (therapistId, params) =>
    apiClient.get(`/api/v1/sessions/therapist/${therapistId}/schedule`, { params }),
  getDashboard: params => apiClient.get('/api/v1/sessions/dashboard', { params }),
  // Sessions Analytics (compat /api/v1/therapy-sessions-analytics)
  analytics: {
    overview: params => apiClient.get('/api/v1/sessions/analytics/overview', { params }),
    trends: params => apiClient.get('/api/v1/sessions/analytics/trends', { params }),
    therapistPerformance: params =>
      apiClient.get('/api/v1/sessions/analytics/therapist-performance', { params }),
    roomUtilization: params =>
      apiClient.get('/api/v1/sessions/analytics/room-utilization', { params }),
    attendance: params => apiClient.get('/api/v1/sessions/analytics/attendance', { params }),
    billing: params => apiClient.get('/api/v1/sessions/analytics/billing', { params }),
    goalProgress: params => apiClient.get('/api/v1/sessions/analytics/goal-progress', { params }),
    cancellations: params => apiClient.get('/api/v1/sessions/analytics/cancellations', { params }),
    calendar: params => apiClient.get('/api/v1/sessions/analytics/calendar', { params }),
    exportReport: data => apiClient.post('/api/v1/sessions/analytics/export/report', data),
    waitlist: params => apiClient.get('/api/v1/sessions/analytics/waitlist', { params }),
    sessionBilling: sessionId => apiClient.get(`/api/v1/sessions/analytics/${sessionId}/billing`),
    bulkBilling: data => apiClient.post('/api/v1/sessions/analytics/billing/bulk', data),
  },
  // Session Center analytics (compat /api/v1/session-center)
  sessionCenter: {
    dashboard: params => apiClient.get('/api/v1/sessions/session-center/dashboard', { params }),
    calendar: params => apiClient.get('/api/v1/sessions/session-center/calendar', { params }),
    therapistLoad: params =>
      apiClient.get('/api/v1/sessions/session-center/therapist-load', { params }),
    attendance: params => apiClient.get('/api/v1/sessions/session-center/attendance', { params }),
    episodeSessions: episodeId =>
      apiClient.get(`/api/v1/sessions/session-center/episode/${episodeId}`),
    beneficiarySessions: (beneficiaryId, params) =>
      apiClient.get(`/api/v1/sessions/session-center/beneficiary/${beneficiaryId}`, { params }),
    goalsProgress: episodeId => apiClient.get(`/api/v1/sessions/session-center/goals/${episodeId}`),
    soapSummary: sessionId => apiClient.get(`/api/v1/sessions/session-center/soap/${sessionId}`),
  },
  // Admin therapy sessions (compat /api/admin/therapy-sessions)
  admin: {
    list: params => apiClient.get('/api/v1/sessions/admin', { params }),
    get: id => apiClient.get(`/api/v1/sessions/admin/${id}`),
    create: data => apiClient.post('/api/v1/sessions/admin', data),
    update: (id, data) => apiClient.patch(`/api/v1/sessions/admin/${id}`, data),
    delete: id => apiClient.delete(`/api/v1/sessions/admin/${id}`),
    getStats: params => apiClient.get('/api/v1/sessions/admin/stats', { params }),
    getCalendar: params => apiClient.get('/api/v1/sessions/admin/calendar', { params }),
    checkConflicts: data => apiClient.post('/api/v1/sessions/admin/conflicts', data),
    updateStatus: (id, data) => apiClient.post(`/api/v1/sessions/admin/${id}/status`, data),
    checkIn: id => apiClient.post(`/api/v1/sessions/admin/${id}/check-in`, {}),
    finalize: id => apiClient.post(`/api/v1/sessions/admin/${id}/finalize`, {}),
    amend: (id, data) => apiClient.post(`/api/v1/sessions/admin/${id}/amend`, data),
    createClaim: (id, data) => apiClient.post(`/api/v1/sessions/admin/${id}/create-claim`, data),
    bulkCreateClaims: data => apiClient.post('/api/v1/sessions/admin/bulk-create-claims', data),
  },
  // Therapist portal sessions (compat /api/v1/therapist/sessions & /schedule)
  therapist: {
    list: params => apiClient.get('/api/v1/sessions/therapist/sessions', { params }),
    create: data => apiClient.post('/api/v1/sessions/therapist/sessions', data),
    get: id => apiClient.get(`/api/v1/sessions/therapist/sessions/${id}`),
    update: (id, data) => apiClient.put(`/api/v1/sessions/therapist/sessions/${id}`, data),
    delete: id => apiClient.delete(`/api/v1/sessions/therapist/sessions/${id}`),
    getDocumentation: id =>
      apiClient.get(`/api/v1/sessions/therapist/sessions/${id}/documentation`),
    saveDocumentation: (id, data) =>
      apiClient.post(`/api/v1/sessions/therapist/sessions/${id}/documentation`, data),
    getSchedule: params => apiClient.get('/api/v1/sessions/therapist/schedule', { params }),
    createSchedule: data => apiClient.post('/api/v1/sessions/therapist/schedule', data),
    updateSchedule: (id, data) => apiClient.put(`/api/v1/sessions/therapist/schedule/${id}`, data),
    deleteSchedule: id => apiClient.delete(`/api/v1/sessions/therapist/schedule/${id}`),
  },
};

/* ═══════════════════════════════════════════════════════════
 *  7. GOALS + MEASURES — الأهداف ومكتبة المقاييس
 * ═══════════════════════════════════════════════════════════ */
export const goalsAPI = {
  // Therapeutic Goals
  create: data => apiClient.post('/api/v1/goals/goals', data),
  list: params => apiClient.get('/api/v1/goals/goals', { params }),
  get: id => apiClient.get(`/api/v1/goals/goals/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/goals/goals/${id}`, data),
  recordProgress: (id, data) => apiClient.post(`/api/v1/goals/goals/${id}/progress`, data),
  getByBeneficiary: beneficiaryId =>
    apiClient.get(`/api/v1/goals/goals/beneficiary/${beneficiaryId}`),
  // Measures Library
  measures: {
    list: params => apiClient.get('/api/v1/goals/measures', { params }),
    get: id => apiClient.get(`/api/v1/goals/measures/${id}`),
    create: data => apiClient.post('/api/v1/goals/measures', data),
    apply: data => apiClient.post('/api/v1/goals/measures/apply', data),
    getApplications: beneficiaryId =>
      apiClient.get(`/api/v1/goals/measures/applications/${beneficiaryId}`),
    score: (applicationId, data) =>
      apiClient.post(`/api/v1/goals/measures/applications/${applicationId}/score`, data),
    history: (beneficiaryId, measureId) =>
      apiClient.get(`/api/v1/goals/measures/history/${beneficiaryId}/${measureId}`),
    beneficiarySummary: beneficiaryId =>
      apiClient.get(`/api/v1/goals/measures/beneficiary/${beneficiaryId}/summary`),
    crossCompare: beneficiaryId =>
      apiClient.get(`/api/v1/goals/measures/beneficiary/${beneficiaryId}/cross-compare`),
    recommendations: beneficiaryId =>
      apiClient.get(`/api/v1/goals/measures/recommendations/${beneficiaryId}`),
    overdueReapplications: params =>
      apiClient.get('/api/v1/goals/measures/overdue-reapplications', { params }),
    dashboard: measureId => apiClient.get(`/api/v1/goals/measures/${measureId}/dashboard`),
  },
};

/* ═══════════════════════════════════════════════════════════
 *  8. WORKFLOW — سير العمل
 * ═══════════════════════════════════════════════════════════ */
export const workflowAPI = {
  // Journey
  start: data => apiClient.post('/api/v1/workflow/journey/start', data),
  transition: (episodeId, data) =>
    apiClient.post(`/api/v1/workflow/journey/${episodeId}/transition`, data),
  getJourney: episodeId => apiClient.get(`/api/v1/workflow/journey/${episodeId}`),
  // Tasks
  createTask: data => apiClient.post('/api/v1/workflow/tasks', data),
  listTasks: params => apiClient.get('/api/v1/workflow/tasks', { params }),
  getTask: id => apiClient.get(`/api/v1/workflow/tasks/${id}`),
  updateTask: (id, data) => apiClient.put(`/api/v1/workflow/tasks/${id}`, data),
  completeTask: (id, data) => apiClient.put(`/api/v1/workflow/tasks/${id}/complete`, data),
  // Audit
  getTransitionLog: episodeId => apiClient.get(`/api/v1/workflow/audit/${episodeId}`),
  getDashboard: params => apiClient.get('/api/v1/workflow/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  9. PROGRAMS — مكتبة البرامج
 * ═══════════════════════════════════════════════════════════ */
export const programsAPI = {
  create: data => apiClient.post('/api/v1/programs', data),
  list: params => apiClient.get('/api/v1/programs', { params }),
  get: id => apiClient.get(`/api/v1/programs/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/programs/${id}`, data),
  enroll: (id, data) => apiClient.post(`/api/v1/programs/${id}/enroll`, data),
  getEnrollments: id => apiClient.get(`/api/v1/programs/${id}/enrollments`),
  updateProgress: (enrollmentId, data) =>
    apiClient.put(`/api/v1/programs/enrollments/${enrollmentId}/progress`, data),
  getRecommendations: beneficiaryId =>
    apiClient.get(`/api/v1/programs/recommendations/${beneficiaryId}`),
  getDashboard: params => apiClient.get('/api/v1/programs/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  10. AI RECOMMENDATIONS — التوصيات الذكية
 * ═══════════════════════════════════════════════════════════ */
export const aiRecommendationsAPI = {
  // Recommendations — paths match domains/ai-recommendations/routes/recommendations.routes.js
  generate: beneficiaryId =>
    apiClient.post(`/api/v1/ai-recommendations/risk/calculate/${beneficiaryId}`),
  list: params => apiClient.get('/api/v1/ai-recommendations/risk/high-risk', { params }),
  get: beneficiaryId =>
    apiClient.get(`/api/v1/ai-recommendations/recommendations/${beneficiaryId}`),
  accept: id =>
    apiClient.post(`/api/v1/ai-recommendations/recommendations/${id}/respond`, {
      action: 'accepted',
    }),
  dismiss: (id, data) =>
    apiClient.post(`/api/v1/ai-recommendations/recommendations/${id}/respond`, {
      action: 'dismissed',
      note: data?.reason,
    }),
  getByBeneficiary: beneficiaryId =>
    apiClient.get(`/api/v1/ai-recommendations/recommendations/${beneficiaryId}`),
  // Risk Scores
  calculateRisk: beneficiaryId =>
    apiClient.post(`/api/v1/ai-recommendations/risk/calculate/${beneficiaryId}`),
  getRiskScore: beneficiaryId =>
    apiClient.get(`/api/v1/ai-recommendations/risk/latest/${beneficiaryId}`),
  getRiskHistory: (beneficiaryId, limit = 20) =>
    apiClient.get(`/api/v1/ai-recommendations/risk/history/${beneficiaryId}`, {
      params: { limit },
    }),
  getRiskDashboard: params => apiClient.get('/api/v1/ai-recommendations/dashboard', { params }),
  // Recommendation lifecycle
  getAllRecommendations: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/ai-recommendations/recommendations/${beneficiaryId}/all`, { params }),
  markViewed: id => apiClient.post(`/api/v1/ai-recommendations/recommendations/${id}/view`),
  rate: (id, data) => apiClient.post(`/api/v1/ai-recommendations/recommendations/${id}/rate`, data),
  // Therapist priorities & rules
  getTherapistPriorities: therapistId =>
    apiClient.get(`/api/v1/ai-recommendations/priorities/${therapistId}`),
  listRules: () => apiClient.get('/api/v1/ai-recommendations/rules'),
};

/* ═══════════════════════════════════════════════════════════
 *  11. QUALITY — الجودة والامتثال
 * ═══════════════════════════════════════════════════════════ */
export const qualityAPI = {
  // Audits
  createAudit: data => apiClient.post('/api/v1/quality/audits', data),
  listAudits: params => apiClient.get('/api/v1/quality/audits', { params }),
  getAudit: id => apiClient.get(`/api/v1/quality/audits/${id}`),
  runAudit: (type, params) => apiClient.post(`/api/v1/quality/audits/run/${type}`, params),
  // Corrective Actions
  createAction: data => apiClient.post('/api/v1/quality/actions', data),
  listActions: params => apiClient.get('/api/v1/quality/actions', { params }),
  getAction: id => apiClient.get(`/api/v1/quality/actions/${id}`),
  updateAction: (id, data) => apiClient.put(`/api/v1/quality/actions/${id}`, data),
  closeAction: (id, data) => apiClient.put(`/api/v1/quality/actions/${id}/close`, data),
  getDashboard: params => apiClient.get('/api/v1/quality/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  12. FAMILY — بوابة الأسرة
 * ═══════════════════════════════════════════════════════════ */
export const familyAPI = {
  // Members
  addMember: data => apiClient.post('/api/v1/family/members', data),
  listMembers: beneficiaryId => apiClient.get(`/api/v1/family/members/${beneficiaryId}`),
  updateMember: (id, data) => apiClient.put(`/api/v1/family/members/${id}`, data),
  // Communications
  send: data => apiClient.post('/api/v1/family/communications', data),
  listCommunications: params => apiClient.get('/api/v1/family/communications', { params }),
  getCommunication: id => apiClient.get(`/api/v1/family/communications/${id}`),
  markRead: id => apiClient.put(`/api/v1/family/communications/${id}/read`),
  getDashboard: params => apiClient.get('/api/v1/family/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  13. REPORTS — محرك التقارير
 * ═══════════════════════════════════════════════════════════ */
export const reportsAPI = {
  // Templates
  createTemplate: data => apiClient.post('/api/v1/reports/templates', data),
  listTemplates: params => apiClient.get('/api/v1/reports/templates', { params }),
  getTemplate: id => apiClient.get(`/api/v1/reports/templates/${id}`),
  // Generate
  generate: data => apiClient.post('/api/v1/reports/generate', data),
  listGenerated: params => apiClient.get('/api/v1/reports/generated', { params }),
  getGenerated: id => apiClient.get(`/api/v1/reports/generated/${id}`),
  download: id =>
    apiClient.get(`/api/v1/reports/generated/${id}/download`, { responseType: 'blob' }),
  // Built-in
  getBuiltinList: () => apiClient.get('/api/v1/reports/builtin'),
  runBuiltin: (reportId, params) => apiClient.post(`/api/v1/reports/builtin/${reportId}`, params),
  getDashboard: params => apiClient.get('/api/v1/reports/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  14. GROUP THERAPY — العلاج الجماعي
 * ═══════════════════════════════════════════════════════════ */
export const groupTherapyAPI = {
  // Groups
  create: data => apiClient.post('/api/v1/group-therapy', data),
  list: params => apiClient.get('/api/v1/group-therapy', { params }),
  get: id => apiClient.get(`/api/v1/group-therapy/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/group-therapy/${id}`, data),
  getByBeneficiary: beneficiaryId =>
    apiClient.get(`/api/v1/group-therapy/beneficiary/${beneficiaryId}`),
  // Members
  addMember: (groupId, data) => apiClient.post(`/api/v1/group-therapy/${groupId}/members`, data),
  withdrawMember: (groupId, beneficiaryId, data) =>
    apiClient.post(`/api/v1/group-therapy/${groupId}/members/${beneficiaryId}/withdraw`, data),
  // Sessions
  createSession: (groupId, data) =>
    apiClient.post(`/api/v1/group-therapy/${groupId}/sessions`, data),
  listSessions: (groupId, params) =>
    apiClient.get(`/api/v1/group-therapy/${groupId}/sessions`, { params }),
  getSession: sessionId => apiClient.get(`/api/v1/group-therapy/sessions/${sessionId}`),
  completeSession: (sessionId, data) =>
    apiClient.put(`/api/v1/group-therapy/sessions/${sessionId}/complete`, data),
  getDashboard: params => apiClient.get('/api/v1/group-therapy/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  15. TELE-REHAB — التأهيل عن بُعد
 * ═══════════════════════════════════════════════════════════ */
export const teleRehabAPI = {
  schedule: data => apiClient.post('/api/v1/tele-rehab', data),
  list: params => apiClient.get('/api/v1/tele-rehab', { params }),
  get: id => apiClient.get(`/api/v1/tele-rehab/${id}`),
  start: id => apiClient.put(`/api/v1/tele-rehab/${id}/start`),
  complete: (id, data) => apiClient.put(`/api/v1/tele-rehab/${id}/complete`, data),
  cancel: (id, data) => apiClient.put(`/api/v1/tele-rehab/${id}/cancel`, data),
  recordQuality: (id, data) => apiClient.put(`/api/v1/tele-rehab/${id}/quality`, data),
  submitSatisfaction: (id, data) => apiClient.put(`/api/v1/tele-rehab/${id}/satisfaction`, data),
  getDashboard: params => apiClient.get('/api/v1/tele-rehab/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  16. AR/VR — تأهيل الواقع الافتراضي / المعزز
 * ═══════════════════════════════════════════════════════════ */
export const arVrAPI = {
  create: data => apiClient.post('/api/v1/ar-vr', data),
  list: params => apiClient.get('/api/v1/ar-vr', { params }),
  get: id => apiClient.get(`/api/v1/ar-vr/${id}`),
  start: id => apiClient.put(`/api/v1/ar-vr/${id}/start`),
  pause: id => apiClient.put(`/api/v1/ar-vr/${id}/pause`),
  resume: id => apiClient.put(`/api/v1/ar-vr/${id}/resume`),
  complete: (id, data) => apiClient.put(`/api/v1/ar-vr/${id}/complete`, data),
  abort: (id, data) => apiClient.put(`/api/v1/ar-vr/${id}/abort`, data),
  recordSafety: (id, data) => apiClient.put(`/api/v1/ar-vr/${id}/safety`, data),
  getProgress: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/ar-vr/progress/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/api/v1/ar-vr/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  17. BEHAVIOR — إدارة السلوك
 * ═══════════════════════════════════════════════════════════ */
export const behaviorAPI = {
  // Records
  createRecord: data => apiClient.post('/api/v1/behavior/records', data),
  listRecords: params => apiClient.get('/api/v1/behavior/records', { params }),
  getRecord: id => apiClient.get(`/api/v1/behavior/records/${id}`),
  reviewRecord: (id, data) => apiClient.put(`/api/v1/behavior/records/${id}/review`, data),
  // Plans
  createPlan: data => apiClient.post('/api/v1/behavior/plans', data),
  listPlans: params => apiClient.get('/api/v1/behavior/plans', { params }),
  getPlan: id => apiClient.get(`/api/v1/behavior/plans/${id}`),
  updatePlan: (id, data) => apiClient.put(`/api/v1/behavior/plans/${id}`, data),
  approvePlan: id => apiClient.put(`/api/v1/behavior/plans/${id}/approve`),
  addPlanReview: (id, data) => apiClient.post(`/api/v1/behavior/plans/${id}/reviews`, data),
  // Analytics
  getAnalytics: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/behavior/analytics/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/api/v1/behavior/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  18. RESEARCH — البحث السريري
 * ═══════════════════════════════════════════════════════════ */
export const researchAPI = {
  create: data => apiClient.post('/api/v1/research', data),
  list: params => apiClient.get('/api/v1/research', { params }),
  get: id => apiClient.get(`/api/v1/research/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/research/${id}`, data),
  transitionStatus: (id, data) => apiClient.put(`/api/v1/research/${id}/status`, data),
  // Participants
  enrollParticipant: (studyId, data) =>
    apiClient.post(`/api/v1/research/${studyId}/participants`, data),
  withdrawParticipant: (studyId, beneficiaryId, data) =>
    apiClient.post(`/api/v1/research/${studyId}/participants/${beneficiaryId}/withdraw`, data),
  recordConsent: (studyId, beneficiaryId, data) =>
    apiClient.put(`/api/v1/research/${studyId}/participants/${beneficiaryId}/consent`, data),
  // Extras
  addMilestone: (studyId, data) => apiClient.post(`/api/v1/research/${studyId}/milestones`, data),
  addPublication: (studyId, data) =>
    apiClient.post(`/api/v1/research/${studyId}/publications`, data),
  getDashboard: params => apiClient.get('/api/v1/research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  19. FIELD TRAINING — التدريب الميداني
 * ═══════════════════════════════════════════════════════════ */
export const fieldTrainingAPI = {
  // Programs
  createProgram: data => apiClient.post('/api/v1/field-training/programs', data),
  listPrograms: params => apiClient.get('/api/v1/field-training/programs', { params }),
  getProgram: id => apiClient.get(`/api/v1/field-training/programs/${id}`),
  updateProgram: (id, data) => apiClient.put(`/api/v1/field-training/programs/${id}`, data),
  // Trainees
  enrollTrainee: (programId, data) =>
    apiClient.post(`/api/v1/field-training/programs/${programId}/trainees`, data),
  listTrainees: params => apiClient.get('/api/v1/field-training/trainees', { params }),
  getTrainee: id => apiClient.get(`/api/v1/field-training/trainees/${id}`),
  logHours: (traineeId, data) =>
    apiClient.post(`/api/v1/field-training/trainees/${traineeId}/hours`, data),
  addEvaluation: (traineeId, data) =>
    apiClient.post(`/api/v1/field-training/trainees/${traineeId}/evaluations`, data),
  addSupervision: (traineeId, data) =>
    apiClient.post(`/api/v1/field-training/trainees/${traineeId}/supervision`, data),
  addObservation: (traineeId, data) =>
    apiClient.post(`/api/v1/field-training/trainees/${traineeId}/observations`, data),
  updateCompetency: (traineeId, name, data) =>
    apiClient.put(`/api/v1/field-training/trainees/${traineeId}/competencies/${name}`, data),
  assignCaseload: (traineeId, data) =>
    apiClient.post(`/api/v1/field-training/trainees/${traineeId}/caseload`, data),
  completeTraining: (traineeId, data) =>
    apiClient.put(`/api/v1/field-training/trainees/${traineeId}/complete`, data),
  getDashboard: params => apiClient.get('/api/v1/field-training/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  20. DASHBOARDS & DECISION SUPPORT — لوحات المعلومات ودعم القرار
 * ═══════════════════════════════════════════════════════════ */
export const dashboardsAPI = {
  // Executive Summary
  getExecutiveSummary: params => apiClient.get('/api/v1/dashboards/executive-summary', { params }),
  // Dashboard Configs
  createConfig: data => apiClient.post('/api/v1/dashboards/configs', data),
  listConfigs: params => apiClient.get('/api/v1/dashboards/configs', { params }),
  getConfig: id => apiClient.get(`/api/v1/dashboards/configs/${id}`),
  updateConfig: (id, data) => apiClient.put(`/api/v1/dashboards/configs/${id}`, data),
  deleteConfig: id => apiClient.delete(`/api/v1/dashboards/configs/${id}`),
  addWidget: (dashboardId, data) =>
    apiClient.post(`/api/v1/dashboards/configs/${dashboardId}/widgets`, data),
  removeWidget: (dashboardId, widgetId) =>
    apiClient.delete(`/api/v1/dashboards/configs/${dashboardId}/widgets/${widgetId}`),
  updateLayout: (dashboardId, data) =>
    apiClient.put(`/api/v1/dashboards/configs/${dashboardId}/layout`, data),
  // KPIs
  createKPI: data => apiClient.post('/api/v1/dashboards/kpis', data),
  listKPIs: params => apiClient.get('/api/v1/dashboards/kpis', { params }),
  getKPI: id => apiClient.get(`/api/v1/dashboards/kpis/${id}`),
  updateKPI: (id, data) => apiClient.put(`/api/v1/dashboards/kpis/${id}`, data),
  getLatestKPIs: params => apiClient.get('/api/v1/dashboards/kpis/latest', { params }),
  recordSnapshot: (kpiId, data) =>
    apiClient.post(`/api/v1/dashboards/kpis/${kpiId}/snapshots`, data),
  getKPITrend: (kpiId, params) =>
    apiClient.get(`/api/v1/dashboards/kpis/${kpiId}/trend`, { params }),
  // Alerts
  createAlert: data => apiClient.post('/api/v1/dashboards/alerts', data),
  listAlerts: params => apiClient.get('/api/v1/dashboards/alerts', { params }),
  getAlert: id => apiClient.get(`/api/v1/dashboards/alerts/${id}`),
  acknowledgeAlert: id => apiClient.put(`/api/v1/dashboards/alerts/${id}/acknowledge`),
  resolveAlert: (id, data) => apiClient.put(`/api/v1/dashboards/alerts/${id}/resolve`, data),
  dismissAlert: (id, data) => apiClient.put(`/api/v1/dashboards/alerts/${id}/dismiss`, data),
  escalateAlert: (id, data) => apiClient.put(`/api/v1/dashboards/alerts/${id}/escalate`, data),
  assignAlert: (id, data) => apiClient.put(`/api/v1/dashboards/alerts/${id}/assign`, data),
  getAlertAnalytics: params => apiClient.get('/api/v1/dashboards/alerts/analytics', { params }),
  // Decision Support Engine
  listRules: () => apiClient.get('/api/v1/dashboards/decision/rules'),
  runAllRules: params => apiClient.post('/api/v1/dashboards/decision/run-all', null, { params }),
  runRule: (ruleId, params) =>
    apiClient.post(`/api/v1/dashboards/decision/run/${ruleId}`, null, { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  21. WORKFORCE ANALYTICS — تحليلات القوى العاملة
 * ═══════════════════════════════════════════════════════════ */
export const workforceAnalyticsAPI = {
  create: data => apiClient.post('/api/v1/workforce-analytics', data),
  list: params => apiClient.get('/api/v1/workforce-analytics', { params }),
  get: id => apiClient.get(`/api/v1/workforce-analytics/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/workforce-analytics/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/workforce-analytics/${id}`),
  getDashboard: params => apiClient.get('/api/v1/workforce-analytics/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  22. CREDENTIAL MANAGER — إدارة الشهادات والاعتمادات
 * ═══════════════════════════════════════════════════════════ */
export const credentialManagerAPI = {
  create: data => apiClient.post('/api/v1/credential-manager', data),
  list: params => apiClient.get('/api/v1/credential-manager', { params }),
  get: id => apiClient.get(`/api/v1/credential-manager/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/credential-manager/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/credential-manager/${id}`),
  getDashboard: params => apiClient.get('/api/v1/credential-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  23. MENTORSHIP PROGRAM — برنامج التوجيه والإرشاد
 * ═══════════════════════════════════════════════════════════ */
export const mentorshipProgramAPI = {
  create: data => apiClient.post('/api/v1/mentorship-program', data),
  list: params => apiClient.get('/api/v1/mentorship-program', { params }),
  get: id => apiClient.get(`/api/v1/mentorship-program/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/mentorship-program/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/mentorship-program/${id}`),
  getDashboard: params => apiClient.get('/api/v1/mentorship-program/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  24. CAREER PATHWAY — المسارات المهنية
 * ═══════════════════════════════════════════════════════════ */
export const careerPathwayAPI = {
  create: data => apiClient.post('/api/v1/career-pathway', data),
  list: params => apiClient.get('/api/v1/career-pathway', { params }),
  get: id => apiClient.get(`/api/v1/career-pathway/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/career-pathway/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/career-pathway/${id}`),
  getDashboard: params => apiClient.get('/api/v1/career-pathway/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  25. ACCREDITATION MANAGER — إدارة الاعتماد المؤسسي
 * ═══════════════════════════════════════════════════════════ */
export const accreditationManagerAPI = {
  create: data => apiClient.post('/api/v1/accreditation-manager', data),
  list: params => apiClient.get('/api/v1/accreditation-manager', { params }),
  get: id => apiClient.get(`/api/v1/accreditation-manager/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/accreditation-manager/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/accreditation-manager/${id}`),
  getDashboard: params => apiClient.get('/api/v1/accreditation-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  26. INSPECTION TRACKER — متابعة التفتيش والزيارات
 * ═══════════════════════════════════════════════════════════ */
export const inspectionTrackerAPI = {
  create: data => apiClient.post('/api/v1/inspection-tracker', data),
  list: params => apiClient.get('/api/v1/inspection-tracker', { params }),
  get: id => apiClient.get(`/api/v1/inspection-tracker/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/inspection-tracker/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/inspection-tracker/${id}`),
  getDashboard: params => apiClient.get('/api/v1/inspection-tracker/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  27. STANDARDS COMPLIANCE — الامتثال للمعايير
 * ═══════════════════════════════════════════════════════════ */
export const standardsComplianceAPI = {
  create: data => apiClient.post('/api/v1/standards-compliance', data),
  list: params => apiClient.get('/api/v1/standards-compliance', { params }),
  get: id => apiClient.get(`/api/v1/standards-compliance/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/standards-compliance/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/standards-compliance/${id}`),
  getDashboard: params => apiClient.get('/api/v1/standards-compliance/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  28. LICENSURE MANAGER — إدارة التراخيص
 * ═══════════════════════════════════════════════════════════ */
export const licensureManagerAPI = {
  create: data => apiClient.post('/api/v1/licensure-manager', data),
  list: params => apiClient.get('/api/v1/licensure-manager', { params }),
  get: id => apiClient.get(`/api/v1/licensure-manager/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/licensure-manager/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/licensure-manager/${id}`),
  getDashboard: params => apiClient.get('/api/v1/licensure-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  29. PATIENT PORTAL — بوابة المريض
 * ═══════════════════════════════════════════════════════════ */
export const patientPortalAPI = {
  create: data => apiClient.post('/api/v1/patient-portal', data),
  list: params => apiClient.get('/api/v1/patient-portal', { params }),
  get: id => apiClient.get(`/api/v1/patient-portal/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/patient-portal/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/patient-portal/${id}`),
  getDashboard: params => apiClient.get('/api/v1/patient-portal/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  30. HEALTH EDUCATION — التثقيف الصحي
 * ═══════════════════════════════════════════════════════════ */
export const healthEducationAPI = {
  create: data => apiClient.post('/api/v1/health-education', data),
  list: params => apiClient.get('/api/v1/health-education', { params }),
  get: id => apiClient.get(`/api/v1/health-education/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/health-education/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/health-education/${id}`),
  getDashboard: params => apiClient.get('/api/v1/health-education/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  31. REMOTE MONITORING — المراقبة عن بُعد
 * ═══════════════════════════════════════════════════════════ */
export const remoteMonitoringAPI = {
  create: data => apiClient.post('/api/v1/remote-monitoring', data),
  list: params => apiClient.get('/api/v1/remote-monitoring', { params }),
  get: id => apiClient.get(`/api/v1/remote-monitoring/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/remote-monitoring/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/remote-monitoring/${id}`),
  getDashboard: params => apiClient.get('/api/v1/remote-monitoring/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  32. PATIENT COMMUNITY — مجتمع المرضى
 * ═══════════════════════════════════════════════════════════ */
export const patientCommunityAPI = {
  create: data => apiClient.post('/api/v1/patient-community', data),
  list: params => apiClient.get('/api/v1/patient-community', { params }),
  get: id => apiClient.get(`/api/v1/patient-community/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/patient-community/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/patient-community/${id}`),
  getDashboard: params => apiClient.get('/api/v1/patient-community/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  33. FHIR INTEGRATION — تكامل FHIR
 * ═══════════════════════════════════════════════════════════ */
export const fhirIntegrationAPI = {
  create: data => apiClient.post('/api/v1/fhir-integration', data),
  list: params => apiClient.get('/api/v1/fhir-integration', { params }),
  get: id => apiClient.get(`/api/v1/fhir-integration/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/fhir-integration/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/fhir-integration/${id}`),
  getDashboard: params => apiClient.get('/api/v1/fhir-integration/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  34. HL7 MESSAGING — رسائل HL7
 * ═══════════════════════════════════════════════════════════ */
export const hl7MessagingAPI = {
  create: data => apiClient.post('/api/v1/hl7-messaging', data),
  list: params => apiClient.get('/api/v1/hl7-messaging', { params }),
  get: id => apiClient.get(`/api/v1/hl7-messaging/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/hl7-messaging/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/hl7-messaging/${id}`),
  getDashboard: params => apiClient.get('/api/v1/hl7-messaging/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  35. DATA EXCHANGE — تبادل البيانات
 * ═══════════════════════════════════════════════════════════ */
export const dataExchangeAPI = {
  create: data => apiClient.post('/api/v1/data-exchange', data),
  list: params => apiClient.get('/api/v1/data-exchange', { params }),
  get: id => apiClient.get(`/api/v1/data-exchange/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/data-exchange/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/data-exchange/${id}`),
  getDashboard: params => apiClient.get('/api/v1/data-exchange/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  36. INTEROPERABILITY HUB — مركز التشغيل البيني
 * ═══════════════════════════════════════════════════════════ */
export const interoperabilityHubAPI = {
  create: data => apiClient.post('/api/v1/interoperability-hub', data),
  list: params => apiClient.get('/api/v1/interoperability-hub', { params }),
  get: id => apiClient.get(`/api/v1/interoperability-hub/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/interoperability-hub/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/interoperability-hub/${id}`),
  getDashboard: params => apiClient.get('/api/v1/interoperability-hub/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  37. BACKUP MANAGER — إدارة النسخ الاحتياطي
 * ═══════════════════════════════════════════════════════════ */
export const backupManagerAPI = {
  create: data => apiClient.post('/api/v1/backup-manager', data),
  list: params => apiClient.get('/api/v1/backup-manager', { params }),
  get: id => apiClient.get(`/api/v1/backup-manager/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/backup-manager/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/backup-manager/${id}`),
  getDashboard: params => apiClient.get('/api/v1/backup-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  38. BUSINESS CONTINUITY — استمرارية الأعمال
 * ═══════════════════════════════════════════════════════════ */
export const businessContinuityAPI = {
  create: data => apiClient.post('/api/v1/business-continuity', data),
  list: params => apiClient.get('/api/v1/business-continuity', { params }),
  get: id => apiClient.get(`/api/v1/business-continuity/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/business-continuity/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/business-continuity/${id}`),
  getDashboard: params => apiClient.get('/api/v1/business-continuity/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  39. SYSTEM FAILOVER — تجاوز الأعطال
 * ═══════════════════════════════════════════════════════════ */
export const systemFailoverAPI = {
  create: data => apiClient.post('/api/v1/system-failover', data),
  list: params => apiClient.get('/api/v1/system-failover', { params }),
  get: id => apiClient.get(`/api/v1/system-failover/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/system-failover/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/system-failover/${id}`),
  getDashboard: params => apiClient.get('/api/v1/system-failover/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  40. INCIDENT RESPONSE — الاستجابة للحوادث
 * ═══════════════════════════════════════════════════════════ */
export const incidentResponseAPI = {
  create: data => apiClient.post('/api/v1/incident-response', data),
  list: params => apiClient.get('/api/v1/incident-response', { params }),
  get: id => apiClient.get(`/api/v1/incident-response/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/incident-response/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/incident-response/${id}`),
  getDashboard: params => apiClient.get('/api/v1/incident-response/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  41. EQUIPMENT LIFECYCLE — دورة حياة المعدات
 * ═══════════════════════════════════════════════════════════ */
export const equipmentLifecycleAPI = {
  create: data => apiClient.post('/api/v1/equipment-lifecycle', data),
  list: params => apiClient.get('/api/v1/equipment-lifecycle', { params }),
  get: id => apiClient.get(`/api/v1/equipment-lifecycle/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/equipment-lifecycle/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/equipment-lifecycle/${id}`),
  getDashboard: params => apiClient.get('/api/v1/equipment-lifecycle/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  42. ENVIRONMENTAL MONITORING — المراقبة البيئية
 * ═══════════════════════════════════════════════════════════ */
export const environmentalMonitoringAPI = {
  create: data => apiClient.post('/api/v1/environmental-monitoring', data),
  list: params => apiClient.get('/api/v1/environmental-monitoring', { params }),
  get: id => apiClient.get(`/api/v1/environmental-monitoring/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/environmental-monitoring/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/environmental-monitoring/${id}`),
  getDashboard: params => apiClient.get('/api/v1/environmental-monitoring/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  43. SPACE MANAGEMENT — إدارة المساحات والمرافق
 * ═══════════════════════════════════════════════════════════ */
export const spaceManagementAPI = {
  create: data => apiClient.post('/api/v1/space-management', data),
  list: params => apiClient.get('/api/v1/space-management', { params }),
  get: id => apiClient.get(`/api/v1/space-management/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/space-management/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/space-management/${id}`),
  getDashboard: params => apiClient.get('/api/v1/space-management/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  44. ASSET TRACKING — تتبع الأصول
 * ═══════════════════════════════════════════════════════════ */
export const assetTrackingAPI = {
  create: data => apiClient.post('/api/v1/asset-tracking', data),
  list: params => apiClient.get('/api/v1/asset-tracking', { params }),
  get: id => apiClient.get(`/api/v1/asset-tracking/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/asset-tracking/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/asset-tracking/${id}`),
  getDashboard: params => apiClient.get('/api/v1/asset-tracking/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  45. CLINICAL RESEARCH (Advanced) — البحث السريري المتقدم
 * ═══════════════════════════════════════════════════════════ */
export const clinicalResearchAPI = {
  create: data => apiClient.post('/api/v1/clinical-research', data),
  list: params => apiClient.get('/api/v1/clinical-research', { params }),
  get: id => apiClient.get(`/api/v1/clinical-research/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/clinical-research/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/clinical-research/${id}`),
  getDashboard: params => apiClient.get('/api/v1/clinical-research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  46. CLINICAL TRIALS — التجارب السريرية
 * ═══════════════════════════════════════════════════════════ */
export const clinicalTrialsAPI = {
  create: data => apiClient.post('/api/v1/clinical-trials', data),
  list: params => apiClient.get('/api/v1/clinical-trials', { params }),
  get: id => apiClient.get(`/api/v1/clinical-trials/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/clinical-trials/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/clinical-trials/${id}`),
  getDashboard: params => apiClient.get('/api/v1/clinical-trials/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  47. OUTCOME RESEARCH — بحوث النتائج
 * ═══════════════════════════════════════════════════════════ */
export const outcomeResearchAPI = {
  create: data => apiClient.post('/api/v1/outcome-research', data),
  list: params => apiClient.get('/api/v1/outcome-research', { params }),
  get: id => apiClient.get(`/api/v1/outcome-research/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/outcome-research/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/outcome-research/${id}`),
  getDashboard: params => apiClient.get('/api/v1/outcome-research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  48. PUBLICATION MANAGER — إدارة المنشورات العلمية
 * ═══════════════════════════════════════════════════════════ */
export const publicationManagerAPI = {
  create: data => apiClient.post('/api/v1/publication-manager', data),
  list: params => apiClient.get('/api/v1/publication-manager', { params }),
  get: id => apiClient.get(`/api/v1/publication-manager/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/publication-manager/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/publication-manager/${id}`),
  getDashboard: params => apiClient.get('/api/v1/publication-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  49. VOLUNTEER MANAGEMENT — إدارة المتطوعين
 * ═══════════════════════════════════════════════════════════ */
export const volunteerManagementAPI = {
  create: data => apiClient.post('/api/v1/volunteer-management', data),
  list: params => apiClient.get('/api/v1/volunteer-management', { params }),
  get: id => apiClient.get(`/api/v1/volunteer-management/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/volunteer-management/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/volunteer-management/${id}`),
  getDashboard: params => apiClient.get('/api/v1/volunteer-management/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  50. COMMUNITY OUTREACH — التواصل المجتمعي
 * ═══════════════════════════════════════════════════════════ */
export const communityOutreachAPI = {
  create: data => apiClient.post('/api/v1/community-outreach', data),
  list: params => apiClient.get('/api/v1/community-outreach', { params }),
  get: id => apiClient.get(`/api/v1/community-outreach/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/community-outreach/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/community-outreach/${id}`),
  getDashboard: params => apiClient.get('/api/v1/community-outreach/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  51. DONOR RELATIONS — علاقات المانحين
 * ═══════════════════════════════════════════════════════════ */
export const donorRelationsAPI = {
  create: data => apiClient.post('/api/v1/donor-relations', data),
  list: params => apiClient.get('/api/v1/donor-relations', { params }),
  get: id => apiClient.get(`/api/v1/donor-relations/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/donor-relations/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/donor-relations/${id}`),
  getDashboard: params => apiClient.get('/api/v1/donor-relations/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  52. ADVOCACY PROGRAM — برنامج المناصرة
 * ═══════════════════════════════════════════════════════════ */
export const advocacyProgramAPI = {
  create: data => apiClient.post('/api/v1/advocacy-program', data),
  list: params => apiClient.get('/api/v1/advocacy-program', { params }),
  get: id => apiClient.get(`/api/v1/advocacy-program/${id}`),
  update: (id, data) => apiClient.put(`/api/v1/advocacy-program/${id}`, data),
  remove: id => apiClient.delete(`/api/v1/advocacy-program/${id}`),
  getDashboard: params => apiClient.get('/api/v1/advocacy-program/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  53. REHAB MEASURES — مكتبة مقاييس التأهيل والتقييم الذكي
 * ═══════════════════════════════════════════════════════════ */
export const rehabMeasuresAPI = {
  /** قائمة جميع المقاييس (مع فلترة category / population / search) */
  list: params => apiClient.get('/api/v1/rehab-measures/catalog', { params }),
  /** تفاصيل مقياس واحد بمفتاحه مثل GMFCS أو FIM */
  get: key => apiClient.get(`/api/v1/rehab-measures/catalog/${key}`),
  /** فئات المقاييس مع عدد المقاييس في كل فئة */
  categories: () => apiClient.get('/api/v1/rehab-measures/categories'),
  /** اقتراح مقاييس مناسبة حسب التشخيص والعمر */
  suggest: params => apiClient.get('/api/v1/rehab-measures/suggest', { params }),
  /** حساب نتيجة مقياس واحد { measureKey, responses, meta? } */
  score: data => apiClient.post('/api/v1/rehab-measures/score', data),
  /** حساب بطارية مقاييس { assessments: [...], beneficiary? } */
  scoreBattery: data => apiClient.post('/api/v1/rehab-measures/score-battery', data),
  /** تحليل التقدم الزمني لمقياس { sessions: [{ date, responses }] } */
  analyzeProgress: (measureKey, data) =>
    apiClient.post(`/api/v1/rehab-measures/progress/${measureKey}`, data),
  /** بناء خطة تقييم شاملة { diagnosis, age } */
  buildPlan: data => apiClient.post('/api/v1/rehab-measures/assessment-plan', data),
  /** توليد ملخص سريري { batteryResult, beneficiary } */
  clinicalSummary: data => apiClient.post('/api/v1/rehab-measures/clinical-summary', data),
  /** توليد أهداف SMART { tier, context? } */
  generateGoals: (measureKey, data) =>
    apiClient.post(`/api/v1/rehab-measures/goals/${measureKey}`, data),
};

/* ═══════════════════════════════════════════════════════════
 *  54. REHAB TEMPLATES — قوالب برامج التأهيل المستندة للأدلة
 * ═══════════════════════════════════════════════════════════ */
export const rehabTemplatesAPI = {
  /** قائمة جميع القوالب (ملخص) */
  list: () => apiClient.get('/api/v1/rehab-templates'),
  /** تفاصيل قالب واحد بمفتاحه */
  get: key => apiClient.get(`/api/v1/rehab-templates/${key}`),
  /** اقتراح قوالب مناسبة { diagnosis, age, functionalLevel? } */
  match: data => apiClient.post('/api/v1/rehab-templates/match', data),
  /** بناء خطة جلسات مخصصة { beneficiary, startDate? } */
  buildPlan: (key, data) => apiClient.post(`/api/v1/rehab-templates/${key}/build-plan`, data),
};

/* ═══════════════════════════════════════════════════════════
 *  55. ACTIVITY LIBRARY — مكتبة الأنشطة التأهيلية (المرحلة 27)
 * ═══════════════════════════════════════════════════════════ */
export const activityLibraryAPI = {
  /** قائمة الأنشطة مع فلترة (discipline, domain, difficulty, ageMin, ageMax, search) */
  list: params => apiClient.get('/api/v1/activity-library/activities', { params }),
  /** التخصصات المتاحة */
  disciplines: () => apiClient.get('/api/v1/activity-library/activities/disciplines'),
  /** إحصائيات المكتبة */
  stats: () => apiClient.get('/api/v1/activity-library/activities/stats'),
  /** تفاصيل نشاط واحد */
  get: id => apiClient.get(`/api/v1/activity-library/activities/${id}`),
  /** زرع الأنشطة الافتراضية (admin) */
  seed: () => apiClient.post('/api/v1/activity-library/activities/seed'),
  /** إضافة نشاط مخصص */
  create: data => apiClient.post('/api/v1/activity-library/activities', data),
  /** تسجيل استخدام نشاط في جلسة */
  recordUse: (id, data) => apiClient.post(`/api/v1/activity-library/activities/${id}/use`, data),
  /** تحديث نشاط */
  update: (id, data) => apiClient.patch(`/api/v1/activity-library/activities/${id}`, data),
};

/* ═══════════════════════════════════════════════════════════
 *  56. SESSION CENTER — مركز الجلسات العلاجية
 * ═══════════════════════════════════════════════════════════ */
export const sessionCenterAPI = {
  /** لوحة تحكم: KPIs + توزيعات + اتجاهات */
  dashboard: params => apiClient.get('/api/v1/sessions/session-center/dashboard', { params }),
  /** فتحات التقويم (year, month, therapistId?, beneficiaryId?) */
  calendar: params => apiClient.get('/api/v1/sessions/session-center/calendar', { params }),
  /** حمل المعالجين (from, to, therapistId?) */
  therapistLoad: params =>
    apiClient.get('/api/v1/sessions/session-center/therapist-load', { params }),
  /** تقرير الحضور (from, to, beneficiaryId?, therapistId?) */
  attendance: params => apiClient.get('/api/v1/sessions/session-center/attendance', { params }),
  /** جلسات حلقة علاجية + ميتاداتا التقدم */
  episodeSessions: episodeId =>
    apiClient.get(`/api/v1/sessions/session-center/episode/${episodeId}`),
  /** تاريخ جلسات مستفيد معين */
  beneficiarySessions: (beneficiaryId, params) =>
    apiClient.get(`/api/v1/sessions/session-center/beneficiary/${beneficiaryId}`, { params }),
  /** تقدم الأهداف لحلقة علاجية */
  goalsProgress: episodeId => apiClient.get(`/api/v1/sessions/session-center/goals/${episodeId}`),
  /** ملخص SOAP لجلسة واحدة */
  soap: sessionId => apiClient.get(`/api/v1/sessions/session-center/soap/${sessionId}`),
};

/* ═══════════════════════════════════════════════════════════
 *  57. MEASURES LIBRARY — مكتبة المقاييس الموحدة
 * ═══════════════════════════════════════════════════════════ */
export const measuresLibraryAPI = {
  /** إحصائيات المكتبة */
  dashboard: () => apiClient.get('/api/v1/measures-library/dashboard'),
  /** قائمة المقاييس مع بحث وفلترة */
  list: params => apiClient.get('/api/v1/measures-library', { params }),
  /** اقتراح مقاييس بناءً على السياق */
  suggest: params => apiClient.get('/api/v1/measures-library/suggest', { params }),
  /** تفاصيل مقياس + إحصائيات الاستخدام */
  get: id => apiClient.get(`/api/v1/measures-library/${id}`),
  /** دليل التسجيل والتفسير */
  scoringGuide: id => apiClient.get(`/api/v1/measures-library/${id}/scoring`),
  /** إضافة مقياس جديد */
  create: data => apiClient.post('/api/v1/measures-library', data),
  /** تحديث مقياس */
  update: (id, data) => apiClient.put(`/api/v1/measures-library/${id}`, data),
};

/* ─── Section 59: Goal Bank — بنك الأهداف التأهيلية ─────────── */
export const goalBankAPI = {
  /** قائمة الأهداف مع فلترة (domain, category, difficulty, ageMin, ageMax, search) */
  list: params => apiClient.get('/api/v1/goal-bank', { params }),
  /** المجالات المتاحة مع عدد الأهداف */
  domains: () => apiClient.get('/api/v1/goal-bank/domains'),
  /** تفاصيل هدف واحد */
  get: id => apiClient.get(`/api/v1/goal-bank/${id}`),
  /** إنشاء هدف جديد */
  create: data => apiClient.post('/api/v1/goal-bank', data),
  /** تحديث هدف */
  update: (id, data) => apiClient.put(`/api/v1/goal-bank/${id}`, data),
  /** حذف هدف */
  delete: id => apiClient.delete(`/api/v1/goal-bank/${id}`),
};

/* ─── Section 60: Report Center — مركز التقارير السريرية ──────── */
export const reportCenterAPI = {
  /** الملخص التنفيذي */
  executive: params => apiClient.get('/api/v1/report-center/executive', { params }),
  /** المؤشرات السريرية الرئيسية */
  clinicalKPIs: params => apiClient.get('/api/v1/report-center/clinical-kpis', { params }),
  /** تقرير المستفيدين */
  beneficiaries: params => apiClient.get('/api/v1/report-center/beneficiaries', { params }),
  /** تقرير الجلسات */
  sessions: params => apiClient.get('/api/v1/report-center/sessions', { params }),
  /** تقرير مخرجات التأهيل */
  outcomes: params => apiClient.get('/api/v1/report-center/outcomes', { params }),
  /** مؤشرات الجودة */
  quality: params => apiClient.get('/api/v1/report-center/quality', { params }),
  /** تقرير التخريج */
  discharge: params => apiClient.get('/api/v1/report-center/discharge', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  UNIFIED EXPORT — تصدير موحد
 * ═══════════════════════════════════════════════════════════ */
const dddAPI = {
  core: coreAPI,
  episodes: episodesAPI,
  timeline: timelineAPI,
  assessments: assessmentsAPI,
  carePlans: carePlansAPI,
  sessions: sessionsAPI,
  goals: goalsAPI,
  workflow: workflowAPI,
  programs: programsAPI,
  aiRecommendations: aiRecommendationsAPI,
  quality: qualityAPI,
  family: familyAPI,
  reports: reportsAPI,
  groupTherapy: groupTherapyAPI,
  teleRehab: teleRehabAPI,
  arVr: arVrAPI,
  behavior: behaviorAPI,
  research: researchAPI,
  fieldTraining: fieldTrainingAPI,
  dashboards: dashboardsAPI,
  // Phase 29 – Workforce Development
  workforceAnalytics: workforceAnalyticsAPI,
  credentialManager: credentialManagerAPI,
  mentorshipProgram: mentorshipProgramAPI,
  careerPathway: careerPathwayAPI,
  // Phase 30 – Accreditation & Compliance
  accreditationManager: accreditationManagerAPI,
  inspectionTracker: inspectionTrackerAPI,
  standardsCompliance: standardsComplianceAPI,
  licensureManager: licensureManagerAPI,
  // Phase 31 – Patient Engagement
  patientPortal: patientPortalAPI,
  healthEducation: healthEducationAPI,
  remoteMonitoring: remoteMonitoringAPI,
  patientCommunity: patientCommunityAPI,
  // Phase 32 – Interoperability
  fhirIntegration: fhirIntegrationAPI,
  hl7Messaging: hl7MessagingAPI,
  dataExchange: dataExchangeAPI,
  interoperabilityHub: interoperabilityHubAPI,
  // Phase 33 – Disaster Recovery
  backupManager: backupManagerAPI,
  businessContinuity: businessContinuityAPI,
  systemFailover: systemFailoverAPI,
  incidentResponse: incidentResponseAPI,
  // Phase 34 – Facility & Asset
  equipmentLifecycle: equipmentLifecycleAPI,
  environmentalMonitoring: environmentalMonitoringAPI,
  spaceManagement: spaceManagementAPI,
  assetTracking: assetTrackingAPI,
  // Phase 35 – Clinical Research
  clinicalResearch: clinicalResearchAPI,
  clinicalTrials: clinicalTrialsAPI,
  outcomeResearch: outcomeResearchAPI,
  publicationManager: publicationManagerAPI,
  // Phase 36 – Community Engagement
  volunteerManagement: volunteerManagementAPI,
  communityOutreach: communityOutreachAPI,
  donorRelations: donorRelationsAPI,
  advocacyProgram: advocacyProgramAPI,
  // Rehab Measures Library & Smart Assessment Engine
  rehabMeasures: rehabMeasuresAPI,
  rehabTemplates: rehabTemplatesAPI,
  // Activity Library — Phase 27
  activityLibrary: activityLibraryAPI,
  // Clinical Core — Session Center + Measures Library
  sessionCenter: sessionCenterAPI,
  measuresLibrary: measuresLibraryAPI,
  // Goal Bank — بنك الأهداف التأهيلية الذكية
  goalBank: goalBankAPI,
  // Report Center — مركز التقارير السريرية الموحدة
  reportCenter: reportCenterAPI,
};

export default dddAPI;
