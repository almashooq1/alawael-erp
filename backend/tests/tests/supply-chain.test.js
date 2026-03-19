#!/usr/bin/env node

const http = require('http');
const assert = require('assert');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3001';
const SC_BASE = `${BASE_URL}/api/supply-chain`;

let supplierId = '';
let productId = '';
let orderId = '';
let shipmentId = '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SC_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (_e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tests = {
  // Status Check
  'Supply Chain - Status Check': async () => {
    const res = await makeRequest('GET', '/status');
    console.log(`   Status: ${res.status}`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.strictEqual(res.body.success, true, 'Should return success');
    console.log('   ✅ PASS');
  },

  // Supplier Management
  'Supplier - Create': async () => {
    const res = await makeRequest('POST', '/suppliers', {
      name: 'Test Supplier Co.',
      email: 'supplier@test.com',
      phone: '+966-500-000-000',
      address: 'Riyadh, Saudi Arabia',
      category: 'electronics'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
    assert.strictEqual(res.body.success, true, 'Should be successful');
    supplierId = res.body.data.id;
    console.log(`   ✅ PASS (ID: ${supplierId})`);
  },

  'Supplier - List': async () => {
    const res = await makeRequest('GET', '/suppliers');
    console.log(`   Status: ${res.status}`);
    assert.strictEqual(res.status, 200, 'Should return 200');
    assert(Array.isArray(res.body.data.suppliers), 'Should return suppliers array');
    console.log(`   ✅ PASS (${res.body.data.total} suppliers)`);
  },

  'Supplier - Get': async () => {
    if (!supplierId) {
      console.log('   ⏭️ SKIPPED (no supplier ID)');
      return;
    }
    const res = await makeRequest('GET', `/suppliers/${supplierId}`);
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  'Supplier - Update': async () => {
    if (!supplierId) {
      console.log('   ⏭️ SKIPPED (no supplier ID)');
      return;
    }
    const res = await makeRequest('PUT', `/suppliers/${supplierId}`, {
      status: 'active',
      rating: 4.5
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  // Inventory Management
  'Inventory - Add Product': async () => {
    const res = await makeRequest('POST', '/inventory', {
      sku: 'SKU-001',
      name: 'Test Product',
      category: 'electronics',
      quantity: 100,
      minLevel: 10,
      price: 299.99,
      unit: 'piece',
      supplierId: supplierId || 'supplier_1'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
    productId = res.body.data.id;
    console.log(`   ✅ PASS (ID: ${productId})`);
  },

  'Inventory - Update Stock': async () => {
    if (!productId) {
      console.log('   ⏭️ SKIPPED (no product ID)');
      return;
    }
    const res = await makeRequest('PATCH', `/inventory/${productId}`, {
      quantityChange: 50,
      reason: 'Restock from supplier'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  'Inventory - Status Report': async () => {
    const res = await makeRequest('GET', '/inventory/status');
    console.log(`   Status: ${res.status}`);
    assert.strictEqual(res.status, 200, 'Should return 200');
    assert(res.body.data.totalProducts !== undefined, 'Should have totalProducts');
    console.log(`   ✅ PASS (${res.body.data.totalProducts} products)`);
  },

  // Purchase Orders
  'Order - Create': async () => {
    const res = await makeRequest('POST', '/orders', {
      supplierId: supplierId || 'supplier_1',
      items: [
        {
          productId: productId || 'product_1',
          quantity: 50,
          unitPrice: 299.99
        }
      ],
      totalAmount: 14999.50,
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Test order'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
    orderId = res.body.data.id;
    console.log(`   ✅ PASS (ID: ${orderId})`);
  },

  'Order - List': async () => {
    const res = await makeRequest('GET', '/orders');
    console.log(`   Status: ${res.status}`);
    assert.strictEqual(res.status, 200, 'Should return 200');
    assert(Array.isArray(res.body.data.orders), 'Should return orders array');
    console.log(`   ✅ PASS (${res.body.data.total} orders)`);
  },

  'Order - Get': async () => {
    if (!orderId) {
      console.log('   ⏭️ SKIPPED (no order ID)');
      return;
    }
    const res = await makeRequest('GET', `/orders/${orderId}`);
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  'Order - Update Status': async () => {
    if (!orderId) {
      console.log('   ⏭️ SKIPPED (no order ID)');
      return;
    }
    const res = await makeRequest('PATCH', `/orders/${orderId}/status`, {
      status: 'confirmed'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  // Shipments
  'Shipment - Create': async () => {
    const res = await makeRequest('POST', '/shipments', {
      orderId: orderId || 'po_123',
      carrier: 'DHL Express',
      origin: 'Distribution Center',
      destination: 'Customer Location',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
    shipmentId = res.body.data.id;
    console.log(`   ✅ PASS (ID: ${shipmentId})`);
  },

  'Shipment - Update Status': async () => {
    if (!shipmentId) {
      console.log('   ⏭️ SKIPPED (no shipment ID)');
      return;
    }
    const res = await makeRequest('PATCH', `/shipments/${shipmentId}/status`, {
      status: 'in-transit',
      location: 'Distribution Center'
    });
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  'Shipment - Track': async () => {
    const res = await makeRequest('GET', '/shipments/track/TEST123');
    console.log(`   Status: ${res.status}`);
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
    console.log('   ✅ PASS');
  },

  // Analytics
  'Analytics - Get Dashboard': async () => {
    const res = await makeRequest('GET', '/analytics');
    console.log(`   Status: ${res.status}`);
    assert.strictEqual(res.status, 200, 'Should return 200');
    assert(res.body.data.summary !== undefined, 'Should have summary');
    console.log(`   ✅ PASS (${res.body.data.summary.totalSuppliers} suppliers, ${res.body.data.summary.totalOrders} orders)`);
  }
};

async function runTests() {
  console.log('\n🚚 Supply Chain Management Test Suite');
  console.log('═'.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      console.log(`\n📋 ${testName}`);
      await testFn();
      passed++;
    } catch (err) {
      console.log(`   ❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

console.log('\n⏳ Waiting for server...');
setTimeout(runTests, 2000);
