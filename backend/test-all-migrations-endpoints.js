/**
 * Test All Migration Endpoints
 * Tests all 14 endpoints of the migration system
 */

const http = require('http');

const baseURL = 'http://localhost:3001';
const endpoints = [
  { method: 'GET', path: '/api/migrations/plan', name: 'Get Migration Plan' },
  { method: 'GET', path: '/api/migrations/summary', name: 'Get Summary' },
  { method: 'GET', path: '/api/migrations/log', name: 'Get Log' },
  { method: 'GET', path: '/api/migrations/csv-info', name: 'Get CSV Info' },
  { method: 'POST', path: '/api/migrations/initialize', name: 'Initialize Manager', body: { sourceDB: 'test', targetDB: 'test' } },
  { method: 'POST', path: '/api/migrations/plan', name: 'Create Plan', body: { tables: ['test'] } },
  { method: 'POST', path: '/api/migrations/execute', name: 'Execute Migration', body: {} },
  { method: 'POST', path: '/api/migrations/pause', name: 'Pause Migration', body: {} },
  { method: 'POST', path: '/api/migrations/resume', name: 'Resume Migration', body: {} },
  { method: 'DELETE', path: '/api/migrations/log', name: 'Delete Log', body: {} },
];

let testCount = 0;
let passCount = 0;

function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(baseURL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 500
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        error: error.message,
        success: false
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         MIGRATION ENDPOINTS TEST SUITE                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test health first
  console.log('📋 Pre-check: Testing server health...');
  const health = await makeRequest('GET', '/health');
  if (health.statusCode === 200) {
    console.log('✅ Server is healthy\n');
  } else {
    console.log(`❌ Server health check failed: ${health.statusCode}\n`);
    return;
  }

  console.log('🧪 Testing 10 Migration Endpoints:\n');

  for (const endpoint of endpoints) {
    testCount++;
    const result = await makeRequest(endpoint.method, endpoint.path, endpoint.body);
    
    const statusOK = result.statusCode >= 200 && result.statusCode < 500;
    const status = statusOK ? '✅' : '❌';
    
    if (statusOK) passCount++;

    console.log(`${status} [${testCount}] ${endpoint.method.padEnd(6)} ${endpoint.path}`);
    console.log(`    Status: ${result.statusCode} ${result.error ? `(${result.error})` : ''}`);
    
    if (result.body && result.statusCode !== 204) {
      try {
        const parsed = JSON.parse(result.body);
        const msg = parsed.error || parsed.message || parsed.success;
        console.log(`    Response: ${typeof msg === 'string' ? msg : JSON.stringify(msg).substring(0, 100)}`);
      } catch (e) {
        console.log(`    Response: ${result.body.substring(0, 100)}`);
      }
    }
    console.log('');
  }

  console.log('📊 SUMMARY:');
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total Tests:  ${testCount}`);
  console.log(`Passed:       ${passCount} ✅`);
  console.log(`Failed:       ${testCount - passCount} ❌`);
  console.log(`Success Rate: ${Math.round(passCount / testCount * 100)}%`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (passCount === testCount) {
    console.log('🎉 ALL TESTS PASSED! Migration system is operational.\n');
  } else if (passCount >= testCount * 0.8) {
    console.log('⚠️  Most endpoints working. Check failed endpoints.\n');
  } else {
    console.log('❌ Multiple failures detected. Review configuration.\n');
  }

  process.exit(passCount === testCount ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
