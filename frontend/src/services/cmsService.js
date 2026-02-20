// CMS Service
import apiClient from './apiClient';

const cmsService = {
  // Get all content
  getContent: async (params = {}) => {
    return await apiClient.get('/cms/content', { params });
  },

  // Get content by ID
  getContentById: async contentId => {
    return await apiClient.get(`/cms/content/${contentId}`);
  },

  // Create content
  createContent: async contentData => {
    return await apiClient.post('/cms/content', contentData);
  },

  // Update content
  updateContent: async (contentId, contentData) => {
    return await apiClient.put(`/cms/content/${contentId}`, contentData);
  },

  // Delete content
  deleteContent: async contentId => {
    return await apiClient.delete(`/cms/content/${contentId}`);
  },

  // Publish content
  publishContent: async contentId => {
    return await apiClient.patch(`/cms/content/${contentId}/publish`);
  },

  // Upload media
  uploadMedia: async formData => {
    return await apiClient.post('/cms/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get media library
  getMediaLibrary: async (params = {}) => {
    return await apiClient.get('/cms/media', { params });
  },
};

export default cmsService;
