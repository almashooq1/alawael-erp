#!/usr/bin/env node

/**
 * Quick Health Routes Test
 * Tests if /api/v1/health/* routes are working
 */

const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Suppress MongoDB warnings for this test
mongoose.set('strictQuery', false);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Health Routes Quick Test');
console.log('═══════════════════════════════════════════════════════════\n');

// Step 1: Load health routes
console.log('📝 Step 1: Loading health.routes.js...');
try {
  const healthRoutes = require('./routes/health.routes');
  console.log('✅ health.routes.js loaded successfully');
  console.log(
    `   Routes: ${healthRoutes.stack ? healthRoutes.stack.length : '?'} endpoints registered\n`
  );
} catch (err) {
  console.error('❌ Failed to load health.routes.js:', err.message);
  console.error(err.stack);
  process.exit(1);
}

// Step 2: Mount routes
console.log('📝 Step 2: Mounting health routes...');
try {
  const healthRoutes = require('./routes/health.routes');
  app.use('/api/v1/health', healthRoutes);
  console.log('✅ /api/v1/health routes mounted\n');

  // List the routes that should be available
  console.log('Expected endpoints:');
  console.log('  - GET /api/v1/health/db');
  console.log('  - GET /api/v1/health/models');
  console.log('  - GET /api/v1/health/system');
  console.log('  - GET /api/v1/health/full');
  console.log('  - GET /api/v1/health/ready');
  console.log('  - GET /api/v1/health/alive\n');
} catch (err) {
  console.error('❌ Failed to mount health.routes:', err.message);
  process.exit(1);
}

// Step 3: Start test server
console.log('📝 Step 3: Starting test server on port 7777...');
const server = app.listen(7777, () => {
  console.log('✅ Test server started\n');

  // Step 4: Test each endpoint
  setTimeout(() => {
    console.log('📝 Step 4: Testing each endpoint...\n');
    testEndpoints();
  }, 1000);
});

async function testEndpoints() {
  const endpoints = [
    { name: 'Database', path: '/api/v1/health/db' },
    { name: 'Models', path: '/api/v1/health/models' },
    { name: 'System', path: '/api/v1/health/system' },
    { name: 'Full', path: '/api/v1/health/full' },
    { name: 'Readiness', path: '/api/v1/health/ready' },
    { name: 'Liveness', path: '/api/v1/health/alive' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:7777${endpoint.path}`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${endpoint.name.padEnd(15)} ${response.status}`);
      } else {
        console.log(
          `❌ ${endpoint.name.padEnd(15)} ${response.status} - ${data.message || 'Unknown error'}`
        );
      }
    } catch (err) {
      console.log(`❌ ${endpoint.name.padEnd(15)} Error: ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Test Complete');
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  process.exit(0);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});
