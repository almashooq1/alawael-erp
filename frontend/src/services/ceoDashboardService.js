/**
 * CEO Executive Dashboard Service — خدمة لوحة تحكم الإدارة التنفيذية
 * Phase 19 — Frontend API layer
 */
import api from './api';

const BASE = '/ceo-dashboard';

const ceoDashboardService = {
  /* ── Executive Dashboard ── */
  getDashboard: () => api.get(`${BASE}/dashboard`),

  /* ── Reference Data ── */
  getDepartmentList: () => api.get(`${BASE}/departments-list`),
  getKPICategories: () => api.get(`${BASE}/kpi-categories`),
  getWidgetTypes: () => api.get(`${BASE}/widget-types`),
  getAlertSeverities: () => api.get(`${BASE}/alert-severities`),
  getPeriods: () => api.get(`${BASE}/periods`),
  getStrategicStatuses: () => api.get(`${BASE}/strategic-statuses`),
  getStatistics: () => api.get(`${BASE}/statistics`),

  /* ── KPIs ── */
  listKPIs: (params = {}) => api.get(`${BASE}/kpis`, { params }),
  getKPI: (id) => api.get(`${BASE}/kpis/${id}`),
  createKPI: (data) => api.post(`${BASE}/kpis`, data),
  updateKPI: (id, data) => api.put(`${BASE}/kpis/${id}`, data),
  deleteKPI: (id) => api.delete(`${BASE}/kpis/${id}`),
  getKPITrend: (id, params = {}) => api.get(`${BASE}/kpis/${id}/trend`, { params }),
  addKPISnapshot: (id, data) => api.post(`${BASE}/kpis/${id}/snapshots`, data),

  /* ── Alerts ── */
  listAlerts: (params = {}) => api.get(`${BASE}/alerts`, { params }),
  getAlert: (id) => api.get(`${BASE}/alerts/${id}`),
  createAlert: (data) => api.post(`${BASE}/alerts`, data),
  markAlertRead: (id) => api.patch(`${BASE}/alerts/${id}/read`),
  resolveAlert: (id, data) => api.patch(`${BASE}/alerts/${id}/resolve`, data),
  dismissAlert: (id) => api.delete(`${BASE}/alerts/${id}`),

  /* ── Strategic Goals ── */
  listGoals: (params = {}) => api.get(`${BASE}/goals`, { params }),
  getGoal: (id) => api.get(`${BASE}/goals/${id}`),
  createGoal: (data) => api.post(`${BASE}/goals`, data),
  updateGoal: (id, data) => api.put(`${BASE}/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`${BASE}/goals/${id}`),

  /* ── Departments ── */
  listDepartments: () => api.get(`${BASE}/departments`),
  getDepartment: (id) => api.get(`${BASE}/departments/${id}`),
  updateDepartment: (id, data) => api.put(`${BASE}/departments/${id}`, data),
  getDepartmentComparison: () => api.get(`${BASE}/departments/comparison`),

  /* ── Widgets & Layouts ── */
  listWidgets: () => api.get(`${BASE}/widgets`),
  getWidget: (id) => api.get(`${BASE}/widgets/${id}`),
  createWidget: (data) => api.post(`${BASE}/widgets`, data),
  updateWidget: (id, data) => api.put(`${BASE}/widgets/${id}`, data),
  deleteWidget: (id) => api.delete(`${BASE}/widgets/${id}`),
  listLayouts: () => api.get(`${BASE}/layouts`),
  getLayout: (id) => api.get(`${BASE}/layouts/${id}`),
  createLayout: (data) => api.post(`${BASE}/layouts`, data),
  setDefaultLayout: (id) => api.patch(`${BASE}/layouts/${id}/set-default`),
  deleteLayout: (id) => api.delete(`${BASE}/layouts/${id}`),

  /* ── Benchmarks ── */
  listBenchmarks: () => api.get(`${BASE}/benchmarks`),
  getBenchmark: (kpiCode) => api.get(`${BASE}/benchmarks/${kpiCode}`),

  /* ── Reports ── */
  listReports: () => api.get(`${BASE}/reports`),
  getReport: (id) => api.get(`${BASE}/reports/${id}`),
  generateReport: (data) => api.post(`${BASE}/reports/generate`, data),
  exportReport: (id, format = 'json') => api.get(`${BASE}/reports/${id}/export`, { params: { format } }),

  /* ── Comparative Analytics ── */
  comparePerformance: (period1, period2) => api.get(`${BASE}/compare`, { params: { period1, period2 } }),

  /* ── Audit Log ── */
  getAuditLog: (params = {}) => api.get(`${BASE}/audit-log`, { params }),
};

export default ceoDashboardService;
