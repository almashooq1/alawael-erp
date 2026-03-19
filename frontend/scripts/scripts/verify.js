#!/usr/bin/env node

/**
 * Phase 12 - System Verification Script
 * Checks all components and API endpoints
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

const tests = [
  {
    name: 'Backend Server',
    check: async () => {
      const response = await axios.get(`${API_BASE}/api/health`);
      return response.status === 200;
    },
  },
  {
    name: 'Dashboard Health',
    check: async () => {
      const response = await axios.get(`${API_BASE}/api/dashboard/health`);
      return response.data.data !== undefined;
    },
  },
  {
    name: 'Search Endpoint',
    check: async () => {
      const response = await axios.post(`${API_BASE}/api/search/full-text`, { query: 'test' });
      return response.status === 200;
    },
  },
  {
    name: 'Validation Endpoint',
    check: async () => {
      const response = await axios.post(`${API_BASE}/api/validate/email`, {
        email: 'test@example.com',
      });
      return response.status === 200;
    },
  },
  {
    name: 'Admin Overview',
    check: async () => {
      const response = await axios.get(`${API_BASE}/api/admin/overview`);
      return response.status === 200;
    },
  },
];

async function runTests() {
  console.log(chalk.cyan('\n🔍 Phase 12 System Verification\n'));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    try {
      const result = await test.check();
      if (result) {
        console.log(chalk.green('✓ PASSED'));
        passed++;
      } else {
        console.log(chalk.red('✗ FAILED'));
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`✗ ERROR: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.green(`✓ Passed: ${passed}`));
  console.log(chalk.red(`✗ Failed: ${failed}`));
  console.log(chalk.cyan(`\nTotal: ${passed + failed} tests\n`));

  if (failed === 0) {
    console.log(chalk.green.bold('✨ All systems operational!\n'));
  } else {
    console.log(chalk.yellow.bold('⚠️  Some tests failed. Check backend server.\n'));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error(chalk.red('\n❌ Verification failed:'), error.message);
  process.exit(1);
});
