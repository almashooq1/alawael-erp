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

const BASE = '/api/v1/insurance';

const insuranceService = {
  // ─── CRUD الوثائق ────────────────────────────────────────────────────
  getPolicies: params => api.get(BASE, { params }),
  getPolicy: id => api.get(`${BASE}/${id}`),
  createPolicy: data => api.post(BASE, data),
  updatePolicy: (id, data) => api.put(`${BASE}/${id}`, data),
  deletePolicy: id => api.delete(`${BASE}/${id}`),

  // ─── الإحصائيات والتقارير ─────────────────────────────────────────────
  getStatistics: () => api.get(`${BASE}/statistics`),
  getExpiringPolicies: (days = 30) => api.get(`${BASE}/expiring`, { params: { days } }),

  // ─── المطالبات ────────────────────────────────────────────────────────
  getPolicyClaims: policyId => api.get(`${BASE}/${policyId}/claims`),
  addClaim: (policyId, data) => api.post(`${BASE}/${policyId}/claims`, data),
  updateClaimStatus: (policyId, claimId, data) =>
    api.put(`${BASE}/${policyId}/claims/${claimId}`, data),

  // ─── التجديد وعروض الأسعار ───────────────────────────────────────────
  renewPolicy: (policyId, data) => api.post(`${BASE}/${policyId}/renew`, data),
  getQuote: data => api.post(`${BASE}/quote`, data),

  // ─── التأمين حسب المركبة ──────────────────────────────────────────────
  getVehicleInsurance: vehicleId => api.get(`${BASE}/vehicle/${vehicleId}`),

  // ─── البيانات المرجعية ────────────────────────────────────────────────
  getCompanies: () => api.get(`${BASE}/companies`),
  getPolicyTypes: () => api.get(`${BASE}/policy-types`),
  getViolationCodes: () => api.get(`${BASE}/violation-codes`),
};

export default insuranceService;
