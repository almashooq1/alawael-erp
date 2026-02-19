/**
 * API Service - Frontend communication with backend
 * Provides centralized API methods for all frontend components
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// AUTH APIs
export const loginUser = (email, password) =>
  apiClient.post('/api/auth/login', { email, password });

export const registerUser = (email, password, name) =>
  apiClient.post('/api/auth/register', { email, password, name });

export const logoutUser = () =>
  apiClient.post('/api/auth/logout');

export const getCurrentUser = () =>
  apiClient.get('/api/auth/me');

// PRODUCT APIs
export const getProducts = (page = 1, limit = 10, search = '') =>
  apiClient.get(`/api/products?page=${page}&limit=${limit}&search=${search}`);

export const getProduct = (id) =>
  apiClient.get(`/api/products/${id}`);

export const createProduct = (data) =>
  apiClient.post('/api/products', data);

export const updateProduct = (id, data) =>
  apiClient.put(`/api/products/${id}`, data);

export const deleteProduct = (id) =>
  apiClient.delete(`/api/products/${id}`);

// INVENTORY APIs
export const getInventory = (page = 1, limit = 10) =>
  apiClient.get(`/api/inventory?page=${page}&limit=${limit}`);

export const getInventoryItem = (id) =>
  apiClient.get(`/api/inventory/${id}`);

export const updateInventory = (id, data) =>
  apiClient.put(`/api/inventory/${id}`, data);

export const adjustInventory = (id, quantity, reason) =>
  apiClient.post(`/api/inventory/${id}/adjust`, { quantity, reason });

// ORDER APIs
export const getOrders = (page = 1, limit = 10, status = '') =>
  apiClient.get(`/api/orders?page=${page}&limit=${limit}&status=${status}`);

export const getOrder = (id) =>
  apiClient.get(`/api/orders/${id}`);

export const createOrder = (data) =>
  apiClient.post('/api/orders', data);

export const updateOrder = (id, data) =>
  apiClient.put(`/api/orders/${id}`, data);

export const updateOrderStatus = (id, status) =>
  apiClient.patch(`/api/orders/${id}/status`, { status });

// SHIPMENT APIs
export const getShipments = (page = 1, limit = 10) =>
  apiClient.get(`/api/shipments?page=${page}&limit=${limit}`);

export const getShipment = (id) =>
  apiClient.get(`/api/shipments/${id}`);

export const createShipment = (data) =>
  apiClient.post('/api/shipments', data);

export const updateShipment = (id, data) =>
  apiClient.put(`/api/shipments/${id}`, data);

export const trackShipment = (trackingNumber) =>
  apiClient.get(`/api/shipments/track/${trackingNumber}`);

// SUPPLIER APIs
export const getSuppliers = (page = 1, limit = 10) =>
  apiClient.get(`/api/suppliers?page=${page}&limit=${limit}`);

export const getSupplier = (id) =>
  apiClient.get(`/api/suppliers/${id}`);

export const createSupplier = (data) =>
  apiClient.post('/api/suppliers', data);

export const updateSupplier = (id, data) =>
  apiClient.put(`/api/suppliers/${id}`, data);

// BARCODE APIs
export const generateBarcode = (productId) =>
  apiClient.post(`/api/barcodes/generate`, { productId });

export const scanBarcode = (barcode) =>
  apiClient.post('/api/barcodes/scan', { barcode });

export const getBarcode = (id) =>
  apiClient.get(`/api/barcodes/${id}`);

// ANALYTICS APIs
export const getDashboardStats = () =>
  apiClient.get('/api/analytics/dashboard');

export const getInventoryAnalytics = (period = '30d') =>
  apiClient.get(`/api/analytics/inventory?period=${period}`);

export const getOrderAnalytics = (period = '30d') =>
  apiClient.get(`/api/analytics/orders?period=${period}`);

export const getSalesAnalytics = (period = '30d') =>
  apiClient.get(`/api/analytics/sales?period=${period}`);

// FILE UPLOAD APIs
export const uploadFile = (file, fileType = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  return apiClient.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadFile = (fileId) =>
  apiClient.get(`/api/files/${fileId}/download`, { responseType: 'blob' });

// DASHBOARD APIs
export const getValidationDashboard = () =>
  apiClient.get('/api/dashboards/validation');

export const getCashFlowDashboard = () =>
  apiClient.get('/api/dashboards/cashflow');

export const getRiskDashboard = () =>
  apiClient.get('/api/dashboards/risk');

export const getComplianceDashboard = () =>
  apiClient.get('/api/dashboards/compliance');

export const getReportingDashboard = () =>
  apiClient.get('/api/dashboards/reporting');

export const getAdvancedAnalyticsDashboard = () =>
  apiClient.get('/api/dashboards/advanced-analytics');

// CASH FLOW SPECIFIC APIs
export const getCashFlowData = () =>
  apiClient.get('/api/dashboards/cashflow/data');

export const getForecasts = (period = '3m') =>
  apiClient.get(`/api/dashboards/cashflow/forecasts?period=${period}`);

export const getReserves = () =>
  apiClient.get('/api/dashboards/cashflow/reserves');

// VALIDATION SPECIFIC APIs
export const getValidationViolations = () =>
  apiClient.get('/api/dashboards/validation/violations');

export const getComplianceMetrics = () =>
  apiClient.get('/api/dashboards/validation/metrics');

// RISK SPECIFIC APIs
export const getRiskItems = () =>
  apiClient.get('/api/dashboards/risk/items');

export const getRiskTrends = (period = '90d') =>
  apiClient.get(`/api/dashboards/risk/trends?period=${period}`);

export const getMitigationStrategies = () =>
  apiClient.get('/api/dashboards/risk/mitigations');

// COMPLIANCE SPECIFIC APIs
export const getComplianceViolations = () =>
  apiClient.get('/api/dashboards/compliance/violations');

export const getComplianceReports = () =>
  apiClient.get('/api/dashboards/compliance/reports');

// REPORTING SPECIFIC APIs
export const getFinancialReports = (type = 'all') =>
  apiClient.get(`/api/dashboards/reporting/reports?type=${type}`);

export const getFinancialRatios = () =>
  apiClient.get('/api/dashboards/reporting/ratios');

// ANALYTICS SPECIFIC APIs
export const getAdvancedAnalytics = () =>
  apiClient.get('/api/dashboards/advanced-analytics/data');

export const getAnalyticsTrends = (metric, period = '30d') =>
  apiClient.get(`/api/dashboards/advanced-analytics/trends?metric=${metric}&period=${period}`);

// AUDIT LOG APIs
export const getAuditLogs = (page = 1, limit = 10, filters = {}) =>
  apiClient.get('/api/audit-logs', { params: { page, limit, ...filters } });

export const getAuditLog = (id) =>
  apiClient.get(`/api/audit-logs/${id}`);

// CHANGELOG APIs
export const getChangeLogs = (entityType, entityId) =>
  apiClient.get(`/api/changelogs/${entityType}/${entityId}`);

// HEALTH CHECK
export const healthCheck = () =>
  apiClient.get('/health');

export default apiClient;
