#!/usr/bin/env node

/**
 * INSTANT HEALTH CHECK - Project Status in 5 seconds
 * فحص صحة فوري - حالة المشروع في 5 ثوان
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const checks = [];
let score = 0;

console.clear();
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     INSTANT PROJECT HEALTH CHECK - 5 Seconds          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Check 1: package.json
const hasPackageJson = fs.existsSync('package.json');
checks.push({ name: 'package.json', status: hasPackageJson, weight: 20 });
console.log(`${hasPackageJson ? '[OK]' : '[XX]'} package.json exists`);

// Check 2: node_modules
const hasNodeModules = fs.existsSync('node_modules');
checks.push({ name: 'node_modules', status: hasNodeModules, weight: 20 });
console.log(`${hasNodeModules ? '[OK]' : '[XX]'} node_modules exists`);

// Check 3: .env file
const hasEnv = fs.existsSync('.env') || fs.existsSync('.env.example');
checks.push({ name: '.env', status: hasEnv, weight: 15 });
console.log(`${hasEnv ? '[OK]' : '[XX]'} Environment file exists`);

// Check 4: Docker setup
const hasDocker = fs.existsSync('docker-compose.yml') || fs.existsSync('Dockerfile');
checks.push({ name: 'Docker', status: hasDocker, weight: 15 });
console.log(`${hasDocker ? '[OK]' : '[XX]'} Docker configured`);

// Check 5: Git setup
const hasGit = fs.existsSync('.git');
checks.push({ name: 'Git', status: hasGit, weight: 10 });
console.log(`${hasGit ? '[OK]' : '[XX]'} Git initialized`);

// Check 6: Tests
const hasTests = fs.existsSync('jest.config.js') || fs.existsSync('tests');
checks.push({ name: 'Tests', status: hasTests, weight: 10 });
console.log(`${hasTests ? '[OK]' : '[XX]'} Test framework configured`);

// Check 7: Documentation
const hasDocs = fs.existsSync('docs') || fs.existsSync('README.md');
checks.push({ name: 'Docs', status: hasDocs, weight: 5 });
console.log(`${hasDocs ? '[OK]' : '[XX]'} Documentation exists`);

// Check 8: Frontend/Backend structure
const hasBackend = fs.existsSync('backend') || fs.existsSync('server') || fs.existsSync('api');
const hasFrontend = fs.existsSync('frontend') || fs.existsSync('client') || fs.existsSync('web');
checks.push({ name: 'Backend', status: hasBackend, weight: 2.5 });
checks.push({ name: 'Frontend', status: hasFrontend, weight: 2.5 });
console.log(`${hasBackend ? '[OK]' : '[XX]'} Backend directory exists`);
console.log(`${hasFrontend ? '[OK]' : '[XX]'} Frontend directory exists`);

// Calculate score
checks.forEach(check => {
  if (check.status) {
    score += check.weight;
  }
});

console.log('\n' + '═'.repeat(54));

// Health status
let status = 'GOOD';
let emoji = '✅';
if (score < 50) {
  status = 'CRITICAL';
  emoji = '🔴';
} else if (score < 70) {
  status = 'WARNING';
  emoji = '🟡';
} else if (score < 85) {
  status = 'FAIR';
  emoji = '🟠';
}

console.log(`\nHealth Score: ${Math.round(score)}/100 ${emoji} [${status}]`);

// Recommendations
console.log('\nQuick Fixes Needed:');
let needsFixes = false;

if (!hasPackageJson) {
  console.log('  1. Run: npm init');
  needsFixes = true;
}
if (hasPackageJson && !hasNodeModules) {
  console.log('  1. Run: npm install');
  needsFixes = true;
}
if (!hasEnv) {
  console.log(`  ${!hasPackageJson && !hasNodeModules ? '2' : '2'}. Create .env file from .env.example`);
  needsFixes = true;
}
if (!hasDocker) {
  console.log(`  ${needsFixes ? '3' : '1'}. Setup Docker: Create docker-compose.yml`);
  needsFixes = true;
}

if (!needsFixes) {
  console.log('  None - Project is healthy!');
}

console.log('\n' + '═'.repeat(54));

// Available tools
console.log('\nAvailable Analysis Tools:');
console.log('  node QUICK_START_ANALYZER.js       (Interactive menu)');
console.log('  node PROJECT_ANALYZER_ADVANCED.js  (Full analysis)');
console.log('  python ADVANCED_DIAGNOSTICS.py     (System diagnostics)');

console.log('\n' + '═'.repeat(54) + '\n');

process.exit(score < 50 ? 1 : 0);
