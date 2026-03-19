/**
 * Enterprise Pro Service — خدمة الميزات المؤسسية الاحترافية
 *
 * 6 modules:
 *  1. Audit Trail & Compliance Hub
 *  2. Advanced Report Builder
 *  3. Unified Calendar Hub
 *  4. CRM Pro
 *  5. Warehouse Intelligence
 *  6. Project Management Pro
 */

import api from './api.client';

const EP = '/enterprise-pro';

const enterpriseProService = {
  // ─── Audit Trail & Compliance Hub (مركز التدقيق والامتثال) ────────────────
  getAuditTrail: (params = {}) => api.get(`${EP}/audit-hub/trail`, { params }),
  getAuditEntry: id => api.get(`${EP}/audit-hub/trail/${id}`),
  getEntityAudit: (type, id) => api.get(`${EP}/audit-hub/trail/entity/${type}/${id}`),
  getAuditStats: () => api.get(`${EP}/audit-hub/stats`),
  getAuditModules: () => api.get(`${EP}/audit-hub/modules`),

  getComplianceChecklists: (params = {}) => api.get(`${EP}/audit-hub/checklists`, { params }),
  getComplianceChecklist: id => api.get(`${EP}/audit-hub/checklists/${id}`),
  createComplianceChecklist: data => api.post(`${EP}/audit-hub/checklists`, data),
  updateComplianceChecklist: (id, data) => api.put(`${EP}/audit-hub/checklists/${id}`, data),
  deleteComplianceChecklist: id => api.delete(`${EP}/audit-hub/checklists/${id}`),
  getComplianceDashboard: () => api.get(`${EP}/audit-hub/compliance-dashboard`),

  getComplianceAlerts: (params = {}) => api.get(`${EP}/audit-hub/alerts`, { params }),
  resolveComplianceAlert: id => api.post(`${EP}/audit-hub/alerts/${id}/resolve`),

  // ─── Advanced Report Builder (مولد التقارير المتقدم) ──────────────────────
  getReportTemplates: (params = {}) => api.get(`${EP}/report-builder/templates`, { params }),
  getReportTemplate: id => api.get(`${EP}/report-builder/templates/${id}`),
  createReportTemplate: data => api.post(`${EP}/report-builder/templates`, data),
  updateReportTemplate: (id, data) => api.put(`${EP}/report-builder/templates/${id}`, data),
  deleteReportTemplate: id => api.delete(`${EP}/report-builder/templates/${id}`),
  cloneReportTemplate: id => api.post(`${EP}/report-builder/templates/${id}/clone`),
  executeReport: (id, data) => api.post(`${EP}/report-builder/execute/${id}`, data),
  getReportExecutions: (params = {}) => api.get(`${EP}/report-builder/executions`, { params }),
  getReportModules: () => api.get(`${EP}/report-builder/modules`),
  getReportStats: () => api.get(`${EP}/report-builder/stats`),

  // ─── Unified Calendar Hub (التقويم الموحد) ────────────────────────────────
  getCalendarEvents: (params = {}) => api.get(`${EP}/calendar-hub/events`, { params }),
  getCalendarEvent: id => api.get(`${EP}/calendar-hub/events/${id}`),
  createCalendarEvent: data => api.post(`${EP}/calendar-hub/events`, data),
  updateCalendarEvent: (id, data) => api.put(`${EP}/calendar-hub/events/${id}`, data),
  deleteCalendarEvent: id => api.delete(`${EP}/calendar-hub/events/${id}`),
  rsvpCalendarEvent: (id, data) => api.post(`${EP}/calendar-hub/events/${id}/rsvp`, data),
  getMyCalendarEvents: () => api.get(`${EP}/calendar-hub/my-events`),
  getTodayEvents: () => api.get(`${EP}/calendar-hub/today`),
  getCalendarRooms: () => api.get(`${EP}/calendar-hub/rooms`),
  getRoomBookings: (params = {}) => api.get(`${EP}/calendar-hub/room-bookings`, { params }),
  createRoomBooking: data => api.post(`${EP}/calendar-hub/room-bookings`, data),
  cancelRoomBooking: id => api.delete(`${EP}/calendar-hub/room-bookings/${id}`),
  getCalendarStats: () => api.get(`${EP}/calendar-hub/stats`),

  // ─── CRM Pro (إدارة العلاقات المتقدمة) ────────────────────────────────────
  getCRMContacts: (params = {}) => api.get(`${EP}/crm-pro/contacts`, { params }),
  getCRMContact: id => api.get(`${EP}/crm-pro/contacts/${id}`),
  createCRMContact: data => api.post(`${EP}/crm-pro/contacts`, data),
  updateCRMContact: (id, data) => api.put(`${EP}/crm-pro/contacts/${id}`, data),
  deleteCRMContact: id => api.delete(`${EP}/crm-pro/contacts/${id}`),

  getCRMPipelines: () => api.get(`${EP}/crm-pro/pipelines`),
  getCRMPipeline: id => api.get(`${EP}/crm-pro/pipelines/${id}`),
  createCRMPipeline: data => api.post(`${EP}/crm-pro/pipelines`, data),
  updateCRMPipeline: (id, data) => api.put(`${EP}/crm-pro/pipelines/${id}`, data),
  deleteCRMPipeline: id => api.delete(`${EP}/crm-pro/pipelines/${id}`),

  getCRMDeals: (params = {}) => api.get(`${EP}/crm-pro/deals`, { params }),
  getCRMDeal: id => api.get(`${EP}/crm-pro/deals/${id}`),
  createCRMDeal: data => api.post(`${EP}/crm-pro/deals`, data),
  updateCRMDeal: (id, data) => api.put(`${EP}/crm-pro/deals/${id}`, data),
  deleteCRMDeal: id => api.delete(`${EP}/crm-pro/deals/${id}`),
  moveCRMDeal: (id, data) => api.put(`${EP}/crm-pro/deals/${id}/move`, data),
  getCRMPipelineBoard: pipelineId => api.get(`${EP}/crm-pro/pipeline-board/${pipelineId}`),

  getCRMActivities: (params = {}) => api.get(`${EP}/crm-pro/activities`, { params }),
  createCRMActivity: data => api.post(`${EP}/crm-pro/activities`, data),
  updateCRMActivity: (id, data) => api.put(`${EP}/crm-pro/activities/${id}`, data),
  getCRMDashboard: () => api.get(`${EP}/crm-pro/dashboard`),

  // ─── Warehouse Intelligence (المستودعات الذكية) ────────────────────────────
  getWarehouses: (params = {}) => api.get(`${EP}/warehouse-intel/warehouses`, { params }),
  getWarehouse: id => api.get(`${EP}/warehouse-intel/warehouses/${id}`),
  createWarehouse: data => api.post(`${EP}/warehouse-intel/warehouses`, data),
  updateWarehouse: (id, data) => api.put(`${EP}/warehouse-intel/warehouses/${id}`, data),
  deleteWarehouse: id => api.delete(`${EP}/warehouse-intel/warehouses/${id}`),

  getWarehouseBins: (params = {}) => api.get(`${EP}/warehouse-intel/bins`, { params }),
  createWarehouseBin: data => api.post(`${EP}/warehouse-intel/bins`, data),
  updateWarehouseBin: (id, data) => api.put(`${EP}/warehouse-intel/bins/${id}`, data),

  getStockLevels: (params = {}) => api.get(`${EP}/warehouse-intel/stock`, { params }),
  updateStockLevel: (id, data) => api.put(`${EP}/warehouse-intel/stock/${id}`, data),

  getStockAlerts: (params = {}) => api.get(`${EP}/warehouse-intel/alerts`, { params }),
  resolveStockAlert: id => api.post(`${EP}/warehouse-intel/alerts/${id}/resolve`),

  getStockTransfers: (params = {}) => api.get(`${EP}/warehouse-intel/transfers`, { params }),
  createStockTransfer: data => api.post(`${EP}/warehouse-intel/transfers`, data),
  updateStockTransfer: (id, data) => api.put(`${EP}/warehouse-intel/transfers/${id}`, data),
  approveStockTransfer: id => api.post(`${EP}/warehouse-intel/transfers/${id}/approve`),
  shipStockTransfer: id => api.post(`${EP}/warehouse-intel/transfers/${id}/ship`),
  receiveStockTransfer: id => api.post(`${EP}/warehouse-intel/transfers/${id}/receive`),
  getWarehouseDashboard: () => api.get(`${EP}/warehouse-intel/dashboard`),

  // ─── Project Management Pro (إدارة المشاريع الاحترافية) ────────────────────
  getProjects: (params = {}) => api.get(`${EP}/project-pro/projects`, { params }),
  getProject: id => api.get(`${EP}/project-pro/projects/${id}`),
  createProject: data => api.post(`${EP}/project-pro/projects`, data),
  updateProject: (id, data) => api.put(`${EP}/project-pro/projects/${id}`, data),
  deleteProject: id => api.delete(`${EP}/project-pro/projects/${id}`),
  cloneProject: id => api.post(`${EP}/project-pro/projects/${id}/clone`),

  getProjectTasks: (params = {}) => api.get(`${EP}/project-pro/tasks`, { params }),
  getProjectTask: id => api.get(`${EP}/project-pro/tasks/${id}`),
  createProjectTask: data => api.post(`${EP}/project-pro/tasks`, data),
  updateProjectTask: (id, data) => api.put(`${EP}/project-pro/tasks/${id}`, data),
  deleteProjectTask: id => api.delete(`${EP}/project-pro/tasks/${id}`),
  addTaskComment: (id, data) => api.post(`${EP}/project-pro/tasks/${id}/comment`, data),
  reorderTasks: data => api.put(`${EP}/project-pro/tasks/reorder`, data),
  getKanbanBoard: projectId => api.get(`${EP}/project-pro/kanban/${projectId}`),

  getTimeLogs: (params = {}) => api.get(`${EP}/project-pro/timelogs`, { params }),
  createTimeLog: data => api.post(`${EP}/project-pro/timelogs`, data),
  getProjectDashboard: () => api.get(`${EP}/project-pro/dashboard`),
  getMyProjectTasks: () => api.get(`${EP}/project-pro/my-tasks`),
};

export default enterpriseProService;
