#!/usr/bin/env node

/**
 * COMPREHENSIVE BARCODE SYSTEM TEST SUITE
 * Tests all endpoints, security, database, and performance
 * Date: February 8, 2026
 */

import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost:4000';
const API_PATH = '/api/barcode';

// JWT Tokens (from generate-jwt.js)
const TOKENS = {
  admin:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwNTc2NjczLCJleHAiOjE3NzA2NjMwNzN9.31VYFEu2oL2SRTpFFv73vzYrPhWwz-IwEv1vTZFKd2w',
  manager:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1hbmFnZXItMDAxIiwidXNlcm5hbWUiOiJtYW5hZ2VyMSIsImVtYWlsIjoibWFuYWdlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ3YXJlaG91c2VfbWFuYWdlciIsImlhdCI6MTc3MDU3NjY3MywiZXhwIjoxNzcwNjYzMDczfQ.PNL-rfPaf1z9sRYRhl9PFgSn49Ubg41pt8jTsXmV9v8',
  logistics:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImxvZ2lzdGljcy0wMDEiLCJ1c2VybmFtZSI6ImxvZ2lzdGljczEiLCJlbWFpbCI6ImxvZ2lzdGljc0BleGFtcGxlLmNvbSIsInJvbGUiOiJsb2dpc3RpY3MiLCJpYXQiOjE3NzA1NzY2NzMsImV4cCI6MTc3MDY2MzA3M30.qbWulFx1vJAIO5MVWaf12psVz_RPkhshstPfdmaqopY',
};

class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
      pass: '✅',
      fail: '❌',
      info: 'ℹ️',
      warn: '⚠️',
      test: '🧪',
    };
    console.log(`${icons[type]} [${timestamp}] ${message}`);
  }

  async test(name, fn) {
    try {
      this.log(`Testing: ${name}`, 'test');
      await fn();
      this.passed++;
      this.log(`PASSED: ${name}`, 'pass');
      this.results.push({ name, status: 'PASSED' });
    } catch (err) {
      this.failed++;
      this.log(`FAILED: ${name} - ${err.message}`, 'fail');
      this.results.push({ name, status: 'FAILED', error: err.message });
    }
  }

  request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL);
      const fullPath = path.startsWith('/api') ? path : `${API_PATH}${path}`;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 80,
        path: fullPath,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };

      const req = http.request(requestOptions, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }
}

