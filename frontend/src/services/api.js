/**
 * Centralized API Service Layer
 * واجهة مركزية للتواصل مع جميع APIs
 *
 * Exports named API groups for specific domains:
 *   dashboardAPI, modulesAPI, searchAPI, validationAPI, adminAPI
 * Also exports withMockFallback for graceful degradation.
 */

import apiClient from './api.client';

// ==================== Helper ====================

/**
 * Wraps an API call so that if it fails, the provided fallback value is returned.
 * Enables the UI to work even when the backend endpoint is unavailable.
 *
 * @param {Function} apiFn - Async function that calls the API
 * @param {*} fallback - Value returned when the call fails
 */
export const withMockFallback = async (apiFn, fallback) => {
  try {
    const result = await apiFn();
    return result;
  } catch (_err) {
    if (typeof window !== 'undefined' && window.__DEV_LOGGER__) {
      window.__DEV_LOGGER__.warn?.('API call failed, using fallback data');
    }
    return { ...fallback, _isFallback: true };
  }
};

// ==================== Dashboard API ====================

export const dashboardAPI = {
  getHealth: () => apiClient.get('/dashboard/health'),
  getSummary: () => apiClient.get('/dashboard/summary'),
  getSummarySystems: () => apiClient.get('/dashboard/summary-systems'),
  getServices: () => apiClient.get('/dashboard/services'),
  getTopKPIs: (limit = 4) => apiClient.get(`/dashboard/top-kpis?limit=${limit}`),
};

// ==================== Modules API ====================

export const modulesAPI = {
  getModuleData: moduleKey => apiClient.get(`/modules/${moduleKey}`),
  getModules: () => apiClient.get('/modules'),
};

// ==================== Search API ====================

export const searchAPI = {
  fullText: query => apiClient.get('/search', { params: { q: query, type: 'full-text' } }),
  fuzzy: query => apiClient.get('/search', { params: { q: query, type: 'fuzzy' } }),
  suggestions: query => apiClient.get('/search/suggestions', { params: { q: query } }),
};

// ==================== Validation API ====================

export const validationAPI = {
  email: value => apiClient.get('/validate/email', { params: { value } }),
  phone: value => apiClient.get('/validate/phone', { params: { value } }),
  url: value => apiClient.get('/validate/url', { params: { value } }),
  schema: value => apiClient.post('/validate/schema', value),
};

// ==================== Admin API ====================

export const adminAPI = {
  getOverview: () => apiClient.get('/admin/overview'),
  getUsers: () => apiClient.get('/admin/users'),
  getAlerts: () => apiClient.get('/admin/alerts'),
};

// ==================== RBAC API ====================

export const rbacAPI = {
  /** Get all roles with labels, levels, hierarchy */
  getRoles: () => apiClient.get('/rbac-admin/roles'),

  /** Get a single role's details + effective permissions */
  getRoleDetail: role => apiClient.get(`/rbac-admin/roles/${role}`),

  /** Get all available resources & actions */
  getPermissions: () => apiClient.get('/rbac-admin/permissions'),

  /** Get a user's effective permissions */
  getUserPermissions: userId => apiClient.get(`/rbac-admin/users/${userId}/permissions`),

  /** Change a user's role */
  updateUserRole: (userId, role) => apiClient.put(`/rbac-admin/users/${userId}/role`, { role }),

  /** Update a user's custom / denied permissions */
  updateUserPermissions: (userId, customPermissions, deniedPermissions) =>
    apiClient.put(`/rbac-admin/users/${userId}/permissions`, {
      customPermissions,
      deniedPermissions,
    }),
};

// Default export = the base apiClient for generic use
export default apiClient;
