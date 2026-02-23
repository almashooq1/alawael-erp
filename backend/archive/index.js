/**
 * Archive Module Index - ملف فهرس الأرشفة
 * Electronic Archive System for Alawael ERP
 */

const mongoose = require('mongoose');

// Services
const { 
  ArchiveService, 
  archiveService, 
  archiveConfig, 
  archiveCategories 
} = require('./archive-service');

const { 
  OCRService, 
  ocrService, 
  ocrConfig, 
  ocrMiddleware 
} = require('./ocr-service');

const { 
  DocumentWorkflowService, 
  documentWorkflowService, 
  workflowConfig, 
  workflowStages, 
  workflowActions 
} = require('./document-workflow');

// Routes
const archiveRoutes = require('./archive-routes');

/**
 * Archive Module Configuration
 */
const archiveModuleConfig = {
  // Module info
  name: 'archive',
  version: '1.0.0',
  description: 'نظام الأرشفة الإلكتروني',
  
  // Features
  features: {
    documentManagement: true,
    ocr: true,
    workflow: true,
    retention: true,
    classification: true,
    search: true,
    versioning: true,
  },
  
  // Integration points
  integrations: {
    notifications: true,
    audit: true,
    storage: true,
    search: true,
  },
};

/**
 * Initialize Archive Module
 */
async function initializeArchiveModule(connection, options = {}) {
  console.log('📁 Initializing Archive Module...');
  
  // Initialize services
  await archiveService.initialize(connection);
  await ocrService.initialize();
  await documentWorkflowService.initialize(connection);
  
  console.log('✅ Archive Module initialized successfully');
  
  return {
    archiveService,
    ocrService,
    documentWorkflowService,
  };
}

/**
 * Get Archive Module Status
 */
async function getArchiveModuleStatus() {
  const archiveStats = await archiveService.getStatistics();
  const ocrStats = ocrService.getStatistics();
  const workflowStats = await documentWorkflowService.getStatistics();
  
  return {
    archive: archiveStats,
    ocr: ocrStats,
    workflow: workflowStats,
    initialized: true,
    version: archiveModuleConfig.version,
  };
}

/**
 * Archive Module Middleware
 */
function archiveMiddleware() {
  return async (req, res, next) => {
    // Add archive services to request
    req.archiveService = archiveService;
    req.ocrService = ocrService;
    req.workflowService = documentWorkflowService;
    next();
  };
}

/**
 * Setup Archive Routes
 */
function setupArchiveRoutes(app) {
  app.use('/api/archive', archiveRoutes);
}

// Export all components
module.exports = {
  // Services
  ArchiveService,
  archiveService,
  OCRService,
  ocrService,
  DocumentWorkflowService,
  documentWorkflowService,
  
  // Configurations
  archiveConfig,
  archiveCategories,
  ocrConfig,
  workflowConfig,
  workflowStages,
  workflowActions,
  archiveModuleConfig,
  
  // Middleware
  ocrMiddleware,
  archiveMiddleware,
  
  // Routes
  archiveRoutes,
  setupArchiveRoutes,
  
  // Initialization
  initializeArchiveModule,
  getArchiveModuleStatus,
};