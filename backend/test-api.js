#!/usr/bin/env node

/**
 * AlAwael ERP API Test Suite
 * اختبار نظام AlAwael ERP API
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

const endpoints = [
  { name: 'Health Check', path: '/health' },
  { name: 'Test First', path: '/test-first' },
  { name: 'API Test', path: '/api/test' },
  { name: 'Phase 29-33', path: '/phases-29-33' },
  { name: 'Phase 29-33 AI Providers', path: '/phases-29-33/ai/llm/providers' },
  { name: 'Phase 29-33 Docs', path: '/phase29-33-docs.html' },
];

async function testEndpoint(path) {
  return new Promise(resolve => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers['content-type'],
        });
      });
    });

    req.on('error', err => {
      resolve({
        path,
        status: 0,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        success: false,
        error: 'Timeout',
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n📊 AlAwael ERP API Test Suite');
  console.log('================================\n');

  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path);
    results.push({
      ...endpoint,
      ...result,
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint.name.padEnd(30)} [${result.status}] ${endpoint.path}`);
  }

  console.log('\n================================');
  console.log(
    `Total: ${results.length} | Success: ${results.filter(r => r.success).length} | Failed: ${results.filter(r => !r.success).length}`
  );
  console.log('================================\n');

  // Exit with success code if all tests pass, otherwise non-zero
  process.exit(results.every(r => r.success) ? 0 : 1);
}

// Wait a bit for server to be ready
setTimeout(runTests, 500);
