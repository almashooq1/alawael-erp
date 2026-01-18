#!/usr/bin/env node

// Simple benchmark runner
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
const REQUESTS = 5;

const endpoints = [
  { name: 'Vehicles', url: '/vehicles' },
  { name: 'Vehicle by ID', url: '/vehicles/507f1f77bcf86cd799439011' },
  { name: 'Compliance', url: '/saudi-compliance/report/507f1f77bcf86cd799439011' },
  { name: 'Fleet Report', url: '/saudi-compliance/fleet-report' },
  { name: 'Health', url: '/performance/health' },
];

async function runBenchmark() {
  console.log('\n=== PERFORMANCE BENCHMARK ===\n');

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);

    const times = [];
    let success = 0;

    for (let i = 0; i < REQUESTS; i++) {
      try {
        const start = Date.now();
        const response = await axios.get(API_BASE_URL + endpoint.url, {
          timeout: 5000,
          validateStatus: () => true,
        });
        const duration = Date.now() - start;
        times.push(duration);
        success++;

        process.stdout.write('.');
      } catch (err) {
        process.stdout.write('F');
      }
    }

    if (success > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);
      console.log(`\n  Success: ${success}/${REQUESTS} | Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms\n`);
    } else {
      console.log(`\n  Failed: 0/${REQUESTS}\n`);
    }
  }

  console.log('=== BENCHMARK COMPLETE ===\n');
}

runBenchmark().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
