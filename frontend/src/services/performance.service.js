/**
 * performance.service.js
 * خدمة الاتصال بـ API مقاييس الأداء
 */

import apiClient from './api.client';

const BASE = '/performance';

export const performanceService = {
  // Web Vitals
  sendWebVitals: metrics => apiClient.post(`${BASE}/web-vitals`, { metrics }),

  getWebVitals: params => apiClient.get(`${BASE}/web-vitals`, { params }),

  getWorstPages: params => apiClient.get(`${BASE}/web-vitals/worst-pages`, { params }),

  // Lighthouse
  runLighthouse: (url, strategy = 'mobile') =>
    apiClient.post(`${BASE}/lighthouse/run`, { url, strategy }),

  getLighthouseAudits: params => apiClient.get(`${BASE}/lighthouse`, { params }),

  getLatestLighthouse: params => apiClient.get(`${BASE}/lighthouse/latest`, { params }),

  // PageSpeed
  getPageSpeed: (url, strategy = 'mobile', refresh = false) =>
    apiClient.get(`${BASE}/pagespeed`, { params: { url, strategy, refresh } }),

  getPageSpeedHistory: params => apiClient.get(`${BASE}/pagespeed/history`, { params }),

  // Dashboard
  getDashboard: params => apiClient.get(`${BASE}/dashboard`, { params }),

  // Alerts
  getAlerts: params => apiClient.get(`${BASE}/alerts`, { params }),

  updateAlert: (id, status) => apiClient.patch(`${BASE}/alerts/${id}`, { status }),

  // Budget
  getBudget: () => apiClient.get(`${BASE}/budget`),

  updateBudget: data => apiClient.post(`${BASE}/budget`, data),

  getBudgetStatus: () => apiClient.get(`${BASE}/budget/status`),
};

export default performanceService;
