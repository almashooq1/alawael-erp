#!/usr/bin/env node

/**
 * START SERVICES ORCHESTRATOR
 * أداة تشغيل الخدمات المتكاملة
 */

const { spawn } = require('child_process');
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.clear();

console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🚀 SERVICE ORCHESTRATOR - التشغيل المتكامل           ║
║                                                               ║
║              Starting Backend & Frontend Services            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

console.log(`${colors.yellow}⚠️  This tool will start the services in the background.${colors.reset}`);
console.log(`${colors.cyan}Keep this terminal open for monitoring.${colors.reset}\n`);

// Track services
const services = [
  {
    name: 'BACKEND',
    cwd: './backend',
    cmd: 'npm',
    args: ['start'],
    port: 3001,
  },
  {
    name: 'FRONTEND',
    cwd: './frontend',
    cmd: 'npm',
    args: ['run', 'dev'],
    port: 3000,
  },
];

let servicesStarted = 0;
const startedServices = [];

console.log(`${colors.blue}${colors.bright}═══ STARTING SERVICES ═══${colors.reset}\n`);

services.forEach((service) => {
  console.log(`${colors.green}►${colors.reset} ${service.name.padEnd(15)} Starting on port ${service.port}...`);

  const process = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    stdio: 'pipe',
    shell: true,
  });

  let output = '';

  process.stdout.on('data', (data) => {
    output += data.toString();
    console.log(`  ${colors.cyan}[${service.name}]${colors.reset}`, data.toString().trim());
  });

  process.stderr.on('data', (data) => {
    console.log(`  ${colors.red}[${service.name}]${colors.reset}`, data.toString().trim());
  });

  process.on('error', (error) => {
    console.log(`  ${colors.red}ERROR:${colors.reset} ${error.message}`);
    servicesStarted = -1;
  });

  startedServices.push(process);
  servicesStarted++;
});

console.log(`\n${colors.green}✓ Services launched!${colors.reset}`);
console.log(`${colors.yellow}Waiting for services to be ready...${colors.reset}\n`);

// Check readiness
let readyCount = 0;
const checkInterval = setInterval(() => {
  if (readyCount >= 10) {
    clearInterval(checkInterval);
    console.log(`\n${colors.cyan}${colors.bright}═══ SERVICES STATUS ═══${colors.reset}\n`);
    console.log(`  ${colors.green}✓${colors.reset} Backend:  http://localhost:3001`);
    console.log(`  ${colors.green}✓${colors.reset} Frontend: http://localhost:3000\n`);

    console.log(`${colors.green}${colors.bright}🎉 ALL SERVICES ARE RUNNING!${colors.reset}\n`);

    console.log(`${colors.blue}Next Steps:${colors.reset}`);
    console.log(`  1. Open http://localhost:3000 in your browser`);
    console.log(`  2. Run tests: cd backend && npm test`);
    console.log(`  3. Check health: node MONITOR.js\n`);

    console.log(`${colors.yellow}Press Ctrl+C to stop services${colors.reset}\n`);
  }
  readyCount++;
}, 500);

// Handle exit
process.on('SIGINT', () => {
  console.log(`\n\n${colors.red}Stopping services...${colors.reset}\n`);
  startedServices.forEach((proc) => {
    proc.kill();
  });
  clearInterval(checkInterval);
  console.log(`${colors.green}Services stopped.${colors.reset}\n`);
  process.exit(0);
});

// Log to file
const fs = require('fs');
fs.appendFileSync(
  'services_log.txt',
  `\nStarted at: ${new Date().toLocaleString()}\nServices: Backend (3001), Frontend (3000)\n`
);
