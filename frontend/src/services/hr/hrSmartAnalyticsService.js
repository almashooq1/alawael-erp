/**
 * hrSmartAnalyticsService.js — خدمة التحليلات الذكية للموارد البشرية
 *
 * تغلف جميع نقاط نهاية /api/v1/hr/smart-analytics
 */
import apiClient from '../api.client';

const BASE = '/api/v1/hr/smart-analytics';

async function call(url, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined) query.set(k, v);
  });
  const qs = query.toString();
  const res = await apiClient({ method: 'GET', url: `${BASE}${url}${qs ? `?${qs}` : ''}` });
  return res?.data ?? res;
}

/** الحزمة الكاملة — كل المقاطع في طلب واحد */
export const getFullDashboard = (params = {}) => call('/dashboard', params);

/** لوحة الذكاء الوظيفي — القوى العاملة والدوران */
export const getIntelligence = (params = {}) => call('/intelligence', params);

/** لوحة الامتثال — GOSI / SCFHS / إقامة / عقود */
export const getComplianceDashboard = (params = {}) => call('/compliance', params);

/** تحليلات الرواتب — التوزيع والفجوات */
export const getPayrollAnalytics = ({ branchId, month, year } = {}) =>
  call('/payroll', { branchId, month, year });

/** توزيع الأداء — منحنى الجرس */
export const getPerformanceDistribution = ({ branchId, year } = {}) =>
  call('/performance', { branchId, year });

/** فاعلية التدريب */
export const getTrainingEffectiveness = ({ branchId, year } = {}) =>
  call('/training', { branchId, year });

/** درجات مخاطرة الموظفين */
export const getRiskScores = ({ branchId, department, limit = 20 } = {}) =>
  call('/risk-scores', { branchId, department, limit });

/** التوصيات الذكية */
export const getSmartRecommendations = (params = {}) => call('/recommendations', params);

const hrSmartAnalyticsService = {
  getFullDashboard,
  getIntelligence,
  getComplianceDashboard,
  getPayrollAnalytics,
  getPerformanceDistribution,
  getTrainingEffectiveness,
  getRiskScores,
  getSmartRecommendations,
};

export default hrSmartAnalyticsService;
