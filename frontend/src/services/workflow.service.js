/**
 * Workflow Management Service — نظام سير العمل الشامل
 *
 * Frontend API service covering all workflow endpoints:
 * dashboard, definitions, templates, instances, tasks, analytics, audit log.
 */

import api from './api.client';

const BASE = '/workflow';
const ENH = '/workflow-enhanced';
const PRO = '/workflow-pro';

const workflowService = {
  // ─── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // ─── Definitions (CRUD + publish / clone / export / import) ─────────────────
  getDefinitions: (params = {}) => api.get(`${BASE}/definitions`, { params }),
  getDefinition: id => api.get(`${BASE}/definitions/${id}`),
  createDefinition: data => api.post(`${BASE}/definitions`, data),
  updateDefinition: (id, data) => api.put(`${BASE}/definitions/${id}`, data),
  publishDefinition: id => api.post(`${BASE}/definitions/${id}/publish`),
  cloneDefinition: id => api.post(`${BASE}/definitions/${id}/clone`),
  deleteDefinition: id => api.delete(`${BASE}/definitions/${id}`),
  exportDefinition: id => api.get(`${BASE}/definitions/${id}/export`),
  importDefinition: data => api.post(`${BASE}/definitions/import`, data),

  // ─── Templates ──────────────────────────────────────────────────────────────
  getTemplates: () => api.get(`${BASE}/templates`),
  deployTemplate: (templateId, data) => api.post(`${BASE}/templates/${templateId}/deploy`, data),

  // ─── Extended Templates (10 new) ────────────────────────────────────────────
  getExtendedTemplates: () => api.get(`${ENH}/templates/extended`),
  getExtendedTemplate: id => api.get(`${ENH}/templates/extended/${id}`),
  deployExtendedTemplate: (id, data) => api.post(`${ENH}/templates/extended/${id}/deploy`, data),

  // ─── Instances (start / list / detail / cancel / suspend / resume) ──────────
  startInstance: data => api.post(`${BASE}/instances/start`, data),
  getInstances: (params = {}) => api.get(`${BASE}/instances`, { params }),
  getInstance: id => api.get(`${BASE}/instances/${id}`),
  cancelInstance: (id, reason) => api.post(`${BASE}/instances/${id}/cancel`, { reason }),
  suspendInstance: (id, reason) => api.post(`${BASE}/instances/${id}/suspend`, { reason }),
  resumeInstance: id => api.post(`${BASE}/instances/${id}/resume`),

  // ─── Tasks (list / detail / start / complete / reassign / bulk) ─────────────
  getTasks: (params = {}) => api.get(`${BASE}/tasks`, { params }),
  getTask: id => api.get(`${BASE}/tasks/${id}`),
  startTask: id => api.post(`${BASE}/tasks/${id}/start`),
  completeTask: (id, data) => api.post(`${BASE}/tasks/${id}/complete`, data),
  reassignTask: (id, data) => api.post(`${BASE}/tasks/${id}/reassign`, data),
  bulkCompleteTasks: data => api.post(`${BASE}/tasks/bulk/complete`, data),

  // ─── Analytics ──────────────────────────────────────────────────────────────
  getAnalyticsOverview: (params = {}) => api.get(`${BASE}/analytics/overview`, { params }),
  getAnalyticsPerformance: (params = {}) => api.get(`${BASE}/analytics/performance`, { params }),

  // ─── SLA ────────────────────────────────────────────────────────────────────
  checkSLA: () => api.post(`${BASE}/sla/check`),

  // ─── Audit Log ──────────────────────────────────────────────────────────────
  getAuditLog: (params = {}) => api.get(`${BASE}/audit-log`, { params }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENHANCED FEATURES — الميزات المتقدمة
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Comments & Discussion ──────────────────────────────────────────────────
  getInstanceComments: (instanceId, params = {}) =>
    api.get(`${ENH}/comments/instance/${instanceId}`, { params }),
  getTaskComments: taskId => api.get(`${ENH}/comments/task/${taskId}`),
  addComment: data => api.post(`${ENH}/comments`, data),
  editComment: (id, data) => api.put(`${ENH}/comments/${id}`, data),
  deleteComment: id => api.delete(`${ENH}/comments/${id}`),
  pinComment: id => api.post(`${ENH}/comments/${id}/pin`),
  reactToComment: (id, emoji) => api.post(`${ENH}/comments/${id}/react`, { emoji }),

  // ─── Favorites & Bookmarks ─────────────────────────────────────────────────
  getFavorites: () => api.get(`${ENH}/favorites`),
  toggleFavorite: data => api.post(`${ENH}/favorites/toggle`, data),
  checkFavorite: (type, id) => api.get(`${ENH}/favorites/check/${type}/${id}`),
  reorderFavorites: items => api.put(`${ENH}/favorites/reorder`, { items }),

  // ─── Delegation & Out-of-Office ────────────────────────────────────────────
  getDelegations: (params = {}) => api.get(`${ENH}/delegations`, { params }),
  createDelegation: data => api.post(`${ENH}/delegations`, data),
  cancelDelegation: id => api.post(`${ENH}/delegations/${id}/cancel`),
  getActiveDelegation: userId => api.get(`${ENH}/delegations/active/${userId}`),
  processDelegations: () => api.post(`${ENH}/delegations/process`),

  // ─── Reminders ──────────────────────────────────────────────────────────────
  getReminders: (params = {}) => api.get(`${ENH}/reminders`, { params }),
  createReminder: data => api.post(`${ENH}/reminders`, data),
  cancelReminder: id => api.delete(`${ENH}/reminders/${id}`),
  processReminders: () => api.post(`${ENH}/reminders/process`),

  // ─── Webhooks ───────────────────────────────────────────────────────────────
  getWebhooks: () => api.get(`${ENH}/webhooks`),
  getWebhook: id => api.get(`${ENH}/webhooks/${id}`),
  createWebhook: data => api.post(`${ENH}/webhooks`, data),
  updateWebhook: (id, data) => api.put(`${ENH}/webhooks/${id}`, data),
  deleteWebhook: id => api.delete(`${ENH}/webhooks/${id}`),
  testWebhook: id => api.post(`${ENH}/webhooks/${id}/test`),
  getWebhookLogs: id => api.get(`${ENH}/webhooks/${id}/logs`),

  // ─── Saved Reports ─────────────────────────────────────────────────────────
  getReports: () => api.get(`${ENH}/reports`),
  getReport: id => api.get(`${ENH}/reports/${id}`),
  createReport: data => api.post(`${ENH}/reports`, data),
  updateReport: (id, data) => api.put(`${ENH}/reports/${id}`, data),
  deleteReport: id => api.delete(`${ENH}/reports/${id}`),
  generateReport: id => api.post(`${ENH}/reports/${id}/generate`),

  // ─── Tags ───────────────────────────────────────────────────────────────────
  getTags: (params = {}) => api.get(`${ENH}/tags`, { params }),
  createTag: data => api.post(`${ENH}/tags`, data),
  updateTag: (id, data) => api.put(`${ENH}/tags/${id}`, data),
  deleteTag: id => api.delete(`${ENH}/tags/${id}`),
  assignTags: (instanceId, tags) => api.post(`${ENH}/tags/assign/${instanceId}`, { tags }),
  removeTag: (instanceId, tagName) => api.delete(`${ENH}/tags/assign/${instanceId}/${tagName}`),

  // ─── Version History ────────────────────────────────────────────────────────
  getVersions: defId => api.get(`${ENH}/versions/${defId}`),
  getVersion: (defId, ver) => api.get(`${ENH}/versions/${defId}/${ver}`),
  createVersionSnapshot: (defId, data) => api.post(`${ENH}/versions/${defId}`, data),
  compareVersions: (defId, v1, v2) => api.get(`${ENH}/versions/${defId}/compare/${v1}/${v2}`),
  restoreVersion: (defId, ver) => api.post(`${ENH}/versions/${defId}/${ver}/restore`),

  // ─── Notification Preferences ───────────────────────────────────────────────
  getNotifPrefs: () => api.get(`${ENH}/notification-prefs`),
  updateNotifPrefs: data => api.put(`${ENH}/notification-prefs`, data),

  // ─── Calendar View ──────────────────────────────────────────────────────────
  getCalendarEvents: (params = {}) => api.get(`${ENH}/calendar`, { params }),

  // ─── Advanced Batch Ops ─────────────────────────────────────────────────────
  batchReassign: data => api.post(`${ENH}/batch/reassign`, data),
  batchCancelInstances: data => api.post(`${ENH}/batch/cancel-instances`, data),
  batchUpdatePriority: data => api.post(`${ENH}/batch/update-priority`, data),
  batchAddTags: data => api.post(`${ENH}/batch/add-tags`, data),

  // ─── Comprehensive Stats ────────────────────────────────────────────────────
  getComprehensiveStats: () => api.get(`${ENH}/stats/comprehensive`),
  getWorkloadStats: () => api.get(`${ENH}/stats/workload`),

  // ─── Global Search ──────────────────────────────────────────────────────────
  searchWorkflows: (params = {}) => api.get(`${ENH}/search`, { params }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PRO FEATURES — الميزات الاحترافية
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Custom Forms (نماذج مخصصة) ─────────────────────────────────────────────
  getForms: (params = {}) => api.get(`${PRO}/forms`, { params }),
  getForm: id => api.get(`${PRO}/forms/${id}`),
  createForm: data => api.post(`${PRO}/forms`, data),
  updateForm: (id, data) => api.put(`${PRO}/forms/${id}`, data),
  deleteForm: id => api.delete(`${PRO}/forms/${id}`),
  cloneForm: id => api.post(`${PRO}/forms/${id}/clone`),
  validateFormData: (id, data) => api.post(`${PRO}/forms/${id}/validate`, { data }),
  getFieldTypes: () => api.get(`${PRO}/forms/field-types`),
  getFormStats: () => api.get(`${PRO}/forms/stats`),

  // ─── Escalation Management (إدارة التصعيد) ─────────────────────────────────
  getEscalationRules: (params = {}) => api.get(`${PRO}/escalations/rules`, { params }),
  getEscalationRule: id => api.get(`${PRO}/escalations/rules/${id}`),
  createEscalationRule: data => api.post(`${PRO}/escalations/rules`, data),
  updateEscalationRule: (id, data) => api.put(`${PRO}/escalations/rules/${id}`, data),
  deleteEscalationRule: id => api.delete(`${PRO}/escalations/rules/${id}`),
  toggleEscalationRule: id => api.post(`${PRO}/escalations/rules/${id}/toggle`),
  getEscalationLogs: (params = {}) => api.get(`${PRO}/escalations/logs`, { params }),
  resolveEscalation: (id, data) => api.post(`${PRO}/escalations/logs/${id}/resolve`, data),
  processEscalations: () => api.post(`${PRO}/escalations/process`),
  getEscalationStats: () => api.get(`${PRO}/escalations/stats`),
  simulateEscalation: data => api.post(`${PRO}/escalations/simulate`, data),

  // ─── SLA Policies (سياسات SLA) ──────────────────────────────────────────────
  getSLAPolicies: (params = {}) => api.get(`${PRO}/sla-policies`, { params }),
  getSLAPolicy: id => api.get(`${PRO}/sla-policies/${id}`),
  createSLAPolicy: data => api.post(`${PRO}/sla-policies`, data),
  updateSLAPolicy: (id, data) => api.put(`${PRO}/sla-policies/${id}`, data),
  deleteSLAPolicy: id => api.delete(`${PRO}/sla-policies/${id}`),
  toggleSLAPolicy: id => api.post(`${PRO}/sla-policies/${id}/toggle`),
  cloneSLAPolicy: id => api.post(`${PRO}/sla-policies/${id}/clone`),
  checkSLACompliance: () => api.post(`${PRO}/sla-policies/check-compliance`),
  getSLADashboard: () => api.get(`${PRO}/sla-policies/dashboard`),
  getSLAStats: () => api.get(`${PRO}/sla-policies/stats`),

  // ─── KPI Dashboard (مؤشرات الأداء) ──────────────────────────────────────────
  getKPIRealtime: () => api.get(`${PRO}/kpi/realtime`),
  getKPITrends: (params = {}) => api.get(`${PRO}/kpi/trends`, { params }),
  generateKPISnapshot: data => api.post(`${PRO}/kpi/snapshot`, data),
  getKPIBottlenecks: () => api.get(`${PRO}/kpi/bottlenecks`),
  getKPIWorkloadDistribution: () => api.get(`${PRO}/kpi/workload-distribution`),
  getKPICompletionTrend: (params = {}) => api.get(`${PRO}/kpi/completion-trend`, { params }),
  getKPICategoryBreakdown: () => api.get(`${PRO}/kpi/category-breakdown`),
  getKPISnapshots: (params = {}) => api.get(`${PRO}/kpi/snapshots`, { params }),

  // ─── Approval Chains (سلاسل الموافقات) ──────────────────────────────────────
  getApprovalChains: (params = {}) => api.get(`${PRO}/approval-chains`, { params }),
  getApprovalChain: id => api.get(`${PRO}/approval-chains/${id}`),
  createApprovalChain: data => api.post(`${PRO}/approval-chains`, data),
  updateApprovalChain: (id, data) => api.put(`${PRO}/approval-chains/${id}`, data),
  deleteApprovalChain: id => api.delete(`${PRO}/approval-chains/${id}`),
  cloneApprovalChain: id => api.post(`${PRO}/approval-chains/${id}/clone`),
  startApprovalChain: (id, data) => api.post(`${PRO}/approval-chains/${id}/start`, data),
  getApprovalInstances: (params = {}) => api.get(`${PRO}/approval-chains/instances`, { params }),
  submitApprovalDecision: (id, data) =>
    api.post(`${PRO}/approval-chains/instances/${id}/decide`, data),
  getApprovalTimeline: id => api.get(`${PRO}/approval-chains/instances/${id}/timeline`),
  getApprovalStats: () => api.get(`${PRO}/approval-chains/stats`),
  getMyPendingApprovals: () => api.get(`${PRO}/approval-chains/my-pending`),

  // ─── Automation Rules (قواعد الأتمتة) ────────────────────────────────────────
  getAutomationRules: (params = {}) => api.get(`${PRO}/automations`, { params }),
  getAutomationRule: id => api.get(`${PRO}/automations/${id}`),
  createAutomationRule: data => api.post(`${PRO}/automations`, data),
  updateAutomationRule: (id, data) => api.put(`${PRO}/automations/${id}`, data),
  deleteAutomationRule: id => api.delete(`${PRO}/automations/${id}`),
  toggleAutomationRule: id => api.post(`${PRO}/automations/${id}/toggle`),
  testAutomationRule: (id, data) => api.post(`${PRO}/automations/${id}/test`, data),
  getAutomationLogs: (params = {}) => api.get(`${PRO}/automations/logs`, { params }),
  getAutomationStats: () => api.get(`${PRO}/automations/stats`),
  getAutomationEvents: () => api.get(`${PRO}/automations/events`),
  getAutomationActions: () => api.get(`${PRO}/automations/actions`),
};

export default workflowService;
