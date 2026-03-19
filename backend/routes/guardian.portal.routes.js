/* eslint-disable no-unused-vars */
/**
 * Guardian Portal Routes
 *
 * Wires the comprehensive guardian.portal.controller.js (57 endpoints)
 * to Express routes under /api/guardian
 *
 * All routes require authentication via JWT middleware
 *
 * PARAM NAMES must match controller destructuring:
 *   :beneficiaryId  → req.params.beneficiaryId
 *   :paymentId      → req.params.paymentId
 *   :messageId      → req.params.messageId
 *   :notificationId → req.params.notificationId
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/guardian.portal.controller');

// All routes require authentication
router.use(authenticate);

// ==================== DASHBOARD ====================
router.get('/dashboard', ctrl.getDashboard);
router.get('/dashboard/summary', ctrl.getDashboardSummary);
router.get('/dashboard/overview', ctrl.getDashboardOverview);
router.get('/dashboard/stats', ctrl.getDashboardStats);

// ==================== PROFILE ====================
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/profile/photo', ctrl.updateProfilePhoto);
router.get('/profile/download', ctrl.downloadProfileData);

// ==================== BENEFICIARIES ====================
router.get('/beneficiaries', ctrl.getBeneficiaries);
router.get('/beneficiaries/:beneficiaryId', ctrl.getBeneficiaryDetail);
router.post('/beneficiaries/link', ctrl.linkBeneficiary);
router.delete('/beneficiaries/:beneficiaryId/unlink', ctrl.unlinkBeneficiary);

// ==================== PROGRESS ====================
router.get('/beneficiaries/:beneficiaryId/progress', ctrl.getBeneficiaryProgress);
router.get('/beneficiaries/:beneficiaryId/progress/monthly', ctrl.getBeneficiaryMonthlyProgress);
router.get('/beneficiaries/:beneficiaryId/progress/trend', ctrl.getBeneficiaryProgressTrend);

// ==================== GRADES ====================
router.get('/beneficiaries/:beneficiaryId/grades', ctrl.getBeneficiaryGrades);
router.get('/beneficiaries/:beneficiaryId/grades/summary', ctrl.getBeneficiaryGradesSummary);
router.get('/beneficiaries/:beneficiaryId/grades/comparison', ctrl.getGradesComparison);

// ==================== ATTENDANCE ====================
router.get('/beneficiaries/:beneficiaryId/attendance', ctrl.getBeneficiaryAttendance);
router.get(
  '/beneficiaries/:beneficiaryId/attendance/summary',
  ctrl.getBeneficiaryAttendanceSummary
);
router.get('/beneficiaries/:beneficiaryId/attendance/report', ctrl.getBeneficiaryAttendanceReport);

// ==================== BEHAVIOR ====================
router.get('/beneficiaries/:beneficiaryId/behavior', ctrl.getBehavior);
router.get('/beneficiaries/:beneficiaryId/behavior/summary', ctrl.getBehaviorSummary);

// ==================== REPORTS ====================
router.get('/reports', ctrl.getReports);
router.get('/reports/monthly', ctrl.getMonthlyReports);
router.post('/reports/generate', ctrl.generateReport);
router.post('/reports/schedule', ctrl.scheduleReport);

// ==================== FINANCIAL ====================
router.get('/payments', ctrl.getPayments);
router.get('/payments/status/pending', ctrl.getPendingPayments);
router.get('/payments/status/overdue', ctrl.getOverduePayments);
router.get('/payments/:paymentId', ctrl.getPaymentDetail);
router.post('/payments/:paymentId/pay', ctrl.makePayment);
router.post('/payments/:paymentId/invoice', ctrl.requestInvoice);
router.get('/payments/:paymentId/receipt', ctrl.getReceipt);
router.post('/payments/:paymentId/refund', ctrl.requestRefund);
router.get('/financial/summary', ctrl.getFinancialSummary);
router.get('/financial/balance', ctrl.getBalance);
router.get('/financial/history', ctrl.getFinancialHistory);
router.get('/financial/forecast', ctrl.getFinancialForecast);

// ==================== MESSAGES ====================
router.get('/messages', ctrl.getMessages);
router.get('/messages/:messageId', ctrl.getMessageDetail);
router.post('/messages', ctrl.sendMessage);
router.put('/messages/:messageId/read', ctrl.markMessageRead);
router.put('/messages/:messageId/archive', ctrl.archiveMessage);
router.delete('/messages/:messageId', ctrl.deleteMessage);

// ==================== NOTIFICATIONS ====================
router.get('/notifications', ctrl.getNotifications);
router.get('/notifications/unread', ctrl.getUnreadNotifications);
router.put('/notifications/:notificationId/read', ctrl.markNotificationRead);
router.put('/notifications/read-all', ctrl.markAllNotificationsRead);
router.get('/notifications/preferences', ctrl.getNotificationPreferences);
router.put('/notifications/preferences', ctrl.updateNotificationPreferences);

// ==================== SETTINGS ====================
router.get('/settings', ctrl.getSettings);
router.patch('/settings', ctrl.updateSettings);
router.patch('/settings/password', ctrl.changePassword);
router.patch('/settings/language', ctrl.changeLanguage);

// ==================== ANALYTICS ====================
router.get('/analytics/dashboard', ctrl.getAnalyticsDashboard);
router.get('/analytics/performance', ctrl.getPerformanceAnalytics);
router.get('/analytics/financial', ctrl.getFinancialAnalytics);
router.get('/analytics/attendance', ctrl.getAttendanceAnalytics);

// ==================== المواعيد APPOINTMENTS ====================
router.get('/appointments', ctrl.getAppointments);
router.post('/appointments', ctrl.bookAppointment);
router.get('/appointments/available-slots', ctrl.getAvailableSlots);
router.get('/appointments/history', ctrl.getAppointmentHistory);
router.get('/appointments/:appointmentId', ctrl.getAppointmentDetail);
router.put('/appointments/:appointmentId/cancel', ctrl.cancelAppointment);

// ==================== الجدول SCHEDULE ====================
router.get('/beneficiaries/:beneficiaryId/schedule', ctrl.getBeneficiarySchedule);
router.get('/beneficiaries/:beneficiaryId/schedule/weekly', ctrl.getBeneficiaryWeeklySchedule);
router.get('/beneficiaries/:beneficiaryId/schedule/exams', ctrl.getBeneficiaryExams);

// ==================== الخطة التعليمية الفردية IEP ====================
router.get('/beneficiaries/:beneficiaryId/iep', ctrl.getBeneficiaryIEP);
router.get('/beneficiaries/:beneficiaryId/iep/goals', ctrl.getBeneficiaryIEPGoals);
router.get('/beneficiaries/:beneficiaryId/iep/progress', ctrl.getBeneficiaryIEPProgress);
router.post('/beneficiaries/:beneficiaryId/iep/feedback', ctrl.submitIEPFeedback);

// ==================== الاستبيانات SURVEYS ====================
router.get('/surveys', ctrl.getSurveys);
router.get('/surveys/history', ctrl.getSurveyHistory);
router.get('/surveys/:surveyId', ctrl.getSurveyDetail);
router.post('/surveys/:surveyId/submit', ctrl.submitSurvey);

// ==================== المكتبة الإلكترونية RESOURCES ====================
router.get('/resources', ctrl.getResources);
router.get('/resources/categories', ctrl.getResourceCategories);
router.get('/resources/bookmarks', ctrl.getBookmarkedResources);
router.get('/resources/:resourceId', ctrl.getResourceDetail);
router.post('/resources/:resourceId/bookmark', ctrl.bookmarkResource);

// ==================== طلبات الدعم SUPPORT TICKETS ====================
router.get('/support-tickets', ctrl.getSupportTickets);
router.post('/support-tickets', ctrl.createSupportTicket);
router.get('/support-tickets/:ticketId', ctrl.getSupportTicketDetail);
router.post('/support-tickets/:ticketId/reply', ctrl.replySupportTicket);
router.put('/support-tickets/:ticketId/close', ctrl.closeSupportTicket);

// ==================== التقويم والأحداث EVENTS ====================
router.get('/events', ctrl.getEvents);
router.get('/events/calendar', ctrl.getEventsCalendar);
router.get('/events/:eventId', ctrl.getEventDetail);
router.post('/events/:eventId/rsvp', ctrl.rsvpEvent);

// ==================== الاقتراحات والشكاوى FEEDBACK & COMPLAINTS ====================
router.get('/feedback', ctrl.getFeedback);
router.post('/feedback', ctrl.submitFeedback);
router.get('/complaints', ctrl.getComplaints);
router.post('/complaints', ctrl.submitComplaint);
router.get('/complaints/:complaintId', ctrl.getComplaintDetail);

// ==================== المستندات DOCUMENTS ====================
router.get('/documents', ctrl.getDocuments);
router.get('/documents/categories', ctrl.getDocumentCategories);
router.post('/documents/upload', ctrl.uploadDocument);
router.get('/documents/:documentId/download', ctrl.downloadDocument);

// ==================== متابعة النقل TRANSPORTATION ====================
router.get('/transportation', ctrl.getTransportation);
router.get('/transportation/tracking', ctrl.getTransportationTracking);
router.get('/transportation/schedule', ctrl.getTransportationSchedule);
router.post('/transportation/absence', ctrl.reportTransportationAbsence);

// ==================== الأنشطة اللاصفية ACTIVITIES ====================
router.get('/activities', ctrl.getActivities);
router.get('/activities/enrolled', ctrl.getEnrolledActivities);
router.get('/activities/:activityId', ctrl.getActivityDetail);
router.post('/activities/:activityId/enroll', ctrl.enrollActivity);
router.delete('/activities/:activityId/withdraw', ctrl.withdrawActivity);

// ==================== طلبات الإذن PERMISSION REQUESTS ====================
router.get('/permission-requests', ctrl.getPermissionRequests);
router.post('/permission-requests', ctrl.createPermissionRequest);
router.get('/permission-requests/:requestId', ctrl.getPermissionRequestDetail);
router.delete('/permission-requests/:requestId', ctrl.cancelPermissionRequest);

// ==================== الإعلانات ANNOUNCEMENTS ====================
router.get('/announcements', ctrl.getAnnouncements);
router.get('/announcements/:announcementId', ctrl.getAnnouncementDetail);

// ==================== التواصل مع المعلمين TEACHERS ====================
router.get('/teachers', ctrl.getTeachers);
router.post('/teachers/:teacherId/message', ctrl.messageTeacher);
router.get('/teachers/:teacherId/messages', ctrl.getTeacherMessages);

// ==================== نظام المكافآت REWARDS ====================
router.get('/rewards', ctrl.getRewards);
router.get('/rewards/:beneficiaryId/history', ctrl.getRewardHistory);

// ==================== الطوارئ EMERGENCY ====================
router.get('/emergency-contacts', ctrl.getEmergencyContacts);
router.put('/emergency-contacts', ctrl.updateEmergencyContacts);
router.post('/emergency-alert', ctrl.sendEmergencyAlert);

// ==================== السجل الصحي HEALTH RECORDS ====================
router.get('/beneficiaries/:beneficiaryId/health', ctrl.getBeneficiaryHealthRecords);
router.get('/beneficiaries/:beneficiaryId/health/medications', ctrl.getBeneficiaryMedications);
router.get('/beneficiaries/:beneficiaryId/health/allergies', ctrl.getBeneficiaryAllergies);
router.get('/beneficiaries/:beneficiaryId/health/vaccinations', ctrl.getBeneficiaryVaccinations);
router.post('/beneficiaries/:beneficiaryId/health/incident', ctrl.reportHealthIncident);
router.get('/beneficiaries/:beneficiaryId/health/summary', ctrl.getHealthSummary);

// ==================== الجلسات العلاجية THERAPY SESSIONS ====================
router.get('/beneficiaries/:beneficiaryId/therapy', ctrl.getBeneficiaryTherapySessions);
router.get('/beneficiaries/:beneficiaryId/therapy/upcoming', ctrl.getUpcomingTherapySessions);
router.get('/beneficiaries/:beneficiaryId/therapy/progress', ctrl.getTherapyProgress);
router.get('/beneficiaries/:beneficiaryId/therapy/:sessionId', ctrl.getTherapySessionDetail);
router.post('/beneficiaries/:beneficiaryId/therapy/:sessionId/rate', ctrl.rateTherapySession);

// ==================== خطة التغذية MEAL PLANS ====================
router.get('/beneficiaries/:beneficiaryId/meals', ctrl.getBeneficiaryMealPlan);
router.get('/beneficiaries/:beneficiaryId/meals/dietary', ctrl.getBeneficiaryDietary);
router.put('/beneficiaries/:beneficiaryId/meals/dietary', ctrl.updateBeneficiaryDietary);
router.post('/beneficiaries/:beneficiaryId/meals/request', ctrl.requestSpecialMeal);
router.get('/beneficiaries/:beneficiaryId/meals/nutrition', ctrl.getNutritionReport);

// ==================== معرض الصور GALLERY ====================
router.get('/gallery', ctrl.getGallery);
router.get('/gallery/albums', ctrl.getGalleryAlbums);
router.get('/gallery/:mediaId', ctrl.getGalleryItem);
router.post('/gallery/:mediaId/download', ctrl.downloadGalleryItem);

// ==================== الواجبات والمهام HOMEWORK ====================
router.get('/beneficiaries/:beneficiaryId/homework', ctrl.getBeneficiaryHomework);
router.get('/beneficiaries/:beneficiaryId/homework/pending', ctrl.getPendingHomework);
router.get('/beneficiaries/:beneficiaryId/homework/stats', ctrl.getHomeworkStats);
router.get('/beneficiaries/:beneficiaryId/homework/:homeworkId', ctrl.getHomeworkDetail);
router.post(
  '/beneficiaries/:beneficiaryId/homework/:homeworkId/acknowledge',
  ctrl.acknowledgeHomework
);

// ==================== الشهادات والإنجازات CERTIFICATES ====================
router.get('/beneficiaries/:beneficiaryId/certificates', ctrl.getBeneficiaryCertificates);
router.get('/beneficiaries/:beneficiaryId/achievements', ctrl.getBeneficiaryAchievements);
router.get('/beneficiaries/:beneficiaryId/certificates/:certId', ctrl.getCertificateDetail);
router.get('/beneficiaries/:beneficiaryId/certificates/:certId/download', ctrl.downloadCertificate);

// ==================== تصاريح الزيارة VISITOR PASS ====================
router.get('/visitor-passes', ctrl.getVisitorPasses);
router.post('/visitor-passes', ctrl.requestVisitorPass);
router.get('/visitor-passes/upcoming', ctrl.getUpcomingVisits);
router.get('/visitor-passes/:passId', ctrl.getVisitorPassDetail);
router.delete('/visitor-passes/:passId', ctrl.cancelVisitorPass);

// ==================== حجز المرافق FACILITY BOOKING ====================
router.get('/facilities', ctrl.getFacilities);
router.post('/facilities/book', ctrl.bookFacility);
router.get('/facilities/bookings', ctrl.getMyFacilityBookings);
router.get('/facilities/availability', ctrl.checkFacilityAvailability);
router.delete('/facilities/bookings/:bookingId', ctrl.cancelFacilityBooking);

// ==================== تقييم الرضا SATISFACTION ====================
router.get('/satisfaction', ctrl.getSatisfactionRatings);
router.post('/satisfaction', ctrl.submitSatisfaction);
router.get('/satisfaction/pending', ctrl.getPendingSatisfaction);
router.get('/satisfaction/summary', ctrl.getSatisfactionSummary);

// ==================== التقويم الأكاديمي ACADEMIC CALENDAR ====================
router.get('/academic-calendar', ctrl.getAcademicCalendar);
router.get('/academic-calendar/holidays', ctrl.getHolidays);
router.get('/academic-calendar/important-dates', ctrl.getImportantDates);

// ==================== مشاركة الأسرة FAMILY ENGAGEMENT ====================
router.get('/family-engagement', ctrl.getFamilyEngagement);
router.get('/family-engagement/home-activities', ctrl.getHomeActivities);
router.get('/family-engagement/:programId', ctrl.getFamilyEngagementDetail);
router.post('/family-engagement/:programId/enroll', ctrl.enrollFamilyProgram);

// ==================== مقارنة الأشقاء SIBLINGS COMPARISON ====================
router.get('/siblings/comparison', ctrl.getSiblingsComparison);
router.get('/siblings/attendance-comparison', ctrl.getSiblingsAttendanceComparison);
router.get('/siblings/academic-comparison', ctrl.getSiblingsAcademicComparison);

// ==================== برامج التطوع VOLUNTEER PROGRAMS ====================
router.get('/volunteer-programs', ctrl.getVolunteerPrograms);
router.get('/volunteer-programs/history', ctrl.getMyVolunteerHistory);
router.get('/volunteer-programs/:programId', ctrl.getVolunteerProgramDetail);
router.post('/volunteer-programs/:programId/enroll', ctrl.enrollVolunteer);
router.get('/volunteer-programs/:programId/certificate', ctrl.getVolunteerCertificate);

// ==================== التقارير اليومية DAILY REPORTS ====================
router.get('/beneficiaries/:beneficiaryId/daily-reports', ctrl.getDailyReports);
router.get('/beneficiaries/:beneficiaryId/daily-reports/summary', ctrl.getDailyReportSummary);
router.get('/beneficiaries/:beneficiaryId/daily-reports/by-date', ctrl.getDailyReportByDate);
router.get('/beneficiaries/:beneficiaryId/daily-reports/:reportId', ctrl.getDailyReportDetail);
router.post('/beneficiaries/:beneficiaryId/daily-reports/subscribe', ctrl.subscribeDailyReport);

// ==================== المواعيد الطبية MEDICAL APPOINTMENTS ====================
router.get('/medical-appointments', ctrl.getMedicalAppointments);
router.post('/medical-appointments', ctrl.bookMedicalAppointment);
router.get('/medical-appointments/:appointmentId', ctrl.getMedicalAppointmentDetail);
router.delete('/medical-appointments/:appointmentId', ctrl.cancelMedicalAppointment);
router.get('/beneficiaries/:beneficiaryId/medical-history', ctrl.getMedicalHistory);

// ==================== صندوق الاقتراحات SUGGESTION BOX ====================
router.get('/suggestions', ctrl.getSuggestions);
router.post('/suggestions', ctrl.submitSuggestion);
router.get('/suggestions/stats', ctrl.getSuggestionStats);
router.get('/suggestions/:suggestionId', ctrl.getSuggestionDetail);

// ==================== تدريب أولياء الأمور PARENT TRAINING ====================
router.get('/parent-training', ctrl.getParentTrainings);
router.get('/parent-training/history', ctrl.getMyTrainingHistory);
router.get('/parent-training/certificates', ctrl.getTrainingCertificates);
router.get('/parent-training/:trainingId', ctrl.getParentTrainingDetail);
router.post('/parent-training/:trainingId/enroll', ctrl.enrollParentTraining);

// ==================== سلامة الطفل CHILD SAFETY ====================
router.get('/safety/alerts', ctrl.getSafetyAlerts);
router.get('/safety/policies', ctrl.getSafetyPolicies);
router.get('/safety/training', ctrl.getSafetyTraining);
router.post('/safety/report', ctrl.reportSafetyConcern);
router.get('/safety/concerns/:concernId', ctrl.getSafetyConcernStatus);

// ==================== المسارات التعليمية LEARNING PATHS ====================
router.get('/beneficiaries/:beneficiaryId/learning-paths', ctrl.getLearningPaths);
router.get(
  '/beneficiaries/:beneficiaryId/learning-paths/progress',
  ctrl.getBeneficiaryLearningProgress
);
router.get(
  '/beneficiaries/:beneficiaryId/learning-paths/recommended',
  ctrl.getRecommendedResources
);
router.get('/beneficiaries/:beneficiaryId/learning-paths/assessments', ctrl.getSkillAssessments);
router.get('/beneficiaries/:beneficiaryId/learning-paths/:pathId', ctrl.getLearningPathDetail);

// ==================== تفضيلات التواصل COMMUNICATION PREFERENCES ====================
router.get('/communication-preferences', ctrl.getCommunicationPreferences);
router.put('/communication-preferences', ctrl.updateCommunicationPreferences);
router.get('/communication-preferences/channels', ctrl.getPreferredChannels);
router.put('/communication-preferences/channels', ctrl.updatePreferredChannels);

// ==================== برنامج الموهوبين GIFTED PROGRAM ====================
router.get('/gifted-programs', ctrl.getGiftedPrograms);
router.get('/gifted-programs/:programId', ctrl.getGiftedProgramDetail);
router.post('/gifted-programs/:programId/nominate', ctrl.nominateBeneficiary);
router.get('/beneficiaries/:beneficiaryId/gifted/assessments', ctrl.getGiftedAssessments);
router.get('/beneficiaries/:beneficiaryId/gifted/progress', ctrl.getGiftedProgress);

// ==================== النوم والرفاهية SLEEP & WELLBEING ====================
router.get('/beneficiaries/:beneficiaryId/sleep-log', ctrl.getSleepLog);
router.post('/beneficiaries/:beneficiaryId/sleep-log', ctrl.addSleepEntry);
router.get('/beneficiaries/:beneficiaryId/wellbeing', ctrl.getWellbeingAssessment);
router.post('/beneficiaries/:beneficiaryId/wellbeing', ctrl.submitWellbeingAssessment);
router.get('/beneficiaries/:beneficiaryId/wellbeing/trend', ctrl.getWellbeingTrend);

// ==================== المهارات الاجتماعية SOCIAL SKILLS ====================
router.get('/beneficiaries/:beneficiaryId/social-skills', ctrl.getSocialSkillsReport);
router.get('/beneficiaries/:beneficiaryId/social-skills/goals', ctrl.getSocialSkillsGoals);
router.get('/beneficiaries/:beneficiaryId/social-skills/progress', ctrl.getSocialSkillsProgress);
router.get('/beneficiaries/:beneficiaryId/social-skills/peers', ctrl.getPeerInteractions);

// ==================== التخطيط المالي BUDGET PLANNING ====================
router.get('/budget-plan', ctrl.getBudgetPlan);
router.post('/budget-plan', ctrl.createBudgetPlan);
router.get('/budget-plan/forecast', ctrl.getExpenseForecast);
router.get('/budget-plan/analytics', ctrl.getBudgetAnalytics);

module.exports = router;
