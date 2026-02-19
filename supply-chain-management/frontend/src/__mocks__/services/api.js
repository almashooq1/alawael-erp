/**
 * Mock API Service for Tests
 */

export const loginUser = jest.fn();
export const registerUser = jest.fn();
export const logoutUser = jest.fn();
export const getCurrentUser = jest.fn();

export const getProducts = jest.fn();
export const getProduct = jest.fn();
export const createProduct = jest.fn();
export const updateProduct = jest.fn();
export const deleteProduct = jest.fn();

export const getInventory = jest.fn();
export const getInventoryItem = jest.fn();
export const updateInventory = jest.fn();
export const adjustInventory = jest.fn();

export const getOrders = jest.fn();
export const getOrder = jest.fn();
export const createOrder = jest.fn();
export const updateOrder = jest.fn();
export const updateOrderStatus = jest.fn();

export const getShipments = jest.fn();
export const getShipment = jest.fn();
export const createShipment = jest.fn();
export const updateShipment = jest.fn();
export const trackShipment = jest.fn();

export const getSuppliers = jest.fn();
export const getSupplier = jest.fn();
export const createSupplier = jest.fn();
export const updateSupplier = jest.fn();

export const generateBarcode = jest.fn();
export const scanBarcode = jest.fn();
export const getBarcode = jest.fn();

export const getDashboardStats = jest.fn();
export const getInventoryAnalytics = jest.fn();
export const getOrderAnalytics = jest.fn();
export const getSalesAnalytics = jest.fn();

export const uploadFile = jest.fn();
export const downloadFile = jest.fn();

export const getValidationDashboard = jest.fn();
export const getCashFlowDashboard = jest.fn();
export const getRiskDashboard = jest.fn();
export const getComplianceDashboard = jest.fn();
export const getReportingDashboard = jest.fn();
export const getAdvancedAnalyticsDashboard = jest.fn();

export const getCashFlowData = jest.fn();
export const getForecasts = jest.fn();
export const getReserves = jest.fn();

export const getValidationViolations = jest.fn();
export const getComplianceMetrics = jest.fn();

export const getRiskItems = jest.fn();
export const getRiskTrends = jest.fn();
export const getMitigationStrategies = jest.fn();

export const getComplianceViolations = jest.fn();
export const getComplianceReports = jest.fn();

export const getFinancialReports = jest.fn();
export const getFinancialRatios = jest.fn();

export const getAdvancedAnalytics = jest.fn();
export const getAnalyticsTrends = jest.fn();

export const getAuditLogs = jest.fn();
export const getAuditLog = jest.fn();

export const getChangeLogs = jest.fn();

export const healthCheck = jest.fn();

export default {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory,
  getInventoryItem,
  updateInventory,
  adjustInventory,
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getShipments,
  getShipment,
  createShipment,
  updateShipment,
  trackShipment,
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  generateBarcode,
  scanBarcode,
  getBarcode,
  getDashboardStats,
  getInventoryAnalytics,
  getOrderAnalytics,
  getSalesAnalytics,
  uploadFile,
  downloadFile,
  getValidationDashboard,
  getCashFlowDashboard,
  getRiskDashboard,
  getComplianceDashboard,
  getReportingDashboard,
  getAdvancedAnalyticsDashboard,
  getCashFlowData,
  getForecasts,
  getReserves,
  getValidationViolations,
  getComplianceMetrics,
  getRiskItems,
  getRiskTrends,
  getMitigationStrategies,
  getComplianceViolations,
  getComplianceReports,
  getFinancialReports,
  getFinancialRatios,
  getAdvancedAnalytics,
  getAnalyticsTrends,
  getAuditLogs,
  getAuditLog,
  getChangeLogs,
  healthCheck,
};
