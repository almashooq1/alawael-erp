#!/usr/bin/env node
/**
 * Quick test to verify Phase 29-33 endpoints are accessible
 */
const http = require('http');

const testEndpoints = [
  '/health',
  '/api/phases-29-33/ai/llm/providers',
  '/api/phases-29-33/quantum/crypto/key-status/test-id-1',
  '/api/phases-29-33/xr/hologram/render/holo-1',
  '/api/phases-29-33/devops/k8s/metrics/cluster-1',
  '/api/phases-29-33/optimization/performance/profile',
];

async function test(path) {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✅ ${path}: ${res.statusCode}`);
        resolve(true);
      });
    });

    req.on('error', e => {
      console.error(`❌ ${path}: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`⏱️ ${path}: TIMEOUT`);
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Phase 29-33 Endpoints...\n');
  for (const endpoint of testEndpoints) {
    await test(endpoint);
    await new Promise(r => setTimeout(r, 500)); // Wait between requests
  }
  console.log('\n✨ Test complete!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
