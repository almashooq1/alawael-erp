/**
 * emrService.js — خدمة الاتصال بواجهة السجل الطبي الإلكتروني (EMR API Service)
 */
import apiClient from '../api/apiClient';

const BASE = '/emr';

export const emrService = {
  // ─── Prescriptions ──────────────────────────────────────────
  createPrescription: (data) => apiClient.post(`${BASE}/prescriptions`, data),
  getPrescriptions: (beneficiaryId) => apiClient.get(`${BASE}/prescriptions/${beneficiaryId}`),

  // ─── Vital Signs ──────────────────────────────────────────
  recordVitalSigns: (data) => apiClient.post(`${BASE}/vital-signs`, data),
  getVitalSignsHistory: (beneficiaryId, type, days = 30) =>
    apiClient.get(`${BASE}/vital-signs/${beneficiaryId}`, { params: { type, days } }),

  // ─── Medication Administration ────────────────────────────
  administerMedication: (data) => apiClient.post(`${BASE}/medication-administration`, data),
  getMedicationSchedule: (beneficiaryId) => apiClient.get(`${BASE}/medication-schedule/${beneficiaryId}`),

  // ─── Lab Results ──────────────────────────────────────────
  addLabResult: (data) => apiClient.post(`${BASE}/lab-results`, data),
  getLabResults: (beneficiaryId) => apiClient.get(`${BASE}/lab-results/${beneficiaryId}`),

  // ─── Allergies ────────────────────────────────────────────
  addAllergy: (data) => apiClient.post(`${BASE}/allergies`, data),
  getAllergies: (beneficiaryId) => apiClient.get(`${BASE}/allergies/${beneficiaryId}`),
  checkAllergyAlerts: (beneficiaryId, medication) =>
    apiClient.get(`${BASE}/allergies/${beneficiaryId}`, { params: { medication } }),

  // ─── Immunizations ────────────────────────────────────────
  addImmunization: (data) => apiClient.post(`${BASE}/immunizations`, data),
  getImmunizations: (beneficiaryId) => apiClient.get(`${BASE}/immunizations/${beneficiaryId}`),

  // ─── Referrals ──────────────────────────────────────────────
  createReferral: (data) => apiClient.post(`${BASE}/referrals`, data),
  getReferrals: (beneficiaryId) => apiClient.get(`${BASE}/referrals/${beneficiaryId}`),
};

export default emrService;
