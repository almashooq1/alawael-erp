/**
 * Rehabilitation Goal Suggestions — Frontend Service
 *
 * Wraps /api/v1/rehab/goal-suggestions/* (Phase 9 C8).
 * Scored suggestions for SMART goals + interventions,
 * plus a /draft endpoint that returns a ready-to-use
 * Goal document skeleton from a template code.
 */
import api from './api.client';

const rehabGoalSuggestionsService = {
  listGoals: params => api.get('/rehab/goal-suggestions/goals', { params }),
  scoreGoals: payload => api.post('/rehab/goal-suggestions/goals', payload),
  listInterventions: params => api.get('/rehab/goal-suggestions/interventions', { params }),
  draft: params => api.get('/rehab/goal-suggestions/draft', { params }),
};

export default rehabGoalSuggestionsService;
