#!/usr/bin/env node
/**
 * Debug script to check if integration routes work
 */

const express = require('express');
const app = express();

// Mimic the safeRequire from app.js
const safeRequire = (filePath) => {
  try {
    return require(filePath);
  } catch (error) {
    console.log(`⚠️  Router not found: ${filePath}`);
    return null;
  }
};

console.log('🔍 Testing Integration Routes Registration\n');

// Load the integration routes
const branchIntegrationRoutes = safeRequire('./routes/branch-integration.routes');

console.log('1. Module loaded:');
console.log('   - branchIntegrationRoutes type:', typeof branchIntegrationRoutes);
console.log('   - branchIntegrationRoutes.router type:', branchIntegrationRoutes ? typeof branchIntegrationRoutes.router : 'N/A');

// Register the routes on the app
if (branchIntegrationRoutes && branchIntegrationRoutes.router) {
  app.use('/api/integration', branchIntegrationRoutes.router);
  console.log('\n2. ✅ Routes registered on app at /api/integration');
} else {
  console.log('\n2. ❌ Failed to register routes');
}

// Test the app routing
app.listen(3002, () => {
  console.log('\n3. Test server running on http://localhost:3002');
  console.log('   Testing GET http://localhost:3002/api/integration/health...');
  
  const http = require('http');
  
  setTimeout(() => {
    http.get('http://localhost:3002/api/integration/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        console.log('   Response:', data);
        process.exit(0);
      });
    }).on('error', (err) => {
      console.log('   Error:', err.message);
      process.exit(1);
    });
  }, 500);
});
