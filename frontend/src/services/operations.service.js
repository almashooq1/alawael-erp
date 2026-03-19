import api from './api.client';

const operationsService = {
  // Assets
  getAssets: async () => api.get('/assets'),
  getAsset: async id => api.get(`/assets/${id}`),
  createAsset: async data => api.post('/assets', data),
  updateAsset: async (id, data) => api.put(`/assets/${id}`, data),
  deleteAsset: async id => api.delete(`/assets/${id}`),

  // Equipment
  getEquipment: async () => api.get('/equipment'),
  getEquipmentById: async id => api.get(`/equipment/${id}`),
  createEquipment: async data => api.post('/equipment', data),
  updateEquipment: async (id, data) => api.put(`/equipment/${id}`, data),
  deleteEquipment: async id => api.delete(`/equipment/${id}`),

  // Maintenance
  getMaintenanceRequests: async () => api.get('/maintenance'),
  getMaintenanceRequest: async id => api.get(`/maintenance/${id}`),
  createMaintenanceRequest: async data => api.post('/maintenance', data),
  updateMaintenanceRequest: async (id, data) => api.put(`/maintenance/${id}`, data),
  deleteMaintenanceRequest: async id => api.delete(`/maintenance/${id}`),

  // Schedules
  getSchedules: async () => api.get('/schedules'),
  getSchedule: async id => api.get(`/schedules/${id}`),
  createSchedule: async data => api.post('/schedules', data),
  updateSchedule: async (id, data) => api.put(`/schedules/${id}`, data),
  deleteSchedule: async id => api.delete(`/schedules/${id}`),

  // Licenses
  getLicenses: async () => api.get('/licenses'),
  getLicense: async id => api.get(`/licenses/${id}`),
  createLicense: async data => api.post('/licenses', data),
  updateLicense: async (id, data) => api.put(`/licenses/${id}`, data),
  deleteLicense: async id => api.delete(`/licenses/${id}`),

  // Branches
  getBranches: async () => api.get('/branches'),
  getBranch: async id => api.get(`/branches/${id}`),
  createBranch: async data => api.post('/branches', data),
  updateBranch: async (id, data) => api.put(`/branches/${id}`, data),
  deleteBranch: async id => api.delete(`/branches/${id}`),
};

export default operationsService;
