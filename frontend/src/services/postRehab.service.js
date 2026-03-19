/**
 * Post-Rehab Follow-up (المتابعة بعد التأهيل) — Frontend Service
 *
 * Discharge follow-up: case management, home visits,
 * impact measurements, satisfaction surveys,
 * re-enrollment requests.
 */
import api from './api.client';

const postRehabService = {
  getDashboard: () => api.get('/post-rehab-followup/dashboard'),

  /* ── Cases ── */
  getCases: params => api.get('/post-rehab-followup/cases', { params }),
  createCase: data => api.post('/post-rehab-followup/cases', data),
  getCase: id => api.get(`/post-rehab-followup/cases/${id}`),
  getOverdueCases: () => api.get('/post-rehab-followup/cases/overdue'),

  /* ── Visits ── */
  getVisits: params => api.get('/post-rehab-followup/visits', { params }),
  createVisit: data => api.post('/post-rehab-followup/visits', data),
  getUpcoming: days => api.get('/post-rehab-followup/visits/upcoming', { params: { days } }),
  completeVisit: (id, data) => api.put(`/post-rehab-followup/visits/${id}/complete`, data),
  missVisit: (id, reason) => api.put(`/post-rehab-followup/visits/${id}/missed`, { reason }),

  /* ── Impact ── */
  getImpactMeasurements: params => api.get('/post-rehab-followup/impact', { params }),
  createImpact: data => api.post('/post-rehab-followup/impact', data),
  getImpactComparison: caseId => api.get(`/post-rehab-followup/impact/comparison/${caseId}`),

  /* ── Surveys ── */
  getSurveyTemplates: () => api.get('/post-rehab-followup/surveys/templates'),
  getSurveys: params => api.get('/post-rehab-followup/surveys', { params }),
  createSurvey: data => api.post('/post-rehab-followup/surveys', data),
  submitSurvey: (id, data) => api.post(`/post-rehab-followup/surveys/${id}/submit`, data),

  /* ── Re-Enrollment ── */
  getReEnrollments: params => api.get('/post-rehab-followup/re-enrollment', { params }),
  createReEnrollment: data => api.post('/post-rehab-followup/re-enrollment', data),
  reviewReEnrollment: (id, data) =>
    api.put(`/post-rehab-followup/re-enrollment/${id}/review`, data),
};

export default postRehabService;
