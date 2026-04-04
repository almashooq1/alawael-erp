/**
 * Telehealth Frontend Service — خدمة الطب عن بعد للواجهة الأمامية
 * @version 1.0.0
 */

import api from './api';

const BASE = '/telehealth';

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getTelehealthStats = () => api.get(`${BASE}/stats`);

// ─── Consultations ────────────────────────────────────────────────────────────

export const getConsultations = (params = {}) => api.get(`${BASE}/consultations`, { params });

export const getConsultation = id => api.get(`${BASE}/consultations/${id}`);

export const createConsultation = data => api.post(`${BASE}/consultations`, data);

export const updateConsultation = (id, data) => api.patch(`${BASE}/consultations/${id}`, data);

export const cancelConsultation = (id, reason) =>
  api.delete(`${BASE}/consultations/${id}`, { data: { reason } });

export const startConsultation = id => api.post(`${BASE}/consultations/${id}/start`);

export const endConsultation = (id, clinicalData) =>
  api.post(`${BASE}/consultations/${id}/end`, clinicalData);

export const addParticipant = (consultationId, participantData) =>
  api.post(`${BASE}/consultations/${consultationId}/participants`, participantData);

export const adjustQuality = (consultationId, bandwidthKbps) =>
  api.post(`${BASE}/consultations/${consultationId}/adjust-quality`, { bandwidthKbps });

// ─── Waiting Room ─────────────────────────────────────────────────────────────

export const getWaitingRoom = consultationId => api.get(`${BASE}/waiting-room/${consultationId}`);

export const joinWaitingRoom = (consultationId, deviceInfo) =>
  api.post(`${BASE}/waiting-room/${consultationId}/join`, deviceInfo);

export const updateDeviceTest = (waitingRoomId, testData) =>
  api.patch(`${BASE}/waiting-room/${waitingRoomId}/device-test`, testData);

export const getProviderQueue = () => api.get(`${BASE}/provider/queue`);

// ─── Prescriptions ────────────────────────────────────────────────────────────

export const createPrescription = (consultationId, data) =>
  api.post(`${BASE}/consultations/${consultationId}/prescriptions`, data);

export const getPrescription = id => api.get(`${BASE}/prescriptions/${id}`);

export const cancelPrescription = (id, reason) =>
  api.post(`${BASE}/prescriptions/${id}/cancel`, { reason });

export const verifyPrescription = uuid => api.get(`${BASE}/prescriptions/verify/${uuid}`);

// ─── Availability Slots ───────────────────────────────────────────────────────

export const getAvailabilitySlots = (params = {}) =>
  api.get(`${BASE}/availability-slots`, { params });

export const createAvailabilitySlot = data => api.post(`${BASE}/availability-slots`, data);

export const bulkCreateSlots = slots => api.post(`${BASE}/availability-slots/bulk`, { slots });

export const updateAvailabilitySlot = (id, data) =>
  api.patch(`${BASE}/availability-slots/${id}`, data);

export const deleteAvailabilitySlot = id => api.delete(`${BASE}/availability-slots/${id}`);

export const getProviderAvailability = (providerId, params = {}) =>
  api.get(`${BASE}/providers/${providerId}/availability`, { params });

// ─── Remote Monitoring Devices ────────────────────────────────────────────────

export const getDevices = (params = {}) => api.get(`${BASE}/devices`, { params });

export const createDevice = data => api.post(`${BASE}/devices`, data);

export const submitDeviceReading = (deviceId, reading) =>
  api.post(`${BASE}/devices/${deviceId}/reading`, { reading });

// ─── Virtual Sessions ─────────────────────────────────────────────────────────

export const createVirtualSession = data => api.post(`${BASE}/virtual-sessions`, data);

export const saveWhiteboard = (sessionId, data) =>
  api.patch(`${BASE}/virtual-sessions/${sessionId}/whiteboard`, { data });

// ─── Recordings ───────────────────────────────────────────────────────────────

export const getSessionRecording = consultationId =>
  api.get(`${BASE}/recordings/${consultationId}`);

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const STATUS_LABELS = {
  scheduled: 'مجدولة',
  waiting: 'في الانتظار',
  in_progress: 'جارية',
  paused: 'متوقفة مؤقتاً',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'لم يحضر',
  technical_failure: 'فشل تقني',
};

export const STATUS_COLORS = {
  scheduled: 'blue',
  waiting: 'yellow',
  in_progress: 'green',
  paused: 'orange',
  completed: 'teal',
  cancelled: 'gray',
  no_show: 'red',
  technical_failure: 'purple',
};

export const TYPE_LABELS = {
  video: 'فيديو',
  audio: 'صوت',
  chat: 'نص',
  hybrid: 'فيديو ونص',
};

export const PRIORITY_LABELS = {
  urgent: 'عاجل',
  routine: 'روتيني',
  follow_up: 'متابعة',
};

export const PRESCRIPTION_STATUS_LABELS = {
  draft: 'مسودة',
  issued: 'صادرة',
  sent: 'مُرسلة',
  dispensed: 'صُرفت',
  cancelled: 'ملغاة',
  expired: 'منتهية',
};

const telehealthService = {
  getTelehealthStats,
  getConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  cancelConsultation,
  startConsultation,
  endConsultation,
  addParticipant,
  adjustQuality,
  getWaitingRoom,
  joinWaitingRoom,
  updateDeviceTest,
  getProviderQueue,
  createPrescription,
  getPrescription,
  cancelPrescription,
  verifyPrescription,
  getAvailabilitySlots,
  createAvailabilitySlot,
  bulkCreateSlots,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getProviderAvailability,
  getDevices,
  createDevice,
  submitDeviceReading,
  createVirtualSession,
  saveWhiteboard,
  getSessionRecording,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  PRIORITY_LABELS,
  PRESCRIPTION_STATUS_LABELS,
};

export default telehealthService;
