// Analytics Service
import apiClient from './apiClient';

const analyticsService = {
  // Get dashboard overview
  getDashboardOverview: async () => {
    return await apiClient.get('/analytics/dashboard');
  },

  // Get system metrics
  getSystemMetrics: async (period = '24h') => {
    return await apiClient.get('/analytics/metrics', { params: { period } });
  },

  // Get user activity
  getUserActivity: async (params = {}) => {
    return await apiClient.get('/analytics/user-activity', { params });
  },

  // Get real-time stats
  getRealTimeStats: async () => {
    return await apiClient.get('/analytics/realtime');
  },

  // Get revenue analytics
  getRevenueAnalytics: async (startDate, endDate) => {
    return await apiClient.get('/analytics/revenue', {
      params: { startDate, endDate },
    });
  },

  // Get performance metrics
  getPerformanceMetrics: async () => {
    return await apiClient.get('/analytics/performance');
  },

  // Get user engagement
  getUserEngagement: async (period = '30d') => {
    return await apiClient.get('/analytics/engagement', { params: { period } });
  },

  // Export analytics report
  exportReport: async (reportType, format = 'pdf') => {
    return await apiClient.get(`/analytics/export/${reportType}`, {
      params: { format },
      responseType: 'blob',
    });
  },
};

export default analyticsService;
