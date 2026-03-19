/**
 * خدمة البيانات لأولياء الأمور (Guardian Portal)
 * جميع الاستدعاءات المتعلقة ببوابة ولي الأمر
 */

import apiClient from './api.client';

const guardianService = {
  // ==================== لوحة التحكم ====================
  getDashboard: () => apiClient.get('/guardian/dashboard'),

  getDashboardSummary: () => apiClient.get('/guardian/dashboard/summary'),

  getDashboardOverview: () => apiClient.get('/guardian/dashboard/overview'),

  getDashboardStats: () => apiClient.get('/guardian/dashboard/stats'),

  // ==================== الملف الشخصي ====================
  getProfile: () => apiClient.get('/guardian/profile'),

  updateProfile: profileData => apiClient.put('/guardian/profile', profileData),

  updateProfilePhoto: file => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.post('/guardian/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadProfileData: () => apiClient.get('/guardian/profile/download'),

  // ==================== إدارة المستفيدين (الأطفال) ====================
  getBeneficiaries: () => apiClient.get('/guardian/beneficiaries'),

  getBeneficiaryDetail: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}`),

  linkBeneficiary: beneficiaryEmail => apiClient.post('/guardian/beneficiaries/link', { email: beneficiaryEmail }),

  unlinkBeneficiary: beneficiaryId => apiClient.delete(`/guardian/beneficiaries/${beneficiaryId}`),

  // ==================== تتبع التقدم ====================
  getBeneficiaryProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress`),

  getBeneficiaryMonthlyProgress: (beneficiaryId, month) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress/${month}`),

  getBeneficiaryProgressTrend: (beneficiaryId, months = 6) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/progress/trend?months=${months}`),

  // ==================== الدرجات ====================
  getBeneficiaryGrades: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/grades`),

  getBeneficiaryGradesSummary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/grades/summary`),

  getGradesComparison: () => apiClient.get('/guardian/analysis/grades-comparison'),

  // ==================== الحضور ====================
  getBeneficiaryAttendance: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance`),

  getBeneficiaryAttendanceSummary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance/summary`),

  getBeneficiaryAttendanceReport: (beneficiaryId, month) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/attendance/report/${month}`),

  // ==================== السلوك ====================
  getBehavior: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/behavior`),

  getBehaviorSummary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/behavior/summary`),

  // ==================== التقارير ====================
  getReports: () => apiClient.get('/guardian/reports'),

  getMonthlyReports: month => apiClient.get(`/guardian/reports/monthly/${month}`),

  generateReport: reportData => apiClient.post('/guardian/reports/generate', reportData),

  scheduleReport: scheduleData => apiClient.post('/guardian/reports/schedule', scheduleData),

  // ==================== المدفوعات ====================
  getPayments: (page = 1) => apiClient.get(`/guardian/payments?page=${page}`),

  getPaymentDetail: paymentId => apiClient.get(`/guardian/payments/${paymentId}`),

  getPendingPayments: () => apiClient.get('/guardian/payments/pending'),

  getOverduePayments: () => apiClient.get('/guardian/payments/overdue'),

  makePayment: paymentData => apiClient.post('/guardian/payments', paymentData),

  requestInvoice: paymentId => apiClient.post(`/guardian/payments/${paymentId}/invoice`),

  getReceipt: paymentId => apiClient.get(`/guardian/payments/${paymentId}/receipt`),

  requestRefund: (paymentId, reason) => apiClient.post(`/guardian/payments/${paymentId}/refund`, { reason }),

  // ==================== الملخص المالي ====================
  getFinancialSummary: () => apiClient.get('/guardian/financial/summary'),

  getBalance: () => apiClient.get('/guardian/financial/balance'),

  getFinancialHistory: (page = 1) => apiClient.get(`/guardian/financial/history?page=${page}`),

  getFinancialForecast: (months = 3) => apiClient.get(`/guardian/financial/forecast?months=${months}`),

  // ==================== الرسائل ====================
  getMessages: (page = 1) => apiClient.get(`/guardian/messages?page=${page}`),

  getMessageDetail: messageId => apiClient.get(`/guardian/messages/${messageId}`),

  sendMessage: messageData => apiClient.post('/guardian/messages', messageData),

  markMessageRead: messageId => apiClient.put(`/guardian/messages/${messageId}/read`),

  archiveMessage: messageId => apiClient.put(`/guardian/messages/${messageId}/archive`),

  deleteMessage: messageId => apiClient.delete(`/guardian/messages/${messageId}`),

  // ==================== الإخطارات ====================
  getNotifications: () => apiClient.get('/guardian/notifications'),

  getUnreadNotifications: () => apiClient.get('/guardian/notifications/unread'),

  markNotificationRead: notificationId => apiClient.put(`/guardian/notifications/${notificationId}/read`),

  markAllNotificationsRead: () => apiClient.put('/guardian/notifications/read-all'),

  getNotificationPreferences: () => apiClient.get('/guardian/notification-preferences'),

  updateNotificationPreferences: preferences => apiClient.put('/guardian/notification-preferences', preferences),

  // ==================== التحليلات ====================
  getAnalyticsDashboard: () => apiClient.get('/guardian/analytics/dashboard'),

  getPerformanceAnalytics: () => apiClient.get('/guardian/analytics/performance'),

  getFinancialAnalytics: () => apiClient.get('/guardian/analytics/financial'),

  getAttendanceAnalytics: () => apiClient.get('/guardian/analytics/attendance'),

  // ==================== الإعدادات ====================
  getSettings: () => apiClient.get('/guardian/settings'),

  updateSettings: settings => apiClient.put('/guardian/settings', settings),

  changePassword: (oldPassword, newPassword) => apiClient.post('/guardian/change-password', { oldPassword, newPassword }),

  changeLanguage: language => apiClient.put('/guardian/language', { language }),

  // ==================== التصدير ====================
  exportAllData: () => apiClient.get('/guardian/export/all'),

  // ==================== البحث ====================
  searchBeneficiaries: query => apiClient.get(`/guardian/search/beneficiaries?q=${query}`),

  searchMessages: query => apiClient.get(`/guardian/search/messages?q=${query}`),

  // ==================== المواعيد ====================
  getAppointments: (page = 1, status) => apiClient.get(`/guardian/appointments?page=${page}${status ? `&status=${status}` : ''}`),

  bookAppointment: appointmentData => apiClient.post('/guardian/appointments', appointmentData),

  getAppointmentDetail: appointmentId => apiClient.get(`/guardian/appointments/${appointmentId}`),

  cancelAppointment: (appointmentId, reason) => apiClient.put(`/guardian/appointments/${appointmentId}/cancel`, { reason }),

  getAvailableSlots: (date, staffId, appointmentType) =>
    apiClient.get(
      `/guardian/appointments/available-slots?date=${date || ''}${staffId ? `&staffId=${staffId}` : ''}${appointmentType ? `&appointmentType=${appointmentType}` : ''}`,
    ),

  getAppointmentHistory: () => apiClient.get('/guardian/appointments/history'),

  // ==================== الجدول ====================
  getBeneficiarySchedule: (beneficiaryId, date) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/schedule${date ? `?date=${date}` : ''}`),

  getBeneficiaryWeeklySchedule: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/schedule/weekly`),

  getBeneficiaryExams: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/schedule/exams`),

  // ==================== الخطة التعليمية الفردية IEP ====================
  getBeneficiaryIEP: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/iep`),

  getBeneficiaryIEPGoals: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/iep/goals`),

  getBeneficiaryIEPProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/iep/progress`),

  submitIEPFeedback: (beneficiaryId, feedbackData) => apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/iep/feedback`, feedbackData),

  // ==================== الاستبيانات ====================
  getSurveys: status => apiClient.get(`/guardian/surveys${status ? `?status=${status}` : ''}`),

  getSurveyDetail: surveyId => apiClient.get(`/guardian/surveys/${surveyId}`),

  submitSurvey: (surveyId, answers) => apiClient.post(`/guardian/surveys/${surveyId}/submit`, { answers }),

  getSurveyHistory: () => apiClient.get('/guardian/surveys/history'),

  // ==================== المكتبة الإلكترونية ====================
  getResources: (page = 1, category, search) =>
    apiClient.get(`/guardian/resources?page=${page}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`),

  getResourceCategories: () => apiClient.get('/guardian/resources/categories'),

  getResourceDetail: resourceId => apiClient.get(`/guardian/resources/${resourceId}`),

  bookmarkResource: resourceId => apiClient.post(`/guardian/resources/${resourceId}/bookmark`),

  getBookmarkedResources: () => apiClient.get('/guardian/resources/bookmarks'),

  // ==================== طلبات الدعم ====================
  getSupportTickets: (page = 1, status) => apiClient.get(`/guardian/support-tickets?page=${page}${status ? `&status=${status}` : ''}`),

  createSupportTicket: ticketData => apiClient.post('/guardian/support-tickets', ticketData),

  getSupportTicketDetail: ticketId => apiClient.get(`/guardian/support-tickets/${ticketId}`),

  replySupportTicket: (ticketId, message) => apiClient.post(`/guardian/support-tickets/${ticketId}/reply`, { message }),

  closeSupportTicket: (ticketId, rating, notes) =>
    apiClient.put(`/guardian/support-tickets/${ticketId}/close`, {
      satisfactionRating: rating,
      closingNotes: notes,
    }),

  // ==================== التقويم والأحداث ====================
  getEvents: (page = 1, month, category) =>
    apiClient.get(`/guardian/events?page=${page}${month ? `&month=${month}` : ''}${category ? `&category=${category}` : ''}`),

  getEventDetail: eventId => apiClient.get(`/guardian/events/${eventId}`),

  rsvpEvent: (eventId, attending, attendeeCount) => apiClient.post(`/guardian/events/${eventId}/rsvp`, { attending, attendeeCount }),

  getEventsCalendar: (year, month) => apiClient.get(`/guardian/events/calendar?year=${year || ''}&month=${month || ''}`),

  // ==================== الاقتراحات والشكاوى ====================
  getFeedback: () => apiClient.get('/guardian/feedback'),

  submitFeedback: feedbackData => apiClient.post('/guardian/feedback', feedbackData),

  submitComplaint: complaintData => apiClient.post('/guardian/complaints', complaintData),

  getComplaints: () => apiClient.get('/guardian/complaints'),

  getComplaintDetail: complaintId => apiClient.get(`/guardian/complaints/${complaintId}`),

  // ==================== المستندات ====================
  getDocuments: (category, beneficiaryId) =>
    apiClient.get(
      `/guardian/documents${category ? `?category=${category}` : ''}${beneficiaryId ? `${category ? '&' : '?'}beneficiaryId=${beneficiaryId}` : ''}`,
    ),

  getDocumentCategories: () => apiClient.get('/guardian/documents/categories'),

  downloadDocument: documentId => apiClient.get(`/guardian/documents/${documentId}/download`),

  uploadDocument: formData =>
    apiClient.post('/guardian/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ==================== متابعة النقل ====================
  getTransportation: () => apiClient.get('/guardian/transportation'),

  getTransportationTracking: beneficiaryId =>
    apiClient.get(`/guardian/transportation/tracking${beneficiaryId ? `?beneficiaryId=${beneficiaryId}` : ''}`),

  getTransportationSchedule: () => apiClient.get('/guardian/transportation/schedule'),

  reportTransportationAbsence: absenceData => apiClient.post('/guardian/transportation/absence', absenceData),

  // ==================== الأنشطة اللاصفية ====================
  getActivities: (page = 1, category) => apiClient.get(`/guardian/activities?page=${page}${category ? `&category=${category}` : ''}`),

  getActivityDetail: activityId => apiClient.get(`/guardian/activities/${activityId}`),

  enrollActivity: (activityId, beneficiaryId, notes) =>
    apiClient.post(`/guardian/activities/${activityId}/enroll`, { beneficiaryId, notes }),

  withdrawActivity: (activityId, beneficiaryId) =>
    apiClient.delete(`/guardian/activities/${activityId}/withdraw`, {
      data: { beneficiaryId },
    }),

  getEnrolledActivities: () => apiClient.get('/guardian/activities/enrolled'),

  // ==================== طلبات الإذن ====================
  getPermissionRequests: (status, beneficiaryId) =>
    apiClient.get(
      `/guardian/permission-requests${status ? `?status=${status}` : ''}${beneficiaryId ? `${status ? '&' : '?'}beneficiaryId=${beneficiaryId}` : ''}`,
    ),

  createPermissionRequest: requestData => apiClient.post('/guardian/permission-requests', requestData),

  getPermissionRequestDetail: requestId => apiClient.get(`/guardian/permission-requests/${requestId}`),

  cancelPermissionRequest: requestId => apiClient.delete(`/guardian/permission-requests/${requestId}`),

  // ==================== الإعلانات ====================
  getAnnouncements: (page = 1, category) => apiClient.get(`/guardian/announcements?page=${page}${category ? `&category=${category}` : ''}`),

  getAnnouncementDetail: announcementId => apiClient.get(`/guardian/announcements/${announcementId}`),

  // ==================== التواصل مع المعلمين ====================
  getTeachers: beneficiaryId => apiClient.get(`/guardian/teachers${beneficiaryId ? `?beneficiaryId=${beneficiaryId}` : ''}`),

  messageTeacher: (teacherId, messageData) => apiClient.post(`/guardian/teachers/${teacherId}/message`, messageData),

  getTeacherMessages: teacherId => apiClient.get(`/guardian/teachers/${teacherId}/messages`),

  // ==================== نظام المكافآت ====================
  getRewards: () => apiClient.get('/guardian/rewards'),

  getRewardHistory: beneficiaryId => apiClient.get(`/guardian/rewards/${beneficiaryId}/history`),

  // ==================== الطوارئ ====================
  getEmergencyContacts: () => apiClient.get('/guardian/emergency-contacts'),

  updateEmergencyContacts: contacts => apiClient.put('/guardian/emergency-contacts', { contacts }),

  sendEmergencyAlert: alertData => apiClient.post('/guardian/emergency-alert', alertData),

  // ==================== السجل الصحي ====================
  getBeneficiaryHealthRecords: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/health`),

  getBeneficiaryMedications: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/health/medications`),

  getBeneficiaryAllergies: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/health/allergies`),

  getBeneficiaryVaccinations: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/health/vaccinations`),

  reportHealthIncident: (beneficiaryId, incidentData) =>
    apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/health/incident`, incidentData),

  getHealthSummary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/health/summary`),

  // ==================== الجلسات العلاجية ====================
  getBeneficiaryTherapySessions: (beneficiaryId, page = 1) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/therapy?page=${page}`),

  getTherapySessionDetail: (beneficiaryId, sessionId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/therapy/${sessionId}`),

  rateTherapySession: (beneficiaryId, sessionId, ratingData) =>
    apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/therapy/${sessionId}/rate`, ratingData),

  getUpcomingTherapySessions: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/therapy/upcoming`),

  getTherapyProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/therapy/progress`),

  // ==================== خطة التغذية ====================
  getBeneficiaryMealPlan: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/meals`),

  getBeneficiaryDietary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/meals/dietary`),

  updateBeneficiaryDietary: (beneficiaryId, dietaryData) =>
    apiClient.put(`/guardian/beneficiaries/${beneficiaryId}/meals/dietary`, dietaryData),

  requestSpecialMeal: (beneficiaryId, mealData) => apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/meals/request`, mealData),

  getNutritionReport: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/meals/nutrition`),

  // ==================== معرض الصور ====================
  getGallery: (page = 1, category) => apiClient.get(`/guardian/gallery?page=${page}${category ? `&category=${category}` : ''}`),

  getGalleryAlbums: () => apiClient.get('/guardian/gallery/albums'),

  getGalleryItem: mediaId => apiClient.get(`/guardian/gallery/${mediaId}`),

  downloadGalleryItem: mediaId => apiClient.post(`/guardian/gallery/${mediaId}/download`),

  // ==================== الواجبات والمهام ====================
  getBeneficiaryHomework: (beneficiaryId, page = 1, status) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/homework?page=${page}${status ? `&status=${status}` : ''}`),

  getHomeworkDetail: (beneficiaryId, homeworkId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/homework/${homeworkId}`),

  getPendingHomework: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/homework/pending`),

  acknowledgeHomework: (beneficiaryId, homeworkId) =>
    apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/homework/${homeworkId}/acknowledge`),

  getHomeworkStats: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/homework/stats`),

  // ==================== الشهادات والإنجازات ====================
  getBeneficiaryCertificates: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/certificates`),

  getCertificateDetail: (beneficiaryId, certId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/certificates/${certId}`),

  downloadCertificate: (beneficiaryId, certId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/certificates/${certId}/download`),

  getBeneficiaryAchievements: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/achievements`),

  // ==================== تصاريح الزيارة ====================
  getVisitorPasses: () => apiClient.get('/guardian/visitor-passes'),

  requestVisitorPass: passData => apiClient.post('/guardian/visitor-passes', passData),

  getVisitorPassDetail: passId => apiClient.get(`/guardian/visitor-passes/${passId}`),

  cancelVisitorPass: passId => apiClient.delete(`/guardian/visitor-passes/${passId}`),

  getUpcomingVisits: () => apiClient.get('/guardian/visitor-passes/upcoming'),

  // ==================== حجز المرافق ====================
  getFacilities: () => apiClient.get('/guardian/facilities'),

  bookFacility: bookingData => apiClient.post('/guardian/facilities/book', bookingData),

  getMyFacilityBookings: () => apiClient.get('/guardian/facilities/bookings'),

  cancelFacilityBooking: bookingId => apiClient.delete(`/guardian/facilities/bookings/${bookingId}`),

  checkFacilityAvailability: (facilityName, date) =>
    apiClient.get(`/guardian/facilities/availability?facilityName=${facilityName || ''}&date=${date || ''}`),

  // ==================== تقييم الرضا ====================
  getSatisfactionRatings: () => apiClient.get('/guardian/satisfaction'),

  submitSatisfaction: ratingData => apiClient.post('/guardian/satisfaction', ratingData),

  getPendingSatisfaction: () => apiClient.get('/guardian/satisfaction/pending'),

  getSatisfactionSummary: () => apiClient.get('/guardian/satisfaction/summary'),

  // ==================== التقويم الأكاديمي ====================
  getAcademicCalendar: (year, month) => apiClient.get(`/guardian/academic-calendar?year=${year || ''}&month=${month || ''}`),

  getHolidays: () => apiClient.get('/guardian/academic-calendar/holidays'),

  getImportantDates: () => apiClient.get('/guardian/academic-calendar/important-dates'),

  // ==================== مشاركة الأسرة ====================
  getFamilyEngagement: () => apiClient.get('/guardian/family-engagement'),

  getFamilyEngagementDetail: programId => apiClient.get(`/guardian/family-engagement/${programId}`),

  enrollFamilyProgram: programId => apiClient.post(`/guardian/family-engagement/${programId}/enroll`),

  getHomeActivities: () => apiClient.get('/guardian/family-engagement/home-activities'),

  // ==================== مقارنة الأشقاء ====================
  getSiblingsComparison: () => apiClient.get('/guardian/siblings/comparison'),

  getSiblingsAttendanceComparison: () => apiClient.get('/guardian/siblings/attendance-comparison'),

  getSiblingsAcademicComparison: () => apiClient.get('/guardian/siblings/academic-comparison'),

  // ==================== برامج التطوع ====================
  getVolunteerPrograms: (page = 1) => apiClient.get(`/guardian/volunteer-programs?page=${page}`),

  getVolunteerProgramDetail: programId => apiClient.get(`/guardian/volunteer-programs/${programId}`),

  enrollVolunteer: programId => apiClient.post(`/guardian/volunteer-programs/${programId}/enroll`),

  getMyVolunteerHistory: () => apiClient.get('/guardian/volunteer-programs/history'),

  getVolunteerCertificate: programId => apiClient.get(`/guardian/volunteer-programs/${programId}/certificate`),

  // ==================== التقارير اليومية ====================
  getDailyReports: (beneficiaryId, page = 1) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/daily-reports?page=${page}`),

  getDailyReportDetail: (beneficiaryId, reportId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/daily-reports/${reportId}`),

  getDailyReportByDate: (beneficiaryId, date) =>
    apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/daily-reports/by-date?date=${date || ''}`),

  subscribeDailyReport: (beneficiaryId, data) => apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/daily-reports/subscribe`, data),

  getDailyReportSummary: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/daily-reports/summary`),

  // ==================== المواعيد الطبية ====================
  getMedicalAppointments: (page = 1) => apiClient.get(`/guardian/medical-appointments?page=${page}`),

  bookMedicalAppointment: appointmentData => apiClient.post('/guardian/medical-appointments', appointmentData),

  getMedicalAppointmentDetail: appointmentId => apiClient.get(`/guardian/medical-appointments/${appointmentId}`),

  cancelMedicalAppointment: (appointmentId, reason) =>
    apiClient.delete(`/guardian/medical-appointments/${appointmentId}`, { data: { reason } }),

  getMedicalHistory: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/medical-history`),

  // ==================== صندوق الاقتراحات ====================
  getSuggestions: () => apiClient.get('/guardian/suggestions'),

  submitSuggestion: suggestionData => apiClient.post('/guardian/suggestions', suggestionData),

  getSuggestionDetail: suggestionId => apiClient.get(`/guardian/suggestions/${suggestionId}`),

  getSuggestionStats: () => apiClient.get('/guardian/suggestions/stats'),

  // ==================== تدريب أولياء الأمور ====================
  getParentTrainings: (page = 1) => apiClient.get(`/guardian/parent-training?page=${page}`),

  getParentTrainingDetail: trainingId => apiClient.get(`/guardian/parent-training/${trainingId}`),

  enrollParentTraining: trainingId => apiClient.post(`/guardian/parent-training/${trainingId}/enroll`),

  getMyTrainingHistory: () => apiClient.get('/guardian/parent-training/history'),

  getTrainingCertificates: () => apiClient.get('/guardian/parent-training/certificates'),

  // ==================== سلامة الطفل ====================
  getSafetyAlerts: () => apiClient.get('/guardian/safety/alerts'),

  getSafetyPolicies: () => apiClient.get('/guardian/safety/policies'),

  reportSafetyConcern: concernData => apiClient.post('/guardian/safety/report', concernData),

  getSafetyConcernStatus: concernId => apiClient.get(`/guardian/safety/concerns/${concernId}`),

  getSafetyTraining: () => apiClient.get('/guardian/safety/training'),

  // ==================== المسارات التعليمية ====================
  getLearningPaths: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/learning-paths`),

  getLearningPathDetail: (beneficiaryId, pathId) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/learning-paths/${pathId}`),

  getBeneficiaryLearningProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/learning-paths/progress`),

  getRecommendedResources: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/learning-paths/recommended`),

  getSkillAssessments: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/learning-paths/assessments`),

  // ==================== تفضيلات التواصل ====================
  getCommunicationPreferences: () => apiClient.get('/guardian/communication-preferences'),

  updateCommunicationPreferences: prefsData => apiClient.put('/guardian/communication-preferences', prefsData),

  getPreferredChannels: () => apiClient.get('/guardian/communication-preferences/channels'),

  updatePreferredChannels: channelsData => apiClient.put('/guardian/communication-preferences/channels', channelsData),

  // ==================== برنامج الموهوبين ====================
  getGiftedPrograms: () => apiClient.get('/guardian/gifted-programs'),

  getGiftedProgramDetail: programId => apiClient.get(`/guardian/gifted-programs/${programId}`),

  nominateBeneficiary: (programId, nominationData) => apiClient.post(`/guardian/gifted-programs/${programId}/nominate`, nominationData),

  getGiftedAssessments: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/gifted/assessments`),

  getGiftedProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/gifted/progress`),

  // ==================== النوم والرفاهية ====================
  getSleepLog: (beneficiaryId, page = 1) => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/sleep-log?page=${page}`),

  addSleepEntry: (beneficiaryId, sleepData) => apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/sleep-log`, sleepData),

  getWellbeingAssessment: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/wellbeing`),

  submitWellbeingAssessment: (beneficiaryId, assessmentData) =>
    apiClient.post(`/guardian/beneficiaries/${beneficiaryId}/wellbeing`, assessmentData),

  getWellbeingTrend: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/wellbeing/trend`),

  // ==================== المهارات الاجتماعية ====================
  getSocialSkillsReport: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/social-skills`),

  getSocialSkillsGoals: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/social-skills/goals`),

  getSocialSkillsProgress: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/social-skills/progress`),

  getPeerInteractions: beneficiaryId => apiClient.get(`/guardian/beneficiaries/${beneficiaryId}/social-skills/peers`),

  // ==================== التخطيط المالي ====================
  getBudgetPlan: () => apiClient.get('/guardian/budget-plan'),

  createBudgetPlan: planData => apiClient.post('/guardian/budget-plan', planData),

  getExpenseForecast: () => apiClient.get('/guardian/budget-plan/forecast'),

  getBudgetAnalytics: () => apiClient.get('/guardian/budget-plan/analytics'),
};

export default guardianService;
