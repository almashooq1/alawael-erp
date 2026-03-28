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
    // Send default date range (current month) so the backend doesn't receive undefined
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = now.toISOString();
    const res = await apiClient.get(
      `/hr-advanced/reports/overview?startDate=${startDate}&endDate=${endDate}`
    );
    const raw = res?.data ?? res;
    // Flatten the nested report structure into the KPI shape the dashboard expects
    return {
      data: {
        totalEmployees: raw?.keyMetrics?.totalEmployees ?? raw?.totalEmployees ?? 0,
        activeEmployees: raw?.keyMetrics?.activeEmployees ?? raw?.activeEmployees ?? 0,
        newHires: raw?.keyMetrics?.newHires ?? raw?.keyMetrics?.newEmployees ?? raw?.newHires ?? 0,
        turnoverRate: parseFloat(raw?.keyMetrics?.turnoverRate) || raw?.turnoverRate || 0,
        onLeave: raw?.keyMetrics?.onLeave ?? raw?.onLeave ?? 0,
        attendanceRate: raw?.keyMetrics?.attendanceRate ?? raw?.attendanceRate ?? 0,
        pendingLeaves: raw?.keyMetrics?.pendingLeaves ?? raw?.pendingLeaves ?? 0,
        totalPayroll:
          raw?.totalPayroll ??
          ((raw?.salaryAnalysis?.averageBaseSalary ?? raw?.salaryAnalysis?.averageSalary)
            ? (raw.salaryAnalysis.averageBaseSalary ?? raw.salaryAnalysis.averageSalary) *
              (raw?.keyMetrics?.totalEmployees || 1)
            : 0),
        avgRating: raw?.keyMetrics?.avgRating ?? raw?.avgRating ?? 0,
        departments:
          raw?.distribution?.byDepartment?.map(d => d._id || d.name) ?? raw?.departments ?? [],
      },
      isDemo: false,
    };
  } catch {
    return {
      data: {
        totalEmployees: 0,
        activeEmployees: 0,
        onLeave: 0,
        attendanceRate: 0,
        pendingLeaves: 0,
        totalPayroll: 0,
        avgRating: 0,
        departments: [],
      },
      isDemo: false,
      error: 'API غير متاح',
    };
  }
};
