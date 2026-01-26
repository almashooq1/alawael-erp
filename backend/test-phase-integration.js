#!/usr/bin/env node

/**
 * Integration Test - Phase 29-33
 * متابعة اختبار تكامل Phase 29-33
 */

const http = require('http');

const tests = [
  {
    path: '/health',
    name: '✅ Backend Health',
  },
  {
    path: '/api/phases-29-33/ai/llm/providers',
    name: '✅ Phase 29 - AI Providers',
  },
  {
    path: '/api/phases-29-33/quantum/crypto/key-status/default',
    name: '✅ Phase 30 - Quantum Key Status',
  },
  {
    path: '/api/phases-29-33/xr/hologram/render/demo',
    name: '✅ Phase 31 - XR Hologram Render',
  },
  {
    path: '/api/phases-29-33/devops/k8s/metrics/demo',
    name: '✅ Phase 32 - K8s Cluster Metrics',
  },
  {
    path: '/api/phases-29-33/optimization/performance/profile',
    name: '✅ Phase 33 - Performance Profile',
  },
];

console.log('\n=== Phase 29-33 Integration Test ===\n');

let passed = 0;
let failed = 0;
let completed = 0;

tests.forEach(test => {
  const startTime = Date.now();

  const req = http.get(`http://localhost:3001${test.path}`, res => {
    const elapsed = Date.now() - startTime;

    if (res.statusCode === 200) {
      console.log(`✅ ${test.name} (${elapsed}ms)`);
      passed++;
    } else {
      console.log(`⚠️  ${test.name} - Status ${res.statusCode} (${elapsed}ms)`);
      failed++;
    }

    res.on('data', () => {});
    res.on('end', () => {
      completed++;
      if (completed === tests.length) {
        printSummary();
      }
    });
  });

  req.on('error', err => {
    console.log(`❌ ${test.name} - ${err.message}`);
    failed++;
    completed++;
    if (completed === tests.length) {
      printSummary();
    }
  });

  req.on('timeout', () => {
    console.log(`⏱️  ${test.name} - TIMEOUT`);
    req.destroy();
    failed++;
    completed++;
    if (completed === tests.length) {
      printSummary();
    }
  });
});

function printSummary() {
  console.log(`\n=== Test Results ===`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

setTimeout(() => {
  if (completed < tests.length) {
    console.log(`\n⏰ Timeout - only ${completed}/${tests.length} tests completed\n`);
    process.exit(1);
  }
}, 30000);
