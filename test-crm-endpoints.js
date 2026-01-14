#!/usr/bin/env node

/**
 * 🏢 CRM System - Quick Test Suite
 * Verifies all CRM API endpoints are working correctly
 */

const http = require('http');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🏢 CRM System - Endpoint Verification        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let testResults = {
  passed: 0,
  failed: 0,
  endpoints: [],
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET') {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        Authorization: 'Bearer test-token-12345',
      },
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data).success : false,
        });
      });
    });

    req.on('error', error => {
      resolve({
        status: 0,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

// Test endpoint
async function testEndpoint(name, path) {
  try {
    const result = await makeRequest(path);
    const isSuccess = result.status === 200 && result.body;

    if (isSuccess) {
      console.log(`✅ ${name}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name} (Status: ${result.status})`);
      testResults.failed++;
    }

    testResults.endpoints.push({
      name,
      path,
      status: result.status,
      success: isSuccess,
    });
  } catch (error) {
    console.log(`❌ ${name} - ${error.message}`);
    testResults.failed++;
  }
}

// Run all tests
async function runTests() {
  console.log('📡 Testing CRM API Endpoints...\n');

  // Test each endpoint
  await testEndpoint('Dashboard', '/api/crm/dashboard');
  await testEndpoint('Customers List', '/api/crm/customers');
  await testEndpoint('Deals List', '/api/crm/deals');
  await testEndpoint('Pipeline', '/api/crm/pipeline');
  await testEndpoint('Activities', '/api/crm/activities');
  await testEndpoint('Analytics', '/api/crm/analytics');

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    📊 Test Summary                    ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed:  ${testResults.passed}`.padEnd(56) + '║');
  console.log(`║  ❌ Failed:  ${testResults.failed}`.padEnd(56) + '║');
  console.log(`║  📊 Total:   ${testResults.passed + testResults.failed}`.padEnd(56) + '║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (testResults.failed === 0) {
    console.log('🎉 All CRM endpoints are working correctly!\n');
    console.log('📍 Next steps:');
    console.log('   1. Open http://localhost:3000/crm');
    console.log('   2. Sign in with your credentials');
    console.log('   3. Explore the CRM features\n');
  } else {
    console.log('⚠️  Some endpoints failed. Check the following:');
    console.log('   • Is Backend running on port 3001?');
    console.log('   • Are CRM routes properly registered?');
    console.log('   • Check backend logs for errors\n');
  }

  // Detailed results
  if (process.argv.includes('--verbose')) {
    console.log('📋 Detailed Results:\n');
    testResults.endpoints.forEach((endpoint, idx) => {
      console.log(`${idx + 1}. ${endpoint.name}`);
      console.log(`   Path: ${endpoint.path}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Success: ${endpoint.success ? '✅' : '❌'}\n`);
    });
  }
}

// Run tests with a delay to ensure server is ready
setTimeout(runTests, 2000);
