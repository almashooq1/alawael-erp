/**
 * Guardian Portal Routes
 * مسارات بوابة ولي الأمر
 */

const express = require('express');
const router = express.Router();
const GuardianController = require('../controllers/guardian.portal.controller');
const authMiddleware = require('../middleware/auth');

// Middleware
router.use(authMiddleware); // All routes require authentication

// Dashboard Routes
router.get('/dashboard', GuardianController.getDashboard);
router.get('/dashboard/summary', GuardianController.getDashboardSummary);
router.get('/dashboard/overview', GuardianController.getDashboardOverview);
router.get('/dashboard/stats', GuardianController.getDashboardStats);

// Profile Routes
router.get('/profile', GuardianController.getProfile);
router.patch('/profile', GuardianController.updateProfile);
router.patch('/profile/photo', GuardianController.updateProfilePhoto);
router.get('/profile/download', GuardianController.downloadProfileData);

// Beneficiaries Management Routes
router.get('/beneficiaries', GuardianController.getBeneficiaries);
router.get('/beneficiaries/:beneficiaryId', GuardianController.getBeneficiaryDetail);
router.post('/beneficiaries/link', GuardianController.linkBeneficiary);
router.delete('/beneficiaries/:beneficiaryId', GuardianController.unlinkBeneficiary);

// Beneficiary Progress Routes
router.get('/beneficiaries/:beneficiaryId/progress', GuardianController.getBeneficiaryProgress);
router.get('/beneficiaries/:beneficiaryId/progress/:monthId', GuardianController.getBeneficiaryProgressDetail);
router.get('/beneficiaries/:beneficiaryId/progress/trend', GuardianController.getBeneficiaryProgressTrend);

// Grades & Academic Routes
router.get('/beneficiaries/:beneficiaryId/grades', GuardianController.getBeneficiaryGrades);
router.get('/beneficiaries/:beneficiaryId/grades/summary', GuardianController.getGradesSummary);
router.get('/beneficiaries/:beneficiaryId/grades/comparison', GuardianController.getGradesComparison);

// Attendance Routes
router.get('/beneficiaries/:beneficiaryId/attendance', GuardianController.getBeneficiaryAttendance);
router.get('/beneficiaries/:beneficiaryId/attendance/summary', GuardianController.getAttendanceSummary);
router.get('/beneficiaries/:beneficiaryId/attendance/report', GuardianController.getAttendanceReport);

// Behavior Routes
router.get('/beneficiaries/:beneficiaryId/behavior', GuardianController.getBehaviorRecord);
router.get('/beneficiaries/:beneficiaryId/behavior/summary', GuardianController.getBehaviorSummary);

// Reports Routes
router.get('/reports', GuardianController.getReports);
router.get('/reports/monthly', GuardianController.getMonthlyReports);
router.get('/reports/:reportId', GuardianController.getReportDetail);
router.get('/reports/:reportId/download/:format', GuardianController.downloadReport);
router.post('/reports/generate', GuardianController.generateReport);
router.post('/reports/schedule', GuardianController.scheduleReport);

// Comparative Analysis Routes
router.get('/reports/analysis/performance', GuardianController.analyzePerformance);
router.get('/reports/analysis/comparison', GuardianController.comparePerformance);
router.get('/reports/analysis/trends', GuardianController.analyzeTrends);
router.get('/reports/analysis/predictions', GuardianController.getPredictions);

// Payments Routes
router.get('/payments', GuardianController.getPayments);
router.get('/payments/:paymentId', GuardianController.getPaymentDetail);
router.get('/payments/pending', GuardianController.getPendingPayments);
router.get('/payments/overdue', GuardianController.getOverduePayments);
router.post('/payments/:paymentId/pay', GuardianController.makePayment);
router.post('/payments/:paymentId/request-invoice', GuardianController.requestInvoice);
router.get('/payments/:paymentId/receipt', GuardianController.getReceipt);
router.post('/payments/:paymentId/refund-request', GuardianController.requestRefund);

// Invoices Routes
router.get('/invoices', GuardianController.getInvoices);
router.get('/invoices/:invoiceId', GuardianController.getInvoiceDetail);
router.get('/invoices/:invoiceId/pdf', GuardianController.downloadInvoicePDF);
router.post('/invoices/:invoiceId/send', GuardianController.sendInvoice);

// Financial Summary Routes
router.get('/financial/summary', GuardianController.getFinancialSummary);
router.get('/financial/balance', GuardianController.getBalance);
router.get('/financial/history', GuardianController.getPaymentHistory);
router.get('/financial/forecast', GuardianController.getPaymentForecast);

