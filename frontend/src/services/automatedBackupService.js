/**
 * AL-AWAEL ERP — Automated Backup Frontend Service
 * Phase 23 — خدمة النسخ الاحتياطي التلقائي
 *
 * Uses the shared apiClient (axios) for consistent auth, retry,
 * deduplication, and base URL configuration.
 */

import apiClient from './api.client';

const BASE = '/api/automated-backup';

const automatedBackupService = {
  /* ── Backups ── */
  createBackup: data => apiClient.post(BASE, data).then(r => r.data),

  listBackups: (params = {}) => apiClient.get(BASE, { params }).then(r => r.data),

  getBackup: id => apiClient.get(`${BASE}/${id}`).then(r => r.data),

  deleteBackup: id => apiClient.delete(`${BASE}/${id}`).then(r => r.data),

  verifyBackup: id => apiClient.post(`${BASE}/${id}/verify`).then(r => r.data),

  /* ── Schedules ── */
  listSchedules: () => apiClient.get(`${BASE}/schedules/list`).then(r => r.data),

  upsertSchedule: data => apiClient.post(`${BASE}/schedules`, data).then(r => r.data),

  toggleSchedule: (id, enabled) =>
    apiClient.put(`${BASE}/schedules/${id}/toggle`, { enabled }).then(r => r.data),

  deleteSchedule: id => apiClient.delete(`${BASE}/schedules/${id}`).then(r => r.data),

  /* ── Storage Targets ── */
  listStorageTargets: () => apiClient.get(`${BASE}/storage/targets`).then(r => r.data),

  upsertStorageTarget: data => apiClient.post(`${BASE}/storage/targets`, data).then(r => r.data),

  testStorageTarget: id => apiClient.post(`${BASE}/storage/targets/${id}/test`).then(r => r.data),

  removeStorageTarget: id => apiClient.delete(`${BASE}/storage/targets/${id}`).then(r => r.data),

  /* ── Restore ── */
  restoreBackup: (id, data = {}) => apiClient.post(`${BASE}/restore/${id}`, data).then(r => r.data),

  listRestoreHistory: (params = {}) =>
    apiClient.get(`${BASE}/restore/history`, { params }).then(r => r.data),

  /* ── Health & Analytics ── */
  getHealth: () => apiClient.get(`${BASE}/health`).then(r => r.data),

  getAnalytics: (params = {}) => apiClient.get(`${BASE}/analytics`, { params }).then(r => r.data),

  runCleanup: () => apiClient.post(`${BASE}/cleanup`).then(r => r.data),

  /* ── Configuration ── */
  getConfig: () => apiClient.get(`${BASE}/config`).then(r => r.data),

  updateConfig: data => apiClient.put(`${BASE}/config`, data).then(r => r.data),
};

export default automatedBackupService;
