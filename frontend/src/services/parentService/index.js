import apiClient from '../api.client';
import {
  getMockParentDashboard,
  getMockChildrenProgress,
  getMockAttendanceReports,
  getMockTherapistCommunications,
  getMockPaymentsHistory,
  getMockDocumentsReports,
  getMockAppointmentsScheduling,
  getMockParentMessages,
} from './mockData';

/**
 * Parent Portal Service
 * API-first with mock data fallback
 * Uses /api/parents for basic routes + /api/guardian for advanced portal features
 */
export const parentService = {
  // ==================== BASIC PARENT ROUTES ====================
  async getParentDashboard(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/dashboard`);
      return data?.data || data;
    } catch {
      return getMockParentDashboard();
    }
  },

  async getChildrenProgress(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/children-progress`);
      return data?.data || data;
    } catch {
      return getMockChildrenProgress();
    }
  },

  async getAttendanceReports(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/attendance`);
      return data?.data || data;
    } catch {
      return getMockAttendanceReports();
    }
  },

  async getTherapistCommunications(_parentId) {
    try {
      const data = await apiClient.get('/communications/therapist');
      return data?.data || data;
    } catch {
      return getMockTherapistCommunications();
    }
  },

  async getPaymentsHistory(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/payments`);
      return data?.data || data;
    } catch {
      return getMockPaymentsHistory();
    }
  },

  async getDocumentsReports(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/documents`);
      return data?.data || data;
    } catch {
      return getMockDocumentsReports();
    }
  },

  async getAppointmentsScheduling(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/appointments`);
      return data?.data || data;
    } catch {
      return getMockAppointmentsScheduling();
    }
  },

  async getParentMessages(parentId) {
    try {
      const data = await apiClient.get(`/parents/${parentId || 'me'}/messages`);
      return data?.data || data;
    } catch {
      return getMockParentMessages();
    }
  },

  // ==================== GUARDIAN PORTAL (ADVANCED) ====================
  // Dashboard
  async getGuardianDashboard() {
    try {
      const data = await apiClient.get('/guardian/dashboard');
      return data?.data || data;
    } catch {
      return getMockParentDashboard();
    }
  },

  async getDashboardSummary() {
    try {
      const data = await apiClient.get('/guardian/dashboard/summary');
      return data?.data || data;
    } catch {
      return null;
    }
  },

  // Profile
  async getProfile() {
    try {
      const data = await apiClient.get('/guardian/profile');
      return data?.data || data;
    } catch {
      return null;
    }
  },

  async updateProfile(profileData) {
    try {
      const data = await apiClient.put('/guardian/profile', profileData);
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },

  // Beneficiaries
  async getBeneficiaries() {
    try {
      const data = await apiClient.get('/guardian/beneficiaries');
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async getBeneficiaryDetail(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}`);
      return data?.data || data;
    } catch {
      return null;
    }
  },

  async getBeneficiaryProgress(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}/progress`);
      return data?.data || data;
    } catch {
      return null;
    }
  },

  async getBeneficiaryProgressTrend(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}/progress/trend`);
      return data?.data || data;
    } catch {
      return [];
    }
  },

  // Grades
  async getBeneficiaryGrades(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}/grades`);
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async getGradesComparison() {
    try {
      const data = await apiClient.get('/guardian/grades/comparison');
      return data?.data || data;
    } catch {
      return null;
    }
  },

  // Attendance (Guardian Portal)
  async getBeneficiaryAttendance(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}/attendance`);
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async getBeneficiaryAttendanceReport(id) {
    try {
      const data = await apiClient.get(`/guardian/beneficiaries/${id}/attendance/report`);
      return data?.data || data;
    } catch {
      return null;
    }
  },

  // Financial
  async getFinancialSummary() {
    try {
      const data = await apiClient.get('/guardian/financial/summary');
      return data?.data || data;
    } catch {
      return null;
    }
  },

  async makePayment(paymentData) {
    try {
      const data = await apiClient.post('/guardian/payments', paymentData);
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },

  // Messages (Guardian Portal)
  async getGuardianMessages() {
    try {
      const data = await apiClient.get('/guardian/messages');
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async sendGuardianMessage(messageData) {
    try {
      const data = await apiClient.post('/guardian/messages', messageData);
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },

  // Notifications
  async getNotifications() {
    try {
      const data = await apiClient.get('/guardian/notifications');
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async markNotificationRead(id) {
    try {
      const data = await apiClient.put(`/guardian/notifications/${id}/read`);
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },

  async markAllNotificationsRead() {
    try {
      const data = await apiClient.put('/guardian/notifications/read-all');
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },

  // Reports
  async getReports() {
    try {
      const data = await apiClient.get('/guardian/reports');
      return data?.data || data;
    } catch {
      return [];
    }
  },

  async generateReport(reportConfig) {
    try {
      const data = await apiClient.post('/guardian/reports/generate', reportConfig);
      return data?.data || data;
    } catch (err) {
      throw err;
    }
  },
};

export default parentService;
