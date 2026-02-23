/**
 * Project Management Module - وحدة إدارة المشاريع
 * Main Entry Point
 */

const {
  ProjectManagementService,
  projectManagementService,
  projectConfig,
  projectStatuses,
} = require('./project-service');

/**
 * Module initialization
 */
async function initialize(connection) {
  await projectManagementService.initialize(connection);
  return projectManagementService;
}

/**
 * Get service instance
 */
function getService() {
  return projectManagementService;
}

/**
 * Get configuration
 */
function getConfig() {
  return projectConfig;
}

module.exports = {
  // Service
  ProjectManagementService,
  projectManagementService,
  
  // Configuration
  projectConfig,
  projectStatuses,
  
  // Helpers
  initialize,
  getService,
  getConfig,
};