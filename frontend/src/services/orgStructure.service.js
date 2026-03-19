/**
 * 🏢 Organization Structure Service — خدمة الهيكل التنظيمي
 * AlAwael ERP — Organizational structure management
 */
import api from './api.client';

const orgStructureService = {
  getStructure: () => api.get('/organization/structure'),
  getDepartments: params => api.get('/organization/departments', { params }),
  createDepartment: data => api.post('/organization/departments', data),
  updateDepartment: (id, data) => api.put(`/organization/departments/${id}`, data),
  deleteDepartment: id => api.delete(`/organization/departments/${id}`),
  getPositions: params => api.get('/organization/positions', { params }),
  createPosition: data => api.post('/organization/positions', data),
  updatePosition: (id, data) => api.put(`/organization/positions/${id}`, data),
  deletePosition: id => api.delete(`/organization/positions/${id}`),
};

export default orgStructureService;
