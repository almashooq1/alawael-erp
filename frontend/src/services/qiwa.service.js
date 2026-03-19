/**
 * Qiwa (منصة قوى) — Frontend Service
 *
 * Ministry of Human Resources integration:
 * employee verification, contracts, WPS,
 * Nitaqat, health & metrics.
 */
import api from './api.client';

const qiwaService = {
  /* ── Employees & Verification ── */
  getEmployees: params => api.get('/qiwa/employees', { params }),
  verifyEmployee: data => api.post('/qiwa/employees/verify', data),
  getLaborRecord: iqama => api.get(`/qiwa/employees/${iqama}/labor-record`),
  getWageHistory: (iqama, months) =>
    api.get(`/qiwa/employees/${iqama}/wage-history`, { params: { months } }),

  /* ── Contracts ── */
  getContracts: params => api.get('/qiwa/contracts', { params }),
  getContract: id => api.get(`/qiwa/contracts/${id}`),
  registerContract: data => api.post('/qiwa/contracts/register', data),
  terminateContract: (id, data) => api.post(`/qiwa/contracts/${id}/terminate`, data),

  /* ── WPS ── */
  submitWPS: data => api.post('/qiwa/wps/submit', data),
  getWPSStatus: id => api.get(`/qiwa/wps/${id}/status`),
  getWPSCompliance: period => api.get('/qiwa/wps/compliance-report', { params: { period } }),

  /* ── Nitaqat ── */
  getNitaqatStatus: () => api.get('/qiwa/nitaqat/status'),
  getNitaqatCompliance: () => api.get('/qiwa/nitaqat/compliance'),

  /* ── Health ── */
  getHealth: () => api.get('/qiwa/health'),
  getMetrics: () => api.get('/qiwa/metrics'),
};

export default qiwaService;
