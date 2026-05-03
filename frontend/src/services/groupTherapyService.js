/**
 * Group Therapy Service
 * خدمة العلاج الجماعي
 */
import apiClient from 'services/api.client';

const BASE = '/group-programs';

const groupTherapyService = {
  // ── Programs ────────────────────────────────────────────────
  getAll: (params = {}) => apiClient.get(BASE, { params }),
  getById: id => apiClient.get(`${BASE}/${id}`),
  create: data => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove: id => apiClient.delete(`${BASE}/${id}`),

  // ── Students ─────────────────────────────────────────────────
  addStudents: (id, studentIds) => apiClient.post(`${BASE}/${id}/students`, { studentIds }),
  removeStudent: (id, studentId) => apiClient.delete(`${BASE}/${id}/students/${studentId}`),

  // ── Sessions ─────────────────────────────────────────────────
  getSessions: id => apiClient.get(`${BASE}/${id}/sessions`),
  logSession: (id, data) => apiClient.post(`${BASE}/${id}/sessions`, data),
};

export default groupTherapyService;
