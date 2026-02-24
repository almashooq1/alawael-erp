/**
 * Rehabilitation Dashboard Module
 * وحدة لوحة تحكم مراكز التأهيل
 */

const {
  RehabilitationDashboardService,
  rehabilitationDashboardService,
  dashboardConfig,
} = require('./rehabilitation-dashboard-service');

const rehabilitationDashboardRoutes = require('./rehabilitation-dashboard-routes');

/**
 * Initialize module
 */
async function initialize(connection, services = {}) {
  await rehabilitationDashboardService.initialize(connection, services);
  console.log('✅ Rehabilitation Dashboard Module initialized');
  return { rehabilitationDashboardService };
}

/**
 * Get services
 */
function getServices() {
  return { rehabilitationDashboardService };
}

/**
 * Get routes
 */
function getRoutes() {
  return { rehabilitationDashboardRoutes };
}

/**
 * Get configurations
 */
function getConfigs() {
  return { dashboardConfig };
}

module.exports = {
  // Service
  RehabilitationDashboardService,
  rehabilitationDashboardService,
  
  // Configuration
  dashboardConfig,
  
  // Routes
  rehabilitationDashboardRoutes,
  
  // Helpers
  initialize,
  getServices,
  getRoutes,
  getConfigs,
};