/**
 * Parent Portal Service
 * خدمة بوابة أولياء الأمور — API Client
 */
import apiClient from './api.client';

const BASE_URL = '/api/v1/parent-portal';

export const parentPortalService = {
  getOverview: async (beneficiaryId) => {
    const response = await apiClient.get(`${BASE_URL}/overview/${beneficiaryId}`);
    return response.data;
  },

  getProgress: async (beneficiaryId, months = 6) => {
    const response = await apiClient.get(`${BASE_URL}/progress/${beneficiaryId}`, {
      params: { months },
    });
    return response.data;
  },

  getHomePrograms: async (beneficiaryId) => {
    const response = await apiClient.get(`${BASE_URL}/home-programs/${beneficiaryId}`);
    return response.data;
  },

  sendMessage: async (beneficiaryId, message) => {
    const response = await apiClient.post(`${BASE_URL}/messages`, { beneficiaryId, message });
    return response.data;
  },

  getNotifications: async (beneficiaryId) => {
    const response = await apiClient.get(`${BASE_URL}/notifications/${beneficiaryId}`);
    return response.data;
  },

  getReports: async (beneficiaryId) => {
    const response = await apiClient.get(`${BASE_URL}/reports/${beneficiaryId}`);
    return response.data;
  },
};

export default { parentPortalService };
