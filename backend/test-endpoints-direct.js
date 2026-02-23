#!/usr/bin/env node
/**
 * Test Health Routes - Direct Test with Documented Outcomes
 */

const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = http.request(`http://localhost:3000${path}`, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data.length > 0 ? JSON.parse(data) : null
        });
      });
    });
    req.on('error', err => resolve({ path, error: err.message }));
    req.end();
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          HEALTH ROUTES Integration Test                ║');
  console.log('║          Testing if /api/v1/health/* routes work       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const endpoints = [
    '/api/health',
    '/api/v1/health/alive',
    '/api/v1/health/ready',
    '/api/v1/health/db',
    '/api/v1/health/models',
    '/api/v1/health/system',
    '/api/v1/health/full',
  ];

  console.log('Testing endpoints:\n');

  for (const path of endpoints) {
    const result = await testEndpoint(path);

    if (result.error) {
      console.log(`❌ ${path}`);
      console.log(`   Error: ${result.error}\n`);
    } else {
      const statusStr = result.status >= 500 ? '⚠️' : result.status >= 400 ? '❌' : '✅';
      console.log(`${statusStr} ${path}`);
      console.log(`   Status: ${result.status}`);
      if (result.body && result.body.status) {
        console.log(`   Health: ${result.body.status}`);
      }
      console.log('');
    }
  }

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                 Test Complete                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

setTimeout(() => main(), 1000);
process.on('exit', () => { try { process.kill(process.pid); } catch(e) {} });
