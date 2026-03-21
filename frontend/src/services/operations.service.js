/**
 * 📦 operations.service.js — Compatibility Re-export
 * Delegates to operationsService.js (canonical) with flat-method API
 * for OperationsDashboard & useOperationsManagement consumers.
 */
import api from './api.client';
import { equipmentService, licenseService } from './operationsService';

const operationsService = {
  // Assets (no dedicated sub-service — direct API)
  getAssets: async () =>
    api
      .get('/assets')
      .then(r => r.data)
      .catch(() => []),
  getAsset: async id =>
    api
      .get(`/assets/${id}`)
      .then(r => r.data)
      .catch(() => null),
  createAsset: async data => api.post('/assets', data).then(r => r.data),
  updateAsset: async (id, data) => api.put(`/assets/${id}`, data).then(r => r.data),
  deleteAsset: async id => api.delete(`/assets/${id}`).then(r => r.data),

  // Equipment — delegate to canonical equipmentService
  getEquipment: equipmentService.getAll,
  getEquipmentById: equipmentService.getById,
  createEquipment: equipmentService.create,
  updateEquipment: equipmentService.update,
  deleteEquipment: equipmentService.delete,

  // Maintenance (direct API — matches consumer method names)
  getMaintenance: async () =>
    api
      .get('/maintenance')
      .then(r => r.data)
      .catch(() => []),
  getMaintenanceById: async id =>
    api
      .get(`/maintenance/${id}`)
      .then(r => r.data)
      .catch(() => null),
  createMaintenance: async data => api.post('/maintenance', data).then(r => r.data),
  updateMaintenance: async (id, data) => api.put(`/maintenance/${id}`, data).then(r => r.data),
  deleteMaintenance: async id => api.delete(`/maintenance/${id}`).then(r => r.data),

  // Schedules
  getSchedules: async () =>
    api
      .get('/schedules')
      .then(r => r.data)
      .catch(() => []),
  getSchedule: async id =>
    api
      .get(`/schedules/${id}`)
      .then(r => r.data)
      .catch(() => null),
  createSchedule: async data => api.post('/schedules', data).then(r => r.data),
  updateSchedule: async (id, data) => api.put(`/schedules/${id}`, data).then(r => r.data),
  deleteSchedule: async id => api.delete(`/schedules/${id}`).then(r => r.data),

  // Licenses — delegate to canonical licenseService
  getLicenses: licenseService.getAll,
  getLicense: licenseService.getById,
  createLicense: licenseService.create,
  updateLicense: licenseService.update,
  deleteLicense: licenseService.delete,

  // Branches
  getBranches: async () =>
    api
      .get('/branches')
      .then(r => r.data)
      .catch(() => []),
  getBranch: async id =>
    api
      .get(`/branches/${id}`)
      .then(r => r.data)
      .catch(() => null),
  createBranch: async data => api.post('/branches', data).then(r => r.data),
  updateBranch: async (id, data) => api.put(`/branches/${id}`, data).then(r => r.data),
  deleteBranch: async id => api.delete(`/branches/${id}`).then(r => r.data),

  // Legacy aliases for backward compat
  getMaintenanceRequests: async () =>
    api
      .get('/maintenance')
      .then(r => r.data)
      .catch(() => []),
  getMaintenanceRequest: async id =>
    api
      .get(`/maintenance/${id}`)
      .then(r => r.data)
      .catch(() => null),
  createMaintenanceRequest: async data => api.post('/maintenance', data).then(r => r.data),
  updateMaintenanceRequest: async (id, data) =>
    api.put(`/maintenance/${id}`, data).then(r => r.data),
  deleteMaintenanceRequest: async id => api.delete(`/maintenance/${id}`).then(r => r.data),
};

export default operationsService;
