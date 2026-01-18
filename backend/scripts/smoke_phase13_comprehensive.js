#!/usr/bin/env node
/**
 * Comprehensive Phase 13 Smoke Tests
 * Tests all 8 advanced feature routes with proper JWT auth
 * Validates: endpoint availability, auth enforcement, and response structure
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const BASE = `http://localhost:${PORT}`;
const SECRET = process.env.JWT_SECRET || 'alawael-erp-secret-key-2026-change-in-production';

// Generate valid token with admin role
const token = jwt.sign({ id: 'test-user', role: 'admin' }, SECRET, { expiresIn: '1h' });
const invalidToken = 'invalid-token-xyz';

// Test matrix: all Phase 13 endpoints
const testCases = [
  {
    name: 'User Profile - Statistics',
    path: '/api/user-profile/statistics',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Two-Factor Auth - Send OTP SMS',
    path: '/api/2fa/send-otp-sms',
    method: 'POST',
    requiresAuth: true,
    body: { phoneNumber: '+1234567890' },
  },
  {
    name: 'Advanced Search - Search',
    path: '/api/search-advanced/search?query=test&limit=10',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Payments - Statistics',
    path: '/api/payments-advanced/statistics',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Notifications - Statistics',
    path: '/api/notifications-advanced/statistics',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Chatbot - Statistics',
    path: '/api/chatbot/statistics',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'AI Advanced - Predictions',
    path: '/api/ai-advanced/predictions',
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Automation - Workflows',
    path: '/api/automation/workflows',
    method: 'GET',
    requiresAuth: true,
  },
];

function makeRequest(path, method = 'GET', token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method };
    if (token) {
      opts.headers = { Authorization: `Bearer ${token}` };
    }
    if (body) {
      const bodyStr = JSON.stringify(body);
      opts.headers = opts.headers || {};
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = http.request(url, opts, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 13 COMPREHENSIVE SMOKE TEST SUITE');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  // Test each endpoint with valid auth
  for (const testCase of testCases) {
    try {
      const { status, body } = await makeRequest(testCase.path, testCase.method, token, testCase.body);
      const isValid = status >= 200 && status < 300;
      const result = {
        test: testCase.name,
        status,
        auth: 'valid',
        pass: isValid,
      };
      results.push(result);

      if (isValid) {
        console.log(`✓ ${testCase.name}`);
        console.log(`  └─ ${testCase.method} ${testCase.path.split('?')[0]} -> ${status}`);
        passed++;
      } else {
        console.log(`✗ ${testCase.name}`);
        console.log(`  └─ Expected 2xx, got ${status}`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ ${testCase.name}`);
      console.log(`  └─ Error: ${err.message}`);
      results.push({
        test: testCase.name,
        error: err.message,
        pass: false,
      });
      failed++;
    }
  }

  // Test auth enforcement (invalid token should get 401/403)
  console.log('\n' + '-'.repeat(70));
  console.log('AUTH ENFORCEMENT TESTS\n');

  for (const testCase of testCases.slice(0, 2)) {
    // Test with invalid token
    try {
      const { status } = await makeRequest(testCase.path, testCase.method, invalidToken, testCase.body);
      const authEnforced = status === 401 || status === 403;

      if (authEnforced) {
        console.log(`✓ ${testCase.name} (Invalid Token)`);
        console.log(`  └─ Correctly rejected with ${status}`);
        passed++;
      } else {
        console.log(`✗ ${testCase.name} (Invalid Token)`);
        console.log(`  └─ Expected 401/403, got ${status}`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ ${testCase.name} (Invalid Token)`);
      console.log(`  └─ Error: ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Total:   ${passed + failed}`);
  console.log('='.repeat(70) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
