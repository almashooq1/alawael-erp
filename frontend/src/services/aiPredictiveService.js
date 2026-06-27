/**
 * AI Predictive Analytics Service — خدمة التحليلات التنبؤية
 * Frontend API layer
 */
import api from './api';

const BASE = '/api/v1/ai-predictive';

const aiPredictiveService = {
  /* ── Goal Achievement Prediction ── */
  predictGoal: (goalId, weeksAhead = 4) =>
    api.get(`${BASE}/goal-prediction/${goalId}`, { params: { weeksAhead } }),

  /* ── Discharge Readiness ── */
  getDischargeReadiness: beneficiaryId =>
    api.get(`${BASE}/discharge-readiness/${beneficiaryId}`),

  /* ── Risk Flags ── */
  getRiskFlags: beneficiaryId => api.get(`${BASE}/risk-flags/${beneficiaryId}`),

  /* ── Intervention Recommendations ── */
  getInterventions: beneficiaryId =>
    api.get(`${BASE}/intervention-recommendations/${beneficiaryId}`),

  /* ── Length of Stay ── */
  getLengthOfStay: beneficiaryId => api.get(`${BASE}/length-of-stay/${beneficiaryId}`),

  /* ── Full Analysis ── */
  getFullAnalysis: beneficiaryId => api.get(`${BASE}/full-analysis/${beneficiaryId}`),
};

export default aiPredictiveService;
