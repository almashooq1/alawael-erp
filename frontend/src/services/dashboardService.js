/**
 * 📊 Dashboard Service v2 — Comprehensive Dashboard API Layer
 * خدمة لوحة التحكم الاحترافية — الإصدار الثاني
 *
 * Provides real-time dashboard data with graceful mock fallback.
 * Supports KPIs, Charts, Clinical, HR, Finance, Supply Chain, Fleet, Operations.
 */

import apiClient from './api.client';
import logger from '../utils/logger';

// ── Mock data for when API is unavailable ──────────────────────────
const DASHBOARD_MOCK = {
  kpis: {
    users: { total: 0, active: 0, label: 'المستخدمون', icon: 'People' },
    beneficiaries: { total: 0, active: 0, label: 'المستفيدون', icon: 'Accessibility' },
    employees: { total: 0, label: 'الموظفون', icon: 'Badge' },
    sessions: { total: 0, today: 0, label: 'الجلسات', icon: 'EventNote' },
    payments: { total: 0, monthCount: 0, label: 'المدفوعات', icon: 'AccountBalance' },
    documents: { total: 0, label: 'المستندات', icon: 'Description' },
    attendance: { today: 0, label: 'الحضور اليوم', icon: 'HowToReg' },
    invoices: { pending: 0, label: 'الفواتير المعلقة', icon: 'Receipt' },
  },
  finance: {
    monthlyRevenue: 0,
    totalRevenue: 0,
    lastMonthRevenue: 0,
    revenueTrend: 0,
    pendingInvoices: 0,
    totalExpenses: 0,
    monthExpenses: 0,
    netIncome: 0,
    monthNetIncome: 0,
  },
  clinical: {
    programs: { total: 0, active: 0, label: 'البرامج العلاجية' },
    carePlans: { total: 0, active: 0, label: 'خطط الرعاية' },
    assessments: { total: 0, label: 'التقييمات' },
    waitlist: { count: 0, label: 'قائمة الانتظار' },
    goals: { total: 0, completed: 0, progress: 0, label: 'الأهداف' },
    feedback: { average: 0, count: 0, label: 'رضا المستفيدين' },
    disabilityPrograms: { active: 0, label: 'برامج الإعاقة' },
  },
  hr: {
    leaves: { pending: 0, approved: 0, total: 0, label: 'الإجازات' },
    approvals: { pending: 0, label: 'طلبات الموافقة' },
    shifts: { total: 0, label: 'الورديات' },
    evaluations: { total: 0, label: 'تقييمات الأداء' },
  },
  supplyChain: {
    suppliers: { total: 0, label: 'الموردون' },
    orders: { total: 0, pending: 0, label: 'أوامر الشراء' },
    inventory: { total: 0, lowStock: 0, label: 'المخزون' },
    contracts: { total: 0, active: 0, label: 'العقود' },
    products: { total: 0, label: 'المنتجات' },
  },
  fleet: {
    vehicles: { total: 0, label: 'المركبات' },
    trips: { total: 0, label: 'الرحلات' },
    drivers: { total: 0, label: 'السائقون' },
  },
  operations: {
    maintenance: { open: 0, label: 'مهام الصيانة' },
    incidents: { open: 0, label: 'الحوادث المفتوحة' },
    leads: { total: 0, new: 0, label: 'العملاء المحتملون' },
    schedules: { today: 0, label: 'مواعيد اليوم' },
    assets: { total: 0, label: 'الأصول' },
  },
  charts: {
    registrations: Array.from({ length: 6 }, (_, i) => ({
      month: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'][i],
      value: 0,
    })),
    activity: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(
      day => ({ day, value: 0 })
    ),
    roleDistribution: [],
    revenueChart: Array.from({ length: 6 }, (_, i) => ({
      month: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'][i],
      revenue: 0,
      transactions: 0,
    })),
    sessionStatus: [],
    expenseCategories: [],
  },
  recentActivity: [],
  alerts: [],
  system: {
    database: 'غير متصل',
    dbStatus: 'disconnected',
    uptime: 0,
    memoryUsage: 0,
    memoryTotal: 0,
    nodeVersion: '',
    collections: 0,
    models: 0,
  },
};

