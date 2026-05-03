/**
 * Attendance Management Service — خدمة نظام الحضور والانصراف الذكي
 *
 * Wraps all 14 backend endpoints under /api/v1/attendance-mgmt
 */
import apiClient from '../api.client';

const BASE = '/api/v1/attendance-mgmt';

/* ─── helper ────────────────────────────────────────────────────────────── */
async function call(method, url, data) {
  const res = await apiClient({ method, url: `${BASE}${url}`, data });
  return res?.data ?? res;
}

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
/** KPI snapshot + weekly trend + department breakdown */
export const getDashboard = ({ branchId, department } = {}) => {
  const p = new URLSearchParams();
  if (branchId) p.set('branchId', branchId);
  if (department) p.set('department', department);
  return call('GET', `/dashboard${p.toString() ? `?${p}` : ''}`);
};

/* ─── Today ─────────────────────────────────────────────────────────────── */
/** Today's attendance list */
export const getToday = ({ page = 1, limit = 20, status, department } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (status) p.set('status', status);
  if (department) p.set('department', department);
  return call('GET', `/today?${p}`);
};

/* ─── Check-in / Check-out ──────────────────────────────────────────────── */
/** Employee check-in with optional GPS */
export const checkIn = ({ lat, lng, notes } = {}) =>
  call('POST', '/check-in', { location: lat ? { lat, lng } : undefined, notes });

/** Employee check-out */
export const checkOut = ({ notes } = {}) => call('POST', '/check-out', { notes });

/* ─── Manual record (admin) ─────────────────────────────────────────────── */
export const createManualRecord = payload => call('POST', '/manual', payload);

/* ─── Employee history ──────────────────────────────────────────────────── */
export const getEmployeeHistory = (employeeId, { page = 1, limit = 30, month, year } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (month) p.set('month', month);
  if (year) p.set('year', year);
  return call('GET', `/employee/${employeeId}/history?${p}`);
};

/* ─── Monthly report ────────────────────────────────────────────────────── */
export const getMonthlyReport = ({ month, year, department, page = 1, limit = 50 } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (month) p.set('month', month);
  if (year) p.set('year', year);
  if (department) p.set('department', department);
  return call('GET', `/report/monthly?${p}`);
};

/* ─── Leave requests ────────────────────────────────────────────────────── */
export const submitLeaveRequest = payload => call('POST', '/leave/request', payload);

export const getLeaveRequests = ({ status, page = 1, limit = 20 } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (status) p.set('status', status);
  return call('GET', `/leave/requests?${p}`);
};

export const processLeaveDecision = (leaveId, decision, notes = '') =>
  call('PATCH', `/leave/${leaveId}/decision`, { decision, notes });

/* ─── Analytics ─────────────────────────────────────────────────────────── */
/** General analytics for last N days */
export const getAnalytics = ({ period = 30, department } = {}) => {
  const p = new URLSearchParams({ period });
  if (department) p.set('department', department);
  return call('GET', `/analytics?${p}`);
};

/* ─── Pattern analysis (AI) ─────────────────────────────────────────────── */
/** Deep behavior pattern analysis for a single employee */
export const getEmployeePatterns = (employeeId, months = 3) =>
  call('GET', `/patterns/${employeeId}?months=${months}`);

/* ─── Shifts reference ──────────────────────────────────────────────────── */
export const getShifts = () => call('GET', '/shifts');

/* ─── Export ────────────────────────────────────────────────────────────── */
export const exportMonthly = ({ month, year, department, format = 'json' } = {}) => {
  const p = new URLSearchParams({ format });
  if (month) p.set('month', month);
  if (year) p.set('year', year);
  if (department) p.set('department', department);
  return call('GET', `/export/monthly?${p}`);
};

/* ─── Leave balance ─────────────────────────────────────────────────────── */
export const getLeaveBalance = ({ employeeId, year } = {}) => {
  const p = new URLSearchParams();
  if (employeeId) p.set('employeeId', employeeId);
  if (year) p.set('year', year);
  const qs = p.toString();
  return call('GET', `/leave/balance${qs ? `?${qs}` : ''}`);
};

/* ─── Overtime ──────────────────────────────────────────────────────────── */
export const submitOvertimeRequest = payload => call('POST', '/overtime/request', payload);

export const getOvertimeRequests = ({ status, page, limit } = {}) => {
  const p = new URLSearchParams();
  if (status) p.set('status', status);
  if (page) p.set('page', page);
  if (limit) p.set('limit', limit);
  const qs = p.toString();
  return call('GET', `/overtime/requests${qs ? `?${qs}` : ''}`);
};

export const processOvertimeDecision = (overtimeId, decision) =>
  call('PATCH', `/overtime/${overtimeId}/decision`, { decision });

export default {
  getDashboard,
  getToday,
  checkIn,
  checkOut,
  createManualRecord,
  getEmployeeHistory,
  getMonthlyReport,
  submitLeaveRequest,
  getLeaveRequests,
  processLeaveDecision,
  getAnalytics,
  getEmployeePatterns,
  getShifts,
  exportMonthly,
  getLeaveBalance,
  submitOvertimeRequest,
  getOvertimeRequests,
  processOvertimeDecision,
};
