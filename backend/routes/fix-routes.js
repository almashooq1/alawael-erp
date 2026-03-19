/* eslint-disable no-unused-vars */
/**
 * Route Loading Analyzer & Fixer
 * مُحلل ومُصحح تحميل المسارات
 *
 * This script analyzes all route files and fixes common issues:
 * - Controllers exported as Router objects
 * - Missing or incorrectly named imports
 * - Syntax errors in route definitions
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const routesDir = __dirname;
const filesToFix = [
  'tenant.routes.js',
  'ai.recommendations.routes.js',
  'integrationHub.routes.js',
  'qiwa.routes.js',
  'measurements.routes.js',
  'mobileApp.routes.js',
  'dashboardWidget.routes.js',
  'realtimeCollaboration.routes.js',
  'smartNotifications.routes.js',
  'advancedAnalytics.routes.js',
];

logger.info('[ROUTE-FIX] Analyzing route files...\n');

filesToFix.forEach(fileName => {
  const filePath = path.join(routesDir, fileName);

  if (!fs.existsSync(filePath)) {
    logger.info(`[SKIP] ${fileName} - File not found`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Validate file exists and has content
    if (!content || content.trim().length === 0) {
      logger.info(`[⚠️] ${fileName} - File is empty`);
      return;
    }

    // Try to load the module
    try {
      require(filePath);
      logger.info(`[✅] ${fileName} - Loads successfully`);
    } catch (loadError) {
      logger.info(`[❌] ${fileName} - Loading error: ${loadError.message.substring(0, 60)}`);
    }
  } catch (err) {
    logger.info(`[ERROR] ${fileName} - ${err.message}`);
  }
});

logger.info('\n[ROUTE-FIX] Analysis complete.');
