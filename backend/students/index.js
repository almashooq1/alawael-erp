/**
 * Student Management Module
 * وحدة إدارة الطلاب الشاملة لمراكز التأهيل
 */

const {
  StudentService,
  studentService,
  studentConfig,
} = require('./student-service');

const studentRoutes = require('./student-routes');

/**
 * Initialize module
 */
async function initialize(connection) {
  await studentService.initialize(connection);
  console.log('✅ Student Module initialized');
  return { studentService };
}

/**
 * Get services
 */
function getServices() {
  return { studentService };
}

/**
 * Get routes
 */
function getRoutes() {
  return { studentRoutes };
}

/**
 * Get configurations
 */
function getConfigs() {
  return { studentConfig };
}

module.exports = {
  // Service
  StudentService,
  studentService,
  
  // Configuration
  studentConfig,
  
  // Routes
  studentRoutes,
  
  // Helpers
  initialize,
  getServices,
  getRoutes,
  getConfigs,
};