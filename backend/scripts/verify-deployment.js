#!/usr/bin/env node

/**
 * Deployment Verification Script
 * سكريبت التحقق من نجاح النشر
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');

/**
 * Deployment Verification Checklist
 */
class DeploymentVerifier {
  constructor() {
    this.checks = [];
    this.results = [];
  }

  /**
   * Check HTTP endpoint
   */
  async checkEndpoint(url, expectedStatus = 200) {
    return new Promise(resolve => {
      const startTime = Date.now();

      http
        .get(url, res => {
          const duration = Date.now() - startTime;
          const success = res.statusCode === expectedStatus;

          resolve({
            success,
            status: res.statusCode,
            duration,
            url,
            message: success
              ? `Healthy (${res.statusCode})`
              : `Status mismatch: expected ${expectedStatus}, got ${res.statusCode}`,
          });
        })
        .on('error', error => {
          const duration = Date.now() - startTime;
          resolve({
            success: false,
            duration,
            url,
            message: error.message,
          });
        })
        .setTimeout(5000, function () {
          this.destroy();
          resolve({
            success: false,
            duration: Date.now() - startTime,
            url,
            message: 'Request timeout',
          });
        });
    });
  }

  /**
   * Run deployment verification
   */
  async verify(config = {}) {
    console.log('\n🚀 Deployment Verification\n');
    console.log('═'.repeat(70));
    console.log('Timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('═'.repeat(70));
    console.log('');

    const baseUrl = config.baseUrl || process.env.APP_URL || 'http://localhost:3000';
    const endpoints = config.endpoints || [
      { path: '/health', name: 'Health Check', status: 200 },
      { path: '/api/health', name: 'API Health', status: 200 },
      { path: '/api/version', name: 'Version Info', status: 200 },
    ];

    let passed = 0;
    let failed = 0;

    console.log('🔍 Checking Endpoints:\n');

    for (const endpoint of endpoints) {
      const url = `${baseUrl}${endpoint.path}`;
      const result = await this.checkEndpoint(url, endpoint.status);

      if (result.success) {
        console.log(`✅ ${endpoint.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Duration: ${result.duration}ms`);
        passed++;
      } else {
        console.log(`❌ ${endpoint.name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Error: ${result.message}`);
        console.log(`   Duration: ${result.duration}ms`);
        failed++;
      }
      console.log('');

      this.results.push({
        endpoint: endpoint.name,
        ...result,
      });
    }

    // Environment checks
    console.log('🔍 Checking Environment:\n');

    const requiredEnvVars = ['NODE_ENV', 'APP_PORT', 'MONGODB_URI', 'REDIS_URL'];

    let envPassed = 0;
    let envFailed = 0;

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set`);
        envPassed++;
      } else {
        console.log(`❌ ${envVar}: Missing`);
        envFailed++;
      }
    }
    console.log('');

    // System checks
    console.log('🔍 Checking System:\n');

    const os = require('os');
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    console.log(`✅ Node.js: ${process.version}`);
    console.log(`✅ Platform: ${process.platform} (${process.arch})`);
    console.log(`✅ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`);
    console.log(`✅ Memory: ${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}% used`);
    console.log(`✅ System Memory: ${((1 - os.freemem() / os.totalmem()) * 100).toFixed(2)}% used`);
    console.log('');

    // Summary
    console.log('═'.repeat(70));
    console.log('Summary:');
    console.log(`  Endpoints:   ${passed}/${endpoints.length} passing`);
    console.log(`  Environment: ${envPassed}/${requiredEnvVars.length} configured`);
    console.log(`  Status: ${failed === 0 && envFailed === 0 ? '✅ READY' : '⚠️  ISSUES'}`);
    console.log('═'.repeat(70));
    console.log('');

    return {
      endpoints: { passed, failed, total: endpoints.length },
      environment: { passed: envPassed, failed: envFailed, total: requiredEnvVars.length },
      ready: failed === 0 && envFailed === 0,
      timestamp: new Date().toISOString(),
      results: this.results,
    };
  }
}

// CLI interface
const verifier = new DeploymentVerifier();

const args = process.argv.slice(2);
const command = args[0];
const baseUrl = args[1] || process.env.APP_URL || 'http://localhost:3000';

if (command === '--json') {
  verifier.verify({ baseUrl }).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ready ? 0 : 1);
  });
} else if (!command || command === 'help') {
  console.log(`
✅ Deployment Verification Script
═══════════════════════════════════════

Usage:
  node scripts/verify-deployment.js [baseUrl]
  node scripts/verify-deployment.js --json [baseUrl]

Arguments:
  baseUrl    Base URL to check (default: http://localhost:3000)
             Can also be set via APP_URL environment variable

Examples:
  node scripts/verify-deployment.js
  node scripts/verify-deployment.js http://localhost:3000
  node scripts/verify-deployment.js http://staging.example.com
  node scripts/verify-deployment.js --json http://production.example.com

What it checks:
  ✓ HTTP endpoints availability
  ✓ Response status codes
  ✓ Required environment variables
  ✓ System resources
  ✓ Node.js process health

Exit codes:
  0 = All checks passed (deployment ready)
  1 = Some checks failed (deployment needs attention)
`);
  process.exit(0);
} else {
  const url = baseUrl.startsWith('http') ? baseUrl : command;
  verifier.verify({ baseUrl: url }).then(result => {
    process.exit(result.ready ? 0 : 1);
  });
}

module.exports = { DeploymentVerifier, verifier };
