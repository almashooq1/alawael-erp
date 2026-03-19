/**
 * insurance.service.js — خدمة إدارة التأمين السعودي
 * Saudi Insurance Management API Service
 *
 * ✅ CRUD وثائق التأمين
 * ✅ إدارة المطالبات
 * ✅ عروض الأسعار
 * ✅ التجديد
 * ✅ الإحصائيات
 * ✅ البيانات المرجعية (شركات، أنواع، مخالفات)
 */
import api from './api.client';

const insuranceService = {
  // ─── CRUD الوثائق ────────────────────────────────────────────────────
  getPolicies: params => api.get('/insurance', { params }),
  getPolicy: id => api.get(`/insurance/${id}`),
  createPolicy: data => api.post('/insurance', data),
  updatePolicy: (id, data) => api.put(`/insurance/${id}`, data),
  deletePolicy: id => api.delete(`/insurance/${id}`),

  // ─── الإحصائيات والتقارير ─────────────────────────────────────────────
  getStatistics: () => api.get('/insurance/statistics'),
  getExpiringPolicies: (days = 30) => api.get('/insurance/expiring', { params: { days } }),

  // ─── المطالبات ────────────────────────────────────────────────────────
  getPolicyClaims: policyId => api.get(`/insurance/${policyId}/claims`),
  addClaim: (policyId, data) => api.post(`/insurance/${policyId}/claims`, data),
  updateClaimStatus: (policyId, claimId, data) =>
    api.put(`/insurance/${policyId}/claims/${claimId}`, data),

  // ─── التجديد وعروض الأسعار ───────────────────────────────────────────
  renewPolicy: (policyId, data) => api.post(`/insurance/${policyId}/renew`, data),
  getQuote: data => api.post('/insurance/quote', data),

  // ─── التأمين حسب المركبة ──────────────────────────────────────────────
  getVehicleInsurance: vehicleId => api.get(`/insurance/vehicle/${vehicleId}`),

  // ─── البيانات المرجعية ────────────────────────────────────────────────
  getCompanies: () => api.get('/insurance/companies'),
  getPolicyTypes: () => api.get('/insurance/policy-types'),
  getViolationCodes: () => api.get('/insurance/violation-codes'),
};

export default insuranceService;
