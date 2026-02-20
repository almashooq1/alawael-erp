#!/usr/bin/env node

console.log('Testing safeRequire with branch-integration.routes...\n');

// Mimic the safeRequire function from app.js
const safeRequire = (filePath) => {
  try {
    return require(filePath);
  } catch (error) {
    console.log(`⚠️  Router not found: ${filePath}`);
    return null;
  }
};

const branchIntegrationRoutes = safeRequire('./routes/branch-integration.routes');

console.log('branchIntegrationRoutes:', branchIntegrationRoutes);
console.log('typeof branchIntegrationRoutes:', typeof branchIntegrationRoutes);

if (branchIntegrationRoutes) {
  console.log('branchIntegrationRoutes.router:', branchIntegrationRoutes.router);
  console.log('typeof branchIntegrationRoutes.router:', typeof branchIntegrationRoutes.router);
  
  if (branchIntegrationRoutes && branchIntegrationRoutes.router) {
    console.log('✅ Router is available and condition passes!');
  } else {
    console.log('❌ Condition failed');
  }
} else {
  console.log('❌ Module returned null from safeRequire');
}
