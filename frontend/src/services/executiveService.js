/**
 * Executive Dashboard Service — خدمة لوحة القيادة التنفيذية
 * Frontend API layer
 */
import api from './api';

const BASE = '/api/v1/executive';

const executiveService = {
  /* ── Executive Overview ── */
  getOverview: (branchId = null) =>
    api.get(`${BASE}/overview`, { params: branchId ? { branchId } : {} }),

  /* ── Branch Comparison ── */
  getBranches: () => api.get(`${BASE}/branches`),

  /* ── Financial Summary ── */
  getFinancial: (startDate, endDate) =>
    api.get(`${BASE}/financial`, { params: { startDate, endDate } }),

  /* ── Staff Performance ── */
  getStaff: () => api.get(`${BASE}/staff`),
};

export default executiveService;
