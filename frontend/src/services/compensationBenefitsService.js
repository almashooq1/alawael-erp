/**
 * Compensation & Benefits Service — خدمة الرواتب والمزايا
 * Connects to: /api/v1/compensation-benefits
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  (fn, fallback = null) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('compensationBenefitsService fallback:', e.message);
      return fallback;
    }
  };

const BASE = '/api/v1/compensation-benefits';

// ─── Salary Structures ────────────────────────────────────────────────────────
export const salaryStructuresService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get(`${BASE}/salary-structures`, { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post(`${BASE}/salary-structures`, data);
    return r.data;
  }),
};

// ─── Benefits Packages ────────────────────────────────────────────────────────
export const benefitsPackagesService = {
  getAll: safe(async () => {
    const r = await apiClient.get(`${BASE}/benefits-packages`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post(`${BASE}/benefits-packages`, data);
    return r.data;
  }),
};

// ─── Employee Enrollment ──────────────────────────────────────────────────────
export const enrollmentService = {
  getByEmployee: safe(async employeeId => {
    const r = await apiClient.get(`${BASE}/enrollment/${employeeId}`);
    return r.data;
  }),
  enroll: safe(async data => {
    const r = await apiClient.post(`${BASE}/enrollment`, data);
    return r.data;
  }),
};

// ─── Payroll Runs ─────────────────────────────────────────────────────────────
export const payrollRunsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get(`${BASE}/payroll-runs`, { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post(`${BASE}/payroll-runs`, data);
    return r.data;
  }),
  approve: safe(async id => {
    const r = await apiClient.patch(`${BASE}/payroll-runs/${id}/approve`);
    return r.data;
  }),
};
