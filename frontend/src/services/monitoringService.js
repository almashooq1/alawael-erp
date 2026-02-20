// Monitoring Service
import apiClient from './apiClient';

const monitoringService = {
  // Get system health
  getSystemHealth: async () => {
    return await apiClient.get('/monitoring/health');
  },

  // Get performance metrics
  getPerformanceMetrics: async () => {
    return await apiClient.get('/monitoring/performance');
  },

  // Get error logs
  getErrorLogs: async (params = {}) => {
    return await apiClient.get('/monitoring/logs/errors', { params });
  },

  // Get system logs
  getSystemLogs: async (params = {}) => {
    return await apiClient.get('/monitoring/logs', { params });
  },

  // Get resource usage
  getResourceUsage: async () => {
    return await apiClient.get('/monitoring/resources');
  },

  // Get API metrics
  getAPIMetrics: async () => {
    return await apiClient.get('/monitoring/api-metrics');
  },

  // Set alert
  setAlert: async alertConfig => {
    return await apiClient.post('/monitoring/alerts', alertConfig);
  },

  // Get alerts
  getAlerts: async () => {
    return await apiClient.get('/monitoring/alerts');
  },
};

export default monitoringService;
