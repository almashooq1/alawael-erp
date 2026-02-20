// Reports Service
import apiClient from './apiClient';

const reportsService = {
  // Get all reports
  getReports: async (params = {}) => {
    return await apiClient.get('/reports', { params });
  },

  // Generate report
  generateReport: async (reportType, filters) => {
    return await apiClient.post('/reports/generate', { reportType, filters });
  },

  // Get report by ID
  getReportById: async reportId => {
    return await apiClient.get(`/reports/${reportId}`);
  },

  // Schedule report
  scheduleReport: async reportConfig => {
    return await apiClient.post('/reports/schedule', reportConfig);
  },

  // Export report
  exportReport: async (reportId, format = 'pdf') => {
    return await apiClient.get(`/reports/${reportId}/export`, {
      params: { format },
      responseType: 'blob',
    });
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    return await apiClient.get('/reports/scheduled');
  },

  // Delete report
  deleteReport: async reportId => {
    return await apiClient.delete(`/reports/${reportId}`);
  },
};

export default reportsService;
