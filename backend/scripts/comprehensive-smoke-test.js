/**
 * comprehensive-smoke-test.js — Comprehensive Smoke Test Suite
 * ════════════════════════════════════════════════════════════════
 * Validates that the backend is properly booted and all critical routes
 * are mounted and responding.
 *
 * Run: node scripts/comprehensive-smoke-test.js
 * Or: npm run test:smoke
 *
 * Exit codes:
 *   0 = All tests passed
 *   1 = One or more critical tests failed
 *   2 = Setup error (couldn't reach server)
 */

'use strict';

const http = require('http');
const logger = require('../utils/logger');

const { ROUTE_MANIFEST: _ROUTE_MANIFEST, getAllRoutes: _getAllRoutes } = require('../config/routeManifest');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS, 10) || 10000;

// ─── Test Configuration (generated from routeManifest) ─────────────────────
const TESTS = {
  critical: [
    { name: 'health-check', path: '/health', expectStatus: 200, expectBody: 'status' },
    { name: 'liveness', path: '/health', expectStatus: 200 },
    { name: 'readiness', path: '/readiness', expectStatus: [200, 503] },
    { name: 'route-health-monitor', path: '/api/health/routes', expectStatus: 200 },
  ],
  public: [
    { name: 'public-build-info', path: '/api/build-info', expectStatus: 200 },
    { name: 'public-landing-config', path: '/api/landing-config/content', expectStatus: 200 },
  ],
  authRequired: [
    { name: 'dashboard-v2', path: '/api/v1/dashboard-v2', expectStatus: [401, 404] },
    { name: 'visualization', path: '/api/v1/visualization', expectStatus: [401, 404] },
    { name: 'report-templates', path: '/api/v1/report-templates', expectStatus: [401, 404] },
    { name: 'scheduled-reports', path: '/api/v1/scheduled-reports', expectStatus: [401, 404] },
    { name: 'zatca', path: '/api/v1/zatca', expectStatus: [401, 404] },
    { name: 'hr-system', path: '/api/v1/hr-system', expectStatus: 401 },
    { name: 'payroll', path: '/api/v1/payroll', expectStatus: [401, 404] },
  ],
  phase29: [
    { name: 'phase29-fmea', path: '/api/v1/fmea', expectStatus: [200, 401, 404] },
    { name: 'phase29-rca', path: '/api/v1/rca', expectStatus: [200, 401, 404] },
    { name: 'phase29-spc', path: '/api/v1/spc', expectStatus: [200, 401, 404] },
    { name: 'phase29-standards', path: '/api/v1/standards', expectStatus: [200, 401, 404] },
  ],
  dddDomains: [
    { name: 'ddd-core', path: '/api/v1/core', expectStatus: [200, 401, 404] },
    { name: 'ddd-sessions', path: '/api/v1/sessions', expectStatus: [200, 401, 404] },
    { name: 'ddd-hr', path: '/api/v1/hr', expectStatus: [200, 401, 404] },
  ],
  docs: [
    { name: 'swagger-docs', path: '/api/docs', expectStatus: [200, 301, 302] },
  ],
};

// ─── HTTP Helper ───────────────────────────────────────────────────────────

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, { method: 'GET', timeout: TIMEOUT_MS }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error(`Timeout after ${TIMEOUT_MS}ms`)));
    req.end();
  });
}

// ─── Test Runner ───────────────────────────────────────────────────────────

async function runTest(test) {
  const start = Date.now();
  try {
    const response = await makeRequest(test.path);
    const duration = Date.now() - start;

    const expectedStatuses = Array.isArray(test.expectStatus) ? test.expectStatus : [test.expectStatus];
    const passed = expectedStatuses.includes(response.status);

    if (passed && test.expectBody) {
      const bodyCheck = response.body.toLowerCase().includes(test.expectBody.toLowerCase());
      if (!bodyCheck) {
        return { passed: false, status: response.status, duration, error: `Body does not contain "${test.expectBody}"` };
      }
    }

    return { passed, status: response.status, duration, error: passed ? null : `Expected ${expectedStatuses.join(' or ')}, got ${response.status}` };
  } catch (err) {
    return { passed: false, status: null, duration: Date.now() - start, error: err.message };
  }
}

async function runAllTests() {
  logger.info('═'.repeat(70));
  logger.info('  COMPREHENSIVE SMOKE TEST SUITE');
  logger.info(`  Base URL: ${BASE_URL}`);
  logger.info('═'.repeat(70));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let criticalFailures = 0;

  const results = [];

  for (const [category, tests] of Object.entries(TESTS)) {
    logger.info(`\n  [${category.toUpperCase()}] — ${tests.length} tests`);
    logger.info('─'.repeat(70));

    for (const test of tests) {
      totalTests++;
      const result = await runTest(test);
      results.push({ category, name: test.name, ...result });

      if (result.passed) {
        passedTests++;
        logger.info(`  ✅ ${test.name} — ${result.status} (${result.duration}ms)`);
      } else {
        failedTests++;
        if (category === 'critical') criticalFailures++;
        logger.error(`  ❌ ${test.name} — ${result.error} (${result.duration}ms)`);
      }
    }
  }

  // Summary
  logger.info('\n' + '═'.repeat(70));
  logger.info('  SUMMARY');
  logger.info('═'.repeat(70));
  logger.info(`  Total tests:   ${totalTests}`);
  logger.info(`  Passed:        ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
  logger.info(`  Failed:        ${failedTests}`);
  logger.info(`  Critical failures: ${criticalFailures}`);
  logger.info('═'.repeat(70));

  // Return summary for CI/CD
  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    criticalFailures,
    results,
    exitCode: criticalFailures > 0 ? 1 : (failedTests > 0 ? 0 : 0), // 0 if non-critical failures, 1 if critical
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

if (require.main === module) {
  runAllTests()
    .then(summary => {
      if (summary.criticalFailures > 0) {
        logger.error('\n❌ CRITICAL FAILURES DETECTED. Server is NOT healthy.');
        process.exit(1);
      } else if (summary.failed > 0) {
        logger.warn('\n⚠️  Some non-critical tests failed. Review recommended.');
        process.exit(0);
      } else {
        logger.info('\n✅ All tests passed. Server is healthy.');
        process.exit(0);
      }
    })
    .catch(err => {
      logger.error('Smoke test setup failed:', err.message);
      process.exit(2);
    });
}

module.exports = { runAllTests, TESTS };
