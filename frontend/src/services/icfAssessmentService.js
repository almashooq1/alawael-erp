/**
 * ICF Assessment Service
 * خدمة تقييمات ICF - API Client
 */
import apiClient from './api.client';

const BASE_URL = '/api/v1/icf-assessments';

export const assessmentsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE_URL, { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  getByPatient: async (beneficiaryId, params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/beneficiary/${beneficiaryId}`, { params });
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  submit: async (id) => {
    const response = await apiClient.post(`${BASE_URL}/${id}/submit`);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  getProgress: async (beneficiaryId, timeRange = '6months') => {
    const response = await apiClient.get(`${BASE_URL}/beneficiary/${beneficiaryId}/progress`, {
      params: { timeRange },
    });
    return response.data;
  },

  compare: async (id, otherId) => {
    const response = await apiClient.get(`${BASE_URL}/${id}/compare/${otherId}`);
    return response.data;
  },

  generateGoals: async (id, carePlanVersionId = null) => {
    const response = await apiClient.post(`${BASE_URL}/${id}/generate-goals`, {
      carePlanVersionId,
    });
    return response.data;
  },

  getRecommendations: async (id) => {
    const response = await apiClient.get(`${BASE_URL}/${id}/recommendations`);
    return response.data;
  },

  createCarePlan: async (id) => {
    const response = await apiClient.post(`${BASE_URL}/${id}/create-care-plan`);
    return response.data;
  },

  exportToDocument: async (id) => {
    const response = await apiClient.post(`${BASE_URL}/${id}/export-to-document`);
    return response.data;
  },
};

export const reportsService = {
  getStatistics: async (params = {}) => {
    const response = await apiClient.get(`${BASE_URL}/stats/overview`, { params });
    return response.data;
  },

  generateReport: async (assessmentId, format = 'pdf') => {
    const response = await apiClient.get(`${BASE_URL}/${assessmentId}/report`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default { assessmentsService, reportsService };
