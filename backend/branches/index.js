/**
 * Branch Management Module - وحدة إدارة الفروع
 * Main Entry Point
 */

const {
  BranchManagementService,
  branchManagementService,
  branchConfig,
  branchTypes,
} = require('./branch-service');

const branchRoutes = require('./branch-routes');

/**
 * Module initialization
 */
async function initialize(connection) {
  await branchManagementService.initialize(connection);
  return branchManagementService;
}

/**
 * Get service instance
 */
function getService() {
  return branchManagementService;
}

/**
 * Get routes
 */
function getRoutes() {
  return branchRoutes;
}

/**
 * Get configuration
 */
function getConfig() {
  return branchConfig;
}

/**
 * Get branch types
 */
function getTypes() {
  return branchTypes;
}

module.exports = {
  // Service
  BranchManagementService,
  branchManagementService,
  
  // Routes
  branchRoutes,
  
  // Configuration
  branchConfig,
  branchTypes,
  
  // Helpers
  initialize,
  getService,
  getRoutes,
  getConfig,
  getTypes,
};