// Messages Routes
router.get('/messages', GuardianController.getMessages);
router.get('/messages/inbox', GuardianController.getInboxMessages);
router.get('/messages/sent', GuardianController.getSentMessages);
router.get('/messages/:messageId', GuardianController.getMessageDetail);
router.post('/messages', GuardianController.sendMessage);
router.post('/messages/:messageId/reply', GuardianController.replyMessage);
router.patch('/messages/:messageId/read', GuardianController.markMessageAsRead);
router.patch('/messages/:messageId/archive', GuardianController.archiveMessage);
router.delete('/messages/:messageId', GuardianController.deleteMessage);
router.get('/messages/search', GuardianController.searchMessages);

// Notifications Routes
router.get('/notifications', GuardianController.getNotifications);
router.get('/notifications/unread', GuardianController.getUnreadNotifications);
router.get('/notifications/:notificationId', GuardianController.getNotificationDetail);
router.patch('/notifications/:notificationId/read', GuardianController.markNotificationAsRead);
router.patch('/notifications/read-all', GuardianController.markAllNotificationsAsRead);
router.patch('/notifications/:notificationId/archive', GuardianController.archiveNotification);
router.get('/notifications/preferences', GuardianController.getNotificationPreferences);
router.patch('/notifications/preferences', GuardianController.updateNotificationPreferences);

// Events Routes
router.get('/events', GuardianController.getEvents);
router.get('/events/:eventId', GuardianController.getEventDetail);
router.post('/events/:eventId/register', GuardianController.registerEvent);
router.post('/events/:eventId/unregister', GuardianController.unregisterEvent);

// Documents & Certificates Routes
router.get('/documents', GuardianController.getDocuments);
router.get('/documents/:documentId', GuardianController.getDocumentDetail);
router.get('/documents/:documentId/download', GuardianController.downloadDocument);

// Activities Routes
router.get('/activities', GuardianController.getActivities);
router.get('/activities/:activityId', GuardianController.getActivityDetail);
router.get('/activities/:activityId/feedback', GuardianController.getActivityFeedback);

// Schedule Routes
router.get('/schedule', GuardianController.getSchedule);
router.get('/schedule/beneficiaries/:beneficiaryId', GuardianController.getBeneficiarySchedule);

// Two-Way Communication Routes
router.get('/staff-directory', GuardianController.getStaffDirectory);
router.post('/contact-staff', GuardianController.contactStaff);
router.post('/schedule-meeting', GuardianController.scheduleMeeting);
router.get('/meetings', GuardianController.getMeetings);
router.get('/meetings/:meetingId', GuardianController.getMeetingDetail);

// Preferences & Settings Routes
router.get('/settings', GuardianController.getSettings);
router.patch('/settings', GuardianController.updateSettings);
router.patch('/settings/password', GuardianController.changePassword);
router.patch('/settings/language', GuardianController.changeLanguage);
router.get('/settings/notification-preferences', GuardianController.getNotificationSettings);
router.patch('/settings/notification-preferences', GuardianController.updateNotificationSettings);

// Account & Security Routes
router.post('/account/verify-email', GuardianController.verifyEmail);
router.post('/account/resend-verification', GuardianController.resendVerification);
router.post('/account/two-factor-enable', GuardianController.enableTwoFactor);
router.post('/account/two-factor-disable', GuardianController.disableTwoFactor);
router.post('/account/linked-accounts', GuardianController.getLinkedAccounts);
router.post('/account/add-linked-guardian', GuardianController.addLinkedGuardian);

// Export & Data Routes
router.get('/export/data', GuardianController.exportData);
router.get('/export/reports/:format', GuardianController.exportReports);
router.get('/export/payments/:format', GuardianController.exportPayments);
router.get('/export/all/:format', GuardianController.exportAllData);

// Support & Help Routes
router.get('/help/faq', GuardianController.getFAQ);
router.post('/help/contact', GuardianController.contactSupport);
router.get('/help/support-tickets', GuardianController.getSupportTickets);
router.get('/help/support-tickets/:ticketId', GuardianController.getSupportTicketDetail);
router.post('/help/support-tickets', GuardianController.createSupportTicket);
router.post('/help/support-tickets/:ticketId/reply', GuardianController.replySupportTicket);

// Analytics Routes
router.get('/analytics/dashboard', GuardianController.getAnalyticsDashboard);
router.get('/analytics/performance', GuardianController.getPerformanceAnalytics);
router.get('/analytics/financial', GuardianController.getFinancialAnalytics);
router.get('/analytics/attendance', GuardianController.getAttendanceAnalytics);

// Search Routes
router.get('/search', GuardianController.search);
router.get('/search/beneficiaries', GuardianController.searchBeneficiaries);
router.get('/search/messages', GuardianController.searchMessages);

module.exports = router;
