/**
 * Beneficiary Portal Routes
 * مسارات بوابة المستفيد
 */

const express = require('express');
const router = express.Router();
const BeneficiaryController = require('../controllers/beneficiary.portal.controller');
const authMiddleware = require('../middleware/auth');

// Middleware
router.use(authMiddleware); // All routes require authentication

// Dashboard Routes
router.get('/dashboard', BeneficiaryController.getDashboard);
router.get('/dashboard/stats', BeneficiaryController.getDashboardStats);

// Profile Routes
router.get('/profile', BeneficiaryController.getProfile);
router.patch('/profile', BeneficiaryController.updateProfile);
router.patch('/profile/photo', BeneficiaryController.updateProfilePhoto);
router.get('/profile/download', BeneficiaryController.downloadProfileData);

// Progress & Academic Routes
router.get('/progress', BeneficiaryController.getProgress);
router.get('/progress/:monthId', BeneficiaryController.getProgressDetail);
router.get('/progress/trend', BeneficiaryController.getProgressTrend);
router.get('/progress/reports', BeneficiaryController.getProgressReports);

// Grades Routes
router.get('/grades', BeneficiaryController.getGrades);
router.get('/grades/summary', BeneficiaryController.getGradesSummary);
router.get('/grades/trend', BeneficiaryController.getGradesTrend);

// Attendance Routes
router.get('/attendance', BeneficiaryController.getAttendance);
router.get('/attendance/summary', BeneficiaryController.getAttendanceSummary);
router.get('/attendance/report', BeneficiaryController.getAttendanceReport);

// Programs Routes
router.get('/programs', BeneficiaryController.getPrograms);
router.get('/programs/:programId', BeneficiaryController.getProgramDetail);
router.get('/programs/:programId/activities', BeneficiaryController.getProgramActivities);
router.post('/programs/:programId/enroll', BeneficiaryController.enrollProgram);
router.post('/programs/:programId/unenroll', BeneficiaryController.unenrollProgram);

// Messaging Routes
router.get('/messages', BeneficiaryController.getMessages);
router.get('/messages/inbox', BeneficiaryController.getInboxMessages);
router.get('/messages/sent', BeneficiaryController.getSentMessages);
router.get('/messages/:messageId', BeneficiaryController.getMessageDetail);
router.post('/messages', BeneficiaryController.sendMessage);
router.post('/messages/:messageId/reply', BeneficiaryController.replyMessage);
router.patch('/messages/:messageId/read', BeneficiaryController.markMessageAsRead);
router.patch('/messages/:messageId/archive', BeneficiaryController.archiveMessage);
router.delete('/messages/:messageId', BeneficiaryController.deleteMessage);

// Documents & Certificates Routes
router.get('/documents', BeneficiaryController.getDocuments);
router.get('/documents/:documentId', BeneficiaryController.getDocumentDetail);
router.get('/documents/:documentId/download', BeneficiaryController.downloadDocument);
router.post('/documents', BeneficiaryController.uploadDocument);
router.delete('/documents/:documentId', BeneficiaryController.deleteDocument);

// Guardians Routes
router.get('/guardians', BeneficiaryController.getGuardians);
router.get('/guardians/:guardianId', BeneficiaryController.getGuardianDetail);
router.post('/guardians/invite', BeneficiaryController.inviteGuardian);
router.delete('/guardians/:guardianId', BeneficiaryController.unlinkGuardian);

// Activities Routes
router.get('/activities', BeneficiaryController.getActivities);
router.post('/activities/:activityId/submit', BeneficiaryController.submitActivity);
router.get('/activities/:activityId/feedback', BeneficiaryController.getActivityFeedback);

// Notifications Routes
router.get('/notifications', BeneficiaryController.getNotifications);
router.patch('/notifications/:notificationId/read', BeneficiaryController.markNotificationAsRead);
router.patch('/notifications/read-all', BeneficiaryController.markAllNotificationsAsRead);
router.patch('/notifications/:notificationId/archive', BeneficiaryController.archiveNotification);
router.get('/notifications/preferences', BeneficiaryController.getNotificationPreferences);
router.patch('/notifications/preferences', BeneficiaryController.updateNotificationPreferences);

// Achievements & Badges Routes
router.get('/achievements', BeneficiaryController.getAchievements);
router.get('/badges', BeneficiaryController.getBadges);

// Schedule Routes
router.get('/schedule', BeneficiaryController.getSchedule);
router.get('/schedule/week', BeneficiaryController.getWeekSchedule);
router.get('/schedule/month', BeneficiaryController.getMonthSchedule);

// Events Routes
router.get('/events', BeneficiaryController.getEvents);
router.get('/events/:eventId', BeneficiaryController.getEventDetail);
router.post('/events/:eventId/register', BeneficiaryController.registerEvent);

// Search Routes
router.get('/search', BeneficiaryController.search);
router.get('/search/messages', BeneficiaryController.searchMessages);

// Settings Routes
router.get('/settings', BeneficiaryController.getSettings);
router.patch('/settings', BeneficiaryController.updateSettings);
router.patch('/settings/password', BeneficiaryController.changePassword);
router.patch('/settings/language', BeneficiaryController.changeLanguage);

// Privacy & Account Routes
router.post('/account/verify-email', BeneficiaryController.verifyEmail);
router.post('/account/resend-verification', BeneficiaryController.resendVerification);
router.post('/account/two-factor-enable', BeneficiaryController.enableTwoFactor);
router.post('/account/two-factor-disable', BeneficiaryController.disableTwoFactor);

// Export Routes
router.get('/export/data', BeneficiaryController.exportData);
router.get('/export/grades/:format', BeneficiaryController.exportGrades);
router.get('/export/attendance/:format', BeneficiaryController.exportAttendance);
router.get('/export/progress/:format', BeneficiaryController.exportProgress);

// Help & Support Routes
router.get('/help/faq', BeneficiaryController.getFAQ);
router.post('/help/contact', BeneficiaryController.contactSupport);
router.get('/help/support-tickets', BeneficiaryController.getSupportTickets);

module.exports = router;
