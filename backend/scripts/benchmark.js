/**
 * API Performance Benchmark
 * قياس أداء الـ API
 *
 * ✅ قياس أداء الـ Endpoints الرئيسية
 * ✅ تقارير الأداء والاختناقات
 * ✅ مقارنة الأداء (مع/بدون caching)
 */

const axios = require('axios');
const Table = require('cli-table3');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const REQUESTS_PER_ENDPOINT = process.env.BENCH_REQUESTS || 10;

// Endpoints to benchmark
const ENDPOINTS = [
  {
    name: 'Get All Vehicles',
    method: 'GET',
    url: '/vehicles',
    cacheable: true,
    timeout: 5000,
  },
  {
    name: 'Get Vehicle by ID',
    method: 'GET',
    url: '/vehicles/507f1f77bcf86cd799439011',
    cacheable: true,
    timeout: 5000,
  },
  {
    name: 'Get Compliance Report',
    method: 'GET',
    url: '/saudi-compliance/report/507f1f77bcf86cd799439011',
    cacheable: true,
    timeout: 5000,
  },
  {
    name: 'Get Fleet Compliance',
    method: 'GET',
    url: '/saudi-compliance/fleet-report',
    cacheable: true,
    timeout: 10000,
  },
  {
    name: 'Get Inspection Schedule',
    method: 'GET',
    url: '/saudi-compliance/inspection-schedule',
    cacheable: true,
    timeout: 10000,
  },
  {
    name: 'Get Performance Metrics',
    method: 'GET',
    url: '/performance/metrics',
    cacheable: false,
    timeout: 5000,
  },
];

// Results storage
const results = {
  totalRequests: 0,
  totalTime: 0,
  slowRequests: [],
  endpoints: {},
};

/**
 * Make a single request and measure response time
 */
async function makeRequest(endpoint, requestNumber = 1) {
  const startTime = Date.now();
  const fullUrl = `${API_BASE_URL}${endpoint.url}`;

  try {
    const response = await axios.get(fullUrl, {
      timeout: endpoint.timeout,
      headers: {
        'X-Request-Number': requestNumber,
        'X-Benchmark': 'true',
      },
    });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      responseTime,
      status: response.status,
      cached: response.headers['x-cache'] || 'N/A',
      size: JSON.stringify(response.data).length,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      responseTime,
      error: error.message,
      cached: 'ERROR',
    };
  }
}

/**
 * Benchmark a single endpoint
 */
