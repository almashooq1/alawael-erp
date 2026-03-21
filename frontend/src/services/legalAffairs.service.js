/**
 * Legal Affairs Service — خدمة الشؤون القانونية
 */
import apiClient from './api.client';

const MOCK_DASHBOARD = {
  summary: { openCases: 0, pendingHearings: 0, totalConsultations: 0, pendingConsultations: 0, totalClaims: 0, totalFees: 0 },
  casesByType: [], casesByStatus: [], upcomingHearings: [],
};

export async function getLegalDashboard() {
  try { const { data } = await apiClient.get('/legal-affairs/dashboard'); return data?.data || MOCK_DASHBOARD; } catch { return MOCK_DASHBOARD; }
}

export async function getLegalCases(params = {}) {
  try { const { data } = await apiClient.get('/legal-affairs/cases', { params }); return data?.data || []; } catch { return []; }
}

export async function getLegalCase(id) {
  try { const { data } = await apiClient.get(`/legal-affairs/cases/${id}`); return data?.data; } catch { return null; }
}

export async function createLegalCase(payload) {
  const { data } = await apiClient.post('/legal-affairs/cases', payload);
  return data?.data;
}

export async function updateLegalCase(id, payload) {
  const { data } = await apiClient.put(`/legal-affairs/cases/${id}`, payload);
  return data?.data;
}

export async function deleteLegalCase(id) {
  const { data } = await apiClient.delete(`/legal-affairs/cases/${id}`);
  return data?.data;
}

export async function getConsultations(params = {}) {
  try { const { data } = await apiClient.get('/legal-affairs/consultations', { params }); return data?.data || []; } catch { return []; }
}

export async function createConsultation(payload) {
  const { data } = await apiClient.post('/legal-affairs/consultations', payload);
  return data?.data;
}

export async function updateConsultation(id, payload) {
  const { data } = await apiClient.put(`/legal-affairs/consultations/${id}`, payload);
  return data?.data;
}

export async function getLegalCalendar(params = {}) {
  try { const { data } = await apiClient.get('/legal-affairs/calendar', { params }); return data?.data || []; } catch { return []; }
}
