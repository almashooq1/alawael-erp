/**
 * Attendance Service — Check-in/out, reports, history, corrections
 * خدمات الحضور والانصراف - التسجيل والتقارير والتعديلات
 */
import { safeFetch } from './safeFetch';
import { DEMO_ATTENDANCE } from './demoData';

// ══════════════════════════════════════════════════════════════
//  الحضور اليومي
// ══════════════════════════════════════════════════════════════

/** جلب سجلات حضور يوم محدد */
export const getAttendance = date => {
  const d = date || new Date().toISOString().split('T')[0];
  return safeFetch(`/hr-system/attendance?date=${d}`, DEMO_ATTENDANCE);
};

/** تسجيل حضور */
export const checkIn = (location = { lat: 0, lng: 0 }) =>
  safeFetch('/hr-system/attendance/checkin', null, { method: 'POST', body: { location } });

/** تسجيل انصراف */
export const checkOut = (location = { lat: 0, lng: 0 }) =>
  safeFetch('/hr-system/attendance/checkout', null, { method: 'POST', body: { location } });

// ══════════════════════════════════════════════════════════════
//  التقارير الشهرية
// ══════════════════════════════════════════════════════════════

/** التقرير الشهري الشخصي */
export const getMonthlyReport = (month, year) =>
  safeFetch(`/smart-attendance/monthly/${month}/${year}`, null);

/** إحصائيات الحضور الشخصية */
export const getMyStats = (month, year) => {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (year) params.set('year', year);
  return safeFetch(`/smart-attendance/stats?${params}`, null);
};

/** تقرير شامل (مدير/HR) */
export const getComprehensiveReport = (startDate, endDate, department) => {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (department) params.set('department', department);
  return safeFetch(`/smart-attendance/report/comprehensive?${params}`, null);
};

// ══════════════════════════════════════════════════════════════
//  سجل الموظف (مدير/HR)
// ══════════════════════════════════════════════════════════════

/** جلب سجل حضور موظف */
export const getEmployeeAttendance = (employeeId, month, year, limit = 30) => {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (year) params.set('year', year);
  if (limit) params.set('limit', limit);
  return safeFetch(`/smart-attendance/employee/${employeeId}?${params}`, []);
};

// ══════════════════════════════════════════════════════════════
//  تعديل السجلات (مدير/HR)
// ══════════════════════════════════════════════════════════════

/** تعديل سجل حضور يدوياً */
export const updateAttendanceRecord = (attendanceId, data) =>
  safeFetch(`/smart-attendance/${attendanceId}`, null, { method: 'PUT', body: data });

/** الموافقة على سجل */
export const approveAttendance = (attendanceId, notes) =>
  safeFetch(`/smart-attendance/${attendanceId}/approve`, null, { method: 'POST', body: { notes } });

/** رفض سجل */
export const rejectAttendance = (attendanceId, reason) =>
  safeFetch(`/smart-attendance/${attendanceId}/reject`, null, { method: 'POST', body: { reason } });
