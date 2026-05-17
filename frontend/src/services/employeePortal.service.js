import api from './api.client';

const BASE = '/api/v1/employee-portal';

const employeePortalService = {
  getProfile: () => api.get(`${BASE}/profile`),
  updateProfile: data => api.put(`${BASE}/profile`, data),
  getLeaveBalance: () => api.get(`${BASE}/leaves/balance`),
  requestLeave: data => api.post(`${BASE}/leaves`, data),
  getLeaves: params => api.get(`${BASE}/leaves`, { params }),
  getPayslips: params => api.get(`${BASE}/payslips`, { params }),
  getDocuments: params => api.get(`${BASE}/documents`, { params }),
  submitRequest: data => api.post(`${BASE}/requests`, data),
  getRequests: params => api.get(`${BASE}/requests`, { params }),
};

export default employeePortalService;
