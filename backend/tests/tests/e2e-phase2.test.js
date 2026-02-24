#!/usr/bin/env node
/**
 * Task #8 E2E Test Suite - Phase 2: Advanced Endpoint Validation
 * Tests endpoint validation, error handling, and edge cases
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

// Wait for server
async function waitForServer(maxAttempts = 30) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      await httpRequest('GET', '/api/supply-chain/status');
      return true;
    } catch (e) {
      attempts++;
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Server not ready after 6 seconds');
}

// Phase 2: Advanced Validation Tests
async function runPhase2() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║ PHASE 2: ADVANCED ENDPOINT VALIDATION        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // 1. SUPPLIER VALIDATION TESTS
  console.log('👥 Supplier Validation:');

  await test('POST /suppliers rejects empty name', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/suppliers', {
      name: '',
      email: 'test@test.com',
      phone: '+966501234567',
      address: 'Riyadh',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /suppliers rejects invalid email', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/suppliers', {
      name: 'Test Supplier',
      email: 'not-an-email',
      phone: '+966501234567',
      address: 'Riyadh',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /suppliers rejects missing phone', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/suppliers', {
      name: 'Test Supplier',
      email: 'test@test.com',
      address: 'Riyadh',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('GET /suppliers/:id with invalid ID returns 404', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/suppliers/invalid-id-xyz');
    assert.ok([400, 404].includes(res.status), `Expected 400/404 but got ${res.status}`);
  });

  // 2. INVENTORY VALIDATION TESTS
  console.log('\n📦 Inventory Validation:');

  await test('POST /inventory rejects missing required fields', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/inventory', {
      name: 'Test Item',
      // Missing sku, category, price, supplierId
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /inventory rejects invalid price (negative)', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/inventory', {
      sku: 'SKU-001',
      name: 'Test Item',
      category: 'Electronics',
      price: -100,
      supplierId: '1',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /inventory rejects invalid quantity (negative)', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/inventory', {
      sku: 'SKU-002',
      name: 'Test Item',
      category: 'Electronics',
      price: 100,
      quantity: -50,
      supplierId: '1',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('PATCH /inventory/:id with invalid ID returns 404/400', async () => {
    const res = await httpRequest('PATCH', '/api/supply-chain/inventory/invalid-id', {
      quantity: 100,
    });
    assert.ok([400, 404].includes(res.status), `Expected 400/404 but got ${res.status}`);
  });

  // 3. PURCHASE ORDER VALIDATION
  console.log('\n📋 Purchase Order Validation:');

  await test('POST /orders rejects missing supplierId', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/orders', {
      items: [{ itemId: 'test', quantity: 50 }],
      totalAmount: 5000,
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /orders rejects empty items array', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/orders', {
      supplierId: '1',
      items: [],
      totalAmount: 5000,
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /orders rejects missing totalAmount', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/orders', {
      supplierId: '1',
      items: [{ itemId: 'test', quantity: 50 }],
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /orders rejects invalid totalAmount (negative)', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/orders', {
      supplierId: '1',
      items: [{ itemId: 'test', quantity: 50 }],
      totalAmount: -1000,
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('GET /orders/:id with invalid ID returns 404/400', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/orders/invalid-id');
    assert.ok([400, 404].includes(res.status), `Expected 400/404 but got ${res.status}`);
  });

  // 4. SHIPMENT VALIDATION
  console.log('\n🚚 Shipment Validation:');

  await test('POST /shipments rejects missing orderId', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/shipments', {
      origin: 'Warehouse A',
      destination: 'Client B',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /shipments rejects missing origin', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/shipments', {
      orderId: '1',
      destination: 'Client B',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  await test('POST /shipments rejects missing destination', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/shipments', {
      orderId: '1',
      origin: 'Warehouse A',
    });
    assert.ok(res.status === 400, `Expected 400 but got ${res.status}`);
  });

  // 5. QUERY PARAMETER VALIDATION
  console.log('\n🔍 Query Parameter Validation:');

  await test('GET /suppliers with invalid limit parameter', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/suppliers?limit=not-a-number');
    // Should either use default or reject with 400
    assert.ok([200, 400].includes(res.status), `Expected 200 or 400 but got ${res.status}`);
  });

  await test('GET /inventory with invalid offset parameter', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/inventory?offset=negative');
    // Should either use default or reject with 400
    assert.ok([200, 400].includes(res.status), `Expected 200 or 400 but got ${res.status}`);
  });

  // 6. RESPONSE FORMAT VALIDATION
  console.log('\n📊 Response Format Validation:');

  await test('GET /suppliers response has proper structure', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/suppliers');
    assert.ok(res.data.success === true || res.data.data, 'Response should have proper structure');
    assert.ok(res.status === 200, `Expected 200 but got ${res.status}`);
  });

  await test('GET /orders response has proper structure', async () => {
    const res = await httpRequest('GET', '/api/supply-chain/orders');
    assert.ok(res.data.success === true || res.data.data, 'Response should have proper structure');
    assert.ok(res.status === 200, `Expected 200 but got ${res.status}`);
  });

  await test('POST responses include status/message properties', async () => {
    const res = await httpRequest('POST', '/api/supply-chain/suppliers', {
      name: 'Test Supplier',
      email: 'unique-' + Date.now() + '@test.com',
      phone: '+966501234567',
      address: 'Riyadh',
      category: 'Equipment',
      rating: 4.5,
    });
    // Response should have success or message property
    assert.ok(res.data.success !== undefined || res.data.message !== undefined, 'Response should include status indicator');
  });

  // 7. HTTP METHOD VALIDATION
  console.log('\n🌐 HTTP Method Validation:');

  await test('DELETE /suppliers/:id with invalid ID returns error', async () => {
    const res = await httpRequest('DELETE', '/api/supply-chain/suppliers/invalid-id');
    assert.ok([400, 404].includes(res.status), `Expected 400/404 but got ${res.status}`);
  });

  await test('DELETE /orders/:id with invalid ID returns error', async () => {
    const res = await httpRequest('DELETE', '/api/supply-chain/orders/invalid-id');
    assert.ok([400, 404].includes(res.status), `Expected 400/404 but got ${res.status}`);
  });

  console.log('\n' + '═'.repeat(50));
}

// Summary Report
function printSummary() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     PHASE 2 TEST SUMMARY REPORT              ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Score: ${percentage}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 PHASE 2 VALIDATION PASSED! Moving to Phase 3\n');
  } else {
    console.log('⚠️  Some validation tests failed. Review above.\n');
  }

  process.exit(testsFailed === 0 ? 0 : 1);
}

// Main execution
console.log('🚀 Starting Phase 2 Test Suite...\n');
console.log('⏳ Waiting for server on port 3009...');

waitForServer()
  .then(() => {
    console.log('✅ Server ready\n');
    return runPhase2();
  })
  .then(() => printSummary())
  .catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
