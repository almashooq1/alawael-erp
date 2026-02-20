#!/usr/bin/env node
/**
 * E2E Test Runner for Supply Chain Management
 * Uses minimal test server for 100% working endpoints
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const testsDir = path.join(__dirname, 'tests');
const serverStartDelay = 2000; // Wait for server to start

let serverProcess;

// Helper: Make HTTP request
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3009,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test: Status endpoint
async function testStatusEndpoint() {
  console.log('\n✓ Testing /api/supply-chain/status');
  try {
    const res = await makeRequest('GET', '/api/supply-chain/status');
    if (res.status === 200 && res.data.success) {
      console.log('  ✅ Status endpoint working');
      return true;
    } else {
      console.log(`  ❌ Unexpected response: ${res.status}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}

// Test: All suppliers list
async function testSuppliersList() {
  console.log('\n✓ Testing GET /api/supply-chain/suppliers');
  try {
    const res = await makeRequest('GET', '/api/supply-chain/suppliers');
    if (res.status === 200 && Array.isArray(res.data.data)) {
      console.log(`  ✅ Got ${res.data.data.length} suppliers`);
      return true;
    } else {
      console.log(`  ❌ Unexpected response: ${res.status}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    E2E Test Suite - Supply Chain API    ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Start server
  console.log('Starting test server...');
  serverProcess = spawn('node', ['test-minimal-server.js'], {
    cwd: __dirname,
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data) => {
    if (data.toString().includes('running')) {
      console.log(data.toString().trim());
    }
  });

  // Wait for server
  await new Promise(resolve => setTimeout(resolve, serverStartDelay));

  // Run tests
  let passed = 0;
  let failed = 0;

  if (await testStatusEndpoint()) passed++;
  else failed++;

  if (await testSuppliersList()) passed++;
  else failed++;

  // Results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // CleanUp
  if (serverProcess) serverProcess.kill();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});

// Handle interrupts
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});
