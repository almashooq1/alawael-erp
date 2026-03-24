#!/usr/bin/env node

/**
 * Performance Testing & Analysis Script
 * Tests backend API response times and resource usage
 */

const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3002';

// Test configurations
const tests = [
  { name: 'Basic Health', path: '/health', method: 'GET' },
  { name: 'Database Health', path: '/api/v1/health/db', method: 'GET' },
  { name: 'System Info', path: '/api/v1/health/system', method: 'GET' },
  { name: 'Models Status', path: '/api/v1/health/models', method: 'GET' },
  { name: 'Full Health', path: '/api/v1/health/full', method: 'GET' },
  { name: 'Ready Check', path: '/api/v1/health/ready', method: 'GET' },
  { name: 'Alive Check', path: '/api/v1/health/alive', method: 'GET' },
];

// Performance metrics
const metrics = {
  total: 0,
  passed: 0,
  failed: 0,
  responses: [],
};

/**
 * Make HTTP request and measure response time
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const request = http.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const duration = performance.now() - startTime;
        resolve({
          status: res.statusCode,
          duration,
          size: data.length,
          success: res.statusCode === 200,
        });
      });
    });

    request.on('error', reject);
    request.setTimeout(5000, () => {
      request.abort();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Run all performance tests
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    ALAWAEL ERP - Performance Analysis Report           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  for (const test of tests) {
    const url = `${BASE_URL}${test.path}`;
    try {
      const result = await makeRequest(url);
      metrics.total++;

      if (result.success) {
        metrics.passed++;
        const responseTime = result.duration.toFixed(2);
        const responseSize = (result.size / 1024).toFixed(2);

        console.log(`✅ ${test.name.padEnd(20)} | ${responseTime}ms | ${responseSize}KB`);
        metrics.responses.push({
          endpoint: test.path,
          duration: result.duration,
          size: result.size,
        });
      } else {
        metrics.failed++;
        console.log(`❌ ${test.name.padEnd(20)} | Status: ${result.status}`);
      }
    } catch (error) {
      metrics.failed++;
      console.log(`❌ ${test.name.padEnd(20)} | Error: ${error.message}`);
    }
  }

  // Summary Statistics
  console.log('\n' + '─'.repeat(58));
  console.log('\n📊 SUMMARY STATISTICS');
  console.log(`├─ Total Tests: ${metrics.total}`);
  console.log(`├─ Passed: ${metrics.passed} ✅`);
  console.log(`├─ Failed: ${metrics.failed} ❌`);
  console.log(`├─ Success Rate: ${((metrics.passed / metrics.total) * 100).toFixed(1)}%`);

  if (metrics.responses.length > 0) {
    const durations = metrics.responses.map(r => r.duration);
    const avgTime = durations.reduce((a, b) => a + b) / durations.length;
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);

    console.log(`\n⏱️  RESPONSE TIME ANALYSIS`);
    console.log(`├─ Average: ${avgTime.toFixed(2)}ms`);
    console.log(`├─ Min: ${minTime.toFixed(2)}ms`);
    console.log(`├─ Max: ${maxTime.toFixed(2)}ms`);

    const throughput = (metrics.total / ((avgTime * metrics.total) / 1000)).toFixed(0);
    console.log(`├─ Estimated Throughput: ${throughput} req/s`);
  }

  const totalSize = metrics.responses.reduce((sum, r) => sum + r.size, 0);
  console.log(`\n💾 DATA TRANSFER`);
  console.log(`├─ Total Transferred: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`└─ Average Response: ${(totalSize / metrics.responses.length / 1024).toFixed(2)}KB`);

  // Performance Grade
  console.log('\n🎯 PERFORMANCE GRADE');
  const grade =
    metrics.passed === metrics.total && metrics.responses.every(r => r.duration < 100)
      ? 'A+'
      : metrics.passed / metrics.total > 0.9 && metrics.responses.every(r => r.duration < 500)
        ? 'A'
        : metrics.passed / metrics.total > 0.8
          ? 'B'
          : 'C';

  const color = grade === 'A+' ? '🟢' : grade === 'A' ? '🟢' : grade === 'B' ? '🟡' : '🔴';
  console.log(`└─ ${color} Overall Grade: ${grade}\n`);

  process.exit(metrics.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
