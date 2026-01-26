/**
 * Advanced Route Debugging - Test Direct vs Express Router
 */
const http = require('http');

const endpoints = [
  '/health',
  '/api/phases-29-33/health',
  '/api/phases-29-33/ai/llm/providers',
  '/api/phases-21-28/health',
];

console.log('\n=== Testing Backend on Port 3001 ===\n');

let completed = 0;

endpoints.forEach(path => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path,
    method: 'GET',
    timeout: 2000,
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`${res.statusCode} ${path}`);
      if (res.statusCode >= 400) {
        console.log(`   Response: ${data.substring(0, 100)}`);
      }
      completed++;
      if (completed === endpoints.length) {
        console.log('\n=== Test Complete ===\n');
      }
    });
  });

  req.on('error', err => {
    console.log(`ERROR ${path}: ${err.message}`);
    completed++;
  });

  req.on('timeout', () => {
    console.log(`TIMEOUT ${path}`);
    req.destroy();
    completed++;
  });

  req.end();
});

setTimeout(() => {
  if (completed < endpoints.length) {
    console.log(`\n⚠️  Incomplete - ${completed}/${endpoints.length} tests finished\n`);
  }
  process.exit(0);
}, 5000);
