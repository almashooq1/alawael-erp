import api from './api.client';

const employeePortalService = {
  getProfile: () => api.get('/employee-portal/profile'),
  updateProfile: data => api.put('/employee-portal/profile', data),
  getLeaveBalance: () => api.get('/employee-portal/leaves/balance'),
  requestLeave: data => api.post('/employee-portal/leaves', data),
  getLeaves: params => api.get('/employee-portal/leaves', { params }),
  getPayslips: params => api.get('/employee-portal/payslips', { params }),
  getDocuments: params => api.get('/employee-portal/documents', { params }),
  submitRequest: data => api.post('/employee-portal/requests', data),
  getRequests: params => api.get('/employee-portal/requests', { params }),
};

export default employeePortalService;
