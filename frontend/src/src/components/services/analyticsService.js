import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  config => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

class AnalyticsService {
  async getHRMetrics() {
    const response = await api.get('/analytics/hr');
    return response.data;
  }

  async getSystemHealth() {
    const response = await api.get('/analytics/system');
    return response.data;
  }

  async getAIInsights() {
    const response = await api.get('/analytics/insights');
    return response.data;
  }
}

export default new AnalyticsService();
