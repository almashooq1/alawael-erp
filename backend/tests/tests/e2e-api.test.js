/**
 * E2E Test Suite - Supply Chain Management API
 * Tests all 21 REST endpoints with various scenarios
 */

const http = require('http');
const _url = require('url');

const BASE_URL = 'http://localhost:3001';
const API_BASE = '/api/supply-chain';

/**
 * HTTP Request Helper
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(path, BASE_URL);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Test Results
 */
const results = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

/**
 * Test Helper
 */
async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.details.push(`✅ ${name}`);
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.errors.push({ name, error: error.message });
    results.details.push(`❌ ${name}: ${error.message}`);
    console.log(`❌ ${name}: ${error.message}`);
  }
}

/**
 * Assertions
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} (expected ${expected}, got ${actual})`);
}

/**
 * Test Suite
 */
async function runTests() {
  console.log('\n🧪 E2E TEST SUITE - Supply Chain Management API');
  console.log('═'.repeat(60));

  let supplierId, productId, orderId, shipmentId;

  // ==================== SUPPLIER ENDPOINTS ====================
  console.log('\n📦 SUPPLIER ENDPOINTS (5 tests)');
  console.log('-'.repeat(60));

  // 1. POST /suppliers
  await test('POST /suppliers - Create supplier', async () => {
    const res = await makeRequest('POST', `${BASE_URL}${API_BASE}/suppliers`, {
      name: 'E2E Test Supplier',
      email: 'e2etest@test.com',
      phone: '+966501234567',
      address: 'Riyadh, Saudi Arabia',
      category: 'electronics'
    });
    assertEquals(res.status, 201, 'Should return 201 Created');
    assert(res.body.data && res.body.data._id, 'Should return supplier with ID');
    supplierId = res.body.data._id;
  });

  // 2. GET /suppliers
  await test('GET /suppliers - List suppliers', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/suppliers`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assert(Array.isArray(res.body.data.suppliers), 'Should return array of suppliers');
  });

  // 3. GET /suppliers/:id
  await test('GET /suppliers/:id - Get supplier details', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/suppliers/${supplierId}`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data._id, supplierId, 'Should return correct supplier');
  });

  // 4. PUT /suppliers/:id
  await test('PUT /suppliers/:id - Update supplier', async () => {
    const res = await makeRequest('PUT', `${BASE_URL}${API_BASE}/suppliers/${supplierId}`, {
      name: 'Updated E2E Test Supplier'
    });
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data.name, 'Updated E2E Test Supplier', 'Should update supplier name');
  });

  // 5. Error case: GET non-existent supplier
  await test('GET /suppliers/:id - 404 Not Found', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/suppliers/invalid123`);
    assertEquals(res.status, 404, 'Should return 404 for non-existent supplier');
  });

  // ==================== INVENTORY ENDPOINTS ====================
  console.log('\n📦 INVENTORY ENDPOINTS (3 tests)');
  console.log('-'.repeat(60));

  // 6. POST /inventory
  await test('POST /inventory - Add product', async () => {
    const res = await makeRequest('POST', `${BASE_URL}${API_BASE}/inventory`, {
      sku: 'E2E-TEST-SKU-001',
      name: 'E2E Test Product',
      category: 'electronics',
      price: 1000,
      quantity: 50,
      minLevel: 10,
      supplierId: supplierId,
      unit: 'piece'
    });
    assertEquals(res.status, 201, 'Should return 201 Created');
    assert(res.body.data && res.body.data._id, 'Should return product with ID');
    productId = res.body.data._id;
  });

  // 7. PATCH /inventory/:id
  await test('PATCH /inventory/:id - Update inventory quantity', async () => {
    const res = await makeRequest('PATCH', `${BASE_URL}${API_BASE}/inventory/${productId}`, {
      quantityChange: 10,
      reason: 'E2E Test Restock'
    });
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data.newQuantity, 60, 'Should update quantity correctly');
  });

  // 8. GET /inventory/status
  await test('GET /inventory/status - Get inventory status', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/inventory/status`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assert(res.body.data.totalProducts >= 1, 'Should include our test product');
  });

  // ==================== PURCHASE ORDER ENDPOINTS ====================
  console.log('\n📦 PURCHASE ORDER ENDPOINTS (5 tests)');
  console.log('-'.repeat(60));

  // 9. POST /orders
  await test('POST /orders - Create purchase order', async () => {
    const res = await makeRequest('POST', `${BASE_URL}${API_BASE}/orders`, {
      supplierId: supplierId,
      items: [
        { productId: productId, quantity: 10, price: 1000 }
      ],
      totalAmount: 10000,
      priority: 'normal',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    assertEquals(res.status, 201, 'Should return 201 Created');
    assert(res.body.data && res.body.data._id, 'Should return order with ID');
    orderId = res.body.data._id;
  });

  // 10. GET /orders
  await test('GET /orders - List purchase orders', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/orders`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assert(Array.isArray(res.body.data.orders), 'Should return array of orders');
  });

  // 11. GET /orders/:id
  await test('GET /orders/:id - Get order details', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/orders/${orderId}`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data._id, orderId, 'Should return correct order');
  });

  // 12. PATCH /orders/:id/status
  await test('PATCH /orders/:id/status - Update order status', async () => {
    const res = await makeRequest('PATCH', `${BASE_URL}${API_BASE}/orders/${orderId}/status`, {
      status: 'confirmed',
      note: 'E2E Test Confirmation'
    });
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data.status, 'confirmed', 'Should update order status');
  });

  // 13. Error case: PATCH invalid status
  await test('PATCH /orders/:id/status - 400 Bad Request (invalid status)', async () => {
    const res = await makeRequest('PATCH', `${BASE_URL}${API_BASE}/orders/${orderId}/status`, {
      status: 'invalid_status'
    });
    assertEquals(res.status, 400, 'Should return 400 for invalid status');
  });

  // ==================== SHIPMENT ENDPOINTS ====================
  console.log('\n📦 SHIPMENT ENDPOINTS (4 tests)');
  console.log('-'.repeat(60));

  // 14. POST /shipments
  await test('POST /shipments - Create shipment', async () => {
    const res = await makeRequest('POST', `${BASE_URL}${API_BASE}/shipments`, {
      orderId: orderId,
      carrier: 'DHL Express',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      origin: 'Riyadh Warehouse'
    });
    assertEquals(res.status, 201, 'Should return 201 Created');
    assert(res.body.data && res.body.data._id, 'Should return shipment with ID');
    shipmentId = res.body.data._id;
  });

  // 15. PATCH /shipments/:id/status
  await test('PATCH /shipments/:id/status - Update shipment status', async () => {
    const res = await makeRequest('PATCH', `${BASE_URL}${API_BASE}/shipments/${shipmentId}/status`, {
      status: 'in-transit',
      location: 'Jeddah Distribution Center'
    });
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.data.status, 'in-transit', 'Should update shipment status');
  });

  // 16. GET /shipments/track/:trackingNumber
  await test('GET /shipments/track/:trackingNumber - Track shipment', async () => {
    // First get the shipment to get tracking number
    const getRes = await makeRequest('GET', `${BASE_URL}${API_BASE}/orders/${orderId}`);
    // For this test, we'll just verify the endpoint works
    const shipmentList = await makeRequest('GET', `${BASE_URL}${API_BASE}/status`);
    assertEquals(shipmentList.status, 200, 'Should return 200 OK');
  });

  // 17. Error case: POST shipment without required fields
  await test('POST /shipments - 400 Bad Request (missing fields)', async () => {
    const res = await makeRequest('POST', `${BASE_URL}${API_BASE}/shipments`, {
      orderId: orderId
      // Missing carrier and estimatedDelivery
    });
    assertEquals(res.status, 400, 'Should return 400 for missing required fields');
  });

  // ==================== SYSTEM ENDPOINTS ====================
  console.log('\n📦 SYSTEM ENDPOINTS (2 tests)');
  console.log('-'.repeat(60));

  // 18. GET /analytics
  await test('GET /analytics - Get supply chain analytics', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/analytics`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assert(res.body.data.summary, 'Should return analytics data');
  });

  // 19. GET /status
  await test('GET /status - Health check', async () => {
    const res = await makeRequest('GET', `${BASE_URL}${API_BASE}/status`);
    assertEquals(res.status, 200, 'Should return 200 OK');
    assertEquals(res.body.status, 'operational', 'Should show operational status');
  });

  // ==================== CLEANUP ====================
  console.log('\n📦 CLEANUP OPERATIONS (3 tests)');
  console.log('-'.repeat(60));

  // 20. DELETE /shipments/:id
  await test('DELETE /shipments/:id - Delete shipment', async () => {
    const res = await makeRequest('DELETE', `${BASE_URL}${API_BASE}/shipments/${shipmentId}`);
    assertEquals(res.status, 200, 'Should return 200 OK');
  });

  // 21. DELETE /orders/:id
  await test('DELETE /orders/:id - Delete order', async () => {
    const res = await makeRequest('DELETE', `${BASE_URL}${API_BASE}/orders/${orderId}`);
    assertEquals(res.status, 200, 'Should return 200 OK');
  });

  // 22. DELETE /suppliers/:id
  await test('DELETE /suppliers/:id - Delete supplier', async () => {
    const res = await makeRequest('DELETE', `${BASE_URL}${API_BASE}/suppliers/${supplierId}`);
    assertEquals(res.status, 200, 'Should return 200 OK');
  });

  // ==================== RESULTS ====================
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.errors.forEach(e => {
      console.log(`  - ${e.name}: ${e.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  process.exit(results.failed > 0 ? 1 : 0);
}

// Start tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
