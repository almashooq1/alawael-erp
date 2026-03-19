import api from './api.client';

const educationService = {
  // Knowledge Base
  getArticles: async () => api.get('/knowledge'),
  getArticle: async id => api.get(`/knowledge/${id}`),
  createArticle: async data => api.post('/knowledge', data),
  updateArticle: async (id, data) => api.put(`/knowledge/${id}`, data),
  deleteArticle: async id => api.delete(`/knowledge/${id}`),

  // CMS
  getContent: async () => api.get('/cms'),
  getContentById: async id => api.get(`/cms/${id}`),
  createContent: async data => api.post('/cms', data),
  updateContent: async (id, data) => api.put(`/cms/${id}`, data),
  deleteContent: async id => api.delete(`/cms/${id}`),

  // Montessori
  getMontessoriPrograms: async () => api.get('/montessori'),
  getMontessoriProgram: async id => api.get(`/montessori/${id}`),
  createMontessoriProgram: async data => api.post('/montessori', data),
  updateMontessoriProgram: async (id, data) => api.put(`/montessori/${id}`, data),
  deleteMontessoriProgram: async id => api.delete(`/montessori/${id}`),

  // Specialized Programs
  getPrograms: async () => api.get('/specialized-programs'),
  getProgram: async id => api.get(`/specialized-programs/${id}`),
  createProgram: async data => api.post('/specialized-programs', data),
  updateProgram: async (id, data) => api.put(`/specialized-programs/${id}`, data),
  deleteProgram: async id => api.delete(`/specialized-programs/${id}`),

  // Community
  getCommunityEvents: async () => api.get('/community'),
  getCommunityEvent: async id => api.get(`/community/${id}`),
  createCommunityEvent: async data => api.post('/community', data),
  updateCommunityEvent: async (id, data) => api.put(`/community/${id}`, data),
  deleteCommunityEvent: async id => api.delete(`/community/${id}`),
};

export default educationService;