async function benchmarkEndpoint(endpoint, requestCount) {
  console.log(`\n📊 Benchmarking: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.url}`);

  const responses = [];

  // First request (cold cache)
  console.log(`   🔹 Cold Cache Request...`);
  const coldResponse = await makeRequest(endpoint, 1);
  responses.push({ ...coldResponse, request: 1, type: 'cold' });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Warm cache requests
  for (let i = 2; i <= requestCount; i++) {
    const response = await makeRequest(endpoint, i);
    responses.push({ ...response, request: i, type: i === 2 ? 'warm' : 'cached' });

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Calculate stats
  const successfulResponses = responses.filter(r => r.success);
  const failedResponses = responses.filter(r => !r.success);

  const avgTime = successfulResponses.length
    ? (successfulResponses.reduce((sum, r) => sum + r.responseTime, 0) / successfulResponses.length).toFixed(2)
    : 'N/A';

  const minTime = successfulResponses.length ? Math.min(...successfulResponses.map(r => r.responseTime)) : 'N/A';

  const maxTime = successfulResponses.length ? Math.max(...successfulResponses.map(r => r.responseTime)) : 'N/A';

  const slowCount = successfulResponses.filter(r => r.responseTime > 1000).length;

  // Store results
  results.endpoints[endpoint.name] = {
    avgTime,
    minTime,
    maxTime,
    successCount: successfulResponses.length,
    failureCount: failedResponses.length,
    slowCount,
    responses,
  };

  results.totalRequests += requestCount;
  results.totalTime += successfulResponses.reduce((sum, r) => sum + r.responseTime, 0);

  if (slowCount > 0) {
    results.slowRequests.push({
      endpoint: endpoint.name,
      slowCount,
      avgSlowTime: (successfulResponses.filter(r => r.responseTime > 1000).reduce((sum, r) => sum + r.responseTime, 0) / slowCount).toFixed(
        2,
      ),
    });
  }

  // Display results
  console.log(`   ✅ Success: ${successfulResponses.length}/${requestCount}`);
  console.log(`   ⏱️  Avg Time: ${avgTime}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);

  if (slowCount > 0) {
    console.log(`   ⚠️  Slow Requests: ${slowCount} (>1000ms)`);
  }

  return results.endpoints[endpoint.name];
}

/**
 * Generate performance report
 */
function generateReport() {
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    📊 PERFORMANCE BENCHMARK REPORT');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Summary Table
  const summaryTable = new Table({
    head: ['Metric', 'Value'],
    style: { head: ['cyan'], border: ['grey'] },
  });

  summaryTable.push(
    ['Total Requests', results.totalRequests],
    ['Total Time', `${results.totalTime}ms`],
    ['Average Response Time', `${(results.totalTime / results.totalRequests).toFixed(2)}ms`],
    ['Slow Requests (>1000ms)', results.slowRequests.length],
  );

  console.log('📈 Summary:');
  console.log(summaryTable.toString());

  // Endpoints Table
  console.log('\n\n📊 Endpoint Details:\n');
  const endpointsTable = new Table({
    head: ['Endpoint', 'Avg (ms)', 'Min (ms)', 'Max (ms)', 'Success', 'Failed', 'Slow'],
    style: { head: ['cyan'], border: ['grey'] },
  });

  Object.entries(results.endpoints).forEach(([name, stats]) => {
    endpointsTable.push([
      name.substring(0, 30),
      stats.avgTime,
      stats.minTime,
      stats.maxTime,
      stats.successCount,
      stats.failureCount,
      stats.slowCount,
    ]);
  });

  console.log(endpointsTable.toString());

  // Slow Requests Report
  if (results.slowRequests.length > 0) {
    console.log('\n\n⚠️  Slow Requests Analysis:\n');
    const slowTable = new Table({
      head: ['Endpoint', 'Count', 'Avg Time (ms)'],
      style: { head: ['red'], border: ['grey'] },
    });

    results.slowRequests.forEach(item => {
      slowTable.push([item.endpoint, item.slowCount, item.avgSlowTime]);
    });

    console.log(slowTable.toString());
  }

  // Recommendations
  console.log('\n\n💡 Recommendations:\n');

  const recommendations = [];

  // Check for slow endpoints
  Object.entries(results.endpoints).forEach(([name, stats]) => {
    if (parseFloat(stats.avgTime) > 500) {
      recommendations.push(`  • ${name}: High average response time (${stats.avgTime}ms). Consider adding caching or optimization.`);
    }
  });

  // Check for failures
  Object.entries(results.endpoints).forEach(([name, stats]) => {
    if (stats.failureCount > 0) {
      recommendations.push(`  • ${name}: ${stats.failureCount} failed requests. Check error handling and timeouts.`);
    }
  });

  if (recommendations.length === 0) {
    console.log('  ✅ All endpoints performing well!');
  } else {
    recommendations.forEach(rec => console.log(rec));
  }

  console.log('\n═══════════════════════════════════════════════════════════════════\n');
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
  console.log('\n🚀 Starting API Performance Benchmark...\n');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`📊 Requests per Endpoint: ${REQUESTS_PER_ENDPOINT}\n`);

  for (const endpoint of ENDPOINTS) {
    try {
      await benchmarkEndpoint(endpoint, parseInt(REQUESTS_PER_ENDPOINT));
    } catch (error) {
      console.error(`❌ Error benchmarking ${endpoint.name}:`, error.message);
    }
  }

  generateReport();
}

// Run benchmark
runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
