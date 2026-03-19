/**
 * 📚 Knowledge Center Frontend Service — خدمة مركز المعرفة
 * AlAwael ERP — Full API client for knowledge center management
 */
import api from './api.client';

const BASE = '/knowledge-center';

const knowledgeCenterService = {
  // ── Articles CRUD ────────────────────────────────────────────────
  getArticles: params => api.get(`${BASE}/articles`, { params }),
  getArticleById: id => api.get(`${BASE}/articles/${id}`),
  createArticle: data => api.post(`${BASE}/articles`, data),
  updateArticle: (id, data) => api.put(`${BASE}/articles/${id}`, data),
  deleteArticle: id => api.delete(`${BASE}/articles/${id}`),

  // ── Categories ───────────────────────────────────────────────────
  getCategories: () => api.get(`${BASE}/categories`),
  createCategory: data => api.post(`${BASE}/categories`, data),
  updateCategory: (id, data) => api.put(`${BASE}/categories/${id}`, data),
  deleteCategory: id => api.delete(`${BASE}/categories/${id}`),

  // ── Search & Discovery ───────────────────────────────────────────
  search: params => api.get(`${BASE}/search`, { params }),
  getTrending: limit => api.get(`${BASE}/trending`, { params: { limit } }),
  getTopRated: limit => api.get(`${BASE}/top-rated`, { params: { limit } }),
  getRecent: limit => api.get(`${BASE}/recent`, { params: { limit } }),

  // ── Article Actions ──────────────────────────────────────────────
  rateArticle: (id, rating, feedback) =>
    api.post(`${BASE}/articles/${id}/rate`, { rating, feedback }),
  addComment: (id, text) => api.post(`${BASE}/articles/${id}/comment`, { text }),
  deleteComment: (id, commentId) => api.delete(`${BASE}/articles/${id}/comment/${commentId}`),
  changeStatus: (id, status) => api.post(`${BASE}/articles/${id}/status`, { status }),

  // ── Bookmarks ────────────────────────────────────────────────────
  toggleBookmark: (id, note) => api.post(`${BASE}/articles/${id}/bookmark`, { note }),
  getBookmarks: () => api.get(`${BASE}/bookmarks`),

  // ── Stats & Analytics ────────────────────────────────────────────
  getStats: () => api.get(`${BASE}/stats`),
  getAnalytics: params => api.get(`${BASE}/analytics`, { params }),

  // ── Seed ─────────────────────────────────────────────────────────
  seed: () => api.post(`${BASE}/seed`),
};

export default knowledgeCenterService;
