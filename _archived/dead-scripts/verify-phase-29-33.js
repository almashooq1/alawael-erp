#!/usr/bin/env node
/**
 * Comprehensive Phase 29-33 Integration Test & Startup Verification
 * This script:
 * 1. Verifies the backend started and is ready
 * 2. Tests all Phase 29-33 endpoints
 * 3. Reports results clearly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

const testEndpoints = [
  { path: '/health', description: 'Server Health' },
  { path: '/api/phases-29-33/ai/llm/providers', description: 'Phase 29: AI LLM Providers' },
  {
    path: '/api/phases-29-33/ai/workflow/agent/status',
    description: 'Phase 29: AI Workflow Agent',
  },
  {
    path: '/api/phases-29-33/quantum/crypto/key-status/test',
    description: 'Phase 30: Quantum Crypto',
  },
  { path: '/api/phases-29-33/quantum/simulation/run', description: 'Phase 30: Quantum Simulation' },
  { path: '/api/phases-29-33/xr/hologram/render/holo-1', description: 'Phase 31: XR Hologram' },
  { path: '/api/phases-29-33/xr/avatar/sync', description: 'Phase 31: XR Avatar' },
  { path: '/api/phases-29-33/devops/k8s/metrics/cluster-1', description: 'Phase 32: K8s Metrics' },
  { path: '/api/phases-29-33/devops/mlops/train', description: 'Phase 32: MLOps Training' },
  {
    path: '/api/phases-29-33/optimization/performance/profile',
    description: 'Phase 33: Performance Profile',
  },
];

function test(endpoint) {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint.path,
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, res => {
      let _data = '';
      res.on('data', chunk => {
        _data += chunk;
      });
      res.on('end', () => {
        const success = res.statusCode === 200;
        results.tests.push({
          endpoint: endpoint.path,
          description: endpoint.description,
          status: res.statusCode,
          success,
        });
        if (success) {
          results.passed++;
          console.log(`  ✅ ${endpoint.description.padEnd(40)} [${res.statusCode}]`);
        } else {
          results.failed++;
          console.log(`  ⚠️ ${endpoint.description.padEnd(40)} [${res.statusCode}]`);
        }
        resolve(true);
      });
    });

    req.on('error', e => {
      results.failed++;
      results.tests.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        error: e.message,
        success: false,
      });
      console.log(`  ❌ ${endpoint.description.padEnd(40)} [ERROR: ${e.message}]`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      results.failed++;
      results.tests.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        error: 'TIMEOUT',
        success: false,
      });
      console.log(`  ⏱️ ${endpoint.description.padEnd(40)} [TIMEOUT]`);
      resolve(false);
    });

    req.end();
  });
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Phase 29-33 Integration Test Suite                    ║');
  console.log('║  Backend Verification & Endpoint Testing               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('🧪 Testing Endpoints:\n');

  for (const endpoint of testEndpoints) {
    await test(endpoint);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                  ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed:  ${String(results.passed).padEnd(48)} │`);
  console.log(`║  ❌ Failed:  ${String(results.failed).padEnd(48)} │`);
  console.log(`║  📊 Total:   ${String(testEndpoints.length).padEnd(48)} │`);

  const passPercentage = ((results.passed / testEndpoints.length) * 100).toFixed(1);
  console.log(`║  📈 Rate:    ${passPercentage}%${' '.repeat(45)} │`);

  if (results.passed === testEndpoints.length) {
    console.log('║                                                        ║');
    console.log('║  🎉 ALL TESTS PASSED!                                 ║');
    console.log('║  Phase 29-33 is ready for integration testing          ║');
  } else {
    console.log('║                                                        ║');
    console.log('║  ⚠️ Some tests failed - review above                  ║');
  }
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Write results to file
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results saved to: test-results.json\n`);

  process.exit(results.failed === 0 ? 0 : 1);
}

// Wait a bit for backend to be ready
setTimeout(runAllTests, 2000);
