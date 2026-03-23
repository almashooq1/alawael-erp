/**
 * Workforce Analytics API Service — خدمة API تحليلات القوى العاملة
 * Phase 21 — Workforce Analytics & Planning
 */

import api from './api';

const BASE = '/api/workforce-analytics';

const workforceAnalyticsService = {
  /* ── Dashboard & Health ── */
  getHealthScore: () => api.get(`${BASE}/health-score`),
  getDepartmentAnalytics: (deptId) => api.get(`${BASE}/analytics/department/${deptId}`),

  /* ── Headcount Planning ── */
  listHeadcountPlans: () => api.get(`${BASE}/headcount-plans`),
  createHeadcountPlan: (data) => api.post(`${BASE}/headcount-plans`, data),
  approveHeadcountPlan: (id, data) => api.put(`${BASE}/headcount-plans/${id}/approve`, data),

  /* ── Forecasting ── */
  listForecasts: () => api.get(`${BASE}/forecasts`),
  createForecast: (data) => api.post(`${BASE}/forecasts`, data),
  updateForecastAccuracy: (id, data) => api.put(`${BASE}/forecasts/${id}/accuracy`, data),

  /* ── Succession Planning ── */
  listSuccessionPlans: () => api.get(`${BASE}/succession-plans`),
  createSuccessionPlan: (data) => api.post(`${BASE}/succession-plans`, data),
  addSuccessor: (planId, data) => api.post(`${BASE}/succession-plans/${planId}/successors`, data),

  /* ── Skills & Competency ── */
  createSkillMapping: (data) => api.post(`${BASE}/skills`, data),
  updateSkillProficiency: (id, data) => api.put(`${BASE}/skills/${id}`, data),

  /* ── Retention & Attrition ── */
  analyzeRetention: (data) => api.post(`${BASE}/retention/analyze`, data),
  predictAttritionRisk: (data) => api.post(`${BASE}/attrition-risk`, data),

  /* ── Compensation & Benefits ── */
  listSalaryBands: () => api.get(`${BASE}/salary-bands`),
  createSalaryBand: (data) => api.post(`${BASE}/salary-bands`, data),
  analyzeCompensation: (data) => api.post(`${BASE}/compensation/analyze`, data),
  identifyAdjustments: (data) => api.post(`${BASE}/compensation/adjustments`, data),

  /* ── Reports ── */
  generateReport: (data) => api.post(`${BASE}/reports`, data),
};

export default workforceAnalyticsService;
