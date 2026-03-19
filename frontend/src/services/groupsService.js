/**
 * Groups Service
 * خدمة المجموعات
 *
 * Maps to backend: /api/groups/*
 */

import api from './api.client';

const groupsService = {
  // ==================== GROUPS CRUD ====================
  getAll: async (params = {}) => api.get('/groups', { params }),
  getById: async id => api.get(`/groups/${id}`),
  create: async data => api.post('/groups', data),
  update: async (id, data) => api.put(`/groups/${id}`, data),
  delete: async id => api.delete(`/groups/${id}`),

  // ==================== MEMBERS ====================
  addMember: async (groupId, member) => api.post(`/groups/${groupId}/members`, member),
  removeMember: async (groupId, memberIndex) =>
    api.delete(`/groups/${groupId}/members/${memberIndex}`),

  // ==================== CONTACTS ====================
  getContacts: async () => api.get('/groups/contacts'),
};

export default groupsService;
