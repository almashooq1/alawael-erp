/**
 * Quick Integration Test Script
 * Verify Phase 29-33 Frontend & Backend Integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let tests = [];
const candidatePorts = Array.from(
  new Set([Number(process.env.PORT) || 3001, 3001, 3002, 3003, 3004])
);

function detectPort() {
  return new Promise(resolve => {
    const tryNext = idx => {
      if (idx >= candidatePorts.length) return resolve(Number(process.env.PORT) || 3001);
      const p = candidatePorts[idx];
      const options = {
        hostname: 'localhost',
        port: p,
        path: '/health',
        method: 'GET',
        timeout: 1500,
      };
      const req = http.request(options, res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(p);
        } else {
          req.destroy();
          tryNext(idx + 1);
        }
      });
      req.on('error', () => tryNext(idx + 1));
      req.on('timeout', () => {
        req.destroy();
        tryNext(idx + 1);
      });
      req.end();
    };
    tryNext(0);
  });
}

let passed = 0;
let failed = 0;

function runTest(test, callback) {
  const options = {
    hostname: 'localhost',
    port: test.port,
    path: test.path,
    method: test.method,
    timeout: 5000,
  };

  const startTime = Date.now();
  const req = http.request(options, res => {
    const responseTime = Date.now() - startTime;
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ ${test.name} (${responseTime}ms)`);
        passed++;
      } else {
        console.log(`⚠️  ${test.name} - Status: ${res.statusCode} (${responseTime}ms)`);
        failed++;
      }
      callback();
    });
  });

  req.on('error', error => {
    console.log(`❌ ${test.name} - ${error.message}`);
    failed++;
    callback();
  });

  req.on('timeout', () => {
    console.log(`⏱️  ${test.name} - Timeout`);
    failed++;
    req.destroy();
    callback();
  });

  req.end();
}

async function runAllTests() {
  console.log('\n🧪 Phase 29-33 Integration Test\n');
  console.log('='.repeat(50));
  const logFile = path.join(__dirname, 'test-results.log');
  try {
    fs.writeFileSync(logFile, `🧪 Phase 29-33 Integration Test\n${'='.repeat(50)}\n`, 'utf8');
  } catch (e) {
    // ignore
  }

  const port = await detectPort();
  tests = [
    { name: 'Backend Health Check', method: 'GET', path: '/health', port },
    {
      name: 'Phase 29 - AI Providers',
      method: 'GET',
      path: '/api/phases-29-33/ai/llm/providers',
      port,
    },
    {
      name: 'Phase 30 - Quantum Key Status',
      method: 'GET',
      path: '/api/phases-29-33/quantum/crypto/key-status/default',
      port,
    },
    {
      name: 'Phase 31 - XR Hologram Render',
      method: 'GET',
      path: '/api/phases-29-33/xr/hologram/render/demo',
      port,
    },
    {
      name: 'Phase 32 - K8s Cluster Metrics',
      method: 'GET',
      path: '/api/phases-29-33/devops/k8s/metrics/demo',
      port,
    },
    {
      name: 'Phase 33 - Performance Profile',
      method: 'GET',
      path: '/api/phases-29-33/optimization/performance/profile',
      port,
    },
  ];

  let index = 0;

  function runNext() {
    if (index < tests.length) {
      runTest(tests[index], () => {
        index++;
        runNext();
      });
    } else {
      console.log('='.repeat(50));
      console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
      try {
        fs.appendFileSync(
          logFile,
          `${'='.repeat(50)}\n\n📊 Results: ${passed} passed, ${failed} failed\n`,
          'utf8'
        );
      } catch (e) {}

      if (failed === 0) {
        console.log('✅ All tests passed!');
        try {
          fs.appendFileSync(logFile, '✅ All tests passed!\n', 'utf8');
        } catch (e) {}
        process.exit(0);
      } else {
        console.log('⚠️  Some tests failed');
        try {
          fs.appendFileSync(logFile, '⚠️  Some tests failed\n', 'utf8');
        } catch (e) {}
        process.exit(1);
      }
    }
  }

  runNext();
}

runAllTests();
