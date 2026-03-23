/**
 * AI Diagnostic Service — خدمة الذكاء الاصطناعي للتشخيص
 * Phase 17 — Frontend API layer
 */
import api from './api';

const BASE = '/ai-diagnostic';

const aiDiagnosticService = {
  /* ── Dashboard ── */
  getDashboard: () => api.get(`${BASE}/dashboard`),

  /* ── Reference Data ── */
  getScales: () => api.get(`${BASE}/scales`),
  getDisabilityTypes: () => api.get(`${BASE}/disability-types`),
  getTherapyTypes: () => api.get(`${BASE}/therapy-types`),
  getAIModels: () => api.get(`${BASE}/ai-models`),

  /* ── Beneficiaries ── */
  listBeneficiaries: (params = {}) => api.get(`${BASE}/beneficiaries`, { params }),
  getBeneficiary: (id) => api.get(`${BASE}/beneficiaries/${id}`),
  createBeneficiary: (data) => api.post(`${BASE}/beneficiaries`, data),
  updateBeneficiary: (id, data) => api.put(`${BASE}/beneficiaries/${id}`, data),

  /* ── Assessments ── */
  listAssessments: (beneficiaryId, params = {}) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/assessments`, { params }),
  getAssessment: (id) => api.get(`${BASE}/assessments/${id}`),
  createAssessment: (beneficiaryId, data) =>
    api.post(`${BASE}/beneficiaries/${beneficiaryId}/assessments`, data),
  compareAssessments: (beneficiaryId, id1, id2) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/assessments/compare`, { params: { id1, id2 } }),

  /* ── Sessions ── */
  listSessions: (beneficiaryId, params = {}) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/sessions`, { params }),
  getSession: (id) => api.get(`${BASE}/sessions/${id}`),
  createSession: (beneficiaryId, data) =>
    api.post(`${BASE}/beneficiaries/${beneficiaryId}/sessions`, data),
  completeSession: (id, outcomes) => api.put(`${BASE}/sessions/${id}/complete`, outcomes),

  /* ── Goals ── */
  listGoals: (beneficiaryId, params = {}) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/goals`, { params }),
  getGoal: (id) => api.get(`${BASE}/goals/${id}`),
  createGoal: (beneficiaryId, data) =>
    api.post(`${BASE}/beneficiaries/${beneficiaryId}/goals`, data),
  updateGoalProgress: (id, progress, milestoneIndex) =>
    api.put(`${BASE}/goals/${id}/progress`, { progress, milestoneIndex }),

  /* ── Treatment Plans ── */
  listTreatmentPlans: (params = {}) => api.get(`${BASE}/treatment-plans`, { params }),
  getTreatmentPlan: (id) => api.get(`${BASE}/treatment-plans/${id}`),
  createTreatmentPlan: (data) => api.post(`${BASE}/treatment-plans`, data),
  updateTreatmentPlan: (id, data) => api.put(`${BASE}/treatment-plans/${id}`, data),
  optimizeTreatmentPlan: (id) => api.post(`${BASE}/treatment-plans/${id}/optimize`),

  /* ── AI Analysis ── */
  analyzeProgress: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/analysis`),
  getRecommendations: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/recommendations`),
  predictOutcome: (beneficiaryId, goalId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/predictions/${goalId}`),
  detectPatterns: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/patterns`),
  assessRisk: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/risk`),
  generateReport: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/report`),

  /* ── Behavior Logs ── */
  listBehaviorLogs: (beneficiaryId, params = {}) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/behaviors`, { params }),
  createBehaviorLog: (beneficiaryId, data) =>
    api.post(`${BASE}/beneficiaries/${beneficiaryId}/behaviors`, data),

  /* ── Alerts ── */
  listAlerts: (params = {}) => api.get(`${BASE}/alerts`, { params }),
  resolveAlert: (id) => api.put(`${BASE}/alerts/${id}/resolve`),
};

export default aiDiagnosticService;
