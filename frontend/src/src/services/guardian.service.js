/**
 * خدمة البيانات لأولياء الأمور (Guardian Portal)
 * جميع الاستدعاءات المتعلقة ببوابة ولي الأمر
 */

import apiClient from './api.client';

const guardianService = {
  // ==================== لوحة التحكم ====================
  getDashboard: () =>
    apiClient.get('/guardian/dashboard'),

  getDashboardSummary: () =>
    apiClient.get('/guardian/dashboard/summary'),

  getDashboardOverview: () =>
    apiClient.get('/guardian/dashboard/overview'),

  getDashboardStats: () =>
    apiClient.get('/guardian/dashboard/stats'),

  // ==================== الملف الشخصي ====================
  getProfile: () =>
    apiClient.get('/guardian/profile'),

  updateProfile: (profileData) =>
    apiClient.put('/guardian/profile', profileData),

  updateProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.post('/guardian/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadProfileData: () =>
    apiClient.get('/guardian/profile/download'),

  // ==================== إدارة المستفيدين (الأطفال) ====================
  getBeneficiaries: () =>
    apiClient.get('/guardian/beneficiaries'),

  getBeneficiaryDetail: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}`),

  linkBeneficiary: (beneficiaryEmail) =>
    apiClient.post('/guardian/beneficiaries/link', { email: beneficiaryEmail }),

  unlinkBeneficiary: (beneficiaryId) =>
    apiClient.delete(`/guardian/beneficiaries/${beneficiaryId}`),

  // ==================== تتبع التقدم ====================
  getBeneficiaryProgress: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress`),

  getBeneficiaryMonthlyProgress: (beneficiaryId, month) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress/${month}`),

  getBeneficiaryProgressTrend: (beneficiaryId, months = 6) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress/trend?months=${months}`),

  // ==================== الدرجات ====================
  getBeneficiaryGrades: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/grades`),

  getBeneficiaryGradesSummary: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/grades/summary`),

  getGradesComparison: () =>
    apiClient.get('/guardian/analysis/grades-comparison'),

  // ==================== الحضور ====================
  getBeneficiaryAttendance: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance`),

  getBeneficiaryAttendanceSummary: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance/summary`),

  getBeneficiaryAttendanceReport: (beneficiaryId, month) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance/report/${month}`),

  // ==================== السلوك ====================
  getBehavior: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/behavior`),

  getBehaviorSummary: (beneficiaryId) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/behavior/summary`),

  // ==================== التقارير ====================
  getReports: () =>
    apiClient.get('/guardian/reports'),

  getMonthlyReports: (month) =>
    apiClient.get(`/guardian/reports/monthly/${month}`),

  generateReport: (reportData) =>
    apiClient.post('/guardian/reports/generate', reportData),

  scheduleReport: (scheduleData) =>
    apiClient.post('/guardian/reports/schedule', scheduleData),

  // ==================== المدفوعات ====================
  getPayments: (page = 1) =>
    apiClient.get(`/guardian/payments?page=${page}`),

  getPaymentDetail: (paymentId) =>
    apiClient.get(`/guardian/payments/${paymentId}`),

  getPendingPayments: () =>
    apiClient.get('/guardian/payments/pending'),

  getOverduePayments: () =>
    apiClient.get('/guardian/payments/overdue'),

  makePayment: (paymentData) =>
    apiClient.post('/guardian/payments', paymentData),

  requestInvoice: (paymentId) =>
    apiClient.post(`/guardian/payments/${paymentId}/invoice`),

  getReceipt: (paymentId) =>
    apiClient.get(`/guardian/payments/${paymentId}/receipt`),

  requestRefund: (paymentId, reason) =>
    apiClient.post(`/guardian/payments/${paymentId}/refund`, { reason }),

  // ==================== الملخص المالي ====================
  getFinancialSummary: () =>
    apiClient.get('/guardian/financial/summary'),

  getBalance: () =>
    apiClient.get('/guardian/financial/balance'),

  getFinancialHistory: (page = 1) =>
    apiClient.get(`/guardian/financial/history?page=${page}`),

  getFinancialForecast: (months = 3) =>
    apiClient.get(`/guardian/financial/forecast?months=${months}`),

  // ==================== الرسائل ====================
  getMessages: (page = 1) =>
    apiClient.get(`/guardian/messages?page=${page}`),

  getMessageDetail: (messageId) =>
    apiClient.get(`/guardian/messages/${messageId}`),

  sendMessage: (messageData) =>
    apiClient.post('/guardian/messages', messageData),

  markMessageRead: (messageId) =>
    apiClient.put(`/guardian/messages/${messageId}/read`),

  archiveMessage: (messageId) =>
    apiClient.put(`/guardian/messages/${messageId}/archive`),

  deleteMessage: (messageId) =>
    apiClient.delete(`/guardian/messages/${messageId}`),

  // ==================== الإخطارات ====================
  getNotifications: () =>
    apiClient.get('/guardian/notifications'),

  getUnreadNotifications: () =>
    apiClient.get('/guardian/notifications/unread'),

  markNotificationRead: (notificationId) =>
    apiClient.put(`/guardian/notifications/${notificationId}/read`),

  markAllNotificationsRead: () =>
    apiClient.put('/guardian/notifications/read-all'),

  getNotificationPreferences: () =>
    apiClient.get('/guardian/notification-preferences'),

  updateNotificationPreferences: (preferences) =>
    apiClient.put('/guardian/notification-preferences', preferences),

  // ==================== التحليلات ====================
  getAnalyticsDashboard: () =>
    apiClient.get('/guardian/analytics/dashboard'),

  getPerformanceAnalytics: () =>
    apiClient.get('/guardian/analytics/performance'),

  getFinancialAnalytics: () =>
    apiClient.get('/guardian/analytics/financial'),

  getAttendanceAnalytics: () =>
    apiClient.get('/guardian/analytics/attendance'),

  // ==================== الإعدادات ====================
  getSettings: () =>
    apiClient.get('/guardian/settings'),

  updateSettings: (settings) =>
    apiClient.put('/guardian/settings', settings),

  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/guardian/change-password', { oldPassword, newPassword }),

  changeLanguage: (language) =>
    apiClient.put('/guardian/language', { language }),

  // ==================== التصدير ====================
  exportAllData: () =>
    apiClient.get('/guardian/export/all'),

  // ==================== البحث ====================
  searchBeneficiaries: (query) =>
    apiClient.get(`/guardian/search/beneficiaries?q=${query}`),

  searchMessages: (query) =>
    apiClient.get(`/guardian/search/messages?q=${query}`),
};

export default guardianService;
