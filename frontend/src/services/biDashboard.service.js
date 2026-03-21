/**
 * BI Dashboard Service — خدمة لوحة تحكم ذكاء الأعمال
 *
 * API layer for Business Intelligence dashboards, KPIs,
 * analytics, trends, and report management.
 */

import apiClient from './api.client';

// ── Fallback mock data ────────────────────────────────────────────
const MOCK_OVERVIEW = {
  period: 'month',
  summary: {
    beneficiaries: { total: 0, active: 0, new: 0, trend: 0 },
    staff: { total: 0, active: 0, new: 0, trend: 0 },
    finance: { revenue: 0, expenses: 0, netIncome: 0, profitMargin: 0 },
    sessions: { total: 0, completed: 0, completionRate: 0 },
    complaints: { total: 0, resolved: 0, open: 0, resolutionRate: 0 },
    attendance: { totalDays: 0, presentRate: 0 },
  },
  healthScore: 70,
};

const MOCK_KPIS = [
  {
    code: 'BEN_TOTAL',
    nameAr: 'إجمالي المستفيدين',
    category: 'operational',
    unit: 'number',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
  {
    code: 'STAFF_ACTIVE',
    nameAr: 'الموظفون النشطون',
    category: 'hr',
    unit: 'number',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
  {
    code: 'REV_MONTH',
    nameAr: 'الإيرادات الشهرية',
    category: 'financial',
    unit: 'currency',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
  {
    code: 'SESSION_MONTH',
    nameAr: 'جلسات الشهر',
    category: 'operational',
    unit: 'number',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
  {
    code: 'COMPLAINT_RESOLUTION',
    nameAr: 'نسبة حل الشكاوى',
    category: 'satisfaction',
    unit: 'percentage',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
  {
    code: 'ATTENDANCE_RATE',
    nameAr: 'نسبة الحضور',
    category: 'hr',
    unit: 'percentage',
    currentValue: 0,
    trend: 'stable',
    trendPercentage: 0,
  },
];

const MOCK_FINANCE = {
  year: new Date().getFullYear(),
  monthly: [],
  totals: { revenue: 0, expenses: 0, netIncome: 0, invoices: 0 },
  profitMargin: 0,
};

const MOCK_HR = {
  headcount: { total: 0, active: 0, turnoverRate: 0 },
  departments: [],
  leaves: { breakdown: [] },
  attendance: { monthly: [] },
  performance: { avgScore: 0, evaluationsCount: 0 },
};

// ── API Methods ───────────────────────────────────────────────────

/**
 * Get executive overview (النظرة التنفيذية)
 */
export const getOverview = async (period = 'month') => {
  try {
    const res = await apiClient.get('/bi-dashboard/overview', { params: { period } });
    return res.data || MOCK_OVERVIEW;
  } catch {
    return MOCK_OVERVIEW;
  }
};

/**
 * Get KPI list (مؤشرات الأداء)
 */
export const getKPIs = async (params = {}) => {
  try {
    const res = await apiClient.get('/bi-dashboard/kpis', { params });
    return res.data || MOCK_KPIS;
  } catch {
    return MOCK_KPIS;
  }
};

/**
 * Get KPI detail by code
 */
export const getKPIDetail = async code => {
  try {
    const res = await apiClient.get(`/bi-dashboard/kpis/${code}`);
    return res.data;
  } catch {
    return null;
  }
};

/**
 * Create a new KPI
 */
export const createKPI = async data => {
  const res = await apiClient.post('/bi-dashboard/kpis', data);
  return res.data;
};

/**
 * Update KPI
 */
export const updateKPI = async (code, data) => {
  const res = await apiClient.put(`/bi-dashboard/kpis/${code}`, data);
  return res.data;
};

/**
 * Get financial analytics (التحليلات المالية)
 */
export const getFinanceAnalytics = async (params = {}) => {
  try {
    const res = await apiClient.get('/bi-dashboard/finance/analytics', { params });
    return res.data || MOCK_FINANCE;
  } catch {
    return MOCK_FINANCE;
  }
};

/**
 * Get cashflow analysis (التدفق النقدي)
 */
export const getCashflow = async (months = 6) => {
  try {
    const res = await apiClient.get('/bi-dashboard/finance/cashflow', { params: { months } });
    return res.data || { cashflow: [] };
  } catch {
    return { cashflow: [] };
  }
};

/**
 * Get HR analytics (تحليلات الموارد البشرية)
 */
export const getHRAnalytics = async () => {
  try {
    const res = await apiClient.get('/bi-dashboard/hr/analytics');
    return res.data || MOCK_HR;
  } catch {
    return MOCK_HR;
  }
};

/**
 * Get operations analytics (التحليلات التشغيلية)
 */
export const getOperationsAnalytics = async () => {
  try {
    const res = await apiClient.get('/bi-dashboard/operations/analytics');
    return res.data || { sessions: {}, complaints: {}, maintenance: {}, fleet: {} };
  } catch {
    return { sessions: {}, complaints: {}, maintenance: {}, fleet: {} };
  }
};

/**
 * Get trend data (تحليل الاتجاهات)
 */
export const getTrends = async (metric = 'revenue', months = 12) => {
  try {
    const res = await apiClient.get('/bi-dashboard/trends', { params: { metric, months } });
    return res.data || { points: [], trend: {} };
  } catch {
    return { points: [], trend: { direction: 'stable' }, summary: {} };
  }
};

/**
 * Get department comparison (مقارنة الأقسام)
 */
export const getDepartmentComparison = async () => {
  try {
    const res = await apiClient.get('/bi-dashboard/departments/comparison');
    return res.data || [];
  } catch {
    return [];
  }
};

/**
 * Get real-time metrics (المقاييس الآنية)
 */
export const getRealtime = async () => {
  try {
    const res = await apiClient.get('/bi-dashboard/realtime');
    return res.data || {};
  } catch {
    return { todaySessions: 0, todayAttendance: 0, onlineUsers: 0, pendingTasks: 0 };
  }
};

/**
 * Get saved reports list (التقارير المحفوظة)
 */
export const getReports = async (params = {}) => {
  try {
    const res = await apiClient.get('/bi-dashboard/reports', { params });
    return res.data || [];
  } catch {
    return [];
  }
};

/**
 * Get report by ID
 */
export const getReport = async id => {
  try {
    const res = await apiClient.get(`/bi-dashboard/reports/${id}`);
    return res.data;
  } catch {
    return null;
  }
};

/**
 * Create report
 */
export const createReport = async data => {
  const res = await apiClient.post('/bi-dashboard/reports', data);
  return res.data;
};

/**
 * Update report
 */
export const updateReport = async (id, data) => {
  const res = await apiClient.put(`/bi-dashboard/reports/${id}`, data);
  return res.data;
};

/**
 * Delete (archive) report
 */
export const deleteReport = async id => {
  const res = await apiClient.delete(`/bi-dashboard/reports/${id}`);
  return res.data;
};

const biDashboardService = {
  getOverview,
  getKPIs,
  getKPIDetail,
  createKPI,
  updateKPI,
  getFinanceAnalytics,
  getCashflow,
  getHRAnalytics,
  getOperationsAnalytics,
  getTrends,
  getDepartmentComparison,
  getRealtime,
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
};

export default biDashboardService;
