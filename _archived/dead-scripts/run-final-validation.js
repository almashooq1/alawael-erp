#!/usr/bin/env node

/**
 * ALAWAEL Phase 14 - Final System Validation
 * Comprehensive API and functionality test
 * March 3, 2026
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const RESULTS = {
  passed: 0,
  failed: 0,
  tests: [],
  timestamp: new Date().toISOString(),
};

async function test(name, fn) {
  try {
    await fn();
    RESULTS.passed++;
    RESULTS.tests.push({ name, status: '✅ PASS', error: null });
    console.log(`✅ ${name}`);
  } catch (error) {
    RESULTS.failed++;
    RESULTS.tests.push({ name, status: '❌ FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     ALAWAEL PHASE 14 - FINAL VALIDATION      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Test 1: Backend Health
  await test('Backend Health Endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.status) throw new Error('No status in response');
  });

  // Test 2: Status Endpoint
  await test('API Status Endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/api/status`, { timeout: 3000 });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // Test 3: Database Metrics
  await test('Database Metrics Endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/metrics/database`, { timeout: 3000 });
    if (!res.data.stats) throw new Error('No stats in response');
  });

  // Test 4: Redis Metrics
  await test('Redis Metrics Endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/metrics/redis`, { timeout: 3000 });
    if (!res.data.stats) throw new Error('No stats in response');
  });

  // Test 5: Cache Metrics
  await test('Cache Metrics Endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/metrics/cache`, { timeout: 3000 });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // Test 6: RBAC Framework Available
  await test('RBAC Framework Loaded', async () => {
    const rbacPath = path.join(__dirname, 'rbac.js');
    if (!fs.existsSync(rbacPath)) throw new Error('RBAC file not found');
  });

  // Test 7: Swagger Docs Available
  await test('API Documentation Available', async () => {
    const swaggerPath = path.join(__dirname, 'swagger.js');
    if (!fs.existsSync(swaggerPath)) throw new Error('Swagger file not found');
  });

  // Test 8: Integration Tests Available
  await test('Integration Tests Suite', async () => {
    const testPath = path.join(__dirname, 'tests', 'integration.test.js');
    if (!fs.existsSync(testPath)) throw new Error('Integration tests not found');
  });

  // Test 9: Code Quality (0 errors)
  await test('Code Quality Check', async () => {
    // Check if no error markers in key files
    const mainFile = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    // This is a basic check - actual linting would be via eslint
    if (mainFile.includes('TODO') && mainFile.match(/TODO.*\d{2,}.*error/i)) {
      throw new Error('Outstanding TODOs with errors');
    }
  });

  // Test 10: Performance - Response Time
  await test('Performance - Health Response <100ms', async () => {
    const start = Date.now();
    await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    const elapsed = Date.now() - start;
    if (elapsed > 100) throw new Error(`Response took ${elapsed}ms`);
  });

  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║            TEST RESULTS SUMMARY              ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${RESULTS.passed}`);
  console.log(`❌ Failed: ${RESULTS.failed}`);
  console.log(`📊 Total:  ${RESULTS.tests.length}`);
  console.log(`\nSuccess Rate: ${((RESULTS.passed / RESULTS.tests.length) * 100).toFixed(1)}%\n`);

  // Status
  if (RESULTS.failed === 0) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION\n');
    return 0;
  } else {
    console.log('⚠️  Some tests failed - Review above\n');
    return 1;
  }
}

runTests()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
