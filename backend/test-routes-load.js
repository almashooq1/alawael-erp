#!/usr/bin/env node
const path = require('path');

console.log('Testing branch-integration.routes.js...\n');

try {
  const branchIntegrationRoutes = require('./routes/branch-integration.routes');
  
  console.log('✅ Module loaded successfully!');
  console.log('Exports:', Object.keys(branchIntegrationRoutes));
  console.log('Router:', typeof branchIntegrationRoutes.router);
  console.log('Service:', typeof branchIntegrationRoutes.integrationService);
  
  if (branchIntegrationRoutes.router) {
    console.log('✅ Router is available');
  } else {
    console.log('❌ Router is not available');
  }
  
} catch (error) {
  console.error('❌ Error loading module:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
}
