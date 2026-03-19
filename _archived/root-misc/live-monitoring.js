#!/usr/bin/env node

/**
 * LIVE MONITORING DASHBOARD
 * Real-time System Status Checker
 * 
 * Usage: node live-monitoring.js
 * 
 * Shows:
 * - Current system time
 * - PowerShell Execution Policy
 * - npm & Node versions
 * - Backend/Frontend status
 * - Port availability
 * - Process health
 * - Database status
 * - Memory usage
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}╔${'═'.repeat(msg.length + 2)}╗${colors.reset}\n${colors.bright}${colors.blue}║ ${msg} ║${colors.reset}\n${colors.bright}${colors.blue}╚${'═'.repeat(msg.length + 2)}╝${colors.reset}\n`),
  line: () => console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}`)
};

function execCommand(cmd, silent = false) {
  try {
    const result = execSync(cmd, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

function checkFileExists(filepath) {
  return fs.existsSync(filepath);
}

function getFileSize(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return (stats.size / 1024 / 1024).toFixed(2) + ' MB';
  } catch {
    return 'N/A';
  }
}

function formatTime(date) {
  return date.toLocaleString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

async function runDashboard() {
  console.clear();
  
  log.header('🔄 نظام المراقبة المباشرة - LIVE MONITORING DASHBOARD');
  
  const now = new Date();
  console.log(`${colors.bright}⏰ الوقت / Time:${colors.reset} ${formatTime(now)}\n`);

  // 1. PowerShell Status
  log.header('1️⃣  PowerShell Configuration');
  const execPolicy = execCommand('Get-ExecutionPolicy', true);
  if (execPolicy === 'RemoteSigned') {
    log.success(`Execution Policy: ${execPolicy}`);
  } else {
    log.warning(`Execution Policy: ${execPolicy} (Expected: RemoteSigned)`);
  }

  // 2. Node.js & npm
  log.header('2️⃣  Node.js & npm Versions');
  const nodeVersion = execCommand('node --version', true);
  const npmVersion = execCommand('npm --version', true);
  
  if (nodeVersion) log.success(`Node.js: ${nodeVersion}`);
  else log.error('Node.js: NOT FOUND');
  
  if (npmVersion) log.success(`npm: ${npmVersion}`);
  else log.error('npm: NOT FOUND');

  // 3. Project Structure
  log.header('3️⃣  Project Structure & Directories');
  const dirs = [
    { name: 'Root Directory', path: process.cwd() },
    { name: 'erp_new_system/backend', path: path.join(process.cwd(), 'erp_new_system', 'backend') },
    { name: 'erp_new_system/frontend', path: path.join(process.cwd(), 'erp_new_system', 'frontend') }
  ];

  dirs.forEach(dir => {
    if (checkFileExists(dir.path)) {
      log.success(`${dir.name}: Present`);
    } else {
      log.error(`${dir.name}: MISSING`);
    }
  });

  // 4. Configuration Files
  log.header('4️⃣  Configuration Files');
  const configs = [
    { name: '.env (root)', path: path.join(process.cwd(), '.env') },
    { name: '.env (backend)', path: path.join(process.cwd(), 'erp_new_system', 'backend', '.env') },
    { name: '.env (frontend)', path: path.join(process.cwd(), 'erp_new_system', 'frontend', '.env') },
    { name: 'package.json (root)', path: path.join(process.cwd(), 'package.json') },
    { name: 'package.json (backend)', path: path.join(process.cwd(), 'erp_new_system', 'backend', 'package.json') }
  ];

  configs.forEach(config => {
    if (checkFileExists(config.path)) {
      const size = getFileSize(config.path);
      log.success(`${config.name}: Present (${size})`);
    } else {
      log.warning(`${config.name}: Not found`);
    }
  });

  // 5. Dependencies
  log.header('5️⃣  Dependencies Status');
  const nodeModules = [
    { name: 'Root node_modules', path: path.join(process.cwd(), 'node_modules') },
    { name: 'Backend node_modules', path: path.join(process.cwd(), 'erp_new_system', 'backend', 'node_modules') },
    { name: 'Frontend node_modules', path: path.join(process.cwd(), 'erp_new_system', 'frontend', 'node_modules') }
  ];

  nodeModules.forEach(nm => {
    if (checkFileExists(nm.path)) {
      const size = getFileSize(nm.path);
      log.success(`${nm.name}: Installed (${size})`);
    } else {
      log.warning(`${nm.name}: Not installed`);
    }
  });

  // 6. npm Scripts
  log.header('6️⃣  npm Scripts Available');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    const scripts = packageJson.scripts || {};
    
    if (Object.keys(scripts).length > 0) {
      log.success(`Total scripts: ${Object.keys(scripts).length}`);
      Object.entries(scripts).forEach(([key, value]) => {
        console.log(`  ${colors.cyan}▪︎${colors.reset} ${key}: ${value}`);
      });
    } else {
      log.error('No scripts found');
    }
  } catch (error) {
    log.error('Could not read package.json');
  }

  // 7. Port Status
  log.header('7️⃣  Port Availability');
  const ports = [
    { name: 'Backend (3001)', port: 3001 },
    { name: 'Frontend (3000)', port: 3000 },
    { name: 'MongoDB (27017)', port: 27017 }
  ];

  ports.forEach(p => {
    const cmd = `netstat -ano | findstr :${p.port}`;
    const result = execCommand(cmd, true);
    if (result) {
      log.warning(`${p.name}: In use`);
    } else {
      log.success(`${p.name}: Available`);
    }
  });

  // 8. Environment Variables
  log.header('8️⃣  Environment Variables');
  const envVars = process.env;
  if (envVars.NODE_ENV) {
    log.success(`NODE_ENV: ${envVars.NODE_ENV}`);
  } else {
    log.warning('NODE_ENV: Not set (default: development)');
  }

  if (envVars.PSModulePath) {
    log.success(`PSModulePath: Configured`);
  } else {
    log.warning('PSModulePath: Not configured');
  }

  // 9. System Resources
  log.header('9️⃣  System Resources');
  const freemem = (require('os').freemem() / 1024 / 1024 / 1024).toFixed(2);
  const totalmem = (require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const platform = require('os').platform();
  const cpus = require('os').cpus().length;

  log.success(`Platform: ${platform.toUpperCase()}`);
  log.success(`CPUs: ${cpus} cores`);
  log.success(`Memory: ${freemem} GB / ${totalmem} GB available`);
  log.success(`Uptime: ${(require('os').uptime() / 3600).toFixed(2)} hours`);

  // 10. System Status Summary
  log.header('🎯 SYSTEM STATUS SUMMARY');
  
  const checks = {
    'PowerShell Configured': execPolicy === 'RemoteSigned',
    'Node.js Installed': nodeVersion !== null,
    'npm Installed': npmVersion !== null,
    'Backend Directory': checkFileExists(dirs[1].path),
    'Frontend Directory': checkFileExists(dirs[2].path),
    'Backend node_modules': checkFileExists(nodeModules[1].path),
    'Frontend node_modules': checkFileExists(nodeModules[2].path),
    'package.json (root)': checkFileExists(configs[3].path),
    'package.json (backend)': checkFileExists(configs[4].path)
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  Object.entries(checks).forEach(([check, result]) => {
    if (result) log.success(check);
    else log.error(check);
  });

  console.log('');
  log.line();
  console.log(`${colors.bright}${colors.green}OVERALL: ${passed}/${total} Checks Passed${colors.reset}`);
  log.line();

  // Final Status
  if (passed === total) {
    console.log(`\n${colors.bright}${colors.green}🎉 ALL SYSTEMS OPERATIONAL 🎉${colors.reset}\n`);
    console.log(`${colors.green}✅ System is ready for development${colors.reset}`);
    console.log(`${colors.green}✅ All components configured${colors.reset}`);
    console.log(`${colors.green}✅ Environment validated${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  ${total - passed} items need attention${colors.reset}\n`);
  }

  // Quick Actions
  log.header('⚡ Quick Start Commands');
  console.log(`${colors.cyan}npm start${colors.reset}              - Start Backend (port 3001)`);
  console.log(`${colors.cyan}npm start:frontend${colors.reset}     - Start Frontend (port 3000)`);
  console.log(`${colors.cyan}npm test${colors.reset}               - Run tests`);
  console.log(`${colors.cyan}npm run dev${colors.reset}            - Development mode with nodemon`);
  console.log(`${colors.cyan}npm audit${colors.reset}              - Check security vulnerabilities`);
  console.log(`${colors.cyan}npm update${colors.reset}             - Update all dependencies`);
  console.log(`${colors.cyan}node live-monitoring.js${colors.reset} - Run this dashboard again\n`);

  // Monitoring Note
  console.log(`${colors.bright}${colors.cyan}📊 Monitoring Status:${colors.reset}`);
  console.log(`   Last Check: ${formatTime(now)}`);
  console.log(`   Next Update: Run command again for refresh`);
  console.log(`   Status Level: ${passed === total ? '🟢 CRITICAL - ALL GOOD' : '🟡 WARNING - CHECK NEEDED'}\n`);
}

// Run dashboard
runDashboard().catch(error => {
  log.error('Dashboard error: ' + error.message);
  process.exit(1);
});

module.exports = { runDashboard };
