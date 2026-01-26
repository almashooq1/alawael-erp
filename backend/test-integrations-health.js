/**
 * Test Integration Health Endpoint
 * Run with: node test-integrations-health.js
 */

const http = require('http');

setTimeout(() => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/integrations/health',
    method: 'GET',
  };

  const req = http.request(options, res => {
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      try {
        const json = JSON.parse(data);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        console.log('✅ TEST PASSED - Endpoint responding correctly');
        process.exit(0);
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
        process.exit(1);
      }
    });
  });

  req.on('error', error => {
    console.error('❌ Request error:', error.message);
    process.exit(1);
  });

  req.end();
}, 2000); // Wait 2 seconds for server startup
