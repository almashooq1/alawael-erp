/**
 * Load Testing Script
 * اختبار الحمل والأداء تحت الضغط
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  host: 'localhost',
  port: 3002,
  endpoints: [
    { path: '/health', method: 'GET', name: 'Health Check' },
    { path: '/api/performance/health', method: 'GET', name: 'Performance Health' },
    { path: '/api/performance/metrics', method: 'GET', name: 'Performance Metrics' },
  ],
  concurrency: [1, 5, 10, 20], // عدد الطلبات المتزامنة
  requestsPerConcurrency: 10,
};

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  responseTimes: [],
  errors: [],
};

/**
 * Make HTTP request
 */
const makeRequest = endpoint => {
  return new Promise(resolve => {
    const startTime = performance.now();

    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'User-Agent': 'LoadTest/1.0',
        Accept: 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        stats.totalRequests++;
        stats.responseTimes.push(duration);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
          stats.errors.push({
            endpoint: endpoint.path,
            statusCode: res.statusCode,
            time: new Date().toISOString(),
          });
        }

        resolve({
          success: true,
          duration,
          statusCode: res.statusCode,
          endpoint: endpoint.path,
        });
      });
    });

    req.on('timeout', () => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push({
        endpoint: endpoint.path,
        error: 'Timeout',
        time: new Date().toISOString(),
      });
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.on('error', err => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push({
        endpoint: endpoint.path,
        error: err.message,
        time: new Date().toISOString(),
      });
      resolve({ success: false, error: err.message });
    });

    req.end();
  });
};

/**
 * Run concurrent requests
 */
const runConcurrentRequests = async (concurrency, endpoint) => {
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(makeRequest(endpoint));
  }
  return Promise.all(promises);
};

/**
 * Calculate statistics
 */
const calculateStats = () => {
  if (stats.responseTimes.length === 0) return null;

  const sorted = stats.responseTimes.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: Math.min(...sorted),
    max: Math.max(...sorted),
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
};

/**
 * Format output
 */
const formatTime = ms => `${ms.toFixed(2)}ms`;
const formatPercent = (val, total) => `${((val / total) * 100).toFixed(1)}%`;

/**
 * Run load tests
 */
const runLoadTests = async () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         🚀 LOAD TESTING - Almashooq Performance            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Configuration:`);
  console.log(`   Host: ${CONFIG.host}:${CONFIG.port}`);
  console.log(`   Endpoints: ${CONFIG.endpoints.length}`);
  console.log(`   Concurrency Levels: ${CONFIG.concurrency.join(', ')}`);
  console.log(`   Requests per Level: ${CONFIG.requestsPerConcurrency}\n`);

  const testStartTime = performance.now();

  // Test each endpoint
  for (const endpoint of CONFIG.endpoints) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📍 Testing: ${endpoint.name} (${endpoint.path})`);
    console.log(`${'─'.repeat(60)}`);

    // Test each concurrency level
    for (const concurrency of CONFIG.concurrency) {
      const endpointStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
      };

      // Run multiple sets of concurrent requests
      for (let i = 0; i < CONFIG.requestsPerConcurrency; i++) {
        const results = await runConcurrentRequests(concurrency, endpoint);
        results.forEach(result => {
          if (result.success) {
            endpointStats.successfulRequests++;
            endpointStats.responseTimes.push(result.duration);
          } else {
            endpointStats.failedRequests++;
          }
          endpointStats.totalRequests++;
        });
      }

      // Calculate stats for this concurrency level
      if (endpointStats.responseTimes.length > 0) {
        const sorted = endpointStats.responseTimes.sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];

        console.log(`\n   Concurrency: ${concurrency}`);
        console.log(
          `   ├─ Total: ${endpointStats.totalRequests} | Success: ${formatPercent(endpointStats.successfulRequests, endpointStats.totalRequests)}`,
        );
        console.log(`   ├─ Avg: ${formatTime(avg)} | Min: ${formatTime(min)} | Max: ${formatTime(max)}`);
        console.log(`   └─ P95: ${formatTime(p95)}`);
      }
    }
  }

  const testEndTime = performance.now();
  const totalTestTime = testEndTime - testStartTime;

  // Summary
  const calculatedStats = calculateStats();
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 OVERALL SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests} (${formatPercent(stats.successfulRequests, stats.totalRequests)})`);
  console.log(`Failed: ${stats.failedRequests} (${formatPercent(stats.failedRequests, stats.totalRequests)})`);
  console.log(`\nResponse Time Statistics:`);
  console.log(`  Avg: ${formatTime(calculatedStats.avg)}`);
  console.log(`  Min: ${formatTime(calculatedStats.min)}`);
  console.log(`  Max: ${formatTime(calculatedStats.max)}`);
  console.log(`  P95: ${formatTime(calculatedStats.p95)}`);
  console.log(`  P99: ${formatTime(calculatedStats.p99)}`);
  console.log(`\nTotal Test Duration: ${formatTime(totalTestTime)}`);

  // Performance Assessment
  console.log(`\n${'═'.repeat(60)}`);
  console.log('🎯 PERFORMANCE ASSESSMENT');
  console.log(`${'═'.repeat(60)}`);

  const assessment = {
    'Response Time': calculatedStats.avg < 100 ? '✅ Excellent' : calculatedStats.avg < 200 ? '✅ Good' : '⚠️ Needs Improvement',
    'Success Rate': stats.failedRequests === 0 ? '✅ Perfect' : '⚠️ Check Errors',
    'P95 Latency': calculatedStats.p95 < 150 ? '✅ Excellent' : calculatedStats.p95 < 300 ? '✅ Good' : '⚠️ Needs Improvement',
  };

  Object.entries(assessment).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  if (stats.errors.length > 0 && stats.errors.length <= 5) {
    console.log(`\n⚠️ Errors Detected (${stats.errors.length}):`);
    stats.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.endpoint}: ${err.error || `Status ${err.statusCode}`}`);
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ Load Testing Complete\n');

  process.exit(0);
};

// Start tests
runLoadTests().catch(err => {
  console.error('❌ Test Error:', err);
  process.exit(1);
});
