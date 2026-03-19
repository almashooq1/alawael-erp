/**
 * hrInsuranceService.js — خدمة تأمين الموظفين الصحي
 * HR Employee Health Insurance API Service
 *
 * تكامل شؤون الموظفين مع شركات التأمين السعودية
 *
 * ✅ لوحة المعلومات والإحصائيات
 * ✅ CRUD وثائق التأمين الصحي
 * ✅ إدارة المعالين (التابعين)
 * ✅ المطالبات الطبية
 * ✅ التجديد والتسجيل الجماعي
 * ✅ التقارير (ملخص، خصومات الرواتب)
 * ✅ البيانات المرجعية (شركات، فئات تغطية)
 */
import api from './api.client';

const BASE = '/hr-insurance';

const hrInsuranceService = {
  // ─── البيانات المرجعية ────────────────────────────────────────────────
  getCompanies: () => api.get(`${BASE}/companies`),
  getCoverageClasses: () => api.get(`${BASE}/coverage-classes`),

  // ─── الإحصائيات ──────────────────────────────────────────────────────
  getStats: () => api.get(`${BASE}/stats`),
  getExpiringPolicies: (days = 30) => api.get(`${BASE}/expiring`, { params: { days } }),

  // ─── CRUD وثائق التأمين ──────────────────────────────────────────────
  getPolicies: params => api.get(BASE, { params }),
  getPolicy: id => api.get(`${BASE}/${id}`),
  createPolicy: data => api.post(BASE, data),
  updatePolicy: (id, data) => api.put(`${BASE}/${id}`, data),
  deletePolicy: id => api.delete(`${BASE}/${id}`),

  // ─── وثائق موظف محدد ─────────────────────────────────────────────────
  getEmployeeInsurance: employeeId => api.get(`${BASE}/employee/${employeeId}`),

  // ─── المعالين (التابعين) ─────────────────────────────────────────────
  addDependent: (policyId, data) => api.post(`${BASE}/${policyId}/dependents`, data),
  updateDependent: (policyId, depId, data) =>
    api.put(`${BASE}/${policyId}/dependents/${depId}`, data),
  removeDependent: (policyId, depId, reason) =>
    api.delete(`${BASE}/${policyId}/dependents/${depId}`, { data: { reason } }),

  // ─── المطالبات الطبية ─────────────────────────────────────────────────
  getClaims: policyId => api.get(`${BASE}/${policyId}/claims`),
  submitClaim: (policyId, data) => api.post(`${BASE}/${policyId}/claims`, data),
  updateClaimStatus: (policyId, claimId, data) =>
    api.put(`${BASE}/${policyId}/claims/${claimId}`, data),

  // ─── التجديد ─────────────────────────────────────────────────────────
  renewPolicy: (policyId, data) => api.post(`${BASE}/${policyId}/renew`, data),

  // ─── التسجيل الجماعي ──────────────────────────────────────────────────
  bulkEnroll: data => api.post(`${BASE}/bulk-enroll`, data),

  // ─── التقارير ─────────────────────────────────────────────────────────
  getReportSummary: () => api.get(`${BASE}/reports/summary`),
  getPayrollDeductions: params => api.get(`${BASE}/reports/payroll-deductions`, { params }),
};

export default hrInsuranceService;
