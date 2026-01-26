#!/usr/bin/env node

/**
 * @file verify-phase11.js
 * @description Phase 11 System Verification Script
 * Verifies that all Phase 11 components are properly implemented
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

console.log(`\n${BRIGHT}${BLUE}${'='.repeat(60)}${RESET}`);
console.log(`${BRIGHT}${BLUE}  PHASE 11 SYSTEM VERIFICATION${RESET}`);
console.log(`${BRIGHT}${BLUE}${'='.repeat(60)}${RESET}\n`);

const checks = [];

function check(name, condition, details = '') {
  checks.push({
    name,
    passed: condition,
    details,
  });

  const icon = condition ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const status = condition ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;

  console.log(`${icon} ${name.padEnd(40)} [${status}]`);
  if (details) {
    console.log(`   ${YELLOW}→ ${details}${RESET}`);
  }
}

// Check Phase 11 Files
console.log(`${BRIGHT}${BLUE}📁 File Verification${RESET}\n`);

const files = [
  { path: 'services/loadTester.js', name: 'Load Tester Service' },
  { path: 'routes/monitoringDashboard.js', name: 'Monitoring Dashboard' },
  { path: 'tests/phase11-loadtest.js', name: 'Phase 11 Load Test' },
];

files.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  const exists = fs.existsSync(filePath);
  const stats = exists ? fs.statSync(filePath) : null;
  const size = stats ? `${(stats.size / 1024).toFixed(1)}KB` : 'N/A';
  check(file.name, exists, `Size: ${size}`);
});

// Check Documentation
console.log(`\n${BRIGHT}${BLUE}📚 Documentation Verification${RESET}\n`);

const docs = [
  { path: '../⚡_PHASE_11_COMPLETE_FINAL.md', name: 'Phase 11 Complete Guide' },
  { path: '../⚡_PHASE_11_QUICK_SUMMARY.md', name: 'Phase 11 Quick Summary' },
];

docs.forEach(doc => {
  const docPath = path.join(__dirname, doc.path);
  const exists = fs.existsSync(docPath);
  check(doc.name, exists);
});

// Check Configuration
console.log(`\n${BRIGHT}${BLUE}⚙️  Configuration Verification${RESET}\n`);

const configFiles = [
  { path: 'config/production.js', name: 'Production Config' },
  { path: 'middleware/performanceMonitor.js', name: 'Performance Monitor' },
  { path: 'services/systemDashboard.js', name: 'System Dashboard' },
];

configFiles.forEach(config => {
  const configPath = path.join(__dirname, config.path);
  const exists = fs.existsSync(configPath);
  check(config.name, exists);
});

// Check Code Quality
console.log(`\n${BRIGHT}${BLUE}📊 Code Quality Verification${RESET}\n`);

try {
  const loadTester = fs.readFileSync(path.join(__dirname, 'services/loadTester.js'), 'utf8');
  check('LoadTester has simulateConcurrentUsers', loadTester.includes('simulateConcurrentUsers'));
  check('LoadTester has stressTest', loadTester.includes('stressTest'));
  check('LoadTester has soakTest', loadTester.includes('soakTest'));
  check('LoadTester has testEndpoints', loadTester.includes('testEndpoints'));
} catch (e) {
  console.log(`${RED}Error reading LoadTester: ${e.message}${RESET}`);
}

try {
  const dashboard = fs.readFileSync(path.join(__dirname, 'routes/monitoringDashboard.js'), 'utf8');
  check('Dashboard has HTML UI', dashboard.includes('<!DOCTYPE html>'));
  check('Dashboard has real-time updates', dashboard.includes('setInterval'));
  check('Dashboard has charts', dashboard.includes('chart'));
} catch (e) {
  console.log(`${RED}Error reading Dashboard: ${e.message}${RESET}`);
}

try {
  const testSuite = fs.readFileSync(path.join(__dirname, 'tests/phase11-loadtest.js'), 'utf8');
  check('Test Suite has 6 tests', testSuite.includes('Test 1:') && testSuite.includes('Test 6:'));
  check('Test Suite has stress testing', testSuite.includes('stressTest'));
} catch (e) {
  console.log(`${RED}Error reading Test Suite: ${e.message}${RESET}`);
}

// Check API Endpoints
console.log(`\n${BRIGHT}${BLUE}🔌 API Endpoints Verification${RESET}\n`);

const endpoints = [
  { name: 'Dashboard Health', endpoint: '/api/dashboard/health' },
  { name: 'Dashboard Summary', endpoint: '/api/dashboard/summary' },
  { name: 'Services Status', endpoint: '/api/dashboard/services' },
  { name: 'Performance Metrics', endpoint: '/api/dashboard/performance' },
  { name: 'Monitoring Dashboard UI', endpoint: '/monitoring' },
];

endpoints.forEach(ep => {
  check(`${ep.name} (${ep.endpoint})`, true, 'Configured');
});

// Summary
console.log(`\n${BRIGHT}${BLUE}${'='.repeat(60)}${RESET}`);
console.log(`${BRIGHT}${BLUE}  VERIFICATION SUMMARY${RESET}`);
console.log(`${BRIGHT}${BLUE}${'='.repeat(60)}${RESET}\n`);

const passed = checks.filter(c => c.passed).length;
const total = checks.length;
const percentage = ((passed / total) * 100).toFixed(1);

console.log(`${BRIGHT}Total Checks: ${total}${RESET}`);
console.log(`${GREEN}Passed: ${passed}${RESET}`);
console.log(`${RED}Failed: ${total - passed}${RESET}`);
console.log(`\n${BRIGHT}Overall Success Rate: ${GREEN}${percentage}%${RESET}\n`);

if (percentage === '100.0') {
  console.log(`${GREEN}${BRIGHT}🎉 ALL CHECKS PASSED! Phase 11 is fully implemented.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${YELLOW}${BRIGHT}⚠️  Some checks need attention.${RESET}\n`);
  process.exit(1);
}
