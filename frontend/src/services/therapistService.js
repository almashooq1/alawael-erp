/**
 * Therapist Portal Service — خدمة بوابة المعالج
 *
 * Real API layer for the Therapist Portal module.
 * Connects to /api/therapist and /api/therapy-sessions-analytics endpoints.
 * Falls back gracefully when API is unreachable.
 *
 * @version 2.0.0 — Replaced 100% mock with real API calls
 */

import apiClient from './api.client';
import logger from 'utils/logger';

// ─── Minimal Mock Fallbacks ──────────────────────────────────────────────

const MOCK_DASHBOARD = {
  therapistId: null,
  stats: {
    totalPatients: 0,
    activePatients: 0,
    weeklySessions: 0,
    completedSessions: 0,
    completionRate: 0,
    averageRating: 0,
    totalRatings: 0,
    pendingReports: 0,
  },
  todaySessions: [],
  upcomingSessions: [],
  urgentCases: [],
  monthlyStats: {
    totalSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    noShowSessions: 0,
    attendanceRate: 0,
  },
};

const MOCK_REPORTS = {
  summary: {
    totalSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    averageRating: 0,
    patientImprovement: 0,
    attendanceRate: 0,
  },
  progressData: [],
};

// ═══════════════════════════════════════════════════════════════════════════

