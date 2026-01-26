/**
 * Direct API Test - Phase 29-33 Routes
 */
const http = require('http');

const tests = [
  { path: '/health', name: 'Health Check' },
  { path: '/api/phases-29-33/ai/llm/providers', name: 'Phase 29 - AI Providers' },
  { path: '/api/phases-21-28/phases-21-28/health', name: 'Phase 21-28 Health' },
  { path: '/api/dashboard', name: 'Dashboard' },
];

console.log('\n=== Direct API Test ===\n');

tests.forEach(test => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: test.path,
    method: 'GET',
    timeout: 3000,
  };

  const req = http.request(options, res => {
    console.log(`${test.name}: ${res.statusCode} ${res.statusMessage}`);
    res.on('data', () => {}); // Consume data
  });

  req.on('error', err => {
    console.log(`${test.name}: ERROR - ${err.message}`);
  });

  req.on('timeout', () => {
    console.log(`${test.name}: TIMEOUT`);
    req.destroy();
  });

  req.end();
});

setTimeout(() => {
  console.log('\n=== Test Complete ===\n');
}, 5000);
