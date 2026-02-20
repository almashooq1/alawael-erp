// Quick API Test Script
const http = require('http');

const baseURL = 'http://localhost:3005';

const testEndpoints = [
  { name: 'Health Check', path: '/api/health', method: 'GET' },
  { name: 'API Docs', path: '/api-docs', method: 'GET' },
  { name: 'Health (Root)', path: '/health', method: 'GET' },
  { name: 'API Status', path: '/api-docs/status', method: 'GET' },
];

console.log('\n🧪 Quick API Test Starting...\n');
console.log('═'.repeat(50));

let passed = 0;
let failed = 0;

function testEndpoint(endpoint) {
  return new Promise(resolve => {
    const url = `${baseURL}${endpoint.path}`;

    http
      .get(url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ ${endpoint.name}`);
            console.log(`   Path: ${endpoint.path}`);
            console.log(`   Status: ${res.statusCode}`);
            passed++;
          } else {
            console.log(`❌ ${endpoint.name}`);
            console.log(`   Path: ${endpoint.path}`);
            console.log(`   Status: ${res.statusCode}`);
            failed++;
          }
          console.log('');
          resolve();
        });
      })
      .on('error', error => {
        console.log(`❌ ${endpoint.name}`);
        console.log(`   Path: ${endpoint.path}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        failed++;
        resolve();
      });
  });
}

async function runTests() {
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }

  console.log('═'.repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${testEndpoints.length}`);
  console.log(`   ❌ Failed: ${failed}/${testEndpoints.length}`);
  console.log(`   Success Rate: ${Math.round((passed / testEndpoints.length) * 100)}%`);
  console.log('');

  process.exit(failed === 0 ? 0 : 1);
}

runTests();
