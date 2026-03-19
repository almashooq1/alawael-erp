/**
 * Rehab Center Licenses Routes - مسارات تراخيص مراكز ذوي الإعاقة
 * نظام شامل لإدارة جميع التراخيص الحكومية والرخص البلدية والسجلات
 *
 * Base path: /api/rehab-licenses
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/rehabCenterLicense.controller');
const { authenticate, authorize } = require('../middleware/auth');

// جميع المسارات تتطلب مصادقة
router.use(authenticate);

// ==================== Lookup / Reference Data ====================
router.get('/types', controller.getLicenseTypes);

// ==================== لوحة المعلومات والإحصائيات ====================
router.get('/dashboard', controller.getDashboard);
router.get('/statistics', controller.getStatistics);
router.get('/reports/monthly', controller.getMonthlyReport);
router.get('/reports/costs', controller.getCostReport);

// ==================== التنبيهات ====================
router.get('/alerts/active', controller.getActiveAlerts);
router.post('/alerts/scan', authorize(['admin', 'license_manager']), controller.runAlertScan);

// ==================== التراخيص المنتهية / القريبة ====================
router.get('/expired', controller.getExpired);
router.get('/expiring-soon', controller.getExpiringSoon);

// ==================== التصدير ====================
router.get('/export', authorize(['admin', 'license_manager']), controller.exportData);

// ==================== التفويضات ====================
router.get('/delegations/active', controller.getActiveDelegations);

// ==================== الغرامات (عام) ====================
router.get('/penalties/pending', controller.getPendingPenalties);
router.get('/penalties/statistics', controller.getPenaltyStatistics);

// ==================== المخاطرة ====================
router.get('/risk/high', controller.getHighRiskLicenses);
router.post(
  '/risk/calculate-all',
  authorize(['admin', 'license_manager']),
  controller.calculateAllRisks
);

// ==================== الأرشيف ====================
router.get('/archive', controller.getArchived);

// ==================== كشف التكرار ====================
router.get('/duplicates', controller.findDuplicates);

// ==================== التوقعات والتحليلات ====================
router.get('/forecast/renewals', controller.getRenewalForecast);
router.get('/statistics/regions', controller.getRegionStatistics);
router.get('/statistics/renewals', controller.getRenewalStatistics);

// ==================== المهام العامة ====================
router.get('/tasks/overdue', controller.getOverdueTasks);
router.get('/tasks/statistics', controller.getTaskStatistics);

// ==================== المراسلات العامة ====================
router.get('/communications/pending', controller.getPendingCommunications);

// ==================== حاسبة الرسوم ====================
router.get('/fees/total', controller.calculateTotalFees);

// ==================== تقويم المواعيد ====================
router.get('/calendar/upcoming', controller.getUpcomingEvents);

// ==================== الوثائق ====================
router.get('/documents/statistics', controller.getDocumentStatistics);

// ==================== الميزانية ====================
router.get('/budget/statistics', controller.getBudgetStatistics);

// ==================== مؤشر الصحة ====================
router.get('/health/low', controller.getLowHealthLicenses);
router.post(
  '/health/calculate-all',
  authorize(['admin', 'license_manager']),
  controller.calculateAllHealth
);

// ==================== مؤشرات الأداء ====================
router.get('/kpi/dashboard', controller.getKPIDashboard);

// ==================== الاستيراد المجمع ====================
router.post('/bulk/import', authorize(['admin', 'license_manager']), controller.bulkImport);

// ==================== التقارير الموسعة ====================
router.get('/dashboard/enhanced', controller.getEnhancedDashboard);
router.get('/reports/compliance', controller.getComplianceReport);
router.get('/reports/annual', controller.getAnnualReport);

// ==================== العمليات المجمعة ====================
router.post('/bulk/renew', authorize(['admin', 'license_manager']), controller.bulkRenew);
router.post(
  '/bulk/update-status',
  authorize(['admin', 'license_manager']),
  controller.bulkUpdateStatus
);

// ==================== Round 4: القوالب (جمع) ====================
router.get('/templates', controller.getTemplates);
router.post(
  '/templates/:id/create-from',
  authorize(['admin', 'license_manager']),
  controller.createFromTemplate
);
router.delete('/templates/:id', authorize(['admin', 'license_manager']), controller.removeTemplate);

// ==================== Round 4: المفضلة والمتابعة (جمع) ====================
router.get('/favorites/my', controller.getUserFavorites);
router.get('/watchlist/my', controller.getUserWatchlist);

// ==================== Round 4: مقارنة التراخيص ====================
router.post('/compare', controller.compareLicenses);

// ==================== Round 4: SLA (جمع) ====================
router.get('/sla/statistics', controller.getSLAStatistics);
router.get('/sla/breached', controller.getSLABreachedLicenses);
router.post(
  '/sla/evaluate-all',
  authorize(['admin', 'license_manager']),
  controller.evaluateAllSLA
);

// ==================== Round 4: التذاكر (جمع) ====================
router.get('/tickets/statistics', controller.getTicketStatistics);
router.get('/tickets/open', controller.getOpenTickets);

// ==================== Round 4: التقارير التنفيذية (جمع) ====================
router.get('/executive/report', controller.getExecutiveReport);
router.post(
  '/executive/generate-all',
  authorize(['admin', 'license_manager']),
  controller.generateAllExecutiveSummaries
);

// ==================== Round 4: التحليلات التنبؤية (جمع) ====================
router.get('/analytics/predictive', controller.getPredictiveAnalytics);

// ==================== Round 4: الوثائق المنتهية (جمع) ====================
router.get('/documents/expiring', controller.getExpiringDocuments);

// ==================== Round 5: Routes جمع ====================
router.post(
  '/notifications/bulk',
  authorize(['admin', 'license_manager']),
  controller.sendBulkNotifications
);
router.get('/satisfaction/analytics', controller.getGlobalSatisfactionAnalytics);
router.get('/meetings/calendar', controller.getGlobalMeetingsCalendar);
router.get('/training/status', controller.getGlobalTrainingStatus);
router.post(
  '/remediation/auto-scan',
  authorize(['admin', 'license_manager']),
  controller.runAutoRemediation
);
router.get('/vendors/ratings', controller.getGlobalVendorRatings);
router.get('/complaints/analytics', controller.getGlobalComplaintAnalytics);

// ==================== CRUD ====================
router.get('/', controller.getAll);
router.post('/', authorize(['admin', 'license_manager']), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', authorize(['admin', 'license_manager']), controller.update);
router.delete('/:id', authorize(['admin']), controller.delete);

// ==================== التجديد ====================
router.post('/:id/renew', authorize(['admin', 'license_manager']), controller.renew);
router.get('/:id/renewal-history', controller.getRenewalHistory);

// ==================== التنبيهات لترخيص محدد ====================
router.patch('/:id/alerts/:alertId/dismiss', controller.dismissAlert);
router.patch('/:id/alerts/:alertId/read', controller.markAlertRead);

// ==================== الملاحظات والمستندات ====================
router.post('/:id/notes', controller.addNote);
router.post('/:id/attachments', controller.addAttachment);

// ==================== الامتثال ====================
router.post(
  '/:id/inspection',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  controller.recordInspection
);
router.post(
  '/:id/violation',
  authorize(['admin', 'license_manager', 'compliance_officer']),
  controller.recordViolation
);

// ==================== التفويضات (لترخيص محدد) ====================
router.post('/:id/delegation', authorize(['admin', 'license_manager']), controller.setDelegation);
router.delete(
  '/:id/delegation',
  authorize(['admin', 'license_manager']),
  controller.revokeDelegation
);

// ==================== التراخيص المرتبطة ====================
router.post(
  '/:id/linked-licenses',
  authorize(['admin', 'license_manager']),
  controller.linkLicenses
);
router.get('/:id/linked-licenses', controller.getLinkedLicenses);

// ==================== المتطلبات ====================
router.post(
  '/:id/requirements',
  authorize(['admin', 'license_manager']),
  controller.addRequirement
);
router.patch(
  '/:id/requirements/:requirementId',
  authorize(['admin', 'license_manager']),
  controller.updateRequirement
);
router.get('/:id/requirements/status', controller.getRequirementsStatus);

// ==================== الشروط ====================
router.post('/:id/conditions', authorize(['admin', 'license_manager']), controller.addCondition);
router.patch(
  '/:id/conditions/:conditionId',
  authorize(['admin', 'license_manager']),
  controller.updateCondition
);

// ==================== الغرامات (لترخيص محدد) ====================
router.post('/:id/penalties', authorize(['admin', 'license_manager']), controller.addPenalty);
router.patch(
  '/:id/penalties/:penaltyId',
  authorize(['admin', 'license_manager']),
  controller.updatePenalty
);

// ==================== المخاطرة (لترخيص محدد) ====================
router.post(
  '/:id/risk/calculate',
  authorize(['admin', 'license_manager']),
  controller.calculateRisk
);

// ==================== سير عمل الموافقات ====================
router.post(
  '/:id/approval-workflow',
  authorize(['admin', 'license_manager']),
  controller.setupApprovalWorkflow
);
router.patch(
  '/:id/approval-workflow/process',
  authorize(['admin', 'license_manager']),
  controller.processApprovalStep
);

// ==================== الأرشفة (لترخيص محدد) ====================
router.patch('/:id/archive', authorize(['admin', 'license_manager']), controller.archive);
router.patch('/:id/unarchive', authorize(['admin', 'license_manager']), controller.unarchive);

// ==================== التقييم ====================
router.post('/:id/rating', authorize(['admin', 'license_manager']), controller.setAuthorityRating);

// ==================== الإشعارات ====================
router.patch(
  '/:id/notification-preferences',
  authorize(['admin', 'license_manager']),
  controller.updateNotificationPreferences
);

// ==================== الفروع ====================
router.post('/:id/branches', authorize(['admin', 'license_manager']), controller.addBranch);
router.delete(
  '/:id/branches/:branchId',
  authorize(['admin', 'license_manager']),
  controller.removeBranch
);

// ==================== سجل التدقيق ====================
router.get('/:id/audit-trail', controller.getAuditTrail);

// ==================== المهام (لترخيص محدد) ====================
router.post('/:id/tasks', authorize(['admin', 'license_manager']), controller.addTask);
router.patch('/:id/tasks/:taskId', authorize(['admin', 'license_manager']), controller.updateTask);
router.delete('/:id/tasks/:taskId', authorize(['admin', 'license_manager']), controller.removeTask);

// ==================== المراسلات (لترخيص محدد) ====================
router.post(
  '/:id/communications',
  authorize(['admin', 'license_manager']),
  controller.addCommunication
);
router.patch(
  '/:id/communications/:commId',
  authorize(['admin', 'license_manager']),
  controller.updateCommunication
);

// ==================== نسخ الترخيص ====================
router.post('/:id/clone', authorize(['admin', 'license_manager']), controller.cloneLicense);

// ==================== حاسبة الرسوم (لترخيص محدد) ====================
router.get('/:id/fees', controller.calculateFees);

// ==================== تقويم المواعيد (لترخيص محدد) ====================
router.post(
  '/:id/calendar-events',
  authorize(['admin', 'license_manager']),
  controller.addCalendarEvent
);
router.patch(
  '/:id/calendar-events/:eventId',
  authorize(['admin', 'license_manager']),
  controller.updateCalendarEvent
);
router.delete(
  '/:id/calendar-events/:eventId',
  authorize(['admin', 'license_manager']),
  controller.removeCalendarEvent
);

// ==================== جهات الاتصال (لترخيص محدد) ====================
router.post(
  '/:id/authority-contacts',
  authorize(['admin', 'license_manager']),
  controller.addAuthorityContact
);
router.patch(
  '/:id/authority-contacts/:contactId',
  authorize(['admin', 'license_manager']),
  controller.updateAuthorityContact
);
router.delete(
  '/:id/authority-contacts/:contactId',
  authorize(['admin', 'license_manager']),
  controller.removeAuthorityContact
);

// ==================== قائمة الوثائق (لترخيص محدد) ====================
router.post(
  '/:id/document-checklist',
  authorize(['admin', 'license_manager']),
  controller.addDocumentChecklistItem
);
router.patch(
  '/:id/document-checklist/:docId',
  authorize(['admin', 'license_manager']),
  controller.updateDocumentChecklistItem
);
router.get('/:id/document-checklist/status', controller.getDocumentChecklistStatus);

// ==================== التعليقات (لترخيص محدد) ====================
router.post('/:id/comments', controller.addComment);
router.patch('/:id/comments/:commentId', controller.updateComment);
router.delete('/:id/comments/:commentId', controller.deleteComment);
router.patch(
  '/:id/comments/:commentId/pin',
  authorize(['admin', 'license_manager']),
  controller.togglePinComment
);

// ==================== الميزانية (لترخيص محدد) ====================
router.patch('/:id/budget', authorize(['admin', 'license_manager']), controller.updateBudget);
router.post('/:id/expenses', authorize(['admin', 'license_manager']), controller.addExpense);

// ==================== صحة الترخيص (لترخيص محدد) ====================
router.post(
  '/:id/health/calculate',
  authorize(['admin', 'license_manager']),
  controller.calculateHealth
);

// ==================== مؤشرات الأداء (لترخيص محدد) ====================
router.post(
  '/:id/kpi/calculate',
  authorize(['admin', 'license_manager']),
  controller.calculateKPIs
);

// ==================== Round 4: القوالب ====================
router.post(
  '/:id/save-as-template',
  authorize(['admin', 'license_manager']),
  controller.saveAsTemplate
);

// ==================== Round 4: المفضلة والمتابعة ====================
router.post('/:id/favorite', controller.toggleFavorite);
router.post('/:id/watch', controller.toggleWatch);

// ==================== Round 4: SLA ====================
router.patch('/:id/sla', authorize(['admin', 'license_manager']), controller.updateSLASettings);
router.post('/:id/sla/evaluate', authorize(['admin', 'license_manager']), controller.evaluateSLA);
router.post(
  '/:id/sla/escalation-rules',
  authorize(['admin', 'license_manager']),
  controller.addEscalationRule
);
router.delete(
  '/:id/sla/escalation-rules/:ruleId',
  authorize(['admin', 'license_manager']),
  controller.removeEscalationRule
);

// ==================== Round 4: التذاكر ====================
router.post('/:id/tickets', authorize(['admin', 'license_manager']), controller.createTicket);
router.patch(
  '/:id/tickets/:ticketId',
  authorize(['admin', 'license_manager']),
  controller.updateTicket
);
router.post('/:id/tickets/:ticketId/responses', controller.addTicketResponse);

// ==================== Round 4: الإجراءات التلقائية ====================
router.post(
  '/:id/automation-rules',
  authorize(['admin', 'license_manager']),
  controller.addAutomationRule
);
router.patch(
  '/:id/automation-rules/:ruleId',
  authorize(['admin', 'license_manager']),
  controller.updateAutomationRule
);
router.delete(
  '/:id/automation-rules/:ruleId',
  authorize(['admin', 'license_manager']),
  controller.removeAutomationRule
);

// ==================== Round 4: التقارير التنفيذية ====================
router.post(
  '/:id/executive-summary',
  authorize(['admin', 'license_manager']),
  controller.generateExecutiveSummary
);

// ==================== Round 4: التحليلات التنبؤية ====================
router.post(
  '/:id/predictions',
  authorize(['admin', 'license_manager']),
  controller.calculatePredictions
);

// ==================== Round 4: سجل التغييرات ====================
router.get('/:id/change-log', controller.getChangeLog);
router.post(
  '/:id/change-log',
  authorize(['admin', 'license_manager']),
  controller.addChangeLogEntry
);

// ==================== Round 4: إصدارات الوثائق ====================
router.post(
  '/:id/document-versions',
  authorize(['admin', 'license_manager']),
  controller.addDocumentVersion
);
router.post(
  '/:id/document-versions/:docId/versions',
  authorize(['admin', 'license_manager']),
  controller.addNewVersion
);
router.get('/:id/document-versions/:docId', controller.getDocumentVersionHistory);
router.delete(
  '/:id/document-versions/:docId',
  authorize(['admin', 'license_manager']),
  controller.removeDocumentVersion
);

// ==================== Round 5: الإشعارات المتقدمة ====================
router.post(
  '/:id/notifications',
  authorize(['admin', 'license_manager']),
  controller.addScheduledNotification
);
router.get('/:id/notifications', controller.getScheduledNotifications);
router.patch(
  '/:id/notifications/:notifId/status',
  authorize(['admin', 'license_manager']),
  controller.updateNotificationStatus
);
router.delete(
  '/:id/notifications/:notifId',
  authorize(['admin', 'license_manager']),
  controller.removeScheduledNotification
);

// ==================== Round 5: تقييم رضا المتعاملين ====================
router.post('/:id/surveys', controller.addSatisfactionSurvey);
router.get('/:id/surveys', controller.getSatisfactionSurveys);
router.get('/:id/surveys/analysis', controller.analyzeSatisfaction);

// ==================== Round 5: التوقيعات الرقمية ====================
router.post(
  '/:id/signatures',
  authorize(['admin', 'license_manager']),
  controller.addDigitalSignature
);
router.get('/:id/signatures', controller.getDigitalSignatures);
router.patch(
  '/:id/signatures/:sigId/verify',
  authorize(['admin', 'license_manager']),
  controller.verifyDigitalSignature
);
router.get('/:id/signatures/chain', controller.getSignatureChain);

// ==================== Round 5: الاجتماعات والمراجعات ====================
router.post('/:id/meetings', authorize(['admin', 'license_manager']), controller.addMeeting);
router.get('/:id/meetings', controller.getMeetings);
router.patch(
  '/:id/meetings/:meetingId',
  authorize(['admin', 'license_manager']),
  controller.updateMeeting
);
router.patch(
  '/:id/meetings/:meetingId/decisions/:decisionIndex',
  authorize(['admin', 'license_manager']),
  controller.updateMeetingDecision
);

// ==================== Round 5: الربط الخارجي ====================
router.post(
  '/:id/integrations',
  authorize(['admin', 'license_manager']),
  controller.addExternalIntegration
);
router.get('/:id/integrations', controller.getExternalIntegrations);
router.patch(
  '/:id/integrations/:integId/sync',
  authorize(['admin', 'license_manager']),
  controller.updateIntegrationSync
);
router.delete(
  '/:id/integrations/:integId',
  authorize(['admin', 'license_manager']),
  controller.removeExternalIntegration
);

// ==================== Round 5: التدريب والتأهيل ====================
router.post('/:id/training', authorize(['admin', 'license_manager']), controller.addTrainingRecord);
router.get('/:id/training', controller.getTrainingRecords);
router.patch(
  '/:id/training/:recordId',
  authorize(['admin', 'license_manager']),
  controller.updateTrainingRecord
);
router.get('/:id/training/gaps', controller.analyzeTrainingGaps);

// ==================== Round 5: ويدجت لوحة المعلومات ====================
router.put(
  '/:id/dashboard-widgets',
  authorize(['admin', 'license_manager']),
  controller.updateDashboardWidgets
);
router.get('/:id/dashboard-widgets', controller.getDashboardWidgets);

// ==================== Round 5: الإصلاح التلقائي ====================
router.post(
  '/:id/remediation',
  authorize(['admin', 'license_manager']),
  controller.addRemediationAction
);
router.get('/:id/remediation', controller.getRemediationActions);
router.patch(
  '/:id/remediation/:actionId/execute',
  authorize(['admin', 'license_manager']),
  controller.executeRemediation
);

// ==================== Round 5: الموردين والمقاولين ====================
router.post('/:id/vendors', authorize(['admin', 'license_manager']), controller.addVendor);
router.get('/:id/vendors', controller.getVendors);
router.patch(
  '/:id/vendors/:vendorId',
  authorize(['admin', 'license_manager']),
  controller.updateVendor
);
router.delete(
  '/:id/vendors/:vendorId',
  authorize(['admin', 'license_manager']),
  controller.removeVendor
);

// ==================== Round 5: الشكاوى والمقترحات ====================
router.post('/:id/complaints', controller.addComplaint);
router.get('/:id/complaints', controller.getComplaints);
router.patch(
  '/:id/complaints/:complaintId',
  authorize(['admin', 'license_manager']),
  controller.updateComplaint
);
router.post('/:id/complaints/:complaintId/responses', controller.addComplaintResponse);

module.exports = router;
