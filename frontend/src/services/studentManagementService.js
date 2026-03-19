/**
 * Student Management Service — خدمة إدارة الطلاب
 *
 * Maps to backend: /api/student-management/*
 * Covers: CRUD, config, attendance, programs, assessments, IEP,
 *         behavior, documents, notes, communications, AI insights
 */

import api from './api.client';

const BASE = '/student-management';

const studentManagementService = {
  // ==================== CONFIG ====================
  getConfig: async () => api.get(`${BASE}/config`),
  getDisabilityTypes: async () => api.get(`${BASE}/config/disability-types`),
  getPrograms: async () => api.get(`${BASE}/config/programs`),
  getStatuses: async () => api.get(`${BASE}/config/statuses`),

  // ==================== STATISTICS ====================
  getStatistics: async centerId => api.get(`${BASE}/statistics/${centerId || 'default'}`),

  // ==================== STUDENTS — CRUD ====================
  getStudents: async (params = {}) => {
    const { centerId, ...rest } = params;
    if (centerId && centerId !== 'default') {
      return api.get(`${BASE}/center/${centerId}`, { params: rest });
    }
    return api.get(BASE, { params: rest });
  },
  getStudentById: async id => api.get(`${BASE}/${id}`),
  createStudent: async data => api.post(BASE, data),
  updateStudent: async (id, data) => api.put(`${BASE}/${id}`, data),
  deleteStudent: async id => api.delete(`${BASE}/${id}`),
  searchStudents: async query => api.get(`${BASE}/search`, { params: { q: query } }),

  // ==================== ATTENDANCE ====================
  getAttendance: async (id, params = {}) => api.get(`${BASE}/${id}/attendance`, { params }),
  recordAttendance: async (id, data) => api.post(`${BASE}/${id}/attendance`, data),

  // ==================== PROGRAMS ====================
  getStudentPrograms: async id => api.get(`${BASE}/${id}/programs`),
  enrollProgram: async (id, data) => api.post(`${BASE}/${id}/programs`, data),
  updateProgram: async (id, programId, data) =>
    api.put(`${BASE}/${id}/programs/${programId}`, data),

  // ==================== ASSESSMENTS ====================
  getAssessments: async id => api.get(`${BASE}/${id}/assessments`),
  addAssessment: async (id, data) => api.post(`${BASE}/${id}/assessments`, data),

  // ==================== IEP (Individualized Education Plan) ====================
  getIEP: async id => api.get(`${BASE}/${id}/iep`),
  createIEP: async (id, data) => api.post(`${BASE}/${id}/iep`, data),
  updateIEPGoal: async (id, goalId, data) => api.put(`${BASE}/${id}/iep/goals/${goalId}`, data),

  // ==================== BEHAVIOR TRACKING ====================
  getBehavior: async id => api.get(`${BASE}/${id}/behavior`),
  recordBehavior: async (id, data) => api.post(`${BASE}/${id}/behavior`, data),

  // ==================== DOCUMENTS ====================
  getDocuments: async id => api.get(`${BASE}/${id}/documents`),
  uploadDocument: async (id, formData) =>
    api.post(`${BASE}/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ==================== NOTES ====================
  getNotes: async id => api.get(`${BASE}/${id}/notes`),
  addNote: async (id, data) => api.post(`${BASE}/${id}/notes`, data),

  // ==================== COMMUNICATIONS ====================
  getCommunications: async id => api.get(`${BASE}/${id}/communications`),
  addCommunication: async (id, data) => api.post(`${BASE}/${id}/communications`, data),

  // ==================== AI INSIGHTS ====================
  getAIInsights: async id => api.get(`${BASE}/${id}/ai-insights`),

  // ==================== COMPREHENSIVE REPORT ====================
  getComprehensiveReport: async id => api.get(`${BASE}/${id}/report/comprehensive`),

  // ==================== PARENT REPORT ====================
  getParentReport: async id => api.get(`${BASE}/${id}/report/parent`),

  // ==================== PROGRESS TIMELINE ====================
  getProgressTimeline: async id => api.get(`${BASE}/${id}/report/progress-timeline`),

  // ==================== ACADEMIC PERFORMANCE REPORT ====================
  getAcademicPerformanceReport: async id => api.get(`${BASE}/${id}/report/academic-performance`),

  // ==================== BEHAVIORAL ANALYSIS REPORT ====================
  getBehavioralAnalysisReport: async id => api.get(`${BASE}/${id}/report/behavioral-analysis`),

  // ==================== HEALTH & WELLNESS REPORT ====================
  getHealthWellnessReport: async id => api.get(`${BASE}/${id}/report/health-wellness`),

  // ==================== FAMILY ENGAGEMENT REPORT ====================
  getFamilyEngagementReport: async id => api.get(`${BASE}/${id}/report/family-engagement`),

  // ==================== TRANSITION READINESS REPORT ====================
  getTransitionReadinessReport: async id => api.get(`${BASE}/${id}/report/transition-readiness`),

  // ==================== CUSTOM REPORT BUILDER ====================
  buildCustomReport: async (id, sections = []) =>
    api.post(`${BASE}/${id}/report/custom`, { sections }),

  // ==================== PERIODIC REPORT (CENTER) ====================
  getPeriodicReport: async (centerId, params = {}) =>
    api.get(`${BASE}/reports/periodic/${centerId}`, { params }),

  // ==================== COMPARISON REPORT ====================
  getComparisonReport: async studentIds =>
    api.get(`${BASE}/reports/comparison`, { params: { studentIds: studentIds.join(',') } }),

  // ==================== CENTER REPORTS SUMMARY ====================
  getCenterReportsSummary: async centerId => api.get(`${BASE}/reports/center-summary/${centerId}`),

  // ==================== THERAPIST EFFECTIVENESS REPORT ====================
  getTherapistEffectivenessReport: async centerId =>
    api.get(`${BASE}/reports/therapist-effectiveness/${centerId}`),

  // ==================== DASHBOARD ANALYTICS ====================
  getDashboardAnalytics: async centerId =>
    api.get(`${BASE}/reports/dashboard-analytics/${centerId}`),

  // ==================== REPORT SCHEDULES ====================
  getReportSchedules: async () => api.get(`${BASE}/reports/schedules`),

  // ==================== EXPORT REPORT ====================
  exportReportData: async (centerId, format = 'json') =>
    api.get(`${BASE}/reports/export/${centerId}`, {
      params: { format },
      ...(format === 'csv' ? { responseType: 'blob' } : {}),
    }),

  // ==================== REPORT DELIVERY SUBSCRIPTIONS ====================
  // Create a new subscription
  createReportSubscription: async data => api.post(`${BASE}/reports/subscriptions`, data),

  // List all subscriptions (with optional filters)
  listReportSubscriptions: async (filters = {}) =>
    api.get(`${BASE}/reports/subscriptions`, { params: filters }),

  // Get subscription statistics
  getSubscriptionStatistics: async () => api.get(`${BASE}/reports/subscriptions/statistics`),

  // Get a single subscription
  getReportSubscription: async id => api.get(`${BASE}/reports/subscriptions/${id}`),

  // Update subscription
  updateReportSubscription: async (id, data) =>
    api.put(`${BASE}/reports/subscriptions/${id}`, data),

  // Delete subscription
  deleteReportSubscription: async id => api.delete(`${BASE}/reports/subscriptions/${id}`),

  // Pause subscription
  pauseReportSubscription: async id => api.patch(`${BASE}/reports/subscriptions/${id}/pause`),

  // Resume subscription
  resumeReportSubscription: async id => api.patch(`${BASE}/reports/subscriptions/${id}/resume`),

  // Execute subscription now (manual trigger)
  executeReportSubscription: async id => api.post(`${BASE}/reports/subscriptions/${id}/execute`),

  // Get delivery logs for a subscription
  getSubscriptionDeliveryLogs: async (id, limit = 20) =>
    api.get(`${BASE}/reports/subscriptions/${id}/logs`, { params: { limit } }),

  // ==================== BULK OPERATIONS ====================
  bulkUpdateStatus: async (ids, status) => api.patch(`${BASE}/bulk/status`, { ids, status }),
  exportStudents: async (params = {}) =>
    api.get(`${BASE}/export`, { params, responseType: 'blob' }),
};

export default studentManagementService;
