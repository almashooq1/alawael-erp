/**
 * Early Intervention (التدخل المبكر) — Frontend Service
 *
 * Disability early-intervention programs:
 * child management, developmental screenings,
 * milestone tracking, IFSP plans, referrals.
 */
import api from './api.client';

const earlyInterventionService = {
  getDashboard: () => api.get('/early-intervention/dashboard'),

  /* ── Children ── */
  getChildren: params => api.get('/early-intervention/children', { params }),
  createChild: data => api.post('/early-intervention/children', data),
  getChildProfile: id => api.get(`/early-intervention/children/${id}/full-profile`),
  initMilestones: id => api.post(`/early-intervention/children/${id}/initialize-milestones`),

  /* ── Screenings ── */
  getScreenings: params => api.get('/early-intervention/screenings', { params }),
  createScreening: data => api.post('/early-intervention/screenings', data),

  /* ── Milestones ── */
  getMilestones: params => api.get('/early-intervention/milestones', { params }),
  getMilestoneReport: childId => api.get(`/early-intervention/milestones/child/${childId}/report`),

  /* ── IFSPs ── */
  getIFSPs: params => api.get('/early-intervention/ifsps', { params }),
  createIFSP: data => api.post('/early-intervention/ifsps', data),
  addIFSPReview: (id, data) => api.post(`/early-intervention/ifsps/${id}/reviews`, data),

  /* ── Referrals ── */
  getReferrals: params => api.get('/early-intervention/referrals', { params }),
  createReferral: data => api.post('/early-intervention/referrals', data),
  updateReferralStatus: (id, status) =>
    api.patch(`/early-intervention/referrals/${id}/status`, { status }),
};

export default earlyInterventionService;
