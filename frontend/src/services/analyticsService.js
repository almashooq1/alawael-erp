import apiClient from './api.client';
import logger from '../utils/logger';

const MOCK_HR_METRICS = {
  totalEmployees: 0,
  activeEmployees: 0,
  departments: [],
  performanceAverage: 0,
};

const MOCK_SYSTEM_HEALTH = {
  status: 'unknown',
  uptime: 0,
  services: [],
};

const MOCK_AI_INSIGHTS = {
  predictions: [],
  recommendations: [],
};

class AnalyticsService {
  async getHRMetrics() {
    try {
      return await apiClient.get('/analytics/hr');
    } catch (error) {
      logger.warn('Analytics HR metrics unavailable, using defaults:', error.message);
      return MOCK_HR_METRICS;
    }
  }

  async getSystemHealth() {
    try {
      return await apiClient.get('/analytics/system');
    } catch (error) {
      logger.warn('Analytics system health unavailable, using defaults:', error.message);
      return MOCK_SYSTEM_HEALTH;
    }
  }

  async getAIInsights() {
    try {
      return await apiClient.get('/analytics/insights');
    } catch (error) {
      logger.warn('Analytics AI insights unavailable, using defaults:', error.message);
      return MOCK_AI_INSIGHTS;
    }
  }
}

const analyticsService = new AnalyticsService();

export default analyticsService;
