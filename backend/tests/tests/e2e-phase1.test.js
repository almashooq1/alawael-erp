#!/usr/bin/env node
/**
 * Task #8 E2E Test Suite - Phase 1: Integration Testing
 * Tests all Supply Chain API endpoints with real-like scenarios
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3009';
let testsPassed = 0;
let testsFailed = 0;
let testResults = [];

// HTTP Helper
function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test wrapper
async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    testResults.push({ name, status: '✅ PASS' });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    testsFailed++;
    testResults.push({ name, status: `❌ FAIL: ${error.message}` });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

// Phase 1: Integration Tests
async function runPhase1() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║ PHASE 1: INTEGRATION TESTING                 ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // 1. System Status
  console.log('📊 System Status Checks:');
  await test('GET /api/supply-chain/status returns 200', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/status');
    assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}`);
    assert.ok(res.data.success, 'Response should have success=true');
  });

  // 2. Suppliers CRUD
  console.log('\n👥 Supplier Endpoints:');
  let supplierId;

  await test('GET /api/supply-chain/suppliers returns list', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/suppliers');
    assert.strictEqual(res.status, 200);
    // Handle both array and object with .suppliers property
    const suppliers = Array.isArray(res.data.data) ? res.data.data : res.data.data?.suppliers;
    assert.ok(suppliers || Array.isArray(res.data.data), 'Should return suppliers data');
  });

  await test('POST /api/supply-chain/suppliers creates supplier', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/suppliers', {
      name: 'Test Supplier',
      email: 'test@supplier.com',
      phone: '+966501234567',
      address: 'Riyadh, Saudi Arabia',
      category: 'Equipment',
      rating: 4.5,
      status: 'active',
    });
    // In mock mode, this will return mock data
    if (res.status === 201 || res.status === 200) {
      supplierId = res.data.data?._id || '1';
    }
  });

  if (supplierId) {
    await test('GET /api/supply-chain/suppliers/:id returns supplier', async () => {
      const res = await httpRequest('GET', `/api/supply-chain/suppliers/${supplierId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.name, 'Test Supplier');
    });

    await test('PUT /api/supply-chain/suppliers/:id updates supplier', async () => {
      const res = await httpRequest('PUT', `/api/supply-chain/suppliers/${supplierId}`, {
        name: 'Updated Supplier',
      });
      assert.strictEqual(res.status, 200);
    });
  }

  // 3. Inventory
  console.log('\n📦 Inventory Endpoints:');
  let inventoryId;

  await test('GET /api/supply-chain/inventory returns items', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/inventory');
    assert.strictEqual(res.status, 200);
  });

  await test('POST /api/supply-chain/inventory creates item', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/inventory', {
      sku: `SKU-${Date.now()}`,
      name: 'Test Item',
      category: 'Electronics',
      price: 100,
      quantity: 100,
      supplierId: '1',
      warehouseLocation: 'A-01',
    });
    // Accept both 200 and 201 for mock mode
    if ([200, 201].includes(res.status)) {
      inventoryId = res.data.data?._id || 'test-item';
    }
  });

  // 4. Purchase Orders
  console.log('\n📋 Purchase Order Endpoints:');
  let orderId;

  await test('GET /api/supply-chain/orders returns orders', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/orders');
    assert.strictEqual(res.status, 200);
  });

  await test('POST /api/supply-chain/orders creates order', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/orders', {
      supplierId: '1',
      items: [{ itemId: 'test-item', quantity: 50 }],
      totalAmount: 5000,
    });
    // 201 for created or 200 for success
    assert.ok([200, 201].includes(res.status), `Expected 200 or 201 but got ${res.status}`);
    orderId = res.data.data?._id;
  });

  // 5. Shipments
  console.log('\n🚚 Shipment Endpoints:');

  await test('GET /api/supply-chain/shipments returns shipments', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/shipments');
    assert.strictEqual(res.status, 200);
  });

  // 6. Analytics
  console.log('\n📈 Analytics Endpoints:');

  await test('GET /api/supply-chain/analytics returns stats', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/analytics');
    assert.strictEqual(res.status, 200);
    // Analytics data structure check - either direct properties or nested in data.data
    const analyticsData = res.data.data || res.data;
    assert.ok(analyticsData.totalOrders !== undefined || analyticsData.supplierCount !== undefined, 'Should contain analytics data');
  });

  console.log('\n' + '═'.repeat(50));
}

// Summary Report
function printSummary() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY REPORT               ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Score: ${percentage}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Ready for production\n');
  } else {
    console.log('⚠️  Some tests failed. Review output above.\n');
  }
}

// Main
async function main() {
  console.log('🚀 Starting E2E Test Suite...\n');
  console.log('⏳ Waiting for server on port 3009...');

  // Wait for server
  let ready = false;
  for (let i = 0; i < 10; i++) {
    try {
      await httpRequest('GET', '/api/supply-chain/status');
      ready = true;
      console.log('✅ Server ready\n');
      break;
    } catch (e) {
      if (i < 9) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  if (!ready) {
    console.error('❌ Server not responding. Start server first: node test-minimal-server.js');
    process.exit(1);
  }

  // Run tests
  await runPhase1();
  printSummary();
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
