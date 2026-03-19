import api from './api.client';

const kpiDashboardService = {
  getAll: params => api.get('/kpi-dashboard', { params }),
  getById: id => api.get(`/kpi-dashboard/${id}`),
  create: data => api.post('/kpi-dashboard', data),
  update: (id, data) => api.put(`/kpi-dashboard/${id}`, data),
  addMeasurement: (id, data) => api.post(`/kpi-dashboard/${id}/measurement`, data),
  getOverview: () => api.get('/kpi-dashboard/dashboard/overview'),
  getPeriodicReport: params => api.get('/kpi-dashboard/reports/periodic', { params }),
};

export default kpiDashboardService;
