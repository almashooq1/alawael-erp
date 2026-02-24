/**
 * Center Administration Module
 * وحدة إدارة مراكز التأهيل
 */

const {
  CenterAdministrationService,
  centerAdministrationService,
  centerConfig,
} = require('./center-service');

const centerRoutes = require('./center-routes');

/**
 * Initialize module
 */
async function initialize(connection) {
  await centerAdministrationService.initialize(connection);
  console.log('✅ Center Administration Module initialized');
  return { centerAdministrationService };
}

/**
 * Get services
 */
function getServices() {
  return { centerAdministrationService };
}

/**
 * Get routes
 */
function getRoutes() {
  return { centerRoutes };
}

/**
 * Get configurations
 */
function getConfigs() {
  return { centerConfig };
}

module.exports = {
  // Service
  CenterAdministrationService,
  centerAdministrationService,
  
  // Configuration
  centerConfig,
  
  // Routes
  centerRoutes,
  
  // Helpers
  initialize,
  getServices,
  getRoutes,
  getConfigs,
};