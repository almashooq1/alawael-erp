#!/usr/bin/env node

/**
 * Production Server Launcher - Complete Setup
 * بدء خادم الإنتاج الكامل مع التحضيرات
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = (msg, color = 'reset') => {
  console.log(`${colors[color]}${msg}${colors.reset}`);
};

log('\n' + '='.repeat(70), 'blue');
log('🚀 PRODUCTION LAUNCH SEQUENCE v2.0', 'bright');
log('='.repeat(70), 'blue');

const backendDir = __dirname.replace(/scripts$/, '');

// Step 1: Verify environment
log('\n📍 PRE-FLIGHT CHECKS:', 'yellow');

process.stdout.write('  ⏳ Node.js version... ');
try {
  const version = execSync('node -v', { encoding: 'utf8' }).trim();
  log(`✓ ${version}`, 'green');
} catch (e) {
  log('✗ Not found', 'red');
  process.exit(1);
}

// Step 2: Check environment files
process.stdout.write('  ⏳ .env file... ');
const envFiles = ['.env.production', '.env.production.local', '.env'];
let envPath = null;
for (const file of envFiles) {
  const fullPath = path.join(backendDir, file);
  if (fs.existsSync(fullPath)) {
    envPath = fullPath;
    break;
  }
}

if (envPath) {
  log(`✓ Found: ${path.basename(envPath)}`, 'green');
} else {
  log('✗ Not found', 'red');
  log('\n  Create one of:', 'yellow');
  log('    1. .env.production', 'yellow');
  log('    2. .env.production.local', 'yellow');
  log('    3. .env', 'yellow');
  process.exit(1);
}

// Step 3: Load environment
log('\n📊 ENVIRONMENT:', 'yellow');
require('dotenv').config({ path: envPath });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || 3001,
  DATABASE: process.env.DATABASE_URI?.substring(0, 50) + '...',
  JWT_SET: process.env.JWT_SECRET ? '✓' : '✗',
  BACKUP_ENABLED: process.env.BACKUP_ENABLED || 'false',
};

Object.entries(env).forEach(([key, val]) => {
  const status = val === '✗' ? 'red' : 'green';
  log(`  ${key}: ${val}`, status);
});

// Step 4: Check directories
log('\n📁 DIRECTORY CHECK:', 'yellow');

const required = {
  config: path.join(backendDir, 'config'),
  scripts: path.join(backendDir, 'scripts'),
  routes: path.join(backendDir, 'routes'),
};

Object.entries(required).forEach(([name, dir]) => {
  process.stdout.write(`  ⏳ ${name}/... `);
  if (fs.existsSync(dir)) {
    log('✓', 'green');
  } else {
    log('✗', 'red');
    throw new Error(`Missing directory: ${dir}`);
  }
});

// Step 5: Start server
log('\n🌟 STARTING SERVER...', 'bright');
log('   Port: ' + process.env.PORT, 'yellow');
log('   Environment: ' + process.env.NODE_ENV, 'yellow');

process.env.NODE_ENV = 'production';
process.env.NODE_OPTIONS = '--max_old_space_size=4096';

try {
  // Import and start server
  require('../server.js');

  log('\n✅ SERVER STARTED SUCCESSFULLY!', 'green');
  log('\n📍 ENDPOINTS:', 'blue');
  log(`  API:     http://localhost:${process.env.PORT}/api`, 'yellow');
  log(`  Health:  http://localhost:${process.env.PORT}/health`, 'yellow');
  log(`  Status:  http://localhost:${process.env.PORT}/status`, 'yellow');

  log('\n💾 BACKUP SYSTEM:', 'blue');
  log(`  Status: ${process.env.BACKUP_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`, 'yellow');

  log('\n📝 MONITORING:', 'blue');
  log('  View logs:    npm run monitor:logs', 'yellow');
  log('  Check health: npm run health:check', 'yellow');
  log('  Backup stats: npm run backup:stats', 'yellow');

  log('\n🛑 STOP: Press Ctrl+C\n', 'yellow');
} catch (error) {
  log(`\n❌ FAILED TO START: ${error.message}`, 'red');
  if (error.stack) {
    log(error.stack, 'red');
  }
  process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = () => {
  log('\n⏹️  Shutting down gracefully...', 'yellow');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
