/**
 * Document Hub API
 * ================
 * خدمة موحدة للتعامل مع واجهة Document Hub API.
 */

import apiClient from './api.client';
import { triggerBlobDownload } from 'utils/downloadHelper';

const documentHubApi = {
  upload: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        formData.append(key, value.join(','));
      } else {
        formData.append(key, String(value));
      }
    });

    return apiClient.post('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
  },

  getDocuments: async (filters = {}) => {
    return apiClient.get('/api/v1/documents', { params: filters });
  },

  getDocument: async id => {
    return apiClient.get(`/api/v1/documents/${id}`);
  },

  download: async (id, fileName) => {
    const data = await apiClient.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob',
    });
    triggerBlobDownload(data, fileName);
  },

  previewUrl: id => `/api/v1/documents/${id}/preview`,

  share: async (id, payload) => {
    return apiClient.post(`/api/v1/documents/${id}/share`, payload);
  },

  link: async (id, entityType, entityId, sourceModule) => {
    return apiClient.post(`/api/v1/documents/${id}/link`, {
      entityType,
      entityId,
      sourceModule,
    });
  },

  unlink: async (id, entityType, entityId) => {
    return apiClient.post(`/api/v1/documents/${id}/unlink`, { entityType, entityId });
  },

  getEntityDocuments: async (entityType, entityId, filters = {}) => {
    return apiClient.get(`/api/v1/documents/entity/${entityType}/${entityId}`, {
      params: filters,
    });
  },

  delete: async id => {
    return apiClient.delete(`/api/v1/documents/${id}`);
  },

  archive: async id => {
    return apiClient.post(`/api/v1/documents/${id}/archive`);
  },
};

export default documentHubApi;
