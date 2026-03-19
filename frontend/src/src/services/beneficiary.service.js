/**
 * خدمة البيانات للمتعلمين (Beneficiary Portal)
 * جميع الاستدعاءات المتعلقة ببوابة المتعلم
 */

import apiClient from './api.client';

const beneficiaryService = {
  // ==================== لوحة التحكم ====================
  getDashboard: () =>
    apiClient.get('/beneficiary/dashboard'),

  getDashboardStats: () =>
    apiClient.get('/beneficiary/dashboard/stats'),

  // ==================== الملف الشخصي ====================
  getProfile: () =>
    apiClient.get('/beneficiary/profile'),

  updateProfile: (profileData) =>
    apiClient.put('/beneficiary/profile', profileData),

  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.post('/beneficiary/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadProfileData: () =>
    apiClient.get('/beneficiary/profile/download'),

  // ==================== التقدم الأكاديمي ====================
  getProgress: () =>
    apiClient.get('/beneficiary/progress'),

  getProgressByMonth: (month) =>
    apiClient.get(`/beneficiary/progress/${month}`),

  getProgressTrend: (months = 6) =>
    apiClient.get(`/beneficiary/progress/trend?months=${months}`),

  getProgressReports: () =>
    apiClient.get('/beneficiary/progress/reports'),

  // ==================== الدرجات ====================
  getGrades: () =>
    apiClient.get('/beneficiary/grades'),

  getGradesSummary: () =>
    apiClient.get('/beneficiary/grades/summary'),

  getGradesTrend: (months = 6) =>
    apiClient.get(`/beneficiary/grades/trend?months=${months}`),

  // ==================== الحضور ====================
  getAttendance: () =>
    apiClient.get('/beneficiary/attendance'),

  getAttendanceSummary: () =>
    apiClient.get('/beneficiary/attendance/summary'),

  getAttendanceReport: (month) =>
    apiClient.get(`/beneficiary/attendance/report/${month}`),

  // ==================== البرامج ====================
  getPrograms: () =>
    apiClient.get('/beneficiary/programs'),

  getProgramDetail: (programId) =>
    apiClient.get(`/beneficiary/programs/${programId}`),

  getProgramActivities: (programId) =>
    apiClient.get(`/beneficiary/programs/${programId}/activities`),

  enrollProgram: (programId) =>
    apiClient.post(`/beneficiary/programs/${programId}/enroll`),

  unenrollProgram: (programId) =>
    apiClient.post(`/beneficiary/programs/${programId}/unenroll`),

  // ==================== الرسائل ====================
  getMessages: (page = 1, limit = 20) =>
    apiClient.get(`/beneficiary/messages?page=${page}&limit=${limit}`),

  getSentMessages: (page = 1) =>
    apiClient.get(`/beneficiary/messages/sent?page=${page}`),

  getMessageDetail: (messageId) =>
    apiClient.get(`/beneficiary/messages/${messageId}`),

  sendMessage: (messageData) =>
    apiClient.post('/beneficiary/messages', messageData),

  replyMessage: (messageId, replyData) =>
    apiClient.post(`/beneficiary/messages/${messageId}/reply`, replyData),

  markMessageRead: (messageId) =>
    apiClient.put(`/beneficiary/messages/${messageId}/read`),

  archiveMessage: (messageId) =>
    apiClient.put(`/beneficiary/messages/${messageId}/archive`),

  // ==================== المستندات ====================
  getDocuments: () =>
    apiClient.get('/beneficiary/documents'),

  getDocumentDetail: (docId) =>
    apiClient.get(`/beneficiary/documents/${docId}`),

  downloadDocument: (docId) =>
    apiClient.get(`/beneficiary/documents/${docId}/download`, {
      responseType: 'blob',
    }),

  uploadDocument: (file, category) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);
    return apiClient.post('/beneficiary/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument: (docId) =>
    apiClient.delete(`/beneficiary/documents/${docId}`),

  // ==================== أولياء الأمور ====================
  getGuardians: () =>
    apiClient.get('/beneficiary/guardians'),

  getGuardianDetail: (guardianId) =>
    apiClient.get(`/beneficiary/guardians/${guardianId}`),

  inviteGuardian: (email) =>
    apiClient.post('/beneficiary/guardians/invite', { email }),

  removeGuardian: (guardianId) =>
    apiClient.delete(`/beneficiary/guardians/${guardianId}`),

  // ==================== الإخطارات ====================
  getNotifications: () =>
    apiClient.get('/beneficiary/notifications'),

  markNotificationRead: (notificationId) =>
    apiClient.put(`/beneficiary/notifications/${notificationId}/read`),

  markAllNotificationsRead: () =>
    apiClient.put('/beneficiary/notifications/read-all'),

  archiveNotification: (notificationId) =>
    apiClient.put(`/beneficiary/notifications/${notificationId}/archive`),

  getNotificationPreferences: () =>
    apiClient.get('/beneficiary/notification-preferences'),

  updateNotificationPreferences: (preferences) =>
    apiClient.put('/beneficiary/notification-preferences', preferences),

  // ==================== الإعدادات ====================
  getSettings: () =>
    apiClient.get('/beneficiary/settings'),

  updateSettings: (settings) =>
    apiClient.put('/beneficiary/settings', settings),

  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/beneficiary/change-password', {
      oldPassword,
      newPassword,
    }),

  changeLanguage: (language) =>
    apiClient.put('/beneficiary/language', { language }),

  // ==================== التصدير ====================
  exportProfileData: () =>
    apiClient.get('/beneficiary/export/profile'),

  exportGrades: () =>
    apiClient.get('/beneficiary/export/grades'),

  exportAttendance: () =>
    apiClient.get('/beneficiary/export/attendance'),

  exportProgress: () =>
    apiClient.get('/beneficiary/export/progress'),

  // ==================== الدعم ====================
  getFAQ: () =>
    apiClient.get('/beneficiary/faq'),

  contactSupport: (ticketData) =>
    apiClient.post('/beneficiary/support', ticketData),

  getSupportTickets: () =>
    apiClient.get('/beneficiary/support/tickets'),
};

export default beneficiaryService;
