/**
 * Clinical Dashboard Service
 * خدمة لوحة التحكم السريرية — API Client
 */
import apiClient from './api.client';

const BASE_URL = '/api/v1/clinical';

export const clinicalDashboardService = {
  /**
   * Get unified clinical dashboard for a beneficiary
   */
  getDashboard: async (beneficiaryId) => {
    const response = await apiClient.get(`${BASE_URL}/dashboard/${beneficiaryId}`);
    return response.data;
  },
};

export const integratedReportService = {
  /**
   * Generate integrated report for a beneficiary
   */
  generateReport: async (beneficiaryId, options = {}) => {
    const response = await apiClient.post(`${BASE_URL}/reports/${beneficiaryId}`, options);
    return response.data;
  },

  /**
   * Preview report (returns HTML + JSON)
   */
  previewReport: async (beneficiaryId, params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/reports/${beneficiaryId}/preview`, { params });
    return response.data;
  },
};

export const sessionICFService = {
  /**
   * Get ICF targets for a session
   */
  getSessionTargets: async (sessionId) => {
    const response = await apiClient.get(`${BASE_URL}/sessions/${sessionId}/icf-targets`);
    return response.data;
  },

  /**
   * Record ICF progress during a session
   */
  recordProgress: async (sessionId, progressData) => {
    const response = await apiClient.post(`${BASE_URL}/sessions/${sessionId}/icf-progress`, {
      progressData,
    });
    return response.data;
  },

  /**
   * Get ICF progress history for a goal
   */
  getGoalProgress: async (goalId, timeRange = '3months') => {
    const response = await apiClient.get(`${BASE_URL}/goals/${goalId}/icf-progress`, {
      params: { timeRange },
    });
    return response.data;
  },

  /**
   * Auto-link session to ICF goals
   */
  autoLinkSession: async (sessionId) => {
    const response = await apiClient.post(`${BASE_URL}/sessions/${sessionId}/auto-link-icf`);
    return response.data;
  },
};

export default {
  clinicalDashboardService,
  integratedReportService,
  sessionICFService,
};
