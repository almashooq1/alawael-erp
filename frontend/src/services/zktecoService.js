/**
 * ZKTeco Service - خدمة الواجهة الأمامية لأجهزة ZKTeco
 * التواصل مع API أجهزة البصمة
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const BASE = '/zkteco';

/**
 * Wrapper آمن للاتصال بالخادم — بدون بيانات تجريبية
 */
async function safeCall(fn, fallback = null) {
  try {
    const res = await fn();
    const data = res?.data ?? res;
    return { data: data?.data || data, success: data?.success ?? true, isDemo: false };
  } catch (err) {
    logger.error(`ZKTeco API error: ${err?.message}`);
    if (fallback !== null) return { data: fallback, success: false, isDemo: false, error: err?.message };
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  إدارة الأجهزة
// ════════════════════════════════════════════════════════════════════════════════

/** جلب جميع الأجهزة */
export const getDevices = () => safeCall(() => apiClient.get(`${BASE}/devices`), []);

/** جلب جهاز بالمعرف */
export const getDevice = id => safeCall(() => apiClient.get(`${BASE}/devices/${id}`));

/** إضافة جهاز جديد */
export const addDevice = data => safeCall(() => apiClient.post(`${BASE}/devices`, data));

/** تعديل جهاز */
export const updateDevice = (id, data) =>
  safeCall(() => apiClient.put(`${BASE}/devices/${id}`, data));

/** حذف جهاز */
export const deleteDevice = id => safeCall(() => apiClient.delete(`${BASE}/devices/${id}`));

/** إحصائيات الأجهزة */
export const getStats = () => safeCall(() => apiClient.get(`${BASE}/stats`), {});

// ════════════════════════════════════════════════════════════════════════════════
//  الاتصال
// ════════════════════════════════════════════════════════════════════════════════

/** الاتصال بجهاز */
export const connectDevice = id => safeCall(() => apiClient.post(`${BASE}/devices/${id}/connect`));

/** قطع الاتصال */
export const disconnectDevice = id =>
  safeCall(() => apiClient.post(`${BASE}/devices/${id}/disconnect`));

/** اختبار الاتصال */
export const testConnection = (ipAddress, port = 4370) =>
  safeCall(() => apiClient.post(`${BASE}/test-connection`, { ipAddress, port }));

/** جلب وقت الجهاز */
export const getDeviceTime = id => safeCall(() => apiClient.get(`${BASE}/devices/${id}/time`));

// ════════════════════════════════════════════════════════════════════════════════
//  المزامنة
// ════════════════════════════════════════════════════════════════════════════════

/** مزامنة سجلات الحضور من جهاز */
export const syncDevice = id => safeCall(() => apiClient.post(`${BASE}/devices/${id}/sync`));

/** مزامنة جميع الأجهزة */
export const syncAllDevices = () => safeCall(() => apiClient.post(`${BASE}/sync-all`));

/** جلب سجلات المزامنة */
export const getSyncHistory = (id, limit = 20) =>
  safeCall(() => apiClient.get(`${BASE}/devices/${id}/sync-history?limit=${limit}`));

/** تفعيل/تعطيل المزامنة التلقائية */
export const toggleAutoSync = (id, enabled, interval = 15) =>
  safeCall(() => apiClient.post(`${BASE}/devices/${id}/auto-sync`, { enabled, interval }));

// ════════════════════════════════════════════════════════════════════════════════
//  مستخدمو الجهاز
// ════════════════════════════════════════════════════════════════════════════════

/** جلب مستخدمي الجهاز */
export const getDeviceUsers = id =>
  safeCall(() => apiClient.get(`${BASE}/devices/${id}/users`), []);

/** ربط مستخدم بموظف */
export const mapDeviceUser = (deviceId, userId, employeeData) =>
  safeCall(() => apiClient.post(`${BASE}/devices/${deviceId}/users/${userId}/map`, employeeData));

/** إلغاء ربط مستخدم */
export const unmapDeviceUser = (deviceId, userId) =>
  safeCall(() => apiClient.delete(`${BASE}/devices/${deviceId}/users/${userId}/map`));

/** جلب سجلات الحضور الخام */
export const getRawLogs = (id, fromDate, toDate) => {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  return safeCall(() => apiClient.get(`${BASE}/devices/${id}/raw-logs?${params.toString()}`));
};

// ════════════════════════════════════════════════════════════════════════════════
//  مراقبة الصحة (Health Monitoring)
// ════════════════════════════════════════════════════════════════════════════════

/** فحص صحة الاتصالات */
export const healthCheck = () => safeCall(() => apiClient.post(`${BASE}/health-check`));

/** حالة الاتصالات الحالية */
export const getConnections = () => safeCall(() => apiClient.get(`${BASE}/connections`), []);

/** إحصائيات مفصلة */
export const getDetailedStats = () => safeCall(() => apiClient.get(`${BASE}/detailed-stats`), {});

// ════════════════════════════════════════════════════════════════════════════════
//  التصدير
// ════════════════════════════════════════════════════════════════════════════════

const zktecoService = {
  getDevices,
  getDevice,
  addDevice,
  updateDevice,
  deleteDevice,
  getStats,
  connectDevice,
  disconnectDevice,
  testConnection,
  getDeviceTime,
  syncDevice,
  syncAllDevices,
  getSyncHistory,
  toggleAutoSync,
  getDeviceUsers,
  mapDeviceUser,
  unmapDeviceUser,
  getRawLogs,
  healthCheck,
  getConnections,
  getDetailedStats,
};

export default zktecoService;
