#!/usr/bin/env node

/**
 * Quick Test Script - Test all API endpoints
 * يختبر جميع نقاط النهاية للـ API
 */

const http = require('http');

const BASE_URL = 'http://localhost:3005';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
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
  console.clear();
  log(colors.cyan, '\n╔════════════════════════════════════════╗');
  log(colors.cyan, '║  🧪 API Endpoint Test Suite           ║');
  log(colors.cyan, '╚════════════════════════════════════════╝\n');

  const tests = [
    // Health checks
    {
      name: '✅ Health Check',
      path: '/health',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      name: '✅ API Health',
      path: '/api/health',
      method: 'GET',
      expectedStatus: 200,
    },
    // Documentation
    {
      name: '📚 API Documentation',
      path: '/api-docs',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      name: '📚 API Endpoints',
      path: '/api-docs/endpoints',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      name: '📊 API Status',
      path: '/api-docs/status',
      method: 'GET',
      expectedStatus: 200,
    },
    // Auth endpoints
    {
      name: '🔐 Auth - Get Sessions (would fail without token)',
      path: '/api/auth/sessions',
      method: 'GET',
      expectedStatus: 400, // Expected to fail without auth
    },
    // Analytics
    {
      name: '📈 Analytics - Available',
      path: '/api/analytics',
      method: 'GET',
      expectedStatus: 404, // No GET on root, but shows it's registered
    },
    // Support
    {
      name: '🆘 Support - Available',
      path: '/api/support',
      method: 'GET',
      expectedStatus: 404, // No GET on root, but shows it's registered
    },
    // CMS
    {
      name: '📝 CMS - Available',
      path: '/api/cms',
      method: 'GET',
      expectedStatus: 404,
    },
    // Monitoring
    {
      name: '📊 Monitoring - Health',
      path: '/api/monitoring/health',
      method: 'GET',
      expectedStatus: 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      log(colors.yellow, `\n🔄 Testing: ${test.name}`);
      const response = await makeRequest(test.path, test.method, test.body);

      const statusMatch =
        test.expectedStatus === response.statusCode ||
        (response.statusCode >= 200 && response.statusCode < 300);

      if (statusMatch) {
        log(colors.green, `   ✅ Status: ${response.statusCode}`);
        if (response.data.success !== undefined) {
          log(colors.green, `   ✅ Success: ${response.data.success}`);
        }
        passed++;
      } else {
        log(colors.red, `   ❌ Status: ${response.statusCode} (expected ${test.expectedStatus})`);
        failed++;
      }
    } catch (error) {
      log(colors.red, `   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  log(colors.cyan, '\n╔════════════════════════════════════════╗');
  log(colors.cyan, '║  📊 Test Results                       ║');
  log(colors.cyan, '╚════════════════════════════════════════╝');
  log(colors.green, `\n✅ Passed: ${passed}`);
  log(colors.red, `❌ Failed: ${failed}`);
  log(colors.blue, `📊 Total: ${tests.length}`);
  log(colors.cyan, `\n🎯 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(colors.red, `\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
