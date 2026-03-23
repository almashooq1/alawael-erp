/**
 * HR Attendance Engine Service — خدمة محرك الحضور الموحد
 * ═══════════════════════════════════════════════════════════════════
 * واجهة الاتصال مع API الحضور الموحد الجديد /api/hr-attendance
 * يشمل: تسجيل الحضور، الورديات، التقارير، التصحيحات
 *
 * @module services/hr/attendanceEngineService
 */
import apiClient from '../api.client';
import logger from '../../utils/logger';

const BASE = '/hr-attendance';

/**
 * Wrapper آمن للاتصال
 */
async function safeCall(fn, fallback = null) {
  try {
    const res = await fn();
    const data = res?.data ?? res;
    return { data: data?.data || data, success: data?.success ?? true, isDemo: false };
  } catch (err) {
    logger.warn(`AttendanceEngine API error: ${err?.message}`);
    if (fallback !== null) return { data: fallback, success: false, isDemo: true };
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  تسجيل الحضور والانصراف
// ════════════════════════════════════════════════════════════════════════════════

/** تسجيل حضور */
export const checkIn = (data = {}) =>
  safeCall(() => apiClient.post(`${BASE}/check-in`, data));

/** تسجيل انصراف */
export const checkOut = (data = {}) =>
  safeCall(() => apiClient.post(`${BASE}/check-out`, data));

/** حالة اليوم */
export const getTodayStatus = () =>
  safeCall(() => apiClient.get(`${BASE}/today`), null);

/** سجلاتي */
export const getMyRecords = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return safeCall(() => apiClient.get(`${BASE}/my-records?${qs}`), { records: [], pagination: {} });
};

/** تقريري الشهري */
export const getMyMonthlyReport = (month, year) => {
  const qs = new URLSearchParams();
  if (month) qs.set('month', month);
  if (year) qs.set('year', year);
  return safeCall(() => apiClient.get(`${BASE}/my-monthly-report?${qs}`), null);
};

// ════════════════════════════════════════════════════════════════════════════════
//  لوحة التحكم (Manager/HR)
// ════════════════════════════════════════════════════════════════════════════════

/** لوحة التحكم اليومية */
export const getDashboard = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  return safeCall(() => apiClient.get(`${BASE}/dashboard?${qs}`), {
    records: [],
    stats: {},
    pagination: {},
  });
};

/** إحصائيات سريعة */
export const getQuickStats = () =>
  safeCall(() => apiClient.get(`${BASE}/quick-stats`), {});

// ════════════════════════════════════════════════════════════════════════════════
//  سجلات الموظفين
// ════════════════════════════════════════════════════════════════════════════════

/** سجلات موظف */
export const getEmployeeRecords = (employeeId, params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  return safeCall(
    () => apiClient.get(`${BASE}/employee/${employeeId}/records?${qs}`),
    { records: [], pagination: {} }
  );
};

/** تقرير شهري لموظف */
export const getEmployeeMonthlyReport = (employeeId, month, year) => {
  const qs = new URLSearchParams();
  if (month) qs.set('month', month);
  if (year) qs.set('year', year);
  return safeCall(() => apiClient.get(`${BASE}/employee/${employeeId}/monthly-report?${qs}`));
};

/** وردية موظف */
export const getEmployeeShift = (employeeId) =>
  safeCall(() => apiClient.get(`${BASE}/employee/${employeeId}/shift`));

/** تسجيل حضور يدوي لموظف */
export const manualCheckIn = (employeeId, notes) =>
  safeCall(() => apiClient.post(`${BASE}/employee/${employeeId}/check-in`, { notes }));

// ════════════════════════════════════════════════════════════════════════════════
//  التقارير الشاملة
// ════════════════════════════════════════════════════════════════════════════════

/** تقرير شامل */
export const getComprehensiveReport = (startDate, endDate, department) => {
  const qs = new URLSearchParams();
  if (startDate) qs.set('startDate', startDate);
  if (endDate) qs.set('endDate', endDate);
  if (department) qs.set('department', department);
  return safeCall(() => apiClient.get(`${BASE}/reports/comprehensive?${qs}`), null);
};

// ════════════════════════════════════════════════════════════════════════════════
//  التصحيحات والموافقات
// ════════════════════════════════════════════════════════════════════════════════

/** تعديل سجل */
export const updateRecord = (recordId, data) =>
  safeCall(() => apiClient.put(`${BASE}/records/${recordId}`, data));

/** الموافقة على سجل */
export const approveRecord = (recordId, notes) =>
  safeCall(() => apiClient.post(`${BASE}/records/${recordId}/approve`, { notes }));

/** رفض سجل */
export const rejectRecord = (recordId, reason) =>
  safeCall(() => apiClient.post(`${BASE}/records/${recordId}/reject`, { reason }));

/** السجلات المعلقة */
export const getPendingApprovals = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  return safeCall(
    () => apiClient.get(`${BASE}/pending-approvals?${qs}`),
    { records: [], pagination: {} }
  );
};

// ════════════════════════════════════════════════════════════════════════════════
//  إدارة الورديات
// ════════════════════════════════════════════════════════════════════════════════

/** جلب الورديات */
export const getShifts = () =>
  safeCall(() => apiClient.get(`${BASE}/shifts`), []);

/** إنشاء وردية */
export const createShift = (data) =>
  safeCall(() => apiClient.post(`${BASE}/shifts`, data));

/** تعديل وردية */
export const updateShift = (shiftId, data) =>
  safeCall(() => apiClient.put(`${BASE}/shifts/${shiftId}`, data));

/** تعيين وردية */
export const assignShift = (shiftId, targetType, targetId, targetName) =>
  safeCall(() =>
    apiClient.post(`${BASE}/shifts/${shiftId}/assign`, { targetType, targetId, targetName })
  );

/** ورديتي */
export const getMyShift = () =>
  safeCall(() => apiClient.get(`${BASE}/my-shift`), null);

// ════════════════════════════════════════════════════════════════════════════════
//  التصدير
// ════════════════════════════════════════════════════════════════════════════════

const attendanceEngineService = {
  // Check-in/out
  checkIn,
  checkOut,
  getTodayStatus,
  getMyRecords,
  getMyMonthlyReport,
  // Dashboard
  getDashboard,
  getQuickStats,
  // Employee
  getEmployeeRecords,
  getEmployeeMonthlyReport,
  getEmployeeShift,
  manualCheckIn,
  // Reports
  getComprehensiveReport,
  // Corrections
  updateRecord,
  approveRecord,
  rejectRecord,
  getPendingApprovals,
  // Shifts
  getShifts,
  createShift,
  updateShift,
  assignShift,
  getMyShift,
};

export default attendanceEngineService;
