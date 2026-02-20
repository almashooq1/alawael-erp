// Performance Service
import apiClient from './apiClient';

const performanceService = {
  // Get cache statistics
  getCacheStats: async () => {
    return await apiClient.get('/performance/cache/stats');
  },

  // Clear cache
  clearCache: async cacheType => {
    return await apiClient.post('/performance/cache/clear', { cacheType });
  },

  // Get database performance
  getDatabasePerformance: async () => {
    return await apiClient.get('/performance/database');
  },

  // Optimize queries
  optimizeQueries: async () => {
    return await apiClient.post('/performance/optimize');
  },

  // Get optimization history
  getOptimizationHistory: async () => {
    return await apiClient.get('/performance/optimization-history');
  },

  // Run load test
  runLoadTest: async testConfig => {
    return await apiClient.post('/performance/load-test', testConfig);
  },

  // Get load test results
  getLoadTestResults: async () => {
    return await apiClient.get('/performance/load-testing');
  },
};

export default performanceService;
