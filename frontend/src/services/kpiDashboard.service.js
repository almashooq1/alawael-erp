import api from './api.client';

const kpiDashboardService = {
  getAll: params => api.get('/api/v1/kpi-dashboard', { params }),
  getById: id => api.get(`/api/v1/kpi-dashboard/${id}`),
  create: data => api.post('/api/v1/kpi-dashboard', data),
  update: (id, data) => api.put(`/api/v1/kpi-dashboard/${id}`, data),
  addMeasurement: (id, data) => api.post(`/api/v1/kpi-dashboard/${id}/measurement`, data),
  getOverview: () => api.get('/api/v1/kpi-dashboard/dashboard/overview'),
  getPeriodicReport: params => api.get('/api/v1/kpi-dashboard/reports/periodic', { params }),
};

export default kpiDashboardService;
