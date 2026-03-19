/**
 * 📈 Succession Planning Service — خدمة تخطيط التعاقب الوظيفي
 * AlAwael ERP — Succession planning management
 */
import api from './api.client';

const BASE = '/succession-planning';

const successionPlanningService = {
  getPlans: params => api.get(`${BASE}`, { params }),
  getPlanById: id => api.get(`${BASE}/${id}`),
  createPlan: data => api.post(`${BASE}`, data),
  updatePlan: (id, data) => api.put(`${BASE}/${id}`, data),
  deletePlan: id => api.delete(`${BASE}/${id}`),
  addCandidate: (planId, data) => api.post(`${BASE}/${planId}/candidates`, data),
  updateCandidate: (planId, candidateId, data) =>
    api.put(`${BASE}/${planId}/candidates/${candidateId}`, data),
  getDevelopmentPlan: (planId, candidateId) =>
    api.get(`${BASE}/${planId}/candidates/${candidateId}/development`),
  assessReadiness: (planId, candidateId, data) =>
    api.post(`${BASE}/${planId}/candidates/${candidateId}/readiness`, data),
  getTopCandidates: () => api.get(`${BASE}/reports/top-candidates`),
  getStats: () => api.get(`${BASE}/stats`),
};

export default successionPlanningService;
