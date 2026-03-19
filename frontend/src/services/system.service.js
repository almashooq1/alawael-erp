import api from './api.client';

const systemService = {
  // Performance Evaluation
  getEvaluations: async () => api.get('/performance-evaluations'),
  getEvaluation: async id => api.get(`/performance-evaluations/${id}`),
  createEvaluation: async data => api.post('/performance-evaluations', data),
  updateEvaluation: async (id, data) => api.put(`/performance-evaluations/${id}`, data),
  deleteEvaluation: async id => api.delete(`/performance-evaluations/${id}`),

  // Succession Planning
  getPlans: async () => api.get('/succession-planning'),
  getPlan: async id => api.get(`/succession-planning/${id}`),
  createPlan: async data => api.post('/succession-planning', data),
  updatePlan: async (id, data) => api.put(`/succession-planning/${id}`, data),
  deletePlan: async id => api.delete(`/succession-planning/${id}`),

  // Medical Files
  getMedicalFiles: async () => api.get('/medical-files'),
  getMedicalFile: async id => api.get(`/medical-files/${id}`),
  uploadMedicalFile: async data => api.post('/medical-files', data),
  deleteMedicalFile: async id => api.delete(`/medical-files/${id}`),

  // Smart Scheduler
  getSchedules: async params => api.get('/smart-scheduler', { params }),
  getSchedule: async id => api.get(`/smart-scheduler/${id}`),
  createSchedule: async data => api.post('/smart-scheduler', data),
  updateSchedule: async (id, data) => api.put(`/smart-scheduler/${id}`, data),
  deleteSchedule: async id => api.delete(`/smart-scheduler/${id}`),

  // Notification Templates
  getNotificationTemplates: async () => api.get('/notification-templates'),
  getNotificationTemplate: async id => api.get(`/notification-templates/${id}`),
  createNotificationTemplate: async data => api.post('/notification-templates', data),
  updateNotificationTemplate: async (id, data) => api.put(`/notification-templates/${id}`, data),
  deleteNotificationTemplate: async id => api.delete(`/notification-templates/${id}`),

  // Approval Requests
  getApprovalRequests: async () => api.get('/approval-requests'),
  getApprovalRequest: async id => api.get(`/approval-requests/${id}`),
  approveRequest: async id => api.post(`/approval-requests/${id}/approve`),
  rejectRequest: async id => api.post(`/approval-requests/${id}/reject`),

  // Templates
  getTemplates: async () => api.get('/templates'),
  getTemplate: async id => api.get(`/templates/${id}`),
  createTemplate: async data => api.post('/templates', data),
  updateTemplate: async (id, data) => api.put(`/templates/${id}`, data),
  deleteTemplate: async id => api.delete(`/templates/${id}`),

  // RBAC
  getRoles: async () => api.get('/rbac/roles'),
  getPermissions: async () => api.get('/rbac/permissions'),
  createRole: async data => api.post('/rbac/roles', data),
  updateRole: async (id, data) => api.put(`/rbac/roles/${id}`, data),
  deleteRole: async id => api.delete(`/rbac/roles/${id}`),
  assignPermission: async (roleId, permId) =>
    api.post(`/rbac-advanced/roles/${roleId}/permissions/${permId}`),

  // Inventory
  getProducts: async () => api.get('/inventory/products'),
  getCategories: async () => api.get('/inventory/categories'),
  getWarehouses: async () => api.get('/inventory/warehouses'),
  createProduct: async data => api.post('/inventory/products', data),
  updateProduct: async (id, data) => api.put(`/inventory/products/${id}`, data),

  // E-Commerce
  getShopProducts: async () => api.get('/ecommerce/products'),
  getOrders: async () => api.get('/ecommerce/orders'),

  // Civil Defense
  getCivilDefenseRecords: async () => api.get('/civil-defense'),
  createCivilDefenseRecord: async data => api.post('/civil-defense', data),

  // Qiwa Integration
  getQiwaEmployees: async () => api.get('/qiwa/employees'),
  verifyEmployee: async data => api.post('/qiwa/employees/verify', data),
};

export default systemService;
