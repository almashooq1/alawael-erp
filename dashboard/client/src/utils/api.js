import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

/**
 * Get status of all services
 */
export async function getAllServicesStatus() {
  return await api.get('/status');
}

/**
 * Get detailed information about a specific service
 */
export async function getServiceDetails(serviceName) {
  return await api.get(`/service/${serviceName}`);
}

/**
 * Get history of test runs for a service
 */
export async function getServiceHistory(serviceName, limit = 10) {
  const response = await api.get(`/service/${serviceName}`);
  return response.history || [];
}

/**
 * Run quality check for a specific service
 */
export async function runQualityCheck(serviceName) {
  return await api.post(`/run/${serviceName}`);
}

/**
 * Get status of a specific job
 */
export async function getJobStatus(jobId) {
  return await api.get(`/job/${jobId}`);
}

/**
 * Get quality trends over time
 */
export async function getTrends(service = null, days = 7) {
  const params = { days };
  if (service) {
    params.service = service;
  }
  return await api.get('/trends', { params });
}

/**
 * Get recent test runs
 */
export async function getRecentRuns(limit = 20) {
  return await api.get('/recent', { params: { limit } });
}

export default api;
