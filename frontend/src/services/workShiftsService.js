/**
 * Work Shifts & Overtime Service — خدمة جداول الدوام والوقت الإضافي
 * Connects to: /api/v1/work-shifts
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  (fn, fallback = null) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('workShiftsService fallback:', e.message);
      return fallback;
    }
  };

const BASE = '/api/v1/work-shifts';

// ─── Work Shifts CRUD ────────────────────────────────────────────────────────
export const shiftsService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get(BASE, { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`${BASE}/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post(BASE, data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`${BASE}/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`${BASE}/${id}`);
    return r.data;
  }),
};

// ─── Assignments ──────────────────────────────────────────────────────────────
export const assignmentsService = {
  assign: safe(async data => {
    const r = await apiClient.post(`${BASE}/assignments/assign`, data);
    return r.data;
  }),
  getByEmployee: safe(async employeeId => {
    const r = await apiClient.get(`${BASE}/assignments/${employeeId}/current`);
    return r.data;
  }),
};

// ─── Overtime ─────────────────────────────────────────────────────────────────
export const overtimeService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get(`${BASE}/overtime/list`, { params });
    return r.data;
  }),
  request: safe(async data => {
    const r = await apiClient.post(`${BASE}/overtime`, data);
    return r.data;
  }),
  approve: safe(async (id, data) => {
    const r = await apiClient.post(`${BASE}/overtime/${id}/approve`, data);
    return r.data;
  }),
  reject: safe(async (id, data) => {
    const r = await apiClient.post(`${BASE}/overtime/${id}/reject`, data);
    return r.data;
  }),
};
