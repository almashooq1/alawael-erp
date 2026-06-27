/**
 * biAnalyticsService.js — خدمة التحليلات المتقدمة وذكاء الأعمال (Frontend)
 * ═══════════════════════════════════════════════════════════════════════════
 * طبقة API للتحليلات المتقدمة:
 *   • إعدادات منشئ التقارير
 *   • بناء وجلب التقارير
 *   • تصدير (Excel / PDF / PowerBI)
 *   • جدولة التقارير
 *   • التحليلات التنبؤية
 *   • ملخص مستودع البيانات
 */

import apiClient from './api.client';

// ── Fallbacks ─────────────────────────────────────────────────────
const MOCK_CONFIG = {
  sources: [],
  chartTypes: [],
  colorPalettes: [],
  commonFilters: [],
};

const MOCK_REPORT = {
  source: '',
  sourceName: '',
  dimensions: [],
  metrics: [],
  rowCount: 0,
  data: [],
  generatedAt: new Date().toISOString(),
};

const MOCK_SCHEDULED = [];

const MOCK_WAREHOUSE = {
  tables: [],
  recentActivity: { newBeneficiaries: 0, newSessions: 0, period: 'lastMonth' },
};

const MOCK_PREDICTIVE = {
  type: 'revenue',
  forecast: [],
  confidence: 0,
  trend: 'stable',
  message: '',
};

// ── API Methods ───────────────────────────────────────────────────

/**
 * Get report builder configuration (إعدادات منشئ التقارير)
 */
export const getBuilderConfig = async () => {
  try {
    const res = await apiClient.get('/api/v1/bi/config');
    return res.data?.data || MOCK_CONFIG;
  } catch {
    return MOCK_CONFIG;
  }
};

/**
 * Build custom report (بناء تقرير مخصص)
 */
export const buildReport = async (config) => {
  try {
    const res = await apiClient.post('/api/v1/bi/reports', config);
    return res.data?.data || MOCK_REPORT;
  } catch {
    return MOCK_REPORT;
  }
};

/**
 * Get report data by template ID (جلب بيانات التقرير)
 */
export const getReportData = async (templateId, params = {}) => {
  try {
    const res = await apiClient.get(`/api/v1/bi/reports/${templateId}`, { params });
    return res.data?.data || MOCK_REPORT;
  } catch {
    return MOCK_REPORT;
  }
};

/**
 * Export report (تصدير التقرير)
 * Returns: Blob URL for download
 */
export const exportReport = async (templateId, format = 'excel', body = {}) => {
  try {
    const res = await apiClient.post(
      `/api/v1/bi/reports/${templateId}/export`,
      { format, ...body },
      { responseType: 'blob' }
    );
    const blob = new Blob([res.data], {
      type: res.headers['content-type'] || 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const filename =
      res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ||
      `report_${Date.now()}.${format === 'powerbi' ? 'json' : format}`;
    return { url, filename, success: true };
  } catch {
    return { url: null, filename: '', success: false };
  }
};

/**
 * Export custom report (تصدير تقرير مخصص بدون قالب)
 */
export const exportCustomReport = async (config, format = 'excel') => {
  try {
    const res = await apiClient.post(
      '/api/v1/bi/reports/custom/export',
      { config, format },
      { responseType: 'blob' }
    );
    const blob = new Blob([res.data], {
      type: res.headers['content-type'] || 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const filename =
      res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ||
      `report_${Date.now()}.${format === 'powerbi' ? 'json' : format}`;
    return { url, filename, success: true };
  } catch {
    return { url: null, filename: '', success: false };
  }
};

/**
 * Schedule a report (جدولة تقرير)
 */
export const scheduleReport = async (templateId, schedule) => {
  try {
    const res = await apiClient.post('/api/v1/bi/schedule', { templateId, schedule });
    return res.data?.data || { success: false };
  } catch {
    return { success: false, message: 'فشل في جدولة التقرير' };
  }
};

/**
 * Get scheduled reports (قائمة التقارير المجدولة)
 */
export const getScheduledReports = async () => {
  try {
    const res = await apiClient.get('/api/v1/bi/scheduled');
    return res.data?.data || MOCK_SCHEDULED;
  } catch {
    return MOCK_SCHEDULED;
  }
};

/**
 * Get data warehouse summary (ملخص مستودع البيانات)
 */
export const getWarehouseSummary = async () => {
  try {
    const res = await apiClient.get('/api/v1/bi/warehouse');
    return res.data?.data || MOCK_WAREHOUSE;
  } catch {
    return MOCK_WAREHOUSE;
  }
};

/**
 * Get predictive analytics (تحليلات تنبؤية)
 */
export const getPredictiveAnalytics = async (type = 'revenue', params = {}) => {
  try {
    const res = await apiClient.post('/api/v1/bi/predictive', { type, params });
    return res.data?.data || MOCK_PREDICTIVE;
  } catch {
    return { ...MOCK_PREDICTIVE, type };
  }
};

// ── Service Export ────────────────────────────────────────────────
const biAnalyticsService = {
  getBuilderConfig,
  buildReport,
  getReportData,
  exportReport,
  exportCustomReport,
  scheduleReport,
  getScheduledReports,
  getWarehouseSummary,
  getPredictiveAnalytics,
};

export default biAnalyticsService;
