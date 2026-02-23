#!/usr/bin/env node

/**
 * 🚀 Performance Testing Script
 * Measures API response times before and after optimizations
 * @version 2.0.0
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const REQUESTS_PER_TEST = 50;
const CONCURRENT_REQUESTS = 5;

// Test scenarios
const ENDPOINTS = [
  { name: 'Health Check', method: 'GET', path: '/health', cache: false },
  { name: 'Get Users', method: 'GET', path: '/api/v1/users?limit=10', cache: true },
  { name: 'Get Departments', method: 'GET', path: '/api/v1/departments', cache: true },
  { name: 'Get Reports', method: 'GET', path: '/api/v1/reports?limit=20', cache: true },
];

// Results storage
let results = {
  startTime: null,
  endTime: null,
  tests: []
};

/**
 * Make HTTP request
 */
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const startTime = Date.now();

    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const cached = res.headers['x-cache'] === 'HIT';
        resolve({ status: res.statusCode, duration, cached, size: Buffer.byteLength(data) });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

/**
 * Run test for single endpoint
 */
const testEndpoint = async (endpoint) => {
  console.log(`\n📊 Testing: ${endpoint.name}`);
  const url = BASE_URL + endpoint.path;
  const times = [];
  const cacheHits = [];
  let successCount = 0;
  let errorCount = 0;

  // First request (warm up / first time)
  console.log('  ⏳ Warming up...');
  try {
    await makeRequest(url);
  } catch (err) {
    console.error('  ❌ Warmup failed:', err.message);
    return null;
  }

  // Run concurrent requests
  console.log(`  ⏳ Running ${REQUESTS_PER_TEST} requests...`);
  for (let i = 0; i < REQUESTS_PER_TEST; i += CONCURRENT_REQUESTS) {
    const promises = [];
    for (let j = 0; j < CONCURRENT_REQUESTS && i + j < REQUESTS_PER_TEST; j++) {
      promises.push(
        makeRequest(url)
          .then(result => {
            times.push(result.duration);
            cacheHits.push(result.cached);
            successCount++;
            return result;
          })
          .catch(err => {
            console.error(`    ❌ Request ${i + j + 1} failed:`, err.message);
            errorCount++;
          })
      );
    }
    await Promise.all(promises);
  }

  // Calculate statistics
  if (times.length === 0) {
    console.error('  ❌ No successful requests');
    return null;
  }

  const stats = {
    endpoint: endpoint.name,
    path: endpoint.path,
    requests: REQUESTS_PER_TEST,
    successful: successCount,
    failed: errorCount,
    min: Math.min(...times),
    max: Math.max(...times),
    avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
    p99: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)],
    cacheHitRate: Math.round((cacheHits.filter(h => h).length / times.length) * 100)
  };

  // Display results
  console.log('  ✅ Results:');
  console.log(`     Min: ${stats.min}ms | Max: ${stats.max}ms | Avg: ${stats.avg}ms`);
  console.log(`     Median: ${stats.median}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
  console.log(`     Cache Hit Rate: ${stats.cacheHitRate}%`);
  console.log(`     Success Rate: ${stats.successful}/${REQUESTS_PER_TEST}`);

  return stats;
};

/**
 * Run all tests
 */
const runPerformanceTest = async () => {
  console.log('\n🚀 AlAwael ERP - Performance Testing');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📊 Requests per endpoint: ${REQUESTS_PER_TEST}`);
  console.log(`⚡ Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log('================================================\n');

  results.startTime = Date.now();

  for (const endpoint of ENDPOINTS) {
    const stats = await testEndpoint(endpoint);
    if (stats) {
      results.tests.push(stats);
    }
  }

  results.endTime = Date.now();

  // Display summary
  console.log('\n\n📈 PERFORMANCE SUMMARY\n');
  console.log('Endpoint                    Avg(ms)  Median(ms)  P95(ms)  Cache Hit %');
  console.log('─────────────────────────────────────────────────────────────────────');

  for (const test of results.tests) {
    const name = test.endpoint.padEnd(24);
    const avg = test.avg.toString().padEnd(8);
    const median = test.median.toString().padEnd(10);
    const p95 = test.p95.toString().padEnd(8);
    const cache = `${test.cacheHitRate}%`;
    console.log(`${name} ${avg} ${median} ${p95} ${cache}`);
  }

  console.log('─────────────────────────────────────────────────────────────────────');

  // Overall statistics
  const avgResponseTime = Math.round(
    results.tests.reduce((sum, t) => sum + t.avg, 0) / results.tests.length
  );
  const totalRequests = results.tests.reduce((sum, t) => sum + t.requests, 0);
  const totalSuccessful = results.tests.reduce((sum, t) => sum + t.successful, 0);
  const averageCacheHit = Math.round(
    results.tests.reduce((sum, t) => sum + t.cacheHitRate, 0) / results.tests.length
  );

  console.log(`\n📊 Overall Metrics:`);
  console.log(`   Total Requests: ${totalRequests}`);
  console.log(`   Successful: ${totalSuccessful} (${Math.round((totalSuccessful / totalRequests) * 100)}%)`);
  console.log(`   Average Response Time: ${avgResponseTime}ms`);
  console.log(`   Average Cache Hit Rate: ${averageCacheHit}%`);
  console.log(`   Test Duration: ${results.endTime - results.startTime}ms`);

  // Performance assessment
  console.log(`\n✨ Performance Assessment:`);
  if (avgResponseTime < 50) {
    console.log(`   ✅ EXCELLENT: ${avgResponseTime}ms - Outstanding performance`);
  } else if (avgResponseTime < 100) {
    console.log(`   ✅ GOOD: ${avgResponseTime}ms - Above average performance`);
  } else if (avgResponseTime < 200) {
    console.log(`   ⚠️  FAIR: ${avgResponseTime}ms - Average performance`);
  } else {
    console.log(`   ❌ POOR: ${avgResponseTime}ms - Performance optimization needed`);
  }

  if (averageCacheHit < 50) {
    console.log(`   ⚠️  Cache Hit Rate: ${averageCacheHit}% - Consider checking cache strategy`);
  } else if (averageCacheHit < 70) {
    console.log(`   ✅ Cache Hit Rate: ${averageCacheHit}% - Good caching performance`);
  } else {
    console.log(`   ✅ Cache Hit Rate: ${averageCacheHit}% - Excellent caching performance`);
  }

  // Save results to file
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-test-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${filename}\n`);
};

// Run tests
runPerformanceTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
