/**
 * Measures Library Service — خدمة مكتبة المقاييس
 * جميع المكالمات API الخاصة بـ /api/v1/measures-library
 */
import apiClient from './api.client';

const BASE = '/api/v1/measures-library';

export const getDashboard = () => apiClient.get(`${BASE}/dashboard`).then(r => r.data);

export const listMeasures = (params = {}) => apiClient.get(BASE, { params }).then(r => r.data);

export const createMeasure = data => apiClient.post(BASE, data).then(r => r.data);

export const getMeasure = id => apiClient.get(`${BASE}/${id}`).then(r => r.data);

export const updateMeasure = (id, data) => apiClient.put(`${BASE}/${id}`, data).then(r => r.data);

export const getScoringGuide = id => apiClient.get(`${BASE}/${id}/scoring`).then(r => r.data);

export const suggestMeasures = (params = {}) =>
  apiClient.get(`${BASE}/suggest`, { params }).then(r => r.data);

const measuresLibraryService = {
  getDashboard,
  listMeasures,
  createMeasure,
  getMeasure,
  updateMeasure,
  getScoringGuide,
  suggestMeasures,
};

export default measuresLibraryService;
