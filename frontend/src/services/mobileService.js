/**
 * mobileService.js
 * Simple wrapper around existing services for mobile consumption
 */

import sessionsService from './sessions.service';
import apiClient from './api.client';
import logger from 'utils/logger';
import { withMockFallback } from './api';

/**
 * Mobile-optimized service layer
 * Wraps existing services with mobile-specific helpers
 */
export const mobileService = {
  /* ─── Sessions ────────────────────────────────────────────────────── */
  sessions: {
    getToday: () =>
      withMockFallback(
        () => sessionsService.getAll(),
        { data: [], _isFallback: true }
      ),
    getStats: () =>
      withMockFallback(
        () => sessionsService.getStats(),
        { data: null, _isFallback: true }
      ),
    complete: (sessionId) => apiClient.patch(`/api/v1/sessions/${sessionId}/complete`),
    start: (sessionId) => apiClient.patch(`/api/v1/sessions/${sessionId}/start`),
    reschedule: (sessionId, newTime) =>
      apiClient.patch(`/api/v1/sessions/${sessionId}/reschedule`, { newTime }),
  },

  /* ─── Beneficiaries ─────────────────────────────────────────────── */
  beneficiaries: {
    getAll: () =>
      withMockFallback(
        () => apiClient.get('/api/v1/beneficiaries'),
        { data: [], _isFallback: true }
      ),
    getById: (id) =>
      withMockFallback(
        () => apiClient.get(`/api/v1/beneficiaries/${id}`),
        { data: null, _isFallback: true }
      ),
    getICFHistory: (id) =>
      withMockFallback(
        () => apiClient.get(`/api/v1/beneficiaries/${id}/icf-history`),
        { data: [], _isFallback: true }
      ),
  },

  /* ─── Notifications ───────────────────────────────────────────────── */
  notifications: {
    getAll: () =>
      withMockFallback(
        () => apiClient.get('/api/v1/notifications'),
        { data: [], _isFallback: true }
      ),
    markRead: (id) => apiClient.patch(`/api/v1/notifications/${id}/read`),
    markAllRead: () => apiClient.post('/api/v1/notifications/mark-all-read'),
    delete: (id) => apiClient.delete(`/api/v1/notifications/${id}`),
  },

  /* ─── User Profile ────────────────────────────────────────────────── */
  profile: {
    get: () =>
      withMockFallback(
        () => apiClient.get('/api/v1/profile'),
        { data: null, _isFallback: true }
      ),
  },

  /* ─── Dashboard Summary ──────────────────────────────────────────── */
  dashboard: {
    getSummary: () =>
      withMockFallback(
        () => apiClient.get('/api/v1/dashboard/summary'),
        { data: null, _isFallback: true }
      ),
  },
};

export default mobileService;
