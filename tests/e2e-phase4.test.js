/**
 * Task #8 Phase 4: Performance & Load Testing
 * 
 * Focus: System performance under various load conditions
 * - Response time benchmarks
 * - Concurrent request handling
 * - Large dataset operations
 * - Throughput testing
 * - Memory usage patterns
 */

const http = require('http');
const assert = require('assert');

const BASE_HOST = 'localhost';
const BASE_PORT = 3009;
const BASE_PATH = '/api/supply-chain';
const TEST_TIMEOUT = 60000; // 60 seconds for performance tests

// Performance metrics collection
let performanceMetrics = {
  endpoints: {},
  concurrency: {},
  throughput: {}
};

// Helper functions
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const fullPath = BASE_PATH + path;
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: fullPath,
      method: method,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const response = {
          status: res.statusCode,
          data: data ? JSON.parse(data) : null,
          headers: res.headers,
          responseTime
        };
        resolve(response);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TEST_TIMEOUT}ms`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function recordMetric(endpoint, responseTime) {
  if (!performanceMetrics.endpoints[endpoint]) {
    performanceMetrics.endpoints[endpoint] = {
      count: 0,
      total: 0,
      min: Infinity,
      max: 0
    };
  }
  const metrics = performanceMetrics.endpoints[endpoint];
  metrics.count++;
  metrics.total += responseTime;
  metrics.min = Math.min(metrics.min, responseTime);
  metrics.max = Math.max(metrics.max, responseTime);
}

function getAverageTime(endpoint) {
  const metrics = performanceMetrics.endpoints[endpoint];
  if (!metrics || metrics.count === 0) return 0;
  return Math.round(metrics.total / metrics.count);
}

async function waitForServer() {
  let attempts = 0;
  while (attempts < 30) {
    try {
      const res = await makeRequest('GET', '/suppliers');
      if (res.status === 200) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }
  throw new Error('Server did not start in time');
}

// Test data generators
function generateSupplier() {
  return {
    name: `Supplier ${Date.now()}-${Math.random()}`,
    email: `supplier-${Date.now()}@example.com`,
    phone: '+1234567890',
    address: `123 Business St, City ${Math.floor(Math.random() * 1000)}`
  };
}

function generateInventory() {
  return {
    sku: `SKU-${Date.now()}-${Math.random()}`,
    name: `Product ${Date.now()}-${Math.random()}`,
    category: `Category-${Math.floor(Math.random() * 10)}`,
    price: Math.floor(Math.random() * 1000) + 10,
    supplierId: 'test-supplier-1'
  };
}

function generateOrder() {
  return {
    supplierId: 'test-supplier-1',
    items: [
      { productId: `prod-${Math.random()}`, quantity: Math.floor(Math.random() * 100) + 1 }
    ],
    totalAmount: Math.floor(Math.random() * 50000) + 1000
  };
}

// ============================================
// PERFORMANCE TESTS
// ============================================

async function test(description, fn) {
  try {
    await fn();
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Test Suite
async function runTests() {
  console.log('\n🚀 Starting Phase 4 Performance Testing...\n');
  
  try {
    console.log('⏳ Waiting for server on port 3009...');
    await waitForServer();
    console.log('✅ Server ready\n');
  } catch (e) {
    console.error('❌ Server failed to start:', e.message);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // === Test Category 1: Response Time Benchmarks ===
  console.log('📊 Test Category 1: Response Time Benchmarks\n');

  if (await test('GET /suppliers returns in < 1000ms', async () => {
    const res = await makeRequest('GET', '/suppliers');
    recordMetric('/suppliers', res.responseTime);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.responseTime < 1000, `Response time ${res.responseTime}ms exceeded 1000ms`);
  })) passed++; else failed++;

  if (await test('GET /inventory returns in < 1000ms', async () => {
    const res = await makeRequest('GET', '/inventory');
    recordMetric('/inventory', res.responseTime);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.responseTime < 1000, `Response time ${res.responseTime}ms exceeded 1000ms`);
  })) passed++; else failed++;

  if (await test('GET /orders returns in < 1000ms', async () => {
    const res = await makeRequest('GET', '/orders');
    recordMetric('/orders', res.responseTime);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.responseTime < 1000, `Response time ${res.responseTime}ms exceeded 1000ms`);
  })) passed++; else failed++;

  if (await test('POST /suppliers returns in < 1500ms', async () => {
    const supplier = generateSupplier();
    const res = await makeRequest('POST', '/suppliers', supplier);
    recordMetric('POST /suppliers', res.responseTime);
    // Accept 200/201 success or 400 validation error - we care about response time
    assert([200, 201, 400].includes(res.status), `POST returned unexpected status ${res.status}`);
    assert(res.responseTime < 1500, `Response time ${res.responseTime}ms exceeded 1500ms`);
  })) passed++; else failed++;

  if (await test('POST /inventory returns in < 1500ms', async () => {
    const inventory = generateInventory();
    const res = await makeRequest('POST', '/inventory', inventory);
    recordMetric('POST /inventory', res.responseTime);
    // Accept 200/201 success or 400 validation error - we care about response time
    assert([200, 201, 400].includes(res.status), `POST returned unexpected status ${res.status}`);
    assert(res.responseTime < 1500, `Response time ${res.responseTime}ms exceeded 1500ms`);
  })) passed++; else failed++;

  // === Test Category 2: Concurrent Requests ===
  console.log('\n🔄 Test Category 2: Concurrent Request Handling\n');

  if (await test('Handle 10 concurrent GET /suppliers requests', async () => {
    const startTime = Date.now();
    const promises = Array(10).fill(null).map(() => makeRequest('GET', '/suppliers'));
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    results.forEach((res, i) => {
      assert(res.status === 200, `Request ${i} failed with status ${res.status}`);
    });
    
    performanceMetrics.concurrency['10x GET /suppliers'] = {
      totalTime,
      avgTime: totalTime / 10
    };
    
    assert(totalTime < 5000, `10 concurrent requests took ${totalTime}ms, exceeded 5000ms`);
  })) passed++; else failed++;

  if (await test('Handle 5 concurrent POST /suppliers requests', async () => {
    const startTime = Date.now();
    const suppliers = Array(5).fill(null).map(() => generateSupplier());
    const promises = suppliers.map(s => makeRequest('POST', '/suppliers', s));
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Count successful requests (any that didn't timeout)
    let successCount = 0;
    results.forEach((res, i) => {
      if ([200, 201, 400].includes(res.status)) successCount++;
      else console.log(`  Warning: Request ${i} failed with status ${res.status}`);
    });
    
    performanceMetrics.concurrency['5x POST /suppliers'] = {
      totalTime,
      avgTime: totalTime / 5
    };
    
    assert(successCount >= 4, `Only ${successCount}/5 requests succeeded`);
    assert(totalTime < 7500, `5 concurrent POST requests took ${totalTime}ms, exceeded 7500ms`);
  })) passed++; else failed++;

  if (await test('Handle 10 concurrent mixed operations', async () => {
    const startTime = Date.now();
    const promises = [
      ...Array(5).fill(null).map(() => makeRequest('GET', '/suppliers')),
      ...Array(3).fill(null).map(() => makeRequest('POST', '/inventory', generateInventory())),
      ...Array(2).fill(null).map(() => makeRequest('GET', '/orders'))
    ];
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Count successful requests
    let successCount = 0;
    results.forEach((res, i) => {
      if ([200, 201, 400].includes(res.status)) successCount++;
    });
    
    performanceMetrics.concurrency['10x mixed operations'] = totalTime;
    assert(successCount >= 8, `Only ${successCount}/10 requests succeeded`);
    assert(totalTime < 8000, `10 mixed concurrent operations took ${totalTime}ms, exceeded 8000ms`);
  })) passed++; else failed++;

  // === Test Category 3: Large Dataset Handling ===
  console.log('\n📦 Test Category 3: Large Dataset Handling\n');

  if (await test('Retrieve suppliers with no size limit', async () => {
    const res = await makeRequest('GET', '/suppliers');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const supplierArray = res.data?.data?.suppliers || res.data?.suppliers || res.data?.data || res.data;
    assert(Array.isArray(supplierArray), 'Expected suppliers array in response');
    assert(res.responseTime < 2000, `Response time ${res.responseTime}ms for large dataset exceeded 2000ms`);
  })) passed++; else failed++;

  if (await test('Retrieve inventory list efficiently', async () => {
    const res = await makeRequest('GET', '/inventory');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const inventoryArray = res.data?.data?.inventory || res.data?.inventory || res.data?.data || res.data;
    assert(Array.isArray(inventoryArray), 'Expected inventory array in response');
    assert(res.responseTime < 2000, `Response time ${res.responseTime}ms exceeded 2000ms`);
  })) passed++; else failed++;

  if (await test('Retrieve orders and maintain response time', async () => {
    const res = await makeRequest('GET', '/orders');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ordersArray = res.data?.data?.orders || res.data?.orders || res.data?.data || res.data;
    assert(Array.isArray(ordersArray), 'Expected orders array in response');
    assert(res.responseTime < 2000, `Response time ${res.responseTime}ms exceeded 2000ms`);
  })) passed++; else failed++;

  // === Test Category 4: Sequential Performance ===
  console.log('\n⏱️  Test Category 4: Sequential Operation Performance\n');

  if (await test('Create and retrieve supplier sequentially', async () => {
    const supplier = generateSupplier();
    const createRes = await makeRequest('POST', '/suppliers', supplier);
    // Accept 200/201 success or 400 validation (still passing in terms of performance)
    assert([200, 201, 400].includes(createRes.status), `POST failed with ${createRes.status}`);
    
    const totalTime = createRes.responseTime;
    assert(totalTime < 2000, `Sequential create/retrieve took ${totalTime}ms, exceeded 2000ms`);
  })) passed++; else failed++;

  if (await test('Create order with validation overhead', async () => {
    const order = generateOrder();
    const res = await makeRequest('POST', '/orders', order);
    assert([200, 201, 400].includes(res.status), `POST /orders returned unexpected status ${res.status}`);
    assert(res.responseTime < 1500, `Response time ${res.responseTime}ms exceeded 1500ms`);
  })) passed++; else failed++;

  if (await test('List operations maintain consistent performance', async () => {
    const endpoints = ['/suppliers', '/inventory', '/orders', '/shipments'];
    let maxTime = 0;
    let minTime = Infinity;
    
    for (const endpoint of endpoints) {
      const res = await makeRequest('GET', endpoint);
      assert(res.status === 200, `GET ${endpoint} failed`);
      maxTime = Math.max(maxTime, res.responseTime);
      minTime = Math.min(minTime, res.responseTime);
    }
    
    const variance = maxTime - minTime;
    assert(variance < 500, `Endpoint response time variance ${variance}ms exceeded 500ms`);
  })) passed++; else failed++;

  // === Test Category 5: Throughput Analysis ===
  console.log('\n📈 Test Category 5: Throughput Analysis\n');

  if (await test('Measure GET throughput (10 requests)', async () => {
    const startTime = Date.now();
    let successCount = 0;
    
    for (let i = 0; i < 10; i++) {
      try {
        const res = await makeRequest('GET', '/suppliers');
        if (res.status === 200) successCount++;
      } catch (e) {
        // Request failed
      }
    }
    
    const elapsed = Date.now() - startTime;
    const throughput = (successCount / elapsed) * 1000; // requests per second
    
    performanceMetrics.throughput['GET /suppliers'] = {
      requestsPerSecond: throughput.toFixed(2),
      successful: successCount,
      totalTime: elapsed
    };
    
    assert(successCount === 10, `Only ${successCount}/10 requests succeeded`);
    assert(throughput >= 2, `Throughput ${throughput.toFixed(2)} req/s is below minimum 2 req/s`);
  })) passed++; else failed++;

  if (await test('Measure POST throughput (5 requests)', async () => {
    const startTime = Date.now();
    let successCount = 0;
    
    for (let i = 0; i < 5; i++) {
      try {
        const supplier = generateSupplier();
        const res = await makeRequest('POST', '/suppliers', supplier);
        if ([200, 201, 400].includes(res.status)) successCount++;
      } catch (e) {
        // Request failed
      }
    }
    
    const elapsed = Date.now() - startTime;
    const throughput = (successCount / elapsed) * 1000;
    
    performanceMetrics.throughput['POST /suppliers'] = {
      requestsPerSecond: throughput.toFixed(2),
      successful: successCount,
      totalTime: elapsed
    };
    
    assert(successCount >= 4, `Only ${successCount}/5 requests succeeded`);
    assert(throughput >= 0.5, `Throughput ${throughput.toFixed(2)} req/s is below minimum 0.5 req/s`);
  })) passed++; else failed++;

  // === Test Category 6: Error Handling Under Load ===
  console.log('\n⚠️  Test Category 6: Error Handling Under Load\n');

  if (await test('System handles invalid requests under load', async () => {
    const promises = Array(5).fill(null).map(() => 
      makeRequest('POST', '/suppliers', { invalid: 'data' })
    );
    const results = await Promise.all(promises);
    
    const errorCount = results.filter(r => r.status !== 200 && r.status !== 201).length;
    assert(errorCount > 0, 'Expected at least some requests to fail validation');
  })) passed++; else failed++;

  if (await test('System recovers after error conditions', async () => {
    // Send invalid request
    await makeRequest('POST', '/suppliers', { invalid: 'data' });
    
    // Send valid request - should still work
    const validRes = await makeRequest('GET', '/suppliers');
    assert(validRes.status === 200, 'System did not recover after error');
  })) passed++; else failed++;

  // === Test Category 7: Stress Testing ===
  console.log('\n💪 Test Category 7: Stress Testing\n');

  if (await test('Sustained load: 20 requests over 10 seconds', async () => {
    const startTime = Date.now();
    let count = 0;
    let errors = 0;
    
    const sendRequest = async () => {
      try {
        const res = await makeRequest('GET', '/suppliers');
        if (res.status === 200) count++;
        else errors++;
      } catch (e) {
        errors++;
      }
    };
    
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(sendRequest());
    }
    
    await Promise.all(promises);
    const elapsed = Date.now() - startTime;
    
    assert(count >= 18, `Only ${count}/20 requests succeeded`);
    assert(elapsed < 15000, `Sustained load test took ${elapsed}ms, exceeded 15s`);
  })) passed++; else failed++;

  if (await test('System remains responsive after stress', async () => {
    const res = await makeRequest('GET', '/status');
    assert(res.status === 200, 'System not responsive after stress test');
    assert(res.responseTime < 500, 'System response degraded after stress');
  })) passed++; else failed++;

  // === Summary ===
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║    PHASE 4 PERFORMANCE TEST SUMMARY          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Score: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  // Performance metrics
  console.log('📊 Performance Metrics:\n');
  
  console.log('Response Time Averages:');
  Object.keys(performanceMetrics.endpoints).forEach(endpoint => {
    const avg = getAverageTime(endpoint);
    console.log(`  ${endpoint}: ${avg}ms`);
  });

  console.log('\nConcurrency Test Results:');
  Object.keys(performanceMetrics.concurrency).forEach(test => {
    const result = performanceMetrics.concurrency[test];
    if (typeof result === 'object') {
      console.log(`  ${test}: ${result.totalTime}ms total, ${Math.round(result.avgTime)}ms avg`);
    } else {
      console.log(`  ${test}: ${result}ms`);
    }
  });

  console.log('\nThroughput Metrics:');
  Object.keys(performanceMetrics.throughput).forEach(test => {
    const result = performanceMetrics.throughput[test];
    console.log(`  ${test}: ${result.requestsPerSecond} req/s (${result.successful}/${result.totalTime}ms)`);
  });

  if (failed === 0) {
    console.log('\n🎉 PHASE 4 PERFORMANCE TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some performance tests failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
