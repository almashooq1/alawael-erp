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
 *  21. WORKFORCE ANALYTICS — تحليلات القوى العاملة
 * ═══════════════════════════════════════════════════════════ */
export const workforceAnalyticsAPI = {
  create: data => apiClient.post('/workforce-analytics', data),
  list: params => apiClient.get('/workforce-analytics', { params }),
  get: id => apiClient.get(`/workforce-analytics/${id}`),
  update: (id, data) => apiClient.put(`/workforce-analytics/${id}`, data),
  remove: id => apiClient.delete(`/workforce-analytics/${id}`),
  getDashboard: params => apiClient.get('/workforce-analytics/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  22. CREDENTIAL MANAGER — إدارة الشهادات والاعتمادات
 * ═══════════════════════════════════════════════════════════ */
export const credentialManagerAPI = {
  create: data => apiClient.post('/credential-manager', data),
  list: params => apiClient.get('/credential-manager', { params }),
  get: id => apiClient.get(`/credential-manager/${id}`),
  update: (id, data) => apiClient.put(`/credential-manager/${id}`, data),
  remove: id => apiClient.delete(`/credential-manager/${id}`),
  getDashboard: params => apiClient.get('/credential-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  23. MENTORSHIP PROGRAM — برنامج التوجيه والإرشاد
 * ═══════════════════════════════════════════════════════════ */
export const mentorshipProgramAPI = {
  create: data => apiClient.post('/mentorship-program', data),
  list: params => apiClient.get('/mentorship-program', { params }),
  get: id => apiClient.get(`/mentorship-program/${id}`),
  update: (id, data) => apiClient.put(`/mentorship-program/${id}`, data),
  remove: id => apiClient.delete(`/mentorship-program/${id}`),
  getDashboard: params => apiClient.get('/mentorship-program/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  24. CAREER PATHWAY — المسارات المهنية
 * ═══════════════════════════════════════════════════════════ */
export const careerPathwayAPI = {
  create: data => apiClient.post('/career-pathway', data),
  list: params => apiClient.get('/career-pathway', { params }),
  get: id => apiClient.get(`/career-pathway/${id}`),
  update: (id, data) => apiClient.put(`/career-pathway/${id}`, data),
  remove: id => apiClient.delete(`/career-pathway/${id}`),
  getDashboard: params => apiClient.get('/career-pathway/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  25. ACCREDITATION MANAGER — إدارة الاعتماد المؤسسي
 * ═══════════════════════════════════════════════════════════ */
export const accreditationManagerAPI = {
  create: data => apiClient.post('/accreditation-manager', data),
  list: params => apiClient.get('/accreditation-manager', { params }),
  get: id => apiClient.get(`/accreditation-manager/${id}`),
  update: (id, data) => apiClient.put(`/accreditation-manager/${id}`, data),
  remove: id => apiClient.delete(`/accreditation-manager/${id}`),
  getDashboard: params => apiClient.get('/accreditation-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  26. INSPECTION TRACKER — متابعة التفتيش والزيارات
 * ═══════════════════════════════════════════════════════════ */
export const inspectionTrackerAPI = {
  create: data => apiClient.post('/inspection-tracker', data),
  list: params => apiClient.get('/inspection-tracker', { params }),
  get: id => apiClient.get(`/inspection-tracker/${id}`),
  update: (id, data) => apiClient.put(`/inspection-tracker/${id}`, data),
  remove: id => apiClient.delete(`/inspection-tracker/${id}`),
  getDashboard: params => apiClient.get('/inspection-tracker/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  27. STANDARDS COMPLIANCE — الامتثال للمعايير
 * ═══════════════════════════════════════════════════════════ */
export const standardsComplianceAPI = {
  create: data => apiClient.post('/standards-compliance', data),
  list: params => apiClient.get('/standards-compliance', { params }),
  get: id => apiClient.get(`/standards-compliance/${id}`),
  update: (id, data) => apiClient.put(`/standards-compliance/${id}`, data),
  remove: id => apiClient.delete(`/standards-compliance/${id}`),
  getDashboard: params => apiClient.get('/standards-compliance/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  28. LICENSURE MANAGER — إدارة التراخيص
 * ═══════════════════════════════════════════════════════════ */
export const licensureManagerAPI = {
  create: data => apiClient.post('/licensure-manager', data),
  list: params => apiClient.get('/licensure-manager', { params }),
  get: id => apiClient.get(`/licensure-manager/${id}`),
  update: (id, data) => apiClient.put(`/licensure-manager/${id}`, data),
  remove: id => apiClient.delete(`/licensure-manager/${id}`),
  getDashboard: params => apiClient.get('/licensure-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  29. PATIENT PORTAL — بوابة المريض
 * ═══════════════════════════════════════════════════════════ */
export const patientPortalAPI = {
  create: data => apiClient.post('/patient-portal', data),
  list: params => apiClient.get('/patient-portal', { params }),
  get: id => apiClient.get(`/patient-portal/${id}`),
  update: (id, data) => apiClient.put(`/patient-portal/${id}`, data),
  remove: id => apiClient.delete(`/patient-portal/${id}`),
  getDashboard: params => apiClient.get('/patient-portal/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  30. HEALTH EDUCATION — التثقيف الصحي
 * ═══════════════════════════════════════════════════════════ */
export const healthEducationAPI = {
  create: data => apiClient.post('/health-education', data),
  list: params => apiClient.get('/health-education', { params }),
  get: id => apiClient.get(`/health-education/${id}`),
  update: (id, data) => apiClient.put(`/health-education/${id}`, data),
  remove: id => apiClient.delete(`/health-education/${id}`),
  getDashboard: params => apiClient.get('/health-education/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  31. REMOTE MONITORING — المراقبة عن بُعد
 * ═══════════════════════════════════════════════════════════ */
export const remoteMonitoringAPI = {
  create: data => apiClient.post('/remote-monitoring', data),
  list: params => apiClient.get('/remote-monitoring', { params }),
  get: id => apiClient.get(`/remote-monitoring/${id}`),
  update: (id, data) => apiClient.put(`/remote-monitoring/${id}`, data),
  remove: id => apiClient.delete(`/remote-monitoring/${id}`),
  getDashboard: params => apiClient.get('/remote-monitoring/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  32. PATIENT COMMUNITY — مجتمع المرضى
 * ═══════════════════════════════════════════════════════════ */
export const patientCommunityAPI = {
  create: data => apiClient.post('/patient-community', data),
  list: params => apiClient.get('/patient-community', { params }),
  get: id => apiClient.get(`/patient-community/${id}`),
  update: (id, data) => apiClient.put(`/patient-community/${id}`, data),
  remove: id => apiClient.delete(`/patient-community/${id}`),
  getDashboard: params => apiClient.get('/patient-community/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  33. FHIR INTEGRATION — تكامل FHIR
 * ═══════════════════════════════════════════════════════════ */
export const fhirIntegrationAPI = {
  create: data => apiClient.post('/fhir-integration', data),
  list: params => apiClient.get('/fhir-integration', { params }),
  get: id => apiClient.get(`/fhir-integration/${id}`),
  update: (id, data) => apiClient.put(`/fhir-integration/${id}`, data),
  remove: id => apiClient.delete(`/fhir-integration/${id}`),
  getDashboard: params => apiClient.get('/fhir-integration/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  34. HL7 MESSAGING — رسائل HL7
 * ═══════════════════════════════════════════════════════════ */
export const hl7MessagingAPI = {
  create: data => apiClient.post('/hl7-messaging', data),
  list: params => apiClient.get('/hl7-messaging', { params }),
  get: id => apiClient.get(`/hl7-messaging/${id}`),
  update: (id, data) => apiClient.put(`/hl7-messaging/${id}`, data),
  remove: id => apiClient.delete(`/hl7-messaging/${id}`),
  getDashboard: params => apiClient.get('/hl7-messaging/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  35. DATA EXCHANGE — تبادل البيانات
 * ═══════════════════════════════════════════════════════════ */
export const dataExchangeAPI = {
  create: data => apiClient.post('/data-exchange', data),
  list: params => apiClient.get('/data-exchange', { params }),
  get: id => apiClient.get(`/data-exchange/${id}`),
  update: (id, data) => apiClient.put(`/data-exchange/${id}`, data),
  remove: id => apiClient.delete(`/data-exchange/${id}`),
  getDashboard: params => apiClient.get('/data-exchange/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  36. INTEROPERABILITY HUB — مركز التشغيل البيني
 * ═══════════════════════════════════════════════════════════ */
export const interoperabilityHubAPI = {
  create: data => apiClient.post('/interoperability-hub', data),
  list: params => apiClient.get('/interoperability-hub', { params }),
  get: id => apiClient.get(`/interoperability-hub/${id}`),
  update: (id, data) => apiClient.put(`/interoperability-hub/${id}`, data),
  remove: id => apiClient.delete(`/interoperability-hub/${id}`),
  getDashboard: params => apiClient.get('/interoperability-hub/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  37. BACKUP MANAGER — إدارة النسخ الاحتياطي
 * ═══════════════════════════════════════════════════════════ */
export const backupManagerAPI = {
  create: data => apiClient.post('/backup-manager', data),
  list: params => apiClient.get('/backup-manager', { params }),
  get: id => apiClient.get(`/backup-manager/${id}`),
  update: (id, data) => apiClient.put(`/backup-manager/${id}`, data),
  remove: id => apiClient.delete(`/backup-manager/${id}`),
  getDashboard: params => apiClient.get('/backup-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  38. BUSINESS CONTINUITY — استمرارية الأعمال
 * ═══════════════════════════════════════════════════════════ */
export const businessContinuityAPI = {
  create: data => apiClient.post('/business-continuity', data),
  list: params => apiClient.get('/business-continuity', { params }),
  get: id => apiClient.get(`/business-continuity/${id}`),
  update: (id, data) => apiClient.put(`/business-continuity/${id}`, data),
  remove: id => apiClient.delete(`/business-continuity/${id}`),
  getDashboard: params => apiClient.get('/business-continuity/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  39. SYSTEM FAILOVER — تجاوز الأعطال
 * ═══════════════════════════════════════════════════════════ */
export const systemFailoverAPI = {
  create: data => apiClient.post('/system-failover', data),
  list: params => apiClient.get('/system-failover', { params }),
  get: id => apiClient.get(`/system-failover/${id}`),
  update: (id, data) => apiClient.put(`/system-failover/${id}`, data),
  remove: id => apiClient.delete(`/system-failover/${id}`),
  getDashboard: params => apiClient.get('/system-failover/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  40. INCIDENT RESPONSE — الاستجابة للحوادث
 * ═══════════════════════════════════════════════════════════ */
export const incidentResponseAPI = {
  create: data => apiClient.post('/incident-response', data),
  list: params => apiClient.get('/incident-response', { params }),
  get: id => apiClient.get(`/incident-response/${id}`),
  update: (id, data) => apiClient.put(`/incident-response/${id}`, data),
  remove: id => apiClient.delete(`/incident-response/${id}`),
  getDashboard: params => apiClient.get('/incident-response/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  41. EQUIPMENT LIFECYCLE — دورة حياة المعدات
 * ═══════════════════════════════════════════════════════════ */
export const equipmentLifecycleAPI = {
  create: data => apiClient.post('/equipment-lifecycle', data),
  list: params => apiClient.get('/equipment-lifecycle', { params }),
  get: id => apiClient.get(`/equipment-lifecycle/${id}`),
  update: (id, data) => apiClient.put(`/equipment-lifecycle/${id}`, data),
  remove: id => apiClient.delete(`/equipment-lifecycle/${id}`),
  getDashboard: params => apiClient.get('/equipment-lifecycle/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  42. ENVIRONMENTAL MONITORING — المراقبة البيئية
 * ═══════════════════════════════════════════════════════════ */
export const environmentalMonitoringAPI = {
  create: data => apiClient.post('/environmental-monitoring', data),
  list: params => apiClient.get('/environmental-monitoring', { params }),
  get: id => apiClient.get(`/environmental-monitoring/${id}`),
  update: (id, data) => apiClient.put(`/environmental-monitoring/${id}`, data),
  remove: id => apiClient.delete(`/environmental-monitoring/${id}`),
  getDashboard: params => apiClient.get('/environmental-monitoring/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  43. SPACE MANAGEMENT — إدارة المساحات والمرافق
 * ═══════════════════════════════════════════════════════════ */
export const spaceManagementAPI = {
  create: data => apiClient.post('/space-management', data),
  list: params => apiClient.get('/space-management', { params }),
  get: id => apiClient.get(`/space-management/${id}`),
  update: (id, data) => apiClient.put(`/space-management/${id}`, data),
  remove: id => apiClient.delete(`/space-management/${id}`),
  getDashboard: params => apiClient.get('/space-management/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  44. ASSET TRACKING — تتبع الأصول
 * ═══════════════════════════════════════════════════════════ */
export const assetTrackingAPI = {
  create: data => apiClient.post('/asset-tracking', data),
  list: params => apiClient.get('/asset-tracking', { params }),
  get: id => apiClient.get(`/asset-tracking/${id}`),
  update: (id, data) => apiClient.put(`/asset-tracking/${id}`, data),
  remove: id => apiClient.delete(`/asset-tracking/${id}`),
  getDashboard: params => apiClient.get('/asset-tracking/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  45. CLINICAL RESEARCH (Advanced) — البحث السريري المتقدم
 * ═══════════════════════════════════════════════════════════ */
export const clinicalResearchAPI = {
  create: data => apiClient.post('/clinical-research', data),
  list: params => apiClient.get('/clinical-research', { params }),
  get: id => apiClient.get(`/clinical-research/${id}`),
  update: (id, data) => apiClient.put(`/clinical-research/${id}`, data),
  remove: id => apiClient.delete(`/clinical-research/${id}`),
  getDashboard: params => apiClient.get('/clinical-research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  46. CLINICAL TRIALS — التجارب السريرية
 * ═══════════════════════════════════════════════════════════ */
export const clinicalTrialsAPI = {
  create: data => apiClient.post('/clinical-trials', data),
  list: params => apiClient.get('/clinical-trials', { params }),
  get: id => apiClient.get(`/clinical-trials/${id}`),
  update: (id, data) => apiClient.put(`/clinical-trials/${id}`, data),
  remove: id => apiClient.delete(`/clinical-trials/${id}`),
  getDashboard: params => apiClient.get('/clinical-trials/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  47. OUTCOME RESEARCH — بحوث النتائج
 * ═══════════════════════════════════════════════════════════ */
export const outcomeResearchAPI = {
  create: data => apiClient.post('/outcome-research', data),
  list: params => apiClient.get('/outcome-research', { params }),
  get: id => apiClient.get(`/outcome-research/${id}`),
  update: (id, data) => apiClient.put(`/outcome-research/${id}`, data),
  remove: id => apiClient.delete(`/outcome-research/${id}`),
  getDashboard: params => apiClient.get('/outcome-research/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  48. PUBLICATION MANAGER — إدارة المنشورات العلمية
 * ═══════════════════════════════════════════════════════════ */
export const publicationManagerAPI = {
  create: data => apiClient.post('/publication-manager', data),
  list: params => apiClient.get('/publication-manager', { params }),
  get: id => apiClient.get(`/publication-manager/${id}`),
  update: (id, data) => apiClient.put(`/publication-manager/${id}`, data),
  remove: id => apiClient.delete(`/publication-manager/${id}`),
  getDashboard: params => apiClient.get('/publication-manager/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  49. VOLUNTEER MANAGEMENT — إدارة المتطوعين
 * ═══════════════════════════════════════════════════════════ */
export const volunteerManagementAPI = {
  create: data => apiClient.post('/volunteer-management', data),
  list: params => apiClient.get('/volunteer-management', { params }),
  get: id => apiClient.get(`/volunteer-management/${id}`),
  update: (id, data) => apiClient.put(`/volunteer-management/${id}`, data),
  remove: id => apiClient.delete(`/volunteer-management/${id}`),
  getDashboard: params => apiClient.get('/volunteer-management/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  50. COMMUNITY OUTREACH — التواصل المجتمعي
 * ═══════════════════════════════════════════════════════════ */
export const communityOutreachAPI = {
  create: data => apiClient.post('/community-outreach', data),
  list: params => apiClient.get('/community-outreach', { params }),
  get: id => apiClient.get(`/community-outreach/${id}`),
  update: (id, data) => apiClient.put(`/community-outreach/${id}`, data),
  remove: id => apiClient.delete(`/community-outreach/${id}`),
  getDashboard: params => apiClient.get('/community-outreach/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  51. DONOR RELATIONS — علاقات المانحين
 * ═══════════════════════════════════════════════════════════ */
export const donorRelationsAPI = {
  create: data => apiClient.post('/donor-relations', data),
  list: params => apiClient.get('/donor-relations', { params }),
  get: id => apiClient.get(`/donor-relations/${id}`),
  update: (id, data) => apiClient.put(`/donor-relations/${id}`, data),
  remove: id => apiClient.delete(`/donor-relations/${id}`),
  getDashboard: params => apiClient.get('/donor-relations/dashboard', { params }),
};

/* ═══════════════════════════════════════════════════════════
 *  52. ADVOCACY PROGRAM — برنامج المناصرة
 * ═══════════════════════════════════════════════════════════ */
export const advocacyProgramAPI = {
  create: data => apiClient.post('/advocacy-program', data),
  list: params => apiClient.get('/advocacy-program', { params }),
  get: id => apiClient.get(`/advocacy-program/${id}`),
  update: (id, data) => apiClient.put(`/advocacy-program/${id}`, data),
  remove: id => apiClient.delete(`/advocacy-program/${id}`),
  getDashboard: params => apiClient.get('/advocacy-program/dashboard', { params }),
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
};

export default dddAPI;