/**
 * Fetch full dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/dashboard/stats');
    // api.client interceptor already unwraps response.data,
    // so response = { success, data: { kpis, finance, ... } }
    return response?.data || response || DASHBOARD_MOCK;
  } catch (error) {
    logger.warn('Dashboard stats API unavailable, using fallback:', error.message);
    return DASHBOARD_MOCK;
  }
};

/**
 * Fetch quick KPI summary (for navbar/header)
 */
export const getQuickStats = async () => {
  try {
    const response = await apiClient.get('/dashboard/stats/quick');
    return (
      response?.data ||
      response || { users: 0, beneficiaries: 0, todaySessions: 0, unreadNotifs: 0 }
    );
  } catch {
    return { users: 0, beneficiaries: 0, todaySessions: 0, unreadNotifs: 0 };
  }
};

/**
 * Fetch module-level summaries
 */
export const getModuleStats = async () => {
  try {
    const response = await apiClient.get('/dashboard/stats/modules');
    return response?.data || response || {};
  } catch {
    return {};
  }
};

/**
 * Format number for Arabic display (with K/M suffix for dashboard cards).
 * NOTE: For full-precision formatting, use utils/formatters.formatNumber instead.
 */
export const formatNumber = num => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('ar-SA');
};

/**
 * Format currency for Arabic display (SAR)
 */
export const formatCurrency = amount => {
  if (!amount) return '٠ ر.س';
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage
 */
export const formatPercent = value => {
  if (!value && value !== 0) return '0%';
  return `${value}%`;
};

/**
 * Get time-aware Arabic greeting
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء النور';
};

/**
 * Get today's date in Arabic
 */
export const getArabicDate = () => {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Export dashboard data as CSV file download
 * @param {Object} data  — full dashboard stats object
 * @param {string} filename — optional filename override
 */
export const exportDashboardCSV = (data, filename) => {
  if (!data) return;
  const rows = [['القسم', 'المؤشر', 'القيمة']];

  // KPIs
  if (data.kpis) {
    Object.entries(data.kpis).forEach(([, v]) => {
      if (v?.label) rows.push(['مؤشرات أساسية', v.label, v.total ?? v.today ?? v.pending ?? 0]);
    });
  }
  // Finance
  if (data.finance) {
    rows.push(['المالية', 'إيرادات الشهر', data.finance.monthlyRevenue || 0]);
    rows.push(['المالية', 'مصروفات الشهر', data.finance.monthExpenses || 0]);
    rows.push(['المالية', 'صافي الربح', data.finance.monthNetIncome || 0]);
    rows.push(['المالية', 'فواتير معلقة', data.finance.pendingInvoices || 0]);
  }
  // HR
  if (data.hr) {
    rows.push(['الموارد البشرية', 'إجازات معلقة', data.hr.leaves?.pending || 0]);
    rows.push(['الموارد البشرية', 'طلبات الموافقة', data.hr.approvals?.pending || 0]);
  }
  // Clinical
  if (data.clinical) {
    rows.push(['السريرية', 'البرامج النشطة', data.clinical.programs?.active || 0]);
    rows.push(['السريرية', 'قائمة الانتظار', data.clinical.waitlist?.count || 0]);
  }
  // Operations
  if (data.operations) {
    rows.push(['العمليات', 'مهام الصيانة', data.operations.maintenance?.open || 0]);
    rows.push(['العمليات', 'الحوادث المفتوحة', data.operations.incidents?.open || 0]);
  }

  // BOM + UTF-8 for correct Arabic rendering in Excel
  const bom = '\uFEFF';
  const csv = bom + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dashboard_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const dashboardService = {
  getDashboardStats,
  getQuickStats,
  getModuleStats,
  formatNumber,
  formatCurrency,
  formatPercent,
  getGreeting,
  getArabicDate,
  exportDashboardCSV,
  DASHBOARD_MOCK,
};

export default dashboardService;
