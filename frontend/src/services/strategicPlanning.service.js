/**
 * 🎯 Strategic Planning Service — خدمة التخطيط الاستراتيجي
 * AlAwael ERP — Full API client for strategic planning
 */
import api from './api.client';

const BASE = '/strategic-planning';

const strategicPlanningService = {
  // ── Goals (الأهداف الاستراتيجية) ──────────────────────────────
  getGoals: params => api.get(`${BASE}/goals`, { params }),
  getGoalById: id => api.get(`${BASE}/goals/${id}`),
  createGoal: data => api.post(`${BASE}/goals`, data),
  updateGoal: (id, data) => api.put(`${BASE}/goals/${id}`, data),
  deleteGoal: id => api.delete(`${BASE}/goals/${id}`),

  // ── Initiatives (المبادرات) ───────────────────────────────────
  getInitiatives: params => api.get(`${BASE}/initiatives`, { params }),
  getInitiativeById: id => api.get(`${BASE}/initiatives/${id}`),
  createInitiative: data => api.post(`${BASE}/initiatives`, data),
  updateInitiative: (id, data) => api.put(`${BASE}/initiatives/${id}`, data),
  deleteInitiative: id => api.delete(`${BASE}/initiatives/${id}`),

  // ── KPIs (مؤشرات الأداء) ──────────────────────────────────────
  getKPIs: params => api.get(`${BASE}/kpis`, { params }),
  createKPI: data => api.post(`${BASE}/kpis`, data),
  updateKPI: (id, data) => api.put(`${BASE}/kpis/${id}`, data),
  deleteKPI: id => api.delete(`${BASE}/kpis/${id}`),
  recordKPIValue: (id, data) => api.post(`${BASE}/kpis/${id}/record`, data),

  // ── Dashboard & Analytics ─────────────────────────────────────
  getDashboard: () => api.get(`${BASE}/dashboard`),
  getBalancedScorecard: () => api.get(`${BASE}/balanced-scorecard`),
  getProgressReport: params => api.get(`${BASE}/progress-report`, { params }),
};

export default strategicPlanningService;
