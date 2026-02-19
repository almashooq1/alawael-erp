#!/usr/bin/env node

/**
 * FULL PROJECT ANALYSIS - Comprehensive Report Generator
 * تقرير شامل كامل للمشروع
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');

const timestamp = new Date().toLocaleString('en-US');
const reportFile = `ANALYSIS_REPORT_${Date.now()}.txt`;

let report = `
╔════════════════════════════════════════════════════════════════╗
║              COMPREHENSIVE PROJECT ANALYSIS REPORT              ║
║                                                                 ║
║                Generated: ${timestamp}
║                Status: COMPLETE                                ║
╚════════════════════════════════════════════════════════════════╝

`;

console.log(report);

// ====================
// SECTION 1: STRUCTURE
// ====================
report += `\n[1] PROJECT STRUCTURE ANALYSIS\n`;
report += `${'─'.repeat(64)}\n\n`;

const structureChecks = [
  { name: 'Backend directory', path: 'backend', type: 'dir', critical: true },
  { name: 'Frontend directory', path: 'frontend', type: 'dir', critical: true },
  { name: 'Tests directory', path: 'tests', type: 'dir', critical: false },
  { name: 'Docs directory', path: 'docs', type: 'dir', critical: false },
  { name: 'package.json', path: 'package.json', type: 'file', critical: true },
  { name: '.env file', path: '.env', type: 'file', critical: false },
  { name: '.env.example', path: '.env.example', type: 'file', critical: false },
  { name: 'docker-compose.yml', path: 'docker-compose.yml', type: 'file', critical: false },
  { name: 'Dockerfile', path: 'Dockerfile', type: 'file', critical: false },
  { name: '.gitignore', path: '.gitignore', type: 'file', critical: false },
];

let structurePassed = 0;
let structureCritical = 0;

structureChecks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const symbol = exists ? '[✓]' : '[✗]';
  const critical = check.critical ? ' [CRITICAL]' : '';
  
  console.log(`${symbol} ${check.name.padEnd(30)}`);
  report += `${symbol} ${check.name.padEnd(30)}${critical}\n`;
  
  if (exists) structurePassed++;
  if (!exists && check.critical) structureCritical++;
});

const structureScore = (structurePassed / structureChecks.length) * 100;
report += `\nStructure Score: ${Math.round(structurePassed)}/${structureChecks.length} (${Math.round(structureScore)}%)\n`;
console.log(`\nStructure Score: ${Math.round(structurePassed)}/${structureChecks.length}\n`);

// =====================
// SECTION 2: DEPENDENCIES
// =====================
report += `\n[2] DEPENDENCIES ANALYSIS\n`;
report += `${'─'.repeat(64)}\n\n`;

const hasPkgJson = fs.existsSync('package.json');
const hasNodeModules = fs.existsSync('node_modules');

console.log(`[${hasPkgJson ? '✓' : '✗'}] package.json exists`);
console.log(`[${hasNodeModules ? '✓' : '✗'}] node_modules exists`);

report += `[${hasPkgJson ? '✓' : '✗'}] package.json exists\n`;
report += `[${hasNodeModules ? '✓' : '✗'}] node_modules exists\n`;

let dependencyScore = 0;
if (hasPkgJson) dependencyScore += 50;
if (hasNodeModules) dependencyScore += 50;

try {
  const nodeVersion = execSync('node --version 2>&1', { encoding: 'utf8' }).trim();
  console.log(`[✓] Node.js: ${nodeVersion}`);
  report += `[✓] Node.js: ${nodeVersion}\n`;
} catch {
  console.log('[✗] Node.js not found');
  report += '[✗] Node.js not found\n';
  dependencyScore = 0;
}

report += `\nDependency Score: ${dependencyScore}%\n`;
console.log(`\nDependency Score: ${dependencyScore}%\n`);

// ==================
// SECTION 3: SERVICES
// ==================
report += `\n[3] SERVICES PORT STATUS\n`;
report += `${'─'.repeat(64)}\n\n`;

const services = [
  { name: 'Frontend Dev Server', port: 3000, type: 'Critical' },
  { name: 'Backend API Server', port: 3001, type: 'Critical' },
  { name: 'PostgreSQL', port: 5432, type: 'Database' },
  { name: 'MongoDB', port: 27017, type: 'Database' },
  { name: 'Redis Cache', port: 6379, type: 'Cache' },
  { name: 'Elasticsearch', port: 9200, type: 'Search' },
];

let servicesOpen = 0;
let portsChecked = 0;

function checkPort(service) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(300);
    
    socket.on('connect', () => {
      console.log(`[✓] ${service.name.padEnd(30)} :${service.port}`);
      report += `[✓] ${service.name.padEnd(30)} :${service.port}\n`;
      servicesOpen++;
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log(`[✗] ${service.name.padEnd(30)} :${service.port}`);
      report += `[✗] ${service.name.padEnd(30)} :${service.port}\n`;
      socket.destroy();
      resolve();
    });
    
    socket.on('error', () => {
      console.log(`[✗] ${service.name.padEnd(30)} :${service.port}`);
      report += `[✗] ${service.name.padEnd(30)} :${service.port}\n`;
      resolve();
    });
    
    socket.connect(service.port, 'localhost');
  });
}

(async () => {
  // Check all ports
  for (const service of services) {
    await checkPort(service);
  }
  
  const serviceScore = (servicesOpen / services.length) * 100;
  
  console.log(`\nServices Running: ${servicesOpen}/${services.length}\n`);
  report += `\nServices Running: ${servicesOpen}/${services.length}\n`;
  
  // ==================
  // SECTION 4: OVERALL
  // ==================
  const overallScore = (structureScore + dependencyScore + serviceScore) / 3;
  
  console.log('═'.repeat(64));
  console.log('OVERALL PROJECT HEALTH');
  console.log('═'.repeat(64));
  console.log(`Health Score: ${Math.round(overallScore)}/100`);
  
  report += `\n${'═'.repeat(64)}\n`;
  report += `OVERALL PROJECT HEALTH\n`;
  report += `${'═'.repeat(64)}\n\n`;
  report += `Health Score: ${Math.round(overallScore)}/100\n`;
  
  let status = 'EXCELLENT';
  let emoji = '✅';
  
  if (overallScore < 40) {
    status = 'CRITICAL';
    emoji = '🔴';
  } else if (overallScore < 60) {
    status = 'WARNING';
    emoji = '🟡';
  } else if (overallScore < 80) {
    status = 'FAIR';
    emoji = '🟠';
  }
  
  console.log(`Status: ${emoji} ${status}`);
  report += `Status: ${status}\n`;
  
  // ==================
  // SECTION 5: ISSUES
  // ==================
  report += `\n${'─'.repeat(64)}\n`;
  report += `ISSUES FOUND\n`;
  report += `${'─'.repeat(64)}\n\n`;
  
  const issues = [];
  
  if (!hasPkgJson) {
    issues.push({ severity: 'CRITICAL', issue: 'package.json missing', fix: 'npm init -y' });
  }
  
  if (hasPkgJson && !hasNodeModules) {
    issues.push({ severity: 'CRITICAL', issue: 'node_modules not installed', fix: 'npm install' });
  }
  
  if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
    issues.push({ severity: 'HIGH', issue: '.env file not created', fix: 'cp .env.example .env' });
  }
  
  if (structureCritical > 0) {
    issues.push({ severity: 'HIGH', issue: `${structureCritical} critical directories missing`, fix: 'Create missing directories' });
  }
  
  if (servicesOpen === 0) {
    issues.push({ severity: 'INFO', issue: 'No services running', fix: 'Start services with npm run dev' });
  }
  
  if (issues.length === 0) {
    console.log('✓ No critical issues found!\n');
    report += '✓ No critical issues found!\n';
  } else {
    issues.forEach((item, idx) => {
      console.log(`${idx + 1}. [${item.severity}] ${item.issue}`);
      console.log(`   Fix: ${item.fix}\n`);
      
      report += `${idx + 1}. [${item.severity}] ${item.issue}\n`;
      report += `   Fix: ${item.fix}\n\n`;
    });
  }
  
  // ==================
  // SECTION 6: RECOMMENDATIONS
  // ==================
  report += `\n${'─'.repeat(64)}\n`;
  report += `RECOMMENDATIONS\n`;
  report += `${'─'.repeat(64)}\n\n`;
  
  const recommendations = [
    '1. Run: node MASTER_CHECK.js - Quick health check',
    '2. Review this report for detailed analysis',
    '3. Fix all CRITICAL issues first',
    '4. Install dependencies: npm install',
    '5. Configure environment: cp .env.example .env',
    '6. Start development: npm run dev',
    '7. Run tests: npm test',
  ];
  
  recommendations.forEach(rec => {
    console.log(rec);
    report += `${rec}\n`;
  });
  
  // Write report to file
  fs.writeFileSync(reportFile, report);
  
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`Report saved to: ${reportFile}`);
  console.log(`${'═'.repeat(64)}\n`);
  
  report += `\n${'═'.repeat(64)}\n`;
  report += `Report generated on: ${timestamp}\n`;
  report += `${'═'.repeat(64)}\n`;
  
  // Update file with timestamp
  fs.writeFileSync(reportFile, report);
})();
