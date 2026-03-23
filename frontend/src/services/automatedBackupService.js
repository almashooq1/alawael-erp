/**
 * AL-AWAEL ERP — Automated Backup Frontend Service
 * Phase 23 — خدمة النسخ الاحتياطي التلقائي
 */

import axios from 'axios';

const API =
  process.env.REACT_APP_API_URL || window.REACT_APP_API_URL || '';
const BASE = `${API}/api/automated-backup`;

const headers = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const automatedBackupService = {
  /* ── Backups ── */
  createBackup: data =>
    axios.post(BASE, data, { headers: headers() }).then(r => r.data),

  listBackups: (params = {}) =>
    axios.get(BASE, { params, headers: headers() }).then(r => r.data),

  getBackup: id =>
    axios.get(`${BASE}/${id}`, { headers: headers() }).then(r => r.data),

  deleteBackup: id =>
    axios.delete(`${BASE}/${id}`, { headers: headers() }).then(r => r.data),

  verifyBackup: id =>
    axios.post(`${BASE}/${id}/verify`, {}, { headers: headers() }).then(r => r.data),

  /* ── Schedules ── */
  listSchedules: () =>
    axios.get(`${BASE}/schedules/list`, { headers: headers() }).then(r => r.data),

  upsertSchedule: data =>
    axios.post(`${BASE}/schedules`, data, { headers: headers() }).then(r => r.data),

  toggleSchedule: (id, enabled) =>
    axios.put(`${BASE}/schedules/${id}/toggle`, { enabled }, { headers: headers() }).then(r => r.data),

  deleteSchedule: id =>
    axios.delete(`${BASE}/schedules/${id}`, { headers: headers() }).then(r => r.data),

  /* ── Storage Targets ── */
  listStorageTargets: () =>
    axios.get(`${BASE}/storage/targets`, { headers: headers() }).then(r => r.data),

  upsertStorageTarget: data =>
    axios.post(`${BASE}/storage/targets`, data, { headers: headers() }).then(r => r.data),

  testStorageTarget: id =>
    axios.post(`${BASE}/storage/targets/${id}/test`, {}, { headers: headers() }).then(r => r.data),

  removeStorageTarget: id =>
    axios.delete(`${BASE}/storage/targets/${id}`, { headers: headers() }).then(r => r.data),

  /* ── Restore ── */
  restoreBackup: (id, data = {}) =>
    axios.post(`${BASE}/restore/${id}`, data, { headers: headers() }).then(r => r.data),

  listRestoreHistory: (params = {}) =>
    axios.get(`${BASE}/restore/history`, { params, headers: headers() }).then(r => r.data),

  /* ── Health & Analytics ── */
  getHealth: () =>
    axios.get(`${BASE}/health`, { headers: headers() }).then(r => r.data),

  getAnalytics: (params = {}) =>
    axios.get(`${BASE}/analytics`, { params, headers: headers() }).then(r => r.data),

  runCleanup: () =>
    axios.post(`${BASE}/cleanup`, {}, { headers: headers() }).then(r => r.data),

  /* ── Configuration ── */
  getConfig: () =>
    axios.get(`${BASE}/config`, { headers: headers() }).then(r => r.data),

  updateConfig: data =>
    axios.put(`${BASE}/config`, data, { headers: headers() }).then(r => r.data),
};

export default automatedBackupService;
