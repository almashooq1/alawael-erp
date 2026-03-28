/**
 * 📋 خطط الرعاية — Care Plan Service
 * AlAwael ERP — Frontend API Integration
 */
import apiClient from 'services/api.client';

const BASE = '/care-plans';

const carePlanService = {
  // ── CRUD ────────────────────────────────────────────────────────────────
  getAll: (params = {}) => apiClient.get(BASE, { params }),
  getById: id => apiClient.get(`${BASE}/${id}`),
  create: data => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),

  // ── Workflow ────────────────────────────────────────────────────────────
  activate: id => apiClient.post(`${BASE}/${id}/activate`),
  archive: id => apiClient.post(`${BASE}/${id}/archive`),

  // ── Goal Progress ───────────────────────────────────────────────────────
  updateGoalProgress: (planId, goalId, progressData) =>
    apiClient.patch(`${BASE}/${planId}/goals/${goalId}/progress`, progressData),

  // ── Statistics ──────────────────────────────────────────────────────────
  getStats: () => apiClient.get(`${BASE}/stats`),
};

export default carePlanService;
