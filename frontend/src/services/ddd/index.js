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
  create: data => apiClient.post('/core/beneficiaries', data),
  list: params => apiClient.get('/core/beneficiaries', { params }),
  get: id => apiClient.get(`/core/beneficiaries/${id}`),
  update: (id, data) => apiClient.put(`/core/beneficiaries/${id}`, data),
  remove: id => apiClient.delete(`/core/beneficiaries/${id}`),
  search: params => apiClient.get('/core/beneficiaries/search', { params }),
  getStats: params => apiClient.get('/core/beneficiaries/stats', { params }),
  // 360° Profile
  get360: id => apiClient.get(`/core/360/${id}`),
  get360Widget: (id, widget) => apiClient.get(`/core/360/${id}/${widget}`),
  get360Summary: id => apiClient.get(`/core/360/${id}/summary`),
  get360Timeline: (id, params) => apiClient.get(`/core/360/${id}/timeline`, { params }),
  get360Risks: id => apiClient.get(`/core/360/${id}/risks`),
  get360Recommendations: id => apiClient.get(`/core/360/${id}/recommendations`),
};

/* ═══════════════════════════════════════════════════════════
 *  2. EPISODES — حلقات الرعاية
 * ═══════════════════════════════════════════════════════════ */
export const episodesAPI = {
  create: data => apiClient.post('/episodes', data),
  list: params => apiClient.get('/episodes', { params }),
  get: id => apiClient.get(`/episodes/${id}`),
  update: (id, data) => apiClient.put(`/episodes/${id}`, data),
  transition: (id, data) => apiClient.put(`/episodes/${id}/transition`, data),
  addNote: (id, data) => apiClient.post(`/episodes/${id}/notes`, data),
  getByBeneficiary: beneficiaryId => apiClient.get(`/episodes/beneficiary/${beneficiaryId}`),
  getDashboard: params => apiClient.get('/episodes/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  3. TIMELINE — الخط الزمني
 * ═══════════════════════════════════════════════════════════ */
export const timelineAPI = {
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/timeline/beneficiary/${beneficiaryId}`, { params }),
  getByEpisode: (episodeId, params) => apiClient.get(`/timeline/episode/${episodeId}`, { params }),
  addEvent: data => apiClient.post('/timeline', data),
  getEvent: id => apiClient.get(`/timeline/${id}`),
};

/* ═══════════════════════════════════════════════════════════
 *  4. ASSESSMENTS — التقييمات السريرية
 * ═══════════════════════════════════════════════════════════ */
export const assessmentsAPI = {
  create: data => apiClient.post('/assessments', data),
  list: params => apiClient.get('/assessments', { params }),
  get: id => apiClient.get(`/assessments/${id}`),
  update: (id, data) => apiClient.put(`/assessments/${id}`, data),
  complete: (id, data) => apiClient.put(`/assessments/${id}/complete`, data),
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/assessments/beneficiary/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/assessments/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  5. CARE PLANS — خطط الرعاية
 * ═══════════════════════════════════════════════════════════ */
export const carePlansAPI = {
  create: data => apiClient.post('/care-plans', data),
  list: params => apiClient.get('/care-plans', { params }),
  get: id => apiClient.get(`/care-plans/${id}`),
  update: (id, data) => apiClient.put(`/care-plans/${id}`, data),
  activate: id => apiClient.put(`/care-plans/${id}/activate`),
  complete: id => apiClient.put(`/care-plans/${id}/complete`),
  addGoal: (id, data) => apiClient.post(`/care-plans/${id}/goals`, data),
  getByBeneficiary: beneficiaryId => apiClient.get(`/care-plans/beneficiary/${beneficiaryId}`),
  getDashboard: params => apiClient.get('/care-plans/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  6. SESSIONS — الجلسات السريرية
 * ═══════════════════════════════════════════════════════════ */
export const sessionsAPI = {
  create: data => apiClient.post('/sessions', data),
  list: params => apiClient.get('/sessions', { params }),
  get: id => apiClient.get(`/sessions/${id}`),
  update: (id, data) => apiClient.put(`/sessions/${id}`, data),
  complete: (id, data) => apiClient.put(`/sessions/${id}/complete`, data),
  cancel: (id, data) => apiClient.put(`/sessions/${id}/cancel`, data),
  getByBeneficiary: (beneficiaryId, params) =>
    apiClient.get(`/sessions/beneficiary/${beneficiaryId}`, { params }),
  getByTherapist: (therapistId, params) =>
    apiClient.get(`/sessions/therapist/${therapistId}`, { params }),
  getDashboard: params => apiClient.get('/sessions/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  7. GOALS + MEASURES — الأهداف ومكتبة المقاييس
 * ═══════════════════════════════════════════════════════════ */
export const goalsAPI = {
  // Therapeutic Goals
  create: data => apiClient.post('/goals/goals', data),
  list: params => apiClient.get('/goals/goals', { params }),
  get: id => apiClient.get(`/goals/goals/${id}`),
  update: (id, data) => apiClient.put(`/goals/goals/${id}`, data),
  recordProgress: (id, data) => apiClient.post(`/goals/goals/${id}/progress`, data),
  getByBeneficiary: beneficiaryId => apiClient.get(`/goals/goals/beneficiary/${beneficiaryId}`),
  // Measures Library
  measures: {
    list: params => apiClient.get('/goals/measures', { params }),
    get: id => apiClient.get(`/goals/measures/${id}`),
    create: data => apiClient.post('/goals/measures', data),
    apply: data => apiClient.post('/goals/measures/apply', data),
    getApplications: beneficiaryId =>
      apiClient.get(`/goals/measures/applications/${beneficiaryId}`),
    score: (applicationId, data) =>
      apiClient.post(`/goals/measures/applications/${applicationId}/score`, data),
  },
};

/* ═══════════════════════════════════════════════════════════
 *  8. WORKFLOW — سير العمل
 * ═══════════════════════════════════════════════════════════ */
export const workflowAPI = {
  // Journey
  start: data => apiClient.post('/workflow/journey/start', data),
  transition: (episodeId, data) =>
    apiClient.post(`/workflow/journey/${episodeId}/transition`, data),
  getJourney: episodeId => apiClient.get(`/workflow/journey/${episodeId}`),
  // Tasks
  createTask: data => apiClient.post('/workflow/tasks', data),
  listTasks: params => apiClient.get('/workflow/tasks', { params }),
  getTask: id => apiClient.get(`/workflow/tasks/${id}`),
  updateTask: (id, data) => apiClient.put(`/workflow/tasks/${id}`, data),
  completeTask: (id, data) => apiClient.put(`/workflow/tasks/${id}/complete`, data),
  // Audit
  getTransitionLog: episodeId => apiClient.get(`/workflow/audit/${episodeId}`),
  getDashboard: params => apiClient.get('/workflow/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  9. PROGRAMS — مكتبة البرامج
 * ═══════════════════════════════════════════════════════════ */
export const programsAPI = {
  create: data => apiClient.post('/programs', data),
  list: params => apiClient.get('/programs', { params }),
  get: id => apiClient.get(`/programs/${id}`),
  update: (id, data) => apiClient.put(`/programs/${id}`, data),
  enroll: (id, data) => apiClient.post(`/programs/${id}/enroll`, data),
  getEnrollments: id => apiClient.get(`/programs/${id}/enrollments`),
  updateProgress: (enrollmentId, data) =>
    apiClient.put(`/programs/enrollments/${enrollmentId}/progress`, data),
  getRecommendations: beneficiaryId => apiClient.get(`/programs/recommendations/${beneficiaryId}`),
  getDashboard: params => apiClient.get('/programs/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  10. AI RECOMMENDATIONS — التوصيات الذكية
 * ═══════════════════════════════════════════════════════════ */
export const aiRecommendationsAPI = {
  // Recommendations
  generate: beneficiaryId => apiClient.post(`/ai-recommendations/generate/${beneficiaryId}`),
  list: params => apiClient.get('/ai-recommendations', { params }),
  get: id => apiClient.get(`/ai-recommendations/${id}`),
  accept: id => apiClient.put(`/ai-recommendations/${id}/accept`),
  dismiss: (id, data) => apiClient.put(`/ai-recommendations/${id}/dismiss`, data),
  getByBeneficiary: beneficiaryId =>
    apiClient.get(`/ai-recommendations/beneficiary/${beneficiaryId}`),
  // Risk Scores
  calculateRisk: beneficiaryId => apiClient.post(`/ai-recommendations/risk/${beneficiaryId}`),
  getRiskScore: beneficiaryId => apiClient.get(`/ai-recommendations/risk/${beneficiaryId}`),
  getRiskDashboard: params => apiClient.get('/ai-recommendations/risk/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  11. QUALITY — الجودة والامتثال
 * ═══════════════════════════════════════════════════════════ */
export const qualityAPI = {
  // Audits
  createAudit: data => apiClient.post('/quality/audits', data),
  listAudits: params => apiClient.get('/quality/audits', { params }),
  getAudit: id => apiClient.get(`/quality/audits/${id}`),
  runAudit: (type, params) => apiClient.post(`/quality/audits/run/${type}`, params),
  // Corrective Actions
  createAction: data => apiClient.post('/quality/actions', data),
  listActions: params => apiClient.get('/quality/actions', { params }),
  getAction: id => apiClient.get(`/quality/actions/${id}`),
  updateAction: (id, data) => apiClient.put(`/quality/actions/${id}`, data),
  closeAction: (id, data) => apiClient.put(`/quality/actions/${id}/close`, data),
  getDashboard: params => apiClient.get('/quality/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  12. FAMILY — بوابة الأسرة
 * ═══════════════════════════════════════════════════════════ */
export const familyAPI = {
  // Members
  addMember: data => apiClient.post('/family/members', data),
  listMembers: beneficiaryId => apiClient.get(`/family/members/${beneficiaryId}`),
  updateMember: (id, data) => apiClient.put(`/family/members/${id}`, data),
  // Communications
  send: data => apiClient.post('/family/communications', data),
  listCommunications: params => apiClient.get('/family/communications', { params }),
  getCommunication: id => apiClient.get(`/family/communications/${id}`),
  markRead: id => apiClient.put(`/family/communications/${id}/read`),
  getDashboard: params => apiClient.get('/family/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  13. REPORTS — محرك التقارير
 * ═══════════════════════════════════════════════════════════ */
export const reportsAPI = {
  // Templates
  createTemplate: data => apiClient.post('/reports/templates', data),
  listTemplates: params => apiClient.get('/reports/templates', { params }),
  getTemplate: id => apiClient.get(`/reports/templates/${id}`),
  // Generate
  generate: data => apiClient.post('/reports/generate', data),
  listGenerated: params => apiClient.get('/reports/generated', { params }),
  getGenerated: id => apiClient.get(`/reports/generated/${id}`),
  download: id => apiClient.get(`/reports/generated/${id}/download`, { responseType: 'blob' }),
  // Built-in
  getBuiltinList: () => apiClient.get('/reports/builtin'),
  runBuiltin: (reportId, params) => apiClient.post(`/reports/builtin/${reportId}`, params),
  getDashboard: params => apiClient.get('/reports/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  14. GROUP THERAPY — العلاج الجماعي
 * ═══════════════════════════════════════════════════════════ */
export const groupTherapyAPI = {
  // Groups
  create: data => apiClient.post('/group-therapy', data),
  list: params => apiClient.get('/group-therapy', { params }),
  get: id => apiClient.get(`/group-therapy/${id}`),
  update: (id, data) => apiClient.put(`/group-therapy/${id}`, data),
  getByBeneficiary: beneficiaryId => apiClient.get(`/group-therapy/beneficiary/${beneficiaryId}`),
  // Members
  addMember: (groupId, data) => apiClient.post(`/group-therapy/${groupId}/members`, data),
  withdrawMember: (groupId, beneficiaryId, data) =>
    apiClient.post(`/group-therapy/${groupId}/members/${beneficiaryId}/withdraw`, data),
  // Sessions
  createSession: (groupId, data) => apiClient.post(`/group-therapy/${groupId}/sessions`, data),
  listSessions: (groupId, params) =>
    apiClient.get(`/group-therapy/${groupId}/sessions`, { params }),
  getSession: sessionId => apiClient.get(`/group-therapy/sessions/${sessionId}`),
  completeSession: (sessionId, data) =>
    apiClient.put(`/group-therapy/sessions/${sessionId}/complete`, data),
  getDashboard: params => apiClient.get('/group-therapy/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  15. TELE-REHAB — التأهيل عن بُعد
 * ═══════════════════════════════════════════════════════════ */
export const teleRehabAPI = {
  schedule: data => apiClient.post('/tele-rehab', data),
  list: params => apiClient.get('/tele-rehab', { params }),
  get: id => apiClient.get(`/tele-rehab/${id}`),
  start: id => apiClient.put(`/tele-rehab/${id}/start`),
  complete: (id, data) => apiClient.put(`/tele-rehab/${id}/complete`, data),
  cancel: (id, data) => apiClient.put(`/tele-rehab/${id}/cancel`, data),
  recordQuality: (id, data) => apiClient.put(`/tele-rehab/${id}/quality`, data),
  submitSatisfaction: (id, data) => apiClient.put(`/tele-rehab/${id}/satisfaction`, data),
  getDashboard: params => apiClient.get('/tele-rehab/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  16. AR/VR — تأهيل الواقع الافتراضي / المعزز
 * ═══════════════════════════════════════════════════════════ */
export const arVrAPI = {
  create: data => apiClient.post('/ar-vr', data),
  list: params => apiClient.get('/ar-vr', { params }),
  get: id => apiClient.get(`/ar-vr/${id}`),
  start: id => apiClient.put(`/ar-vr/${id}/start`),
  pause: id => apiClient.put(`/ar-vr/${id}/pause`),
  resume: id => apiClient.put(`/ar-vr/${id}/resume`),
  complete: (id, data) => apiClient.put(`/ar-vr/${id}/complete`, data),
  abort: (id, data) => apiClient.put(`/ar-vr/${id}/abort`, data),
  recordSafety: (id, data) => apiClient.put(`/ar-vr/${id}/safety`, data),
  getProgress: (beneficiaryId, params) =>
    apiClient.get(`/ar-vr/progress/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/ar-vr/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  17. BEHAVIOR — إدارة السلوك
 * ═══════════════════════════════════════════════════════════ */
export const behaviorAPI = {
  // Records
  createRecord: data => apiClient.post('/behavior/records', data),
  listRecords: params => apiClient.get('/behavior/records', { params }),
  getRecord: id => apiClient.get(`/behavior/records/${id}`),
  reviewRecord: (id, data) => apiClient.put(`/behavior/records/${id}/review`, data),
  // Plans
  createPlan: data => apiClient.post('/behavior/plans', data),
  listPlans: params => apiClient.get('/behavior/plans', { params }),
  getPlan: id => apiClient.get(`/behavior/plans/${id}`),
  updatePlan: (id, data) => apiClient.put(`/behavior/plans/${id}`, data),
  approvePlan: id => apiClient.put(`/behavior/plans/${id}/approve`),
  addPlanReview: (id, data) => apiClient.post(`/behavior/plans/${id}/reviews`, data),
  // Analytics
  getAnalytics: (beneficiaryId, params) =>
    apiClient.get(`/behavior/analytics/${beneficiaryId}`, { params }),
  getDashboard: params => apiClient.get('/behavior/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  18. RESEARCH — البحث السريري
 * ═══════════════════════════════════════════════════════════ */
export const researchAPI = {
  create: data => apiClient.post('/research', data),
  list: params => apiClient.get('/research', { params }),
  get: id => apiClient.get(`/research/${id}`),
  update: (id, data) => apiClient.put(`/research/${id}`, data),
  transitionStatus: (id, data) => apiClient.put(`/research/${id}/status`, data),
  // Participants
  enrollParticipant: (studyId, data) => apiClient.post(`/research/${studyId}/participants`, data),
  withdrawParticipant: (studyId, beneficiaryId, data) =>
    apiClient.post(`/research/${studyId}/participants/${beneficiaryId}/withdraw`, data),
  recordConsent: (studyId, beneficiaryId, data) =>
    apiClient.put(`/research/${studyId}/participants/${beneficiaryId}/consent`, data),
  // Extras
  addMilestone: (studyId, data) => apiClient.post(`/research/${studyId}/milestones`, data),
  addPublication: (studyId, data) => apiClient.post(`/research/${studyId}/publications`, data),
  getDashboard: params => apiClient.get('/research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  19. FIELD TRAINING — التدريب الميداني
 * ═══════════════════════════════════════════════════════════ */
export const fieldTrainingAPI = {
  // Programs
  createProgram: data => apiClient.post('/field-training/programs', data),
  listPrograms: params => apiClient.get('/field-training/programs', { params }),
  getProgram: id => apiClient.get(`/field-training/programs/${id}`),
  updateProgram: (id, data) => apiClient.put(`/field-training/programs/${id}`, data),
  // Trainees
  enrollTrainee: (programId, data) =>
    apiClient.post(`/field-training/programs/${programId}/trainees`, data),
  listTrainees: params => apiClient.get('/field-training/trainees', { params }),
  getTrainee: id => apiClient.get(`/field-training/trainees/${id}`),
  logHours: (traineeId, data) =>
    apiClient.post(`/field-training/trainees/${traineeId}/hours`, data),
  addEvaluation: (traineeId, data) =>
    apiClient.post(`/field-training/trainees/${traineeId}/evaluations`, data),
  addSupervision: (traineeId, data) =>
    apiClient.post(`/field-training/trainees/${traineeId}/supervision`, data),
  addObservation: (traineeId, data) =>
    apiClient.post(`/field-training/trainees/${traineeId}/observations`, data),
  updateCompetency: (traineeId, name, data) =>
    apiClient.put(`/field-training/trainees/${traineeId}/competencies/${name}`, data),
  assignCaseload: (traineeId, data) =>
    apiClient.post(`/field-training/trainees/${traineeId}/caseload`, data),
  completeTraining: (traineeId, data) =>
    apiClient.put(`/field-training/trainees/${traineeId}/complete`, data),
  getDashboard: params => apiClient.get('/field-training/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  20. DASHBOARDS & DECISION SUPPORT — لوحات المعلومات ودعم القرار
 * ═══════════════════════════════════════════════════════════ */
export const dashboardsAPI = {
  // Executive Summary
  getExecutiveSummary: params => apiClient.get('/dashboards/executive-summary', { params }),
  // Dashboard Configs
  createConfig: data => apiClient.post('/dashboards/configs', data),
  listConfigs: params => apiClient.get('/dashboards/configs', { params }),
  getConfig: id => apiClient.get(`/dashboards/configs/${id}`),
  updateConfig: (id, data) => apiClient.put(`/dashboards/configs/${id}`, data),
  deleteConfig: id => apiClient.delete(`/dashboards/configs/${id}`),
  addWidget: (dashboardId, data) =>
    apiClient.post(`/dashboards/configs/${dashboardId}/widgets`, data),
  removeWidget: (dashboardId, widgetId) =>
    apiClient.delete(`/dashboards/configs/${dashboardId}/widgets/${widgetId}`),
  updateLayout: (dashboardId, data) =>
    apiClient.put(`/dashboards/configs/${dashboardId}/layout`, data),
  // KPIs
  createKPI: data => apiClient.post('/dashboards/kpis', data),
  listKPIs: params => apiClient.get('/dashboards/kpis', { params }),
  getKPI: id => apiClient.get(`/dashboards/kpis/${id}`),
  updateKPI: (id, data) => apiClient.put(`/dashboards/kpis/${id}`, data),
  getLatestKPIs: params => apiClient.get('/dashboards/kpis/latest', { params }),
  recordSnapshot: (kpiId, data) => apiClient.post(`/dashboards/kpis/${kpiId}/snapshots`, data),
  getKPITrend: (kpiId, params) => apiClient.get(`/dashboards/kpis/${kpiId}/trend`, { params }),
  // Alerts
  createAlert: data => apiClient.post('/dashboards/alerts', data),
  listAlerts: params => apiClient.get('/dashboards/alerts', { params }),
  getAlert: id => apiClient.get(`/dashboards/alerts/${id}`),
  acknowledgeAlert: id => apiClient.put(`/dashboards/alerts/${id}/acknowledge`),
  resolveAlert: (id, data) => apiClient.put(`/dashboards/alerts/${id}/resolve`, data),
  dismissAlert: (id, data) => apiClient.put(`/dashboards/alerts/${id}/dismiss`, data),
  escalateAlert: (id, data) => apiClient.put(`/dashboards/alerts/${id}/escalate`, data),
  assignAlert: (id, data) => apiClient.put(`/dashboards/alerts/${id}/assign`, data),
  getAlertAnalytics: params => apiClient.get('/dashboards/alerts/analytics', { params }),
  // Decision Support Engine
  listRules: () => apiClient.get('/dashboards/decision/rules'),
  runAllRules: params => apiClient.post('/dashboards/decision/run-all', null, { params }),
  runRule: (ruleId, params) =>
    apiClient.post(`/dashboards/decision/run/${ruleId}`, null, { params }),
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
};

export default dddAPI;