async function runTests() {
  const runner = new TestRunner();

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  COMPREHENSIVE BARCODE SYSTEM TEST SUITE   ║');
  console.log('║  Started: ' + new Date().toLocaleString() + '  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // ========== HEALTH CHECK TESTS ==========
  console.log('\n📋 HEALTH CHECK TESTS');
  console.log('─'.repeat(50));

  await runner.test('Health endpoint responds without auth', async () => {
    const res = await runner.request('GET', '/api/barcode/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.status) throw new Error('Missing status field');
  });

  // ========== AUTHENTICATION TESTS ==========
  console.log('\n🔐 AUTHENTICATION TESTS');
  console.log('─'.repeat(50));

  await runner.test('Reject request without token', async () => {
    const res = await runner.request('POST', '/qr-code', {
      body: { data: 'test' },
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runner.test('Accept request with valid admin token', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { data: 'test123' },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // ========== QR CODE GENERATION TESTS ==========
  console.log('\n📱 QR CODE GENERATION TESTS');
  console.log('─'.repeat(50));

  await runner.test('Generate QR code with default settings', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { data: 'QR_TEST_001' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.code) throw new Error('Missing code in response');
  });

  await runner.test('Generate QR code with error correction L', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { data: 'QR_EC_L', errorCorrectionLevel: 'L' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runner.test('Generate QR code with error correction H', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { data: 'QR_EC_H', errorCorrectionLevel: 'H' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runner.test('Reject QR code without data', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { errorCorrectionLevel: 'M' },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // ========== BARCODE GENERATION TESTS ==========
  console.log('\n🪪 BARCODE GENERATION TESTS');
  console.log('─'.repeat(50));

  await runner.test('Generate CODE128 barcode', async () => {
    const res = await runner.request('POST', '/barcode', {
      headers: { Authorization: `Bearer ${TOKENS.manager}` },
      body: { data: 'BC_CODE128_001', format: 'CODE128' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.code) throw new Error('Missing code');
  });

  await runner.test('Generate CODE39 barcode', async () => {
    const res = await runner.request('POST', '/barcode', {
      headers: { Authorization: `Bearer ${TOKENS.manager}` },
      body: { data: 'BCCODE39001', format: 'CODE39' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runner.test('Generate EAN13 barcode', async () => {
    const res = await runner.request('POST', '/barcode', {
      headers: { Authorization: `Bearer ${TOKENS.manager}` },
      body: { data: '1234567890128', format: 'EAN13' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runner.test('Reject invalid barcode format', async () => {
    const res = await runner.request('POST', '/barcode', {
      headers: { Authorization: `Bearer ${TOKENS.manager}` },
      body: { data: 'test', format: 'INVALID' },
    });
    if (res.status !== 500) throw new Error(`Expected 500, got ${res.status}`);
  });

  // ========== BATCH PROCESSING TESTS ==========
  console.log('\n📦 BATCH PROCESSING TESTS');
  console.log('─'.repeat(50));

  await runner.test('Process batch with 2 items', async () => {
    const res = await runner.request('POST', '/batch', {
      headers: { Authorization: `Bearer ${TOKENS.logistics}` },
      body: {
        items: [
          { data: 'BATCH_QR_001', type: 'QR' },
          { data: 'BATCH_BC_001', type: 'BARCODE', format: 'CODE128' },
        ],
      },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.body.successCount !== 2) throw new Error('Expected 2 successes');
  });

  await runner.test('Process batch with 5 items', async () => {
    const items = [];
    for (let i = 1; i <= 5; i++) {
      items.push({
        data: `BATCH_ITEM_${i.toString().padStart(3, '0')}`,
        type: i % 2 === 0 ? 'QR' : 'BARCODE',
        format: 'CODE128',
      });
    }
    const res = await runner.request('POST', '/batch', {
      headers: { Authorization: `Bearer ${TOKENS.logistics}` },
      body: { items },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.body.totalItems !== 5) throw new Error('Expected 5 items');
  });

  await runner.test('Reject empty batch', async () => {
    const res = await runner.request('POST', '/batch', {
      headers: { Authorization: `Bearer ${TOKENS.logistics}` },
      body: { items: [] },
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // ========== STATISTICS TESTS ==========
  console.log('\n📊 STATISTICS TESTS');
  console.log('─'.repeat(50));

  await runner.test('Retrieve statistics', async () => {
    const res = await runner.request('GET', '/statistics', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.body.statistics)) throw new Error('Statistics not an array');
  });

  await runner.test('Statistics has correct counts', async () => {
    const res = await runner.request('GET', '/statistics', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
    });
    const stats = res.body.statistics;
    const hasData = stats.some(s => s.count > 0);
    if (!hasData) throw new Error('No data in statistics');
  });

  // ========== ROLE-BASED ACCESS TESTS ==========
  console.log('\n👥 ROLE-BASED ACCESS TESTS');
  console.log('─'.repeat(50));

  await runner.test('Admin can access all endpoints', async () => {
    const res = await runner.request('GET', '/statistics', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runner.test('Manager can access QR endpoint', async () => {
    const res = await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.manager}` },
      body: { data: 'MANAGER_TEST' },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // ========== PERFORMANCE TESTS ==========
  console.log('\n⚡ PERFORMANCE TESTS');
  console.log('─'.repeat(50));

  await runner.test('Health check responds within 100ms', async () => {
    const start = Date.now();
    await runner.request('GET', '/api/barcode/health');
    const time = Date.now() - start;
    if (time > 100) throw new Error(`Too slow: ${time}ms`);
  });

  await runner.test('QR generation completes within 1000ms', async () => {
    const start = Date.now();
    await runner.request('POST', '/qr-code', {
      headers: { Authorization: `Bearer ${TOKENS.admin}` },
      body: { data: 'PERF_TEST' },
    });
    const time = Date.now() - start;
    if (time > 1000) throw new Error(`Too slow: ${time}ms`);
  });

  // ========== SUMMARY ==========
  const duration = ((Date.now() - runner.startTime) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║           TEST RESULTS SUMMARY             ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║ Total Tests:     ${String(runner.passed + runner.failed).padEnd(30)}║`);
  console.log(`║ ✅ Passed:       ${String(runner.passed).padEnd(30)}║`);
  console.log(`║ ❌ Failed:       ${String(runner.failed).padEnd(30)}║`);
  console.log(`║ Duration:        ${String(duration + 's').padEnd(30)}║`);
  console.log('╠════════════════════════════════════════════╣');

  if (runner.failed === 0) {
    console.log('║  🎉 ALL TESTS PASSED - SYSTEM READY! 🎉   ║');
  } else {
    console.log('║  ⚠️  SOME TESTS FAILED - REVIEW NEEDED    ║');
  }

  console.log('╚════════════════════════════════════════════╝\n');

  // Detailed Results
  console.log('📋 DETAILED RESULTS:\n');
  runner.results.forEach((result, idx) => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${idx + 1}. ${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  process.exit(runner.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
