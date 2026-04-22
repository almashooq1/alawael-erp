/**
 * Rehabilitation Disciplines — Frontend Service
 *
 * Wraps /api/v1/rehab/disciplines/* (Phase 9 C5).
 * Read-only catalog: 11 disciplines, their programs,
 * interventions, outcome measures, and SMART goal templates.
 */
import api from './api.client';

const rehabDisciplinesService = {
  getTaxonomy: () => api.get('/rehab/disciplines/taxonomy'),
  getHealth: () => api.get('/rehab/disciplines/health'),
  suggest: params => api.get('/rehab/disciplines/suggest', { params }),
  list: params => api.get('/rehab/disciplines', { params }),
  get: id => api.get(`/rehab/disciplines/${id}`),
  getPrograms: id => api.get(`/rehab/disciplines/${id}/programs`),
  getInterventions: id => api.get(`/rehab/disciplines/${id}/interventions`),
  getMeasures: id => api.get(`/rehab/disciplines/${id}/measures`),
  getGoalTemplates: id => api.get(`/rehab/disciplines/${id}/goal-templates`),
};

export default rehabDisciplinesService;