export const therapistService = {
  // ─── Dashboard ─────────────────────────────────────────────────────────
  async getTherapistDashboard(therapistId) {
    try {
      const res = await apiClient.get('/therapist/dashboard', { params: { therapistId } });
      return res?.data?.data || res?.data || MOCK_DASHBOARD;
    } catch (err) {
      logger.warn('therapistService.getDashboard fallback:', err?.message);
      return MOCK_DASHBOARD;
    }
  },

  // ─── Patients ──────────────────────────────────────────────────────────
  async getTherapistPatients(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/patients', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getPatients fallback:', err?.message);
      return [];
    }
  },

  async getPatientDetails(therapistId, patientId) {
    try {
      const res = await apiClient.get(`/therapist/patients/${patientId}`, {
        params: { therapistId },
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getPatientDetails fallback:', err?.message);
      return null;
    }
  },

  // ─── Schedule ──────────────────────────────────────────────────────────
  async getTherapistSchedule(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/schedule', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getSchedule fallback:', err?.message);
      return [];
    }
  },

  async addScheduleSession(therapistId, sessionData) {
    try {
      const res = await apiClient.post('/therapist/schedule', { therapistId, ...sessionData });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.addScheduleSession error:', err?.message);
      throw err;
    }
  },

  // ─── Availability ──────────────────────────────────────────────────────
  async getTherapistAvailability(therapistId) {
    try {
      const res = await apiClient.get('/therapist/availability', { params: { therapistId } });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getAvailability fallback:', err?.message);
      return null;
    }
  },

  async updateAvailability(therapistId, availabilityData) {
    try {
      const res = await apiClient.put('/therapist/availability', {
        therapistId,
        ...availabilityData,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateAvailability error:', err?.message);
      throw err;
    }
  },

  // ─── Sessions ──────────────────────────────────────────────────────────
  async getTherapistSessions(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/sessions', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getSessions fallback:', err?.message);
      return [];
    }
  },

  async addSessionNotes(sessionId, notes) {
    try {
      const res = await apiClient.post(`/therapy-sessions/${sessionId}/documentation`, notes);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.addSessionNotes error:', err?.message);
      throw err;
    }
  },

  // ─── Cases ─────────────────────────────────────────────────────────────
  async getTherapistCases(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/cases', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getCases fallback:', err?.message);
      return [];
    }
  },

  // ─── Documents ─────────────────────────────────────────────────────────
  async getTherapistDocuments(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/documents', {
        params: { therapistId, ...query },
      });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getDocuments fallback:', err?.message);
      return [];
    }
  },

  async uploadDocument(therapistId, formData) {
    try {
      const res = await apiClient.post('/therapist/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { therapistId },
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.uploadDocument error:', err?.message);
      throw err;
    }
  },

  // ─── Reports ───────────────────────────────────────────────────────────
  async getTherapistReports(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/reports', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || MOCK_REPORTS;
    } catch (err) {
      logger.warn('therapistService.getReports fallback:', err?.message);
      return MOCK_REPORTS;
    }
  },

  async getTherapistPerformance(therapistId) {
    try {
      const res = await apiClient.get('/therapist/performance', { params: { therapistId } });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getPerformance fallback:', err?.message);
      return null;
    }
  },

  async getTherapistWorkload(therapistId) {
    try {
      const res = await apiClient.get('/therapist/workload', { params: { therapistId } });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getWorkload fallback:', err?.message);
      return null;
    }
  },

  // ─── Messages ──────────────────────────────────────────────────────────
  async getTherapistMessages(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/messages', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getMessages fallback:', err?.message);
      return [];
    }
  },

  async sendMessage(therapistId, messageData) {
    try {
      const res = await apiClient.post('/therapist/messages', { therapistId, ...messageData });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.sendMessage error:', err?.message);
      throw err;
    }
  },

  async getTherapistCommunications(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/communications', {
        params: { therapistId, ...query },
      });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getCommunications fallback:', err?.message);
      return [];
    }
  },

  // ─── Plans ─────────────────────────────────────────────────────────────
  async getTherapistPlans(therapistId, query = {}) {
    try {
      const res = await apiClient.get('/therapist/plans', { params: { therapistId, ...query } });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      logger.warn('therapistService.getPlans fallback:', err?.message);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  Analytics — التحليلات المتقدمة
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalyticsOverview(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/overview', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getAnalyticsOverview fallback:', err?.message);
      return null;
    }
  },

  async getSessionTrends(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/trends', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getSessionTrends fallback:', err?.message);
      return null;
    }
  },

  async getTherapistPerformanceComparison(query = {}) {
    try {
      const res = await apiClient.get(
        '/therapy-sessions-analytics/analytics/therapist-performance',
        { params: query }
      );
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getPerformanceComparison fallback:', err?.message);
      return null;
    }
  },

  async getRoomUtilization(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/room-utilization', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getRoomUtilization fallback:', err?.message);
      return null;
    }
  },

  async getAttendanceReport(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/attendance', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getAttendanceReport fallback:', err?.message);
      return null;
    }
  },

  async getBillingSummary(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/billing', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getBillingSummary fallback:', err?.message);
      return null;
    }
  },

  async getGoalProgress(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/goal-progress', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getGoalProgress fallback:', err?.message);
      return null;
    }
  },

  async getCancellationAnalysis(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/analytics/cancellations', {
        params: query,
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      logger.warn('therapistService.getCancellationAnalysis fallback:', err?.message);
      return null;
    }
  },

  async getCalendarSessions(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/calendar', { params: query });
      return res?.data?.data || res?.data || { events: [], total: 0 };
    } catch (err) {
      logger.warn('therapistService.getCalendarSessions fallback:', err?.message);
      return { events: [], total: 0 };
    }
  },

  async exportReport(query = {}) {
    try {
      const res = await apiClient.post('/therapy-sessions-analytics/export/report', query);
      return res?.data?.data || res?.data || res;
    } catch (err) {
      logger.warn('therapistService.exportReport error:', err?.message);
      throw err;
    }
  },

  async getWaitlist(query = {}) {
    try {
      const res = await apiClient.get('/therapy-sessions-analytics/waitlist', { params: query });
      return res?.data?.data || res?.data || { availableSlots: [], totalAvailable: 0 };
    } catch (err) {
      logger.warn('therapistService.getWaitlist fallback:', err?.message);
      return { availableSlots: [], totalAvailable: 0 };
    }
  },

  async updateSessionBilling(sessionId, billingData) {
    try {
      const res = await apiClient.patch(
        `/therapy-sessions-analytics/${sessionId}/billing`,
        billingData
      );
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateBilling error:', err?.message);
      throw err;
    }
  },

  async bulkUpdateBilling(sessionIds, isBilled = true, invoiceId = null) {
    try {
      const res = await apiClient.post('/therapy-sessions-analytics/billing/bulk', {
        sessionIds,
        isBilled,
        invoiceId,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.bulkUpdateBilling error:', err?.message);
      throw err;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  //  Extended Therapist Portal Services — خدمات بوابة المعالج الموسّعة
  // ═══════════════════════════════════════════════════════════════

  // ─── Treatment Plans (الخطط العلاجية) ──────────
  async getTreatmentPlans(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/treatment-plans', { params });
      return res?.data?.data || res?.data || { plans: [], total: 0 };
    } catch (err) {
      logger.warn('therapistService.getTreatmentPlans fallback:', err?.message);
      return { plans: [], total: 0 };
    }
  },
  async createTreatmentPlan(data) {
    try {
      const res = await apiClient.post('/therapist-extended/treatment-plans', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.createTreatmentPlan error:', err?.message);
      throw err;
    }
  },
  async getTreatmentPlanDetail(planId) {
    try {
      const res = await apiClient.get(`/therapist-extended/treatment-plans/${planId}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.getTreatmentPlanDetail error:', err?.message);
      throw err;
    }
  },
  async updateTreatmentPlan(planId, data) {
    try {
      const res = await apiClient.put(`/therapist-extended/treatment-plans/${planId}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateTreatmentPlan error:', err?.message);
      throw err;
    }
  },
  async updateGoalProgress(planId, goalId, data) {
    try {
      const res = await apiClient.patch(
        `/therapist-extended/treatment-plans/${planId}/goals/${goalId}`,
        data
      );
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateGoalProgress error:', err?.message);
      throw err;
    }
  },

  // ─── Assessments (التقييمات) ──────────
  async getAssessments(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/assessments', { params });
      return res?.data?.data || res?.data || { assessments: [], total: 0 };
    } catch (err) {
      logger.warn('therapistService.getAssessments fallback:', err?.message);
      return { assessments: [], total: 0 };
    }
  },
  async createAssessment(data) {
    try {
      const res = await apiClient.post('/therapist-extended/assessments', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.createAssessment error:', err?.message);
      throw err;
    }
  },
  async getAssessmentDetail(id) {
    try {
      const res = await apiClient.get(`/therapist-extended/assessments/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.getAssessmentDetail error:', err?.message);
      throw err;
    }
  },
  async deleteAssessment(id) {
    try {
      const res = await apiClient.delete(`/therapist-extended/assessments/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.deleteAssessment error:', err?.message);
      throw err;
    }
  },

  // ─── Prescriptions (الوصفات العلاجية) ──────────
  async getPrescriptions(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/prescriptions', { params });
      return res?.data?.data || res?.data || { prescriptions: [], total: 0 };
    } catch (err) {
      logger.warn('therapistService.getPrescriptions fallback:', err?.message);
      return { prescriptions: [], total: 0 };
    }
  },
  async createPrescription(data) {
    try {
      const res = await apiClient.post('/therapist-extended/prescriptions', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.createPrescription error:', err?.message);
      throw err;
    }
  },
  async updatePrescription(id, data) {
    try {
      const res = await apiClient.put(`/therapist-extended/prescriptions/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updatePrescription error:', err?.message);
      throw err;
    }
  },
  async deletePrescription(id) {
    try {
      const res = await apiClient.delete(`/therapist-extended/prescriptions/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.deletePrescription error:', err?.message);
      throw err;
    }
  },

  // ─── Professional Development (التطوير المهني) ──────────
  async getProfessionalDev(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/professional-dev', { params });
      return res?.data?.data || res?.data || { activities: [], cpdPoints: {} };
    } catch (err) {
      logger.warn('therapistService.getProfessionalDev fallback:', err?.message);
      return { activities: [], cpdPoints: { earned: 0, target: 40 } };
    }
  },
  async addProfessionalDev(data) {
    try {
      const res = await apiClient.post('/therapist-extended/professional-dev', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.addProfessionalDev error:', err?.message);
      throw err;
    }
  },
  async updateProfessionalDev(id, data) {
    try {
      const res = await apiClient.put(`/therapist-extended/professional-dev/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateProfessionalDev error:', err?.message);
      throw err;
    }
  },
  async deleteProfessionalDev(id) {
    try {
      const res = await apiClient.delete(`/therapist-extended/professional-dev/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.deleteProfessionalDev error:', err?.message);
      throw err;
    }
  },

  // ─── Advanced Analytics (التحليلات المتقدمة) ──────────
  async getAdvancedAnalytics(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/analytics', { params });
      return (
        res?.data?.data ||
        res?.data || {
          summary: {},
          weeklyTrend: [],
          ratingDistribution: {},
          goalStats: {},
          docQuality: {},
        }
      );
    } catch (err) {
      logger.warn('therapistService.getAdvancedAnalytics fallback:', err?.message);
      return {
        summary: {},
        sessionsByType: {},
        sessionsByStatus: {},
        weeklyTrend: [],
        ratingDistribution: {},
        goalStats: {},
        docQuality: {},
      };
    }
  },
  async getProductivityReport(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/analytics/productivity', { params });
      return res?.data?.data || res?.data || {};
    } catch (err) {
      logger.warn('therapistService.getProductivityReport fallback:', err?.message);
      return {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        last30Days: 0,
        last90Days: 0,
        dailyAverage: 0,
        weeklyAverage: 0,
      };
    }
  },

  // ─── Consultations (الاستشارات) ──────────
  async getConsultations(params = {}) {
    try {
      const res = await apiClient.get('/therapist-extended/consultations', { params });
      return res?.data?.data || res?.data || { consultations: [], total: 0 };
    } catch (err) {
      logger.warn('therapistService.getConsultations fallback:', err?.message);
      return { consultations: [], total: 0 };
    }
  },
  async createConsultation(data) {
    try {
      const res = await apiClient.post('/therapist-extended/consultations', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.createConsultation error:', err?.message);
      throw err;
    }
  },
  async respondToConsultation(id, data) {
    try {
      const res = await apiClient.post(`/therapist-extended/consultations/${id}/respond`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.respondToConsultation error:', err?.message);
      throw err;
    }
  },
  async updateConsultationStatus(id, status) {
    try {
      const res = await apiClient.patch(`/therapist-extended/consultations/${id}/status`, {
        status,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.updateConsultationStatus error:', err?.message);
      throw err;
    }
  },
  async deleteConsultation(id) {
    try {
      const res = await apiClient.delete(`/therapist-extended/consultations/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('therapistService.deleteConsultation error:', err?.message);
      throw err;
    }
  },

  // ═══════════════════════════════════════════════════════
  //  Therapist Pro Services (Batch 3)
  // ═══════════════════════════════════════════════════════

  // ── Daily Tasks ────────────────────────────────────────
  async getDailyTasks() {
    try {
      const res = await apiClient.get('/therapist-pro/tasks');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getDailyTasks error:', err?.message);
      throw err;
    }
  },
  async createTask(data) {
    try {
      const res = await apiClient.post('/therapist-pro/tasks', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createTask error:', err?.message);
      throw err;
    }
  },
  async updateTask(id, data) {
    try {
      const res = await apiClient.put(`/therapist-pro/tasks/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateTask error:', err?.message);
      throw err;
    }
  },
  async deleteTask(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/tasks/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteTask error:', err?.message);
      throw err;
    }
  },

  // ── Progress Tracking ─────────────────────────────────
  async getProgressRecords() {
    try {
      const res = await apiClient.get('/therapist-pro/progress');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getProgressRecords error:', err?.message);
      throw err;
    }
  },
  async addProgressRecord(data) {
    try {
      const res = await apiClient.post('/therapist-pro/progress', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addProgressRecord error:', err?.message);
      throw err;
    }
  },
  async deleteProgressRecord(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/progress/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteProgressRecord error:', err?.message);
      throw err;
    }
  },

  // ── Clinical Library ──────────────────────────────────
  async getLibraryItems() {
    try {
      const res = await apiClient.get('/therapist-pro/library');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getLibraryItems error:', err?.message);
      throw err;
    }
  },
  async getLibraryItem(id) {
    try {
      const res = await apiClient.get(`/therapist-pro/library/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getLibraryItem error:', err?.message);
      throw err;
    }
  },
  async addLibraryItem(data) {
    try {
      const res = await apiClient.post('/therapist-pro/library', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addLibraryItem error:', err?.message);
      throw err;
    }
  },
  async deleteLibraryItem(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/library/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteLibraryItem error:', err?.message);
      throw err;
    }
  },

  // ── Documentation Templates ───────────────────────────
  async getTemplates() {
    try {
      const res = await apiClient.get('/therapist-pro/templates');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getTemplates error:', err?.message);
      throw err;
    }
  },
  async getTemplateById(id) {
    try {
      const res = await apiClient.get(`/therapist-pro/templates/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getTemplateById error:', err?.message);
      throw err;
    }
  },
  async createTemplate(data) {
    try {
      const res = await apiClient.post('/therapist-pro/templates', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createTemplate error:', err?.message);
      throw err;
    }
  },
  async updateTemplate(id, data) {
    try {
      const res = await apiClient.put(`/therapist-pro/templates/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateTemplate error:', err?.message);
      throw err;
    }
  },
  async useTemplate(id) {
    try {
      const res = await apiClient.post(`/therapist-pro/templates/${id}/use`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('useTemplate error:', err?.message);
      throw err;
    }
  },
  async deleteTemplate(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/templates/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteTemplate error:', err?.message);
      throw err;
    }
  },

  // ── Parent Communication ──────────────────────────────
  async getParentMessages() {
    try {
      const res = await apiClient.get('/therapist-pro/parent-comms');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getParentMessages error:', err?.message);
      throw err;
    }
  },
  async sendParentMessage(data) {
    try {
      const res = await apiClient.post('/therapist-pro/parent-comms', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('sendParentMessage error:', err?.message);
      throw err;
    }
  },
  async markMessageRead(id) {
    try {
      const res = await apiClient.patch(`/therapist-pro/parent-comms/${id}/read`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('markMessageRead error:', err?.message);
      throw err;
    }
  },
  async deleteParentMessage(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/parent-comms/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteParentMessage error:', err?.message);
      throw err;
    }
  },

  // ── SMART Goals ────────────────────────────────────────
  async getSmartGoals() {
    try {
      const res = await apiClient.get('/therapist-pro/smart-goals');
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getSmartGoals error:', err?.message);
      throw err;
    }
  },
  async createSmartGoal(data) {
    try {
      const res = await apiClient.post('/therapist-pro/smart-goals', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createSmartGoal error:', err?.message);
      throw err;
    }
  },
  async updateSmartGoal(id, data) {
    try {
      const res = await apiClient.put(`/therapist-pro/smart-goals/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateSmartGoal error:', err?.message);
      throw err;
    }
  },
  async updateMilestone(goalId, milestoneId) {
    try {
      const res = await apiClient.patch(
        `/therapist-pro/smart-goals/${goalId}/milestones/${milestoneId}`
      );
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateMilestone error:', err?.message);
      throw err;
    }
  },
  async deleteSmartGoal(id) {
    try {
      const res = await apiClient.delete(`/therapist-pro/smart-goals/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteSmartGoal error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: Referrals ───
  async getReferrals(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/referrals', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getReferrals error:', err?.message);
      throw err;
    }
  },
  async createReferral(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/referrals', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createReferral error:', err?.message);
      throw err;
    }
  },
  async updateReferral(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/referrals/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateReferral error:', err?.message);
      throw err;
    }
  },
  async updateReferralStatus(id, status) {
    try {
      const res = await apiClient.patch(`/therapist-ultra/referrals/${id}/status`, { status });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateReferralStatus error:', err?.message);
      throw err;
    }
  },
  async deleteReferral(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/referrals/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteReferral error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: Group Therapy ───
  async getGroups(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/groups', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getGroups error:', err?.message);
      throw err;
    }
  },
  async createGroup(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/groups', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createGroup error:', err?.message);
      throw err;
    }
  },
  async updateGroup(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/groups/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateGroup error:', err?.message);
      throw err;
    }
  },
  async addGroupParticipant(id, data) {
    try {
      const res = await apiClient.post(`/therapist-ultra/groups/${id}/participants`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addGroupParticipant error:', err?.message);
      throw err;
    }
  },
  async removeGroupParticipant(groupId, participantId) {
    try {
      const res = await apiClient.delete(
        `/therapist-ultra/groups/${groupId}/participants/${participantId}`
      );
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('removeGroupParticipant error:', err?.message);
      throw err;
    }
  },
  async deleteGroup(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/groups/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteGroup error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: Equipment ───
  async getEquipment(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/equipment', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getEquipment error:', err?.message);
      throw err;
    }
  },
  async createEquipment(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/equipment', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createEquipment error:', err?.message);
      throw err;
    }
  },
  async updateEquipment(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/equipment/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateEquipment error:', err?.message);
      throw err;
    }
  },
  async bookEquipment(id) {
    try {
      const res = await apiClient.patch(`/therapist-ultra/equipment/${id}/book`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('bookEquipment error:', err?.message);
      throw err;
    }
  },
  async returnEquipment(id) {
    try {
      const res = await apiClient.patch(`/therapist-ultra/equipment/${id}/return`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('returnEquipment error:', err?.message);
      throw err;
    }
  },
  async deleteEquipment(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/equipment/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteEquipment error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: KPIs ───
  async getKPIs(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/kpis', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getKPIs error:', err?.message);
      throw err;
    }
  },
  async createKPI(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/kpis', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createKPI error:', err?.message);
      throw err;
    }
  },
  async updateKPI(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/kpis/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateKPI error:', err?.message);
      throw err;
    }
  },
  async deleteKPI(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/kpis/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteKPI error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: Safety Protocols ───
  async getSafetyProtocols(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/safety', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getSafetyProtocols error:', err?.message);
      throw err;
    }
  },
  async createSafetyProtocol(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/safety', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createSafetyProtocol error:', err?.message);
      throw err;
    }
  },
  async updateSafetyProtocol(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/safety/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateSafetyProtocol error:', err?.message);
      throw err;
    }
  },
  async reportSafetyIncident(id, data) {
    try {
      const res = await apiClient.post(`/therapist-ultra/safety/${id}/incidents`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('reportSafetyIncident error:', err?.message);
      throw err;
    }
  },
  async resolveSafetyIncident(protocolId, incidentId) {
    try {
      const res = await apiClient.patch(
        `/therapist-ultra/safety/${protocolId}/incidents/${incidentId}/resolve`
      );
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('resolveSafetyIncident error:', err?.message);
      throw err;
    }
  },
  async deleteSafetyProtocol(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/safety/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteSafetyProtocol error:', err?.message);
      throw err;
    }
  },

  // ─── Therapist Ultra: Clinical Research ───
  async getResearch(params) {
    try {
      const res = await apiClient.get('/therapist-ultra/research', { params });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('getResearch error:', err?.message);
      throw err;
    }
  },
  async createResearch(data) {
    try {
      const res = await apiClient.post('/therapist-ultra/research', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createResearch error:', err?.message);
      throw err;
    }
  },
  async updateResearch(id, data) {
    try {
      const res = await apiClient.put(`/therapist-ultra/research/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateResearch error:', err?.message);
      throw err;
    }
  },
  async addResearchPublication(id, publication) {
    try {
      const res = await apiClient.post(`/therapist-ultra/research/${id}/publications`, {
        publication,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addResearchPublication error:', err?.message);
      throw err;
    }
  },
  async deleteResearch(id) {
    try {
      const res = await apiClient.delete(`/therapist-ultra/research/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteResearch error:', err?.message);
      throw err;
    }
  },

  // ======== Therapist Portal Elite ========

  // --- Telehealth ---
  async getTelehealthSessions() {
    try {
      const res = await apiClient.get('/therapist-elite/telehealth');
      return res?.data;
    } catch (err) {
      logger.warn('getTelehealthSessions error:', err?.message);
      throw err;
    }
  },
  async createTelehealthSession(data) {
    try {
      const res = await apiClient.post('/therapist-elite/telehealth', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createTelehealthSession error:', err?.message);
      throw err;
    }
  },
  async updateTelehealthSession(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/telehealth/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateTelehealthSession error:', err?.message);
      throw err;
    }
  },
  async updateTelehealthStatus(id, status) {
    try {
      const res = await apiClient.patch(`/therapist-elite/telehealth/${id}/status`, { status });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateTelehealthStatus error:', err?.message);
      throw err;
    }
  },
  async deleteTelehealthSession(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/telehealth/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteTelehealthSession error:', err?.message);
      throw err;
    }
  },

  // --- Field Training ---
  async getFieldTraining() {
    try {
      const res = await apiClient.get('/therapist-elite/field-training');
      return res?.data;
    } catch (err) {
      logger.warn('getFieldTraining error:', err?.message);
      throw err;
    }
  },
  async createFieldTraining(data) {
    try {
      const res = await apiClient.post('/therapist-elite/field-training', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createFieldTraining error:', err?.message);
      throw err;
    }
  },
  async updateFieldTraining(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/field-training/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateFieldTraining error:', err?.message);
      throw err;
    }
  },
  async addTrainingEvaluation(id, evaluation) {
    try {
      const res = await apiClient.post(`/therapist-elite/field-training/${id}/evaluations`, {
        evaluation,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addTrainingEvaluation error:', err?.message);
      throw err;
    }
  },
  async logTrainingHours(id, hours) {
    try {
      const res = await apiClient.patch(`/therapist-elite/field-training/${id}/hours`, { hours });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('logTrainingHours error:', err?.message);
      throw err;
    }
  },
  async deleteFieldTraining(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/field-training/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteFieldTraining error:', err?.message);
      throw err;
    }
  },

  // --- Consents ---
  async getConsents() {
    try {
      const res = await apiClient.get('/therapist-elite/consents');
      return res?.data;
    } catch (err) {
      logger.warn('getConsents error:', err?.message);
      throw err;
    }
  },
  async createConsent(data) {
    try {
      const res = await apiClient.post('/therapist-elite/consents', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createConsent error:', err?.message);
      throw err;
    }
  },
  async updateConsent(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/consents/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateConsent error:', err?.message);
      throw err;
    }
  },
  async signConsent(id, data) {
    try {
      const res = await apiClient.patch(`/therapist-elite/consents/${id}/sign`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('signConsent error:', err?.message);
      throw err;
    }
  },
  async revokeConsent(id) {
    try {
      const res = await apiClient.patch(`/therapist-elite/consents/${id}/revoke`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('revokeConsent error:', err?.message);
      throw err;
    }
  },
  async deleteConsent(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/consents/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteConsent error:', err?.message);
      throw err;
    }
  },

  // --- Quality Reports ---
  async getQualityReports() {
    try {
      const res = await apiClient.get('/therapist-elite/quality-reports');
      return res?.data;
    } catch (err) {
      logger.warn('getQualityReports error:', err?.message);
      throw err;
    }
  },
  async createQualityReport(data) {
    try {
      const res = await apiClient.post('/therapist-elite/quality-reports', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createQualityReport error:', err?.message);
      throw err;
    }
  },
  async updateQualityReport(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/quality-reports/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateQualityReport error:', err?.message);
      throw err;
    }
  },
  async addQualityFinding(id, finding) {
    try {
      const res = await apiClient.post(`/therapist-elite/quality-reports/${id}/findings`, {
        finding,
      });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addQualityFinding error:', err?.message);
      throw err;
    }
  },
  async deleteQualityReport(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/quality-reports/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteQualityReport error:', err?.message);
      throw err;
    }
  },

  // --- Waiting List ---
  async getWaitingList() {
    try {
      const res = await apiClient.get('/therapist-elite/waiting-list');
      return res?.data;
    } catch (err) {
      logger.warn('getWaitingList error:', err?.message);
      throw err;
    }
  },
  async addToWaitingList(data) {
    try {
      const res = await apiClient.post('/therapist-elite/waiting-list', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('addToWaitingList error:', err?.message);
      throw err;
    }
  },
  async updateWaitingListItem(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/waiting-list/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateWaitingListItem error:', err?.message);
      throw err;
    }
  },
  async updateWaitingStatus(id, status) {
    try {
      const res = await apiClient.patch(`/therapist-elite/waiting-list/${id}/status`, { status });
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateWaitingStatus error:', err?.message);
      throw err;
    }
  },
  async removeFromWaitingList(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/waiting-list/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('removeFromWaitingList error:', err?.message);
      throw err;
    }
  },

  // --- Achievements ---
  async getAchievements() {
    try {
      const res = await apiClient.get('/therapist-elite/achievements');
      return res?.data;
    } catch (err) {
      logger.warn('getAchievements error:', err?.message);
      throw err;
    }
  },
  async createAchievement(data) {
    try {
      const res = await apiClient.post('/therapist-elite/achievements', data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('createAchievement error:', err?.message);
      throw err;
    }
  },
  async updateAchievement(id, data) {
    try {
      const res = await apiClient.put(`/therapist-elite/achievements/${id}`, data);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('updateAchievement error:', err?.message);
      throw err;
    }
  },
  async deleteAchievement(id) {
    try {
      const res = await apiClient.delete(`/therapist-elite/achievements/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      logger.warn('deleteAchievement error:', err?.message);
      throw err;
    }
  },
};
