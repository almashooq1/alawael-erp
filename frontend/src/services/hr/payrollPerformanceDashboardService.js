/**
 * Payroll, Performance & Dashboard Service
 * خدمات الرواتب والأداء ولوحة المعلومات
 */
import apiClient from '../api.client';
import { safeFetch } from './safeFetch';
import { DEMO_EMPLOYEES, DEMO_PAYROLL, DEMO_LEAVES, DEMO_REVIEWS } from './demoData';

/* ─── Payroll ─── */
export const getPayroll = (month, year) => {
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  return safeFetch(`/hr-system/payroll?month=${m}&year=${y}`, DEMO_PAYROLL);
};

/* ─── Performance ─── */
export const getPerformanceReviews = () =>
  safeFetch('/hr-system/performance-reviews', DEMO_REVIEWS);

export const createPerformanceReview = data =>
  safeFetch('/hr-system/performance-reviews', null, { method: 'POST', body: data });

/* ─── Dashboard KPIs ─── */
export const getDashboardKPIs = async () => {
  try {
    const res = await apiClient.get('/hr-advanced/reports/overview');
    return { data: res?.data ?? res, isDemo: false };
  } catch {
    return {
      data: {
        totalEmployees: DEMO_EMPLOYEES.length,
        activeEmployees: DEMO_EMPLOYEES.filter(e => e.status === 'active').length,
        onLeave: DEMO_EMPLOYEES.filter(e => e.status === 'on_leave').length,
        attendanceRate: 87.5,
        pendingLeaves: DEMO_LEAVES.filter(l => l.status === 'pending').length,
        totalPayroll: DEMO_PAYROLL.reduce((s, p) => s + p.netSalary, 0),
        avgRating: 4.1,
        departments: [
          'تقنية المعلومات',
          'الموارد البشرية',
          'المالية',
          'التعليم',
          'العلاج الطبيعي',
          'الإدارة',
          'العلاج الوظيفي',
          'علاج النطق',
        ],
      },
      isDemo: true,
    };
  }
};
