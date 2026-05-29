import api from './api.client';

const educationService = {
  // Knowledge Base — backend router is mounted at /knowledge with article CRUD
  // under /articles (a bare GET /knowledge has no handler → 404).
  getArticles: async () => api.get('/knowledge/articles'),
  getArticle: async id => api.get(`/knowledge/articles/${id}`),
  createArticle: async data => api.post('/knowledge/articles', data),
  updateArticle: async (id, data) => api.put(`/knowledge/articles/${id}`, data),
  deleteArticle: async id => api.delete(`/knowledge/articles/${id}`),

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

  // Community — backend router is mounted at /community with content CRUD under
  // /content (a bare GET /community has no handler → 404).
  getCommunityEvents: async () => api.get('/community/content'),
  getCommunityEvent: async id => api.get(`/community/content/${id}`),
  createCommunityEvent: async data => api.post('/community/content', data),
  updateCommunityEvent: async (id, data) => api.put(`/community/content/${id}`, data),
  deleteCommunityEvent: async id => api.delete(`/community/content/${id}`),
};

export default educationService;
