/**
 * Referral Portal Frontend Service — خدمة بوابة التحويلات للواجهة الأمامية
 * @version 1.0.0
 */

import api from './api';

const BASE = '/referrals';

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getReferralAnalytics = (params = {}) => api.get(`${BASE}/analytics`, { params });

// ─── Referring Facilities ─────────────────────────────────────────────────────

export const getFacilities = (params = {}) => api.get(`${BASE}/facilities`, { params });

export const getFacility = id => api.get(`${BASE}/facilities/${id}`);

export const createFacility = data => api.post(`${BASE}/facilities`, data);

export const updateFacility = (id, data) => api.patch(`${BASE}/facilities/${id}`, data);

export const deactivateFacility = id => api.delete(`${BASE}/facilities/${id}`);

// ─── Referrals ────────────────────────────────────────────────────────────────

export const getReferrals = (params = {}) => api.get(`${BASE}`, { params });

export const getReferral = id => api.get(`${BASE}/${id}`);

export const createReferral = data => api.post(`${BASE}`, data);

export const updateReferral = (id, data) => api.patch(`${BASE}/${id}`, data);

// ─── Review ───────────────────────────────────────────────────────────────────

export const reviewReferral = (id, reviewData) => api.post(`${BASE}/${id}/review`, reviewData);

export const changeReferralStatus = (id, status, data = {}) =>
  api.post(`${BASE}/${id}/status`, { status, ...data });

export const autoAssignReferral = id => api.post(`${BASE}/${id}/auto-assign`);

export const recalculatePriority = id => api.post(`${BASE}/${id}/recalculate-priority`);

// ─── Communications ───────────────────────────────────────────────────────────

export const getCommunications = referralId => api.get(`${BASE}/${referralId}/communications`);

export const sendCommunication = (referralId, messageData) =>
  api.post(`${BASE}/${referralId}/communications`, messageData);

export const markCommunicationRead = commId => api.patch(`${BASE}/communications/${commId}/read`);

// ─── Documents ────────────────────────────────────────────────────────────────

export const getReferralDocuments = referralId => api.get(`${BASE}/${referralId}/documents`);

export const uploadReferralDocument = (referralId, formData) =>
  api.post(`${BASE}/${referralId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteReferralDocument = docId => api.delete(`${BASE}/documents/${docId}`);

// ─── Assessment ───────────────────────────────────────────────────────────────

export const getReferralAssessment = referralId => api.get(`${BASE}/${referralId}/assessment`);

export const saveReferralAssessment = (referralId, data) =>
  api.post(`${BASE}/${referralId}/assessment`, data);

// ─── FHIR ─────────────────────────────────────────────────────────────────────

export const importFhirReferral = (fhirResource, facilityId) =>
  api.post(`${BASE}/fhir/import`, { fhirResource, facilityId });

export const getFhirLogs = (params = {}) => api.get(`${BASE}/fhir/logs`, { params });

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const REFERRAL_STATUS_LABELS = {
  received: 'مستلم',
  under_review: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  scheduled: 'مجدول',
  in_progress: 'جاري',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const REFERRAL_STATUS_COLORS = {
  received: '#6B7280',
  under_review: '#F59E0B',
  accepted: '#3B82F6',
  rejected: '#EF4444',
  scheduled: '#6366F1',
  in_progress: '#10B981',
  completed: '#14B8A6',
  cancelled: '#94A3B8',
};

export const PRIORITY_LABELS = {
  urgent: 'عاجل',
  routine: 'روتيني',
  elective: 'اختياري',
};

export const PRIORITY_COLORS = {
  urgent: '#EF4444',
  routine: '#3B82F6',
  elective: '#6B7280',
};

export const FACILITY_TYPE_LABELS = {
  hospital: 'مستشفى',
  clinic: 'عيادة',
  government_agency: 'جهة حكومية',
  rehabilitation_center: 'مركز تأهيل',
  school: 'مدرسة',
  other: 'أخرى',
};

export const STATUS_TRANSITIONS = {
  received: ['under_review', 'cancelled'],
  under_review: ['accepted', 'rejected'],
  accepted: ['scheduled'],
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  rejected: [],
  completed: [],
  cancelled: [],
};

export const canTransition = (current, next) => (STATUS_TRANSITIONS[current] || []).includes(next);

const referralPortalService = {
  getReferralAnalytics,
  getFacilities,
  getFacility,
  createFacility,
  updateFacility,
  deactivateFacility,
  getReferrals,
  getReferral,
  createReferral,
  updateReferral,
  reviewReferral,
  changeReferralStatus,
  autoAssignReferral,
  recalculatePriority,
  getCommunications,
  sendCommunication,
  markCommunicationRead,
  getReferralDocuments,
  uploadReferralDocument,
  deleteReferralDocument,
  getReferralAssessment,
  saveReferralAssessment,
  importFhirReferral,
  getFhirLogs,
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  FACILITY_TYPE_LABELS,
  STATUS_TRANSITIONS,
  canTransition,
};

export default referralPortalService;
