/**
 * cctvService.js — CCTV Monitoring Frontend Service
 * ══════════════════════════════════════════════════
 * API wrapper for the CCTV integration endpoints.
 */

import apiClient from './api.client';
import { withMockFallback } from './api';

const BASE = '/cctv/integration';

export const cctvService = {
  // ─── Camera List ──────────────────────────────────────────────────────────
  getCameras: (branchId) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/cameras`, { params: { branchId } }),
      { data: [], _isFallback: true }
    ),

  // ─── Live Feed ────────────────────────────────────────────────────────────
  getLiveFeed: (cameraId) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/cameras/${cameraId}/feed`),
      { data: { streams: [], placeholder: true }, _isFallback: true }
    ),

  // ─── Recordings ────────────────────────────────────────────────────────────
  getRecordings: (cameraId, startDate, endDate) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/recordings`, { params: { cameraId, startDate, endDate } }),
      { data: [], _isFallback: true }
    ),

  // ─── Face Recognition Log ─────────────────────────────────────────────────
  getFaceRecognitionLog: (beneficiaryId, startDate, endDate) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/face-recognition`, { params: { beneficiaryId, startDate, endDate } }),
      { data: [], _isFallback: true }
    ),

  // ─── Attendance from CCTV ─────────────────────────────────────────────────
  getAttendance: (beneficiaryId, date) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/attendance`, { params: { beneficiaryId, date } }),
      { data: { present: false, detectionCount: 0 }, _isFallback: true }
    ),

  // ─── Security Alerts ─────────────────────────────────────────────────────
  getAlerts: (startDate, endDate) =>
    withMockFallback(
      () => apiClient.get(`${BASE}/alerts`, { params: { startDate, endDate } }),
      { data: [], _isFallback: true }
    ),

  // ─── Analytics ───────────────────────────────────────────────────────────
  getAnalytics: (branchId, period = 'today') =>
    withMockFallback(
      () => apiClient.get(`${BASE}/analytics`, { params: { branchId, period } }),
      { data: { peopleCountTrend: [], heatmap: [], peakHours: [], summary: {} }, _isFallback: true }
    ),
};

export default cctvService;
