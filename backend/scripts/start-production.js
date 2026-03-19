#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * Production Server Launcher
 * بدء خادم الإنتاج مع كل التحقيقات
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

const main = async () => {
  log('\n' + '='.repeat(70), 'blue');
  log('🚀 Production Server Launcher v1.0', 'bright');
  log('='.repeat(70) + '\n', 'blue');

  // Verify environment
  log('📍 Pre-flight checks:', 'yellow');
  process.stdout.write('  ⏳ Checking Node.js... ');
  const nodeVersion = process.version;
  if (parseInt(nodeVersion.split('.')[0].substring(1)) >= 14) {
    log(`✓ ${nodeVersion}`, 'green');
  } else {
    log(`✗ ${nodeVersion} (need v14+)`, 'red');
    process.exit(1);
  }

  // Check .env
  process.stdout.write('  ⏳ Checking .env.production... ');
  const envPath = path.join(__dirname, '..', '.env.production');
  if (fs.existsSync(envPath)) {
    log('✓', 'green');
  } else {
    log('✗', 'red');
    log('     Create .env.production first!', 'red');
    process.exit(1);
  }

  // Load environment
  require('dotenv').config({ path: envPath });

  // Check critical env vars
  process.stdout.write('  ⏳ Checking environment variables... ');
  const required = ['DATABASE_URI', 'JWT_SECRET', 'PORT'];
  const missing = [];
  required.forEach(key => {
    if (!process.env[key]) missing.push(key);
  });

  if (missing.length === 0) {
    log('✓', 'green');
  } else {
    log(`✗ Missing: ${missing.join(', ')}`, 'red');
    process.exit(1);
  }

  // Start server
  log('\n🌟 Starting production server...', 'yellow');
  log(`   Port: ${process.env.PORT}`, 'yellow');
  log(`   Environment: ${process.env.NODE_ENV || 'production'}`, 'yellow');
  log(`   Database: ${process.env.DATABASE_URI.substring(0, 50)}...`, 'yellow');

  // Set environment variables
  process.env.NODE_ENV = 'production';
  process.env.NODE_OPTIONS = '--max_old_space_size=4096';

  // Import server
  try {
    require('./server.js');

    log('\n✅ Server started successfully!', 'green');
    log('\n📊 Available endpoints:', 'blue');
    log(`   API:     http://localhost:${process.env.PORT}/api`, 'yellow');
    log(`   Health:  http://localhost:${process.env.PORT}/health`, 'yellow');
    log(`   Status:  http://localhost:${process.env.PORT}/status`, 'yellow');

    log('\n💾 Backup system status:', 'blue');
    log(`   Schedule: ${process.env.BACKUP_SCHEDULE || 'Not configured'}`, 'yellow');
    log(`   Enabled:  ${process.env.BACKUP_ENABLED === 'true' ? '✓' : '✗'}`, 'yellow');

    log('\n📝 Monitoring:', 'blue');
    log('   Logs:     npm run monitor:logs', 'yellow');
    log('   Status:   npm run health:check', 'yellow');
    log('   Stats:    npm run backup:stats', 'yellow');

    log('\n🛑 To stop: Press Ctrl+C\n', 'yellow');
  } catch (error) {
    log(`❌ Server failed to start: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('\n\n⏹️  Received SIGTERM, shutting down gracefully...', 'yellow');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log('\n\n⏹️  Received SIGINT, shutting down gracefully...', 'yellow');
    process.exit(0);
  });
};

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
});
