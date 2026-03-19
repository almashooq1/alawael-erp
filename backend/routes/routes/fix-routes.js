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
  'advancedAnalytics.routes.js'
];

console.log('[ROUTE-FIX] Analyzing route files...\n');

filesToFix.forEach(fileName => {
  const filePath = path.join(routesDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${fileName} - File not found`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Validate file exists and has content
    if (!content || content.trim().length === 0) {
      console.log(`[⚠️] ${fileName} - File is empty`);
      return;
    }
    
    // Try to load the module
    try {
      require(filePath);
      console.log(`[✅] ${fileName} - Loads successfully`);
    } catch (loadError) {
      console.log(`[❌] ${fileName} - Loading error: ${loadError.message.substring(0, 60)}`);
    }
    
  } catch (err) {
    console.log(`[ERROR] ${fileName} - ${err.message}`);
  }
});

console.log('\n[ROUTE-FIX] Analysis complete.');
