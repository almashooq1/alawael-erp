/**
 * Rehab Center License API Service - خدمة API تراخيص مراكز ذوي الإعاقة
 * واجهة مركزية للتواصل مع Backend
 */

import apiClient from './api.client';

const BASE = '/rehab-licenses';

const rehabLicenseService = {
  // ==================== أنواع التراخيص ====================
  getLicenseTypes: () => apiClient.get(`${BASE}/types`),

  // ==================== لوحة المعلومات ====================
  getDashboard: () => apiClient.get(`${BASE}/dashboard`),
  getStatistics: () => apiClient.get(`${BASE}/statistics`),

  // ==================== التقارير ====================
  getMonthlyReport: (year, month) =>
    apiClient.get(`${BASE}/reports/monthly`, { params: { year, month } }),
  getCostReport: (filters = {}) => apiClient.get(`${BASE}/reports/costs`, { params: filters }),

  // ==================== التنبيهات ====================
  getActiveAlerts: (filters = {}) => apiClient.get(`${BASE}/alerts/active`, { params: filters }),
  runAlertScan: () => apiClient.post(`${BASE}/alerts/scan`),
  dismissAlert: (licenseId, alertId) =>
    apiClient.patch(`${BASE}/${licenseId}/alerts/${alertId}/dismiss`),
  markAlertRead: (licenseId, alertId) =>
    apiClient.patch(`${BASE}/${licenseId}/alerts/${alertId}/read`),

  // ==================== CRUD ====================
  getAll: (params = {}) => apiClient.get(BASE, { params }),
  getById: id => apiClient.get(`${BASE}/${id}`),
  create: data => apiClient.post(BASE, data),
  update: (id, data) => apiClient.put(`${BASE}/${id}`, data),
  delete: (id, reason) => apiClient.delete(`${BASE}/${id}`, { data: { reason } }),

  // ==================== التراخيص المنتهية / القريبة ====================
  getExpired: () => apiClient.get(`${BASE}/expired`),
  getExpiringSoon: (days = 30) => apiClient.get(`${BASE}/expiring-soon`, { params: { days } }),

  // ==================== التجديد ====================
  renew: (id, data) => apiClient.post(`${BASE}/${id}/renew`, data),
  getRenewalHistory: id => apiClient.get(`${BASE}/${id}/renewal-history`),
  bulkRenew: (licenseIds, renewalData) =>
    apiClient.post(`${BASE}/bulk/renew`, { licenseIds, ...renewalData }),

  // ==================== الملاحظات ====================
  addNote: (id, content, category) => apiClient.post(`${BASE}/${id}/notes`, { content, category }),

  // ==================== المستندات ====================
  addAttachment: (id, fileData) => apiClient.post(`${BASE}/${id}/attachments`, fileData),

  // ==================== الامتثال ====================
  recordInspection: (id, data) => apiClient.post(`${BASE}/${id}/inspection`, data),
  recordViolation: (id, data) => apiClient.post(`${BASE}/${id}/violation`, data),

  // ==================== العمليات المجمعة ====================
  bulkUpdateStatus: (licenseIds, status) =>
    apiClient.post(`${BASE}/bulk/update-status`, { licenseIds, status }),

  // ==================== التصدير ====================
  exportData: (filters = {}) => apiClient.get(`${BASE}/export`, { params: filters }),

  // ==================== التفويضات ====================
  setDelegation: (id, data) => apiClient.post(`${BASE}/${id}/delegation`, data),
  revokeDelegation: id => apiClient.delete(`${BASE}/${id}/delegation`),
  getActiveDelegations: () => apiClient.get(`${BASE}/delegations/active`),

  // ==================== التراخيص المرتبطة ====================
  linkLicenses: (id, targetId, relationship, description) =>
    apiClient.post(`${BASE}/${id}/linked-licenses`, { targetId, relationship, description }),
  getLinkedLicenses: id => apiClient.get(`${BASE}/${id}/linked-licenses`),

  // ==================== المتطلبات ====================
  addRequirement: (id, data) => apiClient.post(`${BASE}/${id}/requirements`, data),
  updateRequirement: (id, reqId, data) =>
    apiClient.patch(`${BASE}/${id}/requirements/${reqId}`, data),
  getRequirementsStatus: id => apiClient.get(`${BASE}/${id}/requirements/status`),

  // ==================== الشروط ====================
  addCondition: (id, data) => apiClient.post(`${BASE}/${id}/conditions`, data),
  updateCondition: (id, condId, data) =>
    apiClient.patch(`${BASE}/${id}/conditions/${condId}`, data),

  // ==================== الغرامات ====================
  addPenalty: (id, data) => apiClient.post(`${BASE}/${id}/penalties`, data),
  updatePenalty: (id, penId, data) => apiClient.patch(`${BASE}/${id}/penalties/${penId}`, data),
  getPendingPenalties: () => apiClient.get(`${BASE}/penalties/pending`),
  getPenaltyStatistics: () => apiClient.get(`${BASE}/penalties/statistics`),

  // ==================== المخاطرة ====================
  calculateRisk: id => apiClient.post(`${BASE}/${id}/risk/calculate`),
  calculateAllRisks: () => apiClient.post(`${BASE}/risk/calculate-all`),
  getHighRiskLicenses: (minScore = 50) =>
    apiClient.get(`${BASE}/risk/high`, { params: { minScore } }),

  // ==================== سير عمل الموافقات ====================
  setupApprovalWorkflow: (id, steps) =>
    apiClient.post(`${BASE}/${id}/approval-workflow`, { steps }),
  processApprovalStep: (id, stepNumber, action, comments) =>
    apiClient.patch(`${BASE}/${id}/approval-workflow/process`, { stepNumber, action, comments }),

  // ==================== الأرشيف ====================
  archive: (id, reason) => apiClient.patch(`${BASE}/${id}/archive`, { reason }),
  unarchive: id => apiClient.patch(`${BASE}/${id}/unarchive`),
  getArchived: (params = {}) => apiClient.get(`${BASE}/archive`, { params }),

  // ==================== كشف التكرار ====================
  findDuplicates: () => apiClient.get(`${BASE}/duplicates`),

  // ==================== التوقعات والتحليلات ====================
  getRenewalForecast: (months = 12) =>
    apiClient.get(`${BASE}/forecast/renewals`, { params: { months } }),
  getRegionStatistics: () => apiClient.get(`${BASE}/statistics/regions`),
  getRenewalStatistics: year => apiClient.get(`${BASE}/statistics/renewals`, { params: { year } }),

  // ==================== التقييم ====================
  setAuthorityRating: (id, data) => apiClient.post(`${BASE}/${id}/rating`, data),

  // ==================== الإشعارات ====================
  updateNotificationPreferences: (id, prefs) =>
    apiClient.patch(`${BASE}/${id}/notification-preferences`, prefs),

  // ==================== الفروع ====================
  addBranch: (id, data) => apiClient.post(`${BASE}/${id}/branches`, data),
  removeBranch: (id, branchId) => apiClient.delete(`${BASE}/${id}/branches/${branchId}`),

  // ==================== سجل التدقيق ====================
  getAuditTrail: (id, params = {}) => apiClient.get(`${BASE}/${id}/audit-trail`, { params }),

  // ==================== التقارير الموسعة ====================
  getEnhancedDashboard: () => apiClient.get(`${BASE}/dashboard/enhanced`),
  getComplianceReport: () => apiClient.get(`${BASE}/reports/compliance`),
  getAnnualReport: year => apiClient.get(`${BASE}/reports/annual`, { params: { year } }),

  // ==================== المهام والتذكيرات ====================
  addTask: (id, data) => apiClient.post(`${BASE}/${id}/tasks`, data),
  updateTask: (id, taskId, data) => apiClient.patch(`${BASE}/${id}/tasks/${taskId}`, data),
  removeTask: (id, taskId) => apiClient.delete(`${BASE}/${id}/tasks/${taskId}`),
  getOverdueTasks: () => apiClient.get(`${BASE}/tasks/overdue`),
  getTaskStatistics: () => apiClient.get(`${BASE}/tasks/statistics`),

  // ==================== سجل المراسلات ====================
  addCommunication: (id, data) => apiClient.post(`${BASE}/${id}/communications`, data),
  updateCommunication: (id, commId, data) =>
    apiClient.patch(`${BASE}/${id}/communications/${commId}`, data),
  getPendingCommunications: () => apiClient.get(`${BASE}/communications/pending`),

  // ==================== نسخ الترخيص ====================
  cloneLicense: (id, data = {}) => apiClient.post(`${BASE}/${id}/clone`, data),

  // ==================== حاسبة الرسوم ====================
  calculateFees: id => apiClient.get(`${BASE}/${id}/fees`),
  calculateTotalFees: (params = {}) => apiClient.get(`${BASE}/fees/total`, { params }),

  // ==================== تقويم المواعيد ====================
  addCalendarEvent: (id, data) => apiClient.post(`${BASE}/${id}/calendar-events`, data),
  updateCalendarEvent: (id, eventId, data) =>
    apiClient.patch(`${BASE}/${id}/calendar-events/${eventId}`, data),
  removeCalendarEvent: (id, eventId) =>
    apiClient.delete(`${BASE}/${id}/calendar-events/${eventId}`),
  getUpcomingEvents: (days = 30) =>
    apiClient.get(`${BASE}/calendar/upcoming`, { params: { days } }),

  // ==================== جهات الاتصال ====================
  addAuthorityContact: (id, data) => apiClient.post(`${BASE}/${id}/authority-contacts`, data),
  updateAuthorityContact: (id, contactId, data) =>
    apiClient.patch(`${BASE}/${id}/authority-contacts/${contactId}`, data),
  removeAuthorityContact: (id, contactId) =>
    apiClient.delete(`${BASE}/${id}/authority-contacts/${contactId}`),

  // ==================== قائمة الوثائق ====================
  addDocumentChecklistItem: (id, data) => apiClient.post(`${BASE}/${id}/document-checklist`, data),
  updateDocumentChecklistItem: (id, docId, data) =>
    apiClient.patch(`${BASE}/${id}/document-checklist/${docId}`, data),
  getDocumentChecklistStatus: id => apiClient.get(`${BASE}/${id}/document-checklist/status`),
  getDocumentStatistics: () => apiClient.get(`${BASE}/documents/statistics`),

  // ==================== التعليقات ====================
  addComment: (id, data) => apiClient.post(`${BASE}/${id}/comments`, data),
  updateComment: (id, commentId, data) =>
    apiClient.patch(`${BASE}/${id}/comments/${commentId}`, data),
  deleteComment: (id, commentId) => apiClient.delete(`${BASE}/${id}/comments/${commentId}`),
  togglePinComment: (id, commentId) => apiClient.patch(`${BASE}/${id}/comments/${commentId}/pin`),

  // ==================== الميزانية ====================
  updateBudget: (id, data) => apiClient.patch(`${BASE}/${id}/budget`, data),
  addExpense: (id, data) => apiClient.post(`${BASE}/${id}/expenses`, data),
  getBudgetStatistics: year => apiClient.get(`${BASE}/budget/statistics`, { params: { year } }),

  // ==================== صحة الترخيص ====================
  calculateHealth: id => apiClient.post(`${BASE}/${id}/health/calculate`),
  calculateAllHealth: () => apiClient.post(`${BASE}/health/calculate-all`),
  getLowHealthLicenses: (maxScore = 50) =>
    apiClient.get(`${BASE}/health/low`, { params: { maxScore } }),

  // ==================== الاستيراد المجمع ====================
  bulkImport: licenses => apiClient.post(`${BASE}/bulk/import`, { licenses }),

  // ==================== مؤشرات الأداء ====================
  calculateKPIs: id => apiClient.post(`${BASE}/${id}/kpi/calculate`),
  getKPIDashboard: () => apiClient.get(`${BASE}/kpi/dashboard`),

  // ==================== Round 4: القوالب ====================
  getTemplates: category => apiClient.get(`${BASE}/templates`, { params: { category } }),
  saveAsTemplate: (id, data) => apiClient.post(`${BASE}/${id}/save-as-template`, data),
  createFromTemplate: (templateId, overrides) =>
    apiClient.post(`${BASE}/templates/${templateId}/create-from`, { overrides }),
  removeTemplate: templateId => apiClient.delete(`${BASE}/templates/${templateId}`),

  // ==================== Round 4: المفضلة والمتابعة ====================
  toggleFavorite: id => apiClient.post(`${BASE}/${id}/favorite`),
  getUserFavorites: () => apiClient.get(`${BASE}/favorites/my`),
  toggleWatch: (id, watchType) => apiClient.post(`${BASE}/${id}/watch`, { watchType }),
  getUserWatchlist: () => apiClient.get(`${BASE}/watchlist/my`),

  // ==================== Round 4: مقارنة التراخيص ====================
  compareLicenses: ids => apiClient.post(`${BASE}/compare`, { ids }),

  // ==================== Round 4: SLA ====================
  updateSLASettings: (id, data) => apiClient.patch(`${BASE}/${id}/sla`, data),
  evaluateSLA: id => apiClient.post(`${BASE}/${id}/sla/evaluate`),
  evaluateAllSLA: () => apiClient.post(`${BASE}/sla/evaluate-all`),
  getSLAStatistics: () => apiClient.get(`${BASE}/sla/statistics`),
  getSLABreachedLicenses: () => apiClient.get(`${BASE}/sla/breached`),
  addEscalationRule: (id, data) => apiClient.post(`${BASE}/${id}/sla/escalation-rules`, data),
  removeEscalationRule: (id, ruleId) =>
    apiClient.delete(`${BASE}/${id}/sla/escalation-rules/${ruleId}`),

  // ==================== Round 4: التذاكر ====================
  createTicket: (id, data) => apiClient.post(`${BASE}/${id}/tickets`, data),
  updateTicket: (id, ticketId, data) => apiClient.patch(`${BASE}/${id}/tickets/${ticketId}`, data),
  addTicketResponse: (id, ticketId, data) =>
    apiClient.post(`${BASE}/${id}/tickets/${ticketId}/responses`, data),
  getTicketStatistics: () => apiClient.get(`${BASE}/tickets/statistics`),
  getOpenTickets: () => apiClient.get(`${BASE}/tickets/open`),

  // ==================== Round 4: الإجراءات التلقائية ====================
  addAutomationRule: (id, data) => apiClient.post(`${BASE}/${id}/automation-rules`, data),
  updateAutomationRule: (id, ruleId, data) =>
    apiClient.patch(`${BASE}/${id}/automation-rules/${ruleId}`, data),
  removeAutomationRule: (id, ruleId) =>
    apiClient.delete(`${BASE}/${id}/automation-rules/${ruleId}`),

  // ==================== Round 4: التقارير التنفيذية ====================
  generateExecutiveSummary: id => apiClient.post(`${BASE}/${id}/executive-summary`),
  getExecutiveReport: () => apiClient.get(`${BASE}/executive/report`),
  generateAllExecutiveSummaries: () => apiClient.post(`${BASE}/executive/generate-all`),

  // ==================== Round 4: التحليلات التنبؤية ====================
  calculatePredictions: id => apiClient.post(`${BASE}/${id}/predictions`),
  getPredictiveAnalytics: () => apiClient.get(`${BASE}/analytics/predictive`),

  // ==================== Round 4: سجل التغييرات ====================
  getChangeLog: (id, params = {}) => apiClient.get(`${BASE}/${id}/change-log`, { params }),
  addChangeLogEntry: (id, data) => apiClient.post(`${BASE}/${id}/change-log`, data),

  // ==================== Round 4: إصدارات الوثائق ====================
  addDocumentVersion: (id, data) => apiClient.post(`${BASE}/${id}/document-versions`, data),
  addNewVersion: (id, docId, data) =>
    apiClient.post(`${BASE}/${id}/document-versions/${docId}/versions`, data),
  getDocumentVersionHistory: (id, docId) =>
    apiClient.get(`${BASE}/${id}/document-versions/${docId}`),
  getExpiringDocuments: (days = 30) =>
    apiClient.get(`${BASE}/documents/expiring`, { params: { days } }),
  removeDocumentVersion: (id, docId) =>
    apiClient.delete(`${BASE}/${id}/document-versions/${docId}`),

  // ==================== Round 5: الإشعارات المتقدمة ====================
  addScheduledNotification: (id, data) => apiClient.post(`${BASE}/${id}/notifications`, data),
  getScheduledNotifications: id => apiClient.get(`${BASE}/${id}/notifications`),
  updateNotificationStatus: (id, notifId, status) =>
    apiClient.patch(`${BASE}/${id}/notifications/${notifId}/status`, { status }),
  removeScheduledNotification: (id, notifId) =>
    apiClient.delete(`${BASE}/${id}/notifications/${notifId}`),
  sendBulkNotifications: data => apiClient.post(`${BASE}/notifications/bulk`, data),

  // ==================== Round 5: تقييم رضا المتعاملين ====================
  addSatisfactionSurvey: (id, data) => apiClient.post(`${BASE}/${id}/surveys`, data),
  getSatisfactionSurveys: id => apiClient.get(`${BASE}/${id}/surveys`),
  analyzeSatisfaction: id => apiClient.get(`${BASE}/${id}/surveys/analysis`),
  getGlobalSatisfactionAnalytics: () => apiClient.get(`${BASE}/satisfaction/analytics`),

  // ==================== Round 5: التوقيعات الرقمية ====================
  addDigitalSignature: (id, data) => apiClient.post(`${BASE}/${id}/signatures`, data),
  getDigitalSignatures: id => apiClient.get(`${BASE}/${id}/signatures`),
  verifyDigitalSignature: (id, sigId) =>
    apiClient.patch(`${BASE}/${id}/signatures/${sigId}/verify`),
  getSignatureChain: id => apiClient.get(`${BASE}/${id}/signatures/chain`),

  // ==================== Round 5: الاجتماعات والمراجعات ====================
  addMeeting: (id, data) => apiClient.post(`${BASE}/${id}/meetings`, data),
  getMeetings: id => apiClient.get(`${BASE}/${id}/meetings`),
  updateMeeting: (id, meetingId, data) =>
    apiClient.patch(`${BASE}/${id}/meetings/${meetingId}`, data),
  updateMeetingDecision: (id, meetingId, decisionIndex, data) =>
    apiClient.patch(`${BASE}/${id}/meetings/${meetingId}/decisions/${decisionIndex}`, data),
  getGlobalMeetingsCalendar: (params = {}) =>
    apiClient.get(`${BASE}/meetings/calendar`, { params }),

  // ==================== Round 5: الربط الخارجي ====================
  addExternalIntegration: (id, data) => apiClient.post(`${BASE}/${id}/integrations`, data),
  getExternalIntegrations: id => apiClient.get(`${BASE}/${id}/integrations`),
  updateIntegrationSync: (id, integId, data) =>
    apiClient.patch(`${BASE}/${id}/integrations/${integId}/sync`, data),
  removeExternalIntegration: (id, integId) =>
    apiClient.delete(`${BASE}/${id}/integrations/${integId}`),

  // ==================== Round 5: التدريب والتأهيل ====================
  addTrainingRecord: (id, data) => apiClient.post(`${BASE}/${id}/training`, data),
  getTrainingRecords: id => apiClient.get(`${BASE}/${id}/training`),
  updateTrainingRecord: (id, recordId, data) =>
    apiClient.patch(`${BASE}/${id}/training/${recordId}`, data),
  analyzeTrainingGaps: id => apiClient.get(`${BASE}/${id}/training/gaps`),
  getGlobalTrainingStatus: () => apiClient.get(`${BASE}/training/status`),

  // ==================== Round 5: ويدجت لوحة المعلومات ====================
  updateDashboardWidgets: (id, data) => apiClient.put(`${BASE}/${id}/dashboard-widgets`, data),
  getDashboardWidgets: id => apiClient.get(`${BASE}/${id}/dashboard-widgets`),

  // ==================== Round 5: الإصلاح التلقائي ====================
  addRemediationAction: (id, data) => apiClient.post(`${BASE}/${id}/remediation`, data),
  getRemediationActions: id => apiClient.get(`${BASE}/${id}/remediation`),
  executeRemediation: (id, actionId, result) =>
    apiClient.patch(`${BASE}/${id}/remediation/${actionId}/execute`, { result }),
  runAutoRemediation: () => apiClient.post(`${BASE}/remediation/auto-scan`),

  // ==================== Round 5: الموردين والمقاولين ====================
  addVendor: (id, data) => apiClient.post(`${BASE}/${id}/vendors`, data),
  getVendors: id => apiClient.get(`${BASE}/${id}/vendors`),
  updateVendor: (id, vendorId, data) => apiClient.patch(`${BASE}/${id}/vendors/${vendorId}`, data),
  removeVendor: (id, vendorId) => apiClient.delete(`${BASE}/${id}/vendors/${vendorId}`),
  getGlobalVendorRatings: () => apiClient.get(`${BASE}/vendors/ratings`),

  // ==================== Round 5: الشكاوى والمقترحات ====================
  addComplaint: (id, data) => apiClient.post(`${BASE}/${id}/complaints`, data),
  getComplaints: id => apiClient.get(`${BASE}/${id}/complaints`),
  updateComplaint: (id, complaintId, data) =>
    apiClient.patch(`${BASE}/${id}/complaints/${complaintId}`, data),
  addComplaintResponse: (id, complaintId, data) =>
    apiClient.post(`${BASE}/${id}/complaints/${complaintId}/responses`, data),
  getGlobalComplaintAnalytics: () => apiClient.get(`${BASE}/complaints/analytics`),
};

export default rehabLicenseService;
