/* eslint-disable no-unused-vars */
/**
 * @file phase11-loadtest.js
 * @description Phase 11 System Integration - Load Test Suite
 * Tests system performance under various load conditions
 */

const LoadTester = require('../services/loadTester');

async function runLoadTests() {
  const tester = new LoadTester('http://localhost:3001');

  try {
    console.log('\n' + '🎊'.repeat(30));
    console.log('  PHASE 11 - SYSTEM INTEGRATION LOAD TESTS');
    console.log('🎊'.repeat(30) + '\n');

    // Test 1: Dashboard Health Check (Basic Load)
    console.log('\n\n1️⃣  Test 1: Dashboard Health Check - Basic Load');
    console.log('━'.repeat(60));
    await tester.simulateConcurrentUsers(10, 20, '/api/dashboard/health');
    tester.displayMetrics();

    // Test 2: System Health (Moderate Load)
    console.log('\n\n2️⃣  Test 2: System Health - Moderate Load');
    console.log('━'.repeat(60));
    tester.resetMetrics();
    await tester.simulateConcurrentUsers(25, 15, '/api/dashboard/summary');
    tester.displayMetrics();

    // Test 3: Dashboard Services Status (High Load)
    console.log('\n\n3️⃣  Test 3: Services Status - High Load');
    console.log('━'.repeat(60));
    tester.resetMetrics();
    await tester.simulateConcurrentUsers(50, 10, '/api/dashboard/services');
    tester.displayMetrics();

    // Test 4: Performance Metrics
    console.log('\n\n4️⃣  Test 4: Performance Metrics');
    console.log('━'.repeat(60));
    tester.resetMetrics();
    await tester.simulateConcurrentUsers(30, 12, '/api/dashboard/performance');
    tester.displayMetrics();

    // Test 5: Stress Test - Gradual Load Increase
    console.log('\n\n5️⃣  Test 5: Stress Test - Gradual Load Increase');
    console.log('━'.repeat(60));
    tester.resetMetrics();
    const stressResults = await tester.stressTest(100, '/api/dashboard/health', 5);

    console.log('\n📊 Stress Test Results Summary:');
    stressResults.forEach(result => {
      console.log(
        `  Users: ${result.users} | Success: ${result.summary.successRate} | Throughput: ${result.summary.throughput}`
      );
    });

    // Test 6: Multiple Endpoints (Integration Test)
    console.log('\n\n6️⃣  Test 6: Multiple Endpoints Integration');
    console.log('━'.repeat(60));
    const endpoints = [
      { path: '/api/dashboard/health', method: 'GET', users: 5, requests: 10 },
      { path: '/api/dashboard/summary', method: 'GET', users: 5, requests: 10 },
      { path: '/api/dashboard/services', method: 'GET', users: 5, requests: 10 },
      { path: '/api/dashboard/performance', method: 'GET', users: 5, requests: 10 },
      { path: '/api/dashboard/integrations', method: 'GET', users: 5, requests: 10 },
    ];

    const endpointResults = await tester.testEndpoints(endpoints);

    // Summary
    console.log('\n\n' + '🎉'.repeat(30));
    console.log('  LOAD TEST SUMMARY');
    console.log('🎉'.repeat(30) + '\n');

    endpointResults.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.endpoint}`);
      console.log(`   ✅ Success Rate: ${result.summary.successRate}`);
      console.log(`   ⏱️  Avg Response: ${result.responseTimes.avg}ms`);
      console.log(`   🚀 Throughput: ${result.summary.throughput}`);
    });

    console.log('\n\n✨ All Phase 11 Load Tests Completed! ✨\n');
  } catch (error) {
    console.error('❌ Load Test Error:', error.message);
    process.exit(1);
  }
}

// Run tests
runLoadTests()
  .then(() => {
    console.log('\n✅ Phase 11 Load Testing Complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  });
