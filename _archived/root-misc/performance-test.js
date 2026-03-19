#!/usr/bin/env node

/**
 * Performance Testing Suite
 * Measures backend API performance under various loads
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const BACKEND_URL = 'http://localhost:3001';
const JWT_SECRET = 'your-secret-key';

// Generate test token
function generateTestToken() {
  const payload = {
    user_id: 'test-user-123',
    username: 'testuser',
    roles: ['admin', 'manager'],
    permissions: ['READ', 'WRITE', 'DELETE'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  return jwt.sign(payload, JWT_SECRET);
}

// Make HTTP request and measure time
function makeRequest(path, method = 'GET', token = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(path, BACKEND_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          duration: duration,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000);
    req.end();
  });
}

// Run performance tests
async function runPerformanceTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Performance & Load Testing Suite                              ║');
  console.log('║   Date: ' + new Date().toISOString().split('T')[0] + '                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const token = generateTestToken();
  const results = {
    rawData: [],
    summary: {}
  };

  // Test 1: Health Check Performance
  console.log('📊 Test 1: Health Check Performance (50 requests)');
  const healthTimes = [];
  for (let i = 0; i < 50; i++) {
    try {
      const result = await makeRequest('/health');
      healthTimes.push(result.duration);
      process.stdout.write('.');
    } catch (err) {
      console.error('\n  ❌ Error:', err.message);
    }
  }
  console.log(' ✅\n');
  
  const avgHealth = healthTimes.reduce((a, b) => a + b, 0) / healthTimes.length;
  const maxHealth = Math.max(...healthTimes);
  const minHealth = Math.min(...healthTimes);
  
  console.log(`  Average Response Time: ${avgHealth.toFixed(2)}ms`);
  console.log(`  Min Response Time: ${minHealth}ms`);
  console.log(`  Max Response Time: ${maxHealth}ms\n`);
  
  results.summary.healthCheck = { avg: avgHealth, min: minHealth, max: maxHealth };

  // Test 2: API Users Endpoint (with auth)
  console.log('📊 Test 2: Users Endpoint Performance (30 requests with auth)');
  const usersTimes = [];
  for (let i = 0; i < 30; i++) {
    try {
      const result = await makeRequest('/api/users', 'GET', token);
      usersTimes.push(result.duration);
      process.stdout.write('.');
    } catch (err) {
      console.error('\n  ❌ Error:', err.message);
    }
  }
  console.log(' ✅\n');

  const avgUsers = usersTimes.reduce((a, b) => a + b, 0) / usersTimes.length;
  const maxUsers = Math.max(...usersTimes);
  const minUsers = Math.min(...usersTimes);

  console.log(`  Average Response Time: ${avgUsers.toFixed(2)}ms`);
  console.log(`  Min Response Time: ${minUsers}ms`);
  console.log(`  Max Response Time: ${maxUsers}ms\n`);

  results.summary.usersEndpoint = { avg: avgUsers, min: minUsers, max: maxUsers };

  // Test 3: Burst Load Test
  console.log('📊 Test 3: Burst Load Test (20 concurrent requests)');
  const burstStart = Date.now();
  const burstPromises = [];
  for (let i = 0; i < 20; i++) {
    burstPromises.push(makeRequest('/api/health'));
  }
  
  try {
    const burstResults = await Promise.all(burstPromises);
    const burstDuration = Date.now() - burstStart;
    const burstTimes = burstResults.map(r => r.duration);
    const avgBurst = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;
    
    console.log(`  ✅ Completed 20 concurrent requests in ${burstDuration}ms`);
    console.log(`  Average Response Time: ${avgBurst.toFixed(2)}ms`);
    console.log(`  Requests/second: ${(20 / (burstDuration / 1000)).toFixed(2)}\n`);
    
    results.summary.burstLoad = {
      totalTime: burstDuration,
      concurrentRequests: 20,
      rps: (20 / (burstDuration / 1000)).toFixed(2)
    };
  } catch (err) {
    console.error(`  ❌ Burst test failed: ${err.message}\n`);
  }

  // Test 4: Sequential Load Test
  console.log('📊 Test 4: Sequential Load Test (100 requests)');
  const allTimes = [];
  const seqStart = Date.now();
  for (let i = 0; i < 100; i++) {
    try {
      const result = await makeRequest('/api/health');
      allTimes.push(result.duration);
      if ((i + 1) % 10 === 0) process.stdout.write('.');
    } catch (err) {
      console.error(`\n  ❌ Error at request ${i + 1}:`, err.message);
    }
  }
  const seqDuration = Date.now() - seqStart;
  console.log(' ✅\n');

  const avgSeq = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
  const p95Seq = allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length * 0.95)];
  const p99Seq = allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length * 0.99)];

  console.log(`  Total Time: ${seqDuration}ms`);
  console.log(`  Average Response Time: ${avgSeq.toFixed(2)}ms`);
  console.log(`  P95 Response Time: ${p95Seq}ms`);
  console.log(`  P99 Response Time: ${p99Seq}ms`);
  console.log(`  Requests/second: ${(100 / (seqDuration / 1000)).toFixed(2)}\n`);

  results.summary.sequentialLoad = {
    totalTime: seqDuration,
    avg: avgSeq,
    p95: p95Seq,
    p99: p99Seq,
    rps: (100 / (seqDuration / 1000)).toFixed(2)
  };

  // Summary Report
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   PERFORMANCE TEST SUMMARY                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('🟢 Health Check Endpoint:');
  console.log(`   Average: ${results.summary.healthCheck.avg.toFixed(2)}ms`);
  console.log(`   Range: ${results.summary.healthCheck.min}-${results.summary.healthCheck.max}ms\n`);

  console.log('🟢 Users Endpoint (with auth):');
  console.log(`   Average: ${results.summary.usersEndpoint.avg.toFixed(2)}ms`);
  console.log(`   Range: ${results.summary.usersEndpoint.min}-${results.summary.usersEndpoint.max}ms\n`);

  console.log('🟢 Burst Performance (20 concurrent):');
  console.log(`   Total Time: ${results.summary.burstLoad.totalTime}ms`);
  console.log(`   Throughput: ${results.summary.burstLoad.rps} req/s\n`);

  console.log('🟢 Sequential Load (100 requests):');
  console.log(`   Total Time: ${results.summary.sequentialLoad.totalTime}ms`);
  console.log(`   Average: ${results.summary.sequentialLoad.avg.toFixed(2)}ms`);
  console.log(`   P95: ${results.summary.sequentialLoad.p95}ms`);
  console.log(`   P99: ${results.summary.sequentialLoad.p99}ms`);
  console.log(`   Throughput: ${results.summary.sequentialLoad.rps} req/s\n`);

  // Performance Assessment
  console.log('📈 Performance Assessment:\n');
  if (avgHealth < 50) {
    console.log('   ✅ Health endpoint: EXCELLENT (<50ms)');
  } else if (avgHealth < 100) {
    console.log('   ✅ Health endpoint: GOOD (50-100ms)');
  } else {
    console.log('   ⚠️  Health endpoint: NEEDS OPTIMIZATION (>100ms)');
  }

  if (avgUsers < 200) {
    console.log('   ✅ Users endpoint: EXCELLENT (<200ms)');
  } else if (avgUsers < 500) {
    console.log('   ✅ Users endpoint: GOOD (200-500ms)');
  } else {
    console.log('   ⚠️  Users endpoint: NEEDS OPTIMIZATION (>500ms)');
  }

  if (results.summary.sequentialLoad.rps > 50) {
    console.log('   ✅ Throughput: EXCELLENT (>50 req/s)');
  } else if (results.summary.sequentialLoad.rps > 20) {
    console.log('   ✅ Throughput: GOOD (20-50 req/s)');
  } else {
    console.log('   ⚠️  Throughput: NEEDS OPTIMIZATION (<20 req/s)');
  }

  if (p95Seq < 200) {
    console.log('   ✅ Consistency: EXCELLENT (P95 <200ms)');
  } else if (p95Seq < 500) {
    console.log('   ✅ Consistency: GOOD (P95 200-500ms)');
  } else {
    console.log('   ⚠️  Consistency: NEEDS OPTIMIZATION (P95 >500ms)');
  }

  console.log('\n✨ Performance test completed successfully!\n');
  
  return results;
}

// Run tests
runPerformanceTests().catch(err => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
