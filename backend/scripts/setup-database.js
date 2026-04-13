#!/usr/bin/env node
/**
 * @file setup-database.js
 * @description سكريبت الإعداد الشامل لقاعدة البيانات - Al-Awael ERP
 * Master Database Setup Script - runs all steps in the correct order
 *
 * الاستخدام / Usage:
 *   node backend/scripts/setup-database.js                    # full setup
 *   node backend/scripts/setup-database.js --step indexes     # specific step
 *   node backend/scripts/setup-database.js --skip seeds       # skip a step
 *   node backend/scripts/setup-database.js --env production   # production setup
 *   node backend/scripts/setup-database.js --check            # check only
 *
 * الخطوات / Steps:
 *   1. connect      - اختبار الاتصال
 *   2. collections  - إنشاء المجموعات
 *   3. indexes      - إنشاء الفهارس
 *   4. seeds        - تحميل البيانات الأساسية
 *   5. health       - فحص الصحة النهائي
 */

'use strict';

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// CLI Args
// ─────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = flag => {
  const idx = argv.indexOf(flag);
  return idx !== -1 ? argv[idx + 1] : null;
};
const hasFlag = flag => argv.includes(flag);

const TARGET_ENV = getArg('--env') || process.env.NODE_ENV || 'development';
const STEP_FILTER = getArg('--step');
const SKIP_STEP = getArg('--skip');
const CHECK_ONLY = hasFlag('--check');
const VERBOSE = hasFlag('--verbose');

// ─────────────────────────────────────────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = {
  connect: {
    name: 'connect',
    label: 'الاتصال بقاعدة البيانات / Database Connection',
    required: true,
  },
  plugins: {
    name: 'plugins',
    label: 'تسجيل الإضافات والعدادات / Register Plugins & Counters',
    required: true,
  },
  migrate: {
    name: 'migrate',
    label: 'تشغيل Migrations / Run Migrations',
    required: true,
  },
  indexes: {
    name: 'indexes',
    label: 'إنشاء الفهارس / Create Indexes',
    required: true,
  },
  seeds: {
    name: 'seeds',
    label: 'تحميل البيانات الأساسية / Seed Initial Data',
    required: false,
    skipInProd: false,
  },
  health: {
    name: 'health',
    label: 'فحص صحة قاعدة البيانات / Health Check',
    required: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const banner = (msg, char = '═') => {
  const line = char.repeat(50);
  console.log(`\n╔${line}╗`);
  console.log(`║  ${msg.padEnd(48)} ║`);
  console.log(`╚${line}╝`);
};

const step = (num, total, msg) => {
  console.log(`\n[${num}/${total}] ${msg}`);
  console.log('─'.repeat(52));
};

const ok = msg => console.log(`  ✅ ${msg}`);
const fail = msg => console.log(`  ❌ ${msg}`);
const info = msg => console.log(`  ℹ️  ${msg}`);
const warn = msg => console.log(`  ⚠️  ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Connect
// ─────────────────────────────────────────────────────────────────────────────
async function stepConnect() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

  // Mask credentials in log
  const safeUri = uri.replace(/\/\/([^:]+:[^@]+@)/, '//<credentials>@');
  info(`URI: ${safeUri}`);
  info(`Environment: ${TARGET_ENV}`);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    w: 'majority',
  });

  ok(`Connected to: ${conn.connection.host}:${conn.connection.port}`);
  ok(`Database: ${conn.connection.name}`);
  ok(`Mongoose version: ${mongoose.version}`);

  // Check MongoDB version
  try {
    const serverInfo = await conn.connection.db.admin().serverInfo();
    ok(`MongoDB version: ${serverInfo.version}`);
  } catch {}

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Register Plugins & Initialize Counters
// ─────────────────────────────────────────────────────────────────────────────
async function stepPlugins() {
  let registerGlobalPlugins, initializeCounters, checkAndResetCounters;

  // Load plugins
  try {
    ({ registerGlobalPlugins } = require('../database/plugins/mongoose-plugins'));
    registerGlobalPlugins({
      softDelete: true,
      pagination: true,
      toJSON: true,
      audit: true,
      timestamps: false, // Mongoose handles this natively
    });
    ok('Global Mongoose plugins registered (softDelete, pagination, toJSON, audit)');
  } catch (e) {
    warn(`Mongoose plugins not loaded: ${e.message}`);
  }

  // Load & initialize counters
  try {
    ({ initializeCounters, checkAndResetCounters } = require('../database/utils/counter'));
    const counterResult = await initializeCounters();
    ok(
      `Counters initialized: ${counterResult.initialized} created, ${counterResult.existing} existing`
    );

    // Auto-reset yearly/monthly counters if needed
    const resets = await checkAndResetCounters();
    if (resets > 0) {
      ok(`Auto-reset ${resets} counter(s) for new period`);
    }
  } catch (e) {
    warn(`Counter initialization failed: ${e.message}`);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Run Migrations
// ─────────────────────────────────────────────────────────────────────────────
async function stepMigrate() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const fs = require('fs');

  if (!fs.existsSync(migrationsDir)) {
    warn('Migrations directory not found, skipping...');
    return { success: true, skipped: true };
  }

  // Get all migration files sorted
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js') && /^\d{14}_/.test(f))
    .sort();

  info(`Found ${migrationFiles.length} migration file(s)`);

  // Track applied migrations (using a meta collection)
  const metaCol = mongoose.connection.db.collection('_migrations');
  const applied = await metaCol.find({}).toArray();
  const appliedNames = new Set(applied.map(m => m.name));

  let ran = 0;
  let skipped = 0;

  for (const file of migrationFiles) {
    const migName = path.basename(file, '.js');

    if (appliedNames.has(migName)) {
      if (VERBOSE) info(`  ⏩ Already applied: ${migName}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ▶️  ${migName} ... `);
    try {
      const migration = require(path.join(migrationsDir, file));
      await migration.up(mongoose.connection.db);

      // Record as applied
      await metaCol.insertOne({
        name: migName,
        appliedAt: new Date(),
        env: TARGET_ENV,
      });

      console.log('✅');
      ran++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      if (err.message.includes('not found') || err.message.includes('Collection')) {
        // Non-critical - collection might not exist yet
        warn(`  Migration warning: ${err.message}`);
      } else {
        throw err;
      }
    }
  }

  ok(`Migrations: ${ran} applied, ${skipped} already applied`);
  return { success: true, ran, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Create Indexes
// ─────────────────────────────────────────────────────────────────────────────
async function stepIndexes() {
  const indexesModule = path.join(__dirname, '../database/indexes/core-indexes.js');

  let createAllCoreIndexes;
  try {
    ({ createAllCoreIndexes } = require(indexesModule));
  } catch (e) {
    warn(`Core indexes module not found: ${e.message}`);
    return { success: true, skipped: true };
  }

  const db = mongoose.connection.db;
  const results = await createAllCoreIndexes(db);

  ok(`Indexes: ${results.success.length} groups created, ${results.failed.length} failed`);

  if (results.failed.length > 0 && VERBOSE) {
    results.failed.forEach(f => warn(`  Failed: ${f.name} - ${f.error}`));
  }

  return { success: true, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Run Seeds
// ─────────────────────────────────────────────────────────────────────────────
async function stepSeeds() {
  if (TARGET_ENV === 'production') {
    const seedInProd = process.env.ALLOW_PROD_SEED === 'true';
    if (!seedInProd) {
      warn('Skipping seeds in production (set ALLOW_PROD_SEED=true to enable)');
      return { success: true, skipped: true };
    }
  }

  const seedsDir = path.join(__dirname, '../seeds');
  const fs = require('fs');

  if (!fs.existsSync(seedsDir)) {
    warn('Seeds directory not found');
    return { success: true, skipped: true };
  }

  // Run the seed registry
  const seedFiles = fs
    .readdirSync(seedsDir)
    .filter(f => f.endsWith('.seed.js'))
    .sort();
  info(`Found ${seedFiles.length} seed file(s)`);

  let seeded = 0;
  let seedSkipped = 0;
  let seedFailed = 0;

  for (const file of seedFiles) {
    process.stdout.write(`  🌱 ${file.replace('.seed.js', '')} ... `);
    try {
      const seeder = require(path.join(seedsDir, file));
      if (typeof seeder.seed === 'function') {
        await seeder.seed(mongoose.connection);
        console.log('✅');
        seeded++;
      } else if (typeof seeder.up === 'function') {
        await seeder.up(mongoose.connection.db);
        console.log('✅');
        seeded++;
      } else {
        console.log('⏩ (no seed function)');
        seedSkipped++;
      }
    } catch (err) {
      console.log(`⚠️  ${err.message.substring(0, 60)}`);
      seedFailed++;
    }
  }

  ok(`Seeds: ${seeded} applied, ${seedSkipped} skipped, ${seedFailed} warnings`);
  return { success: true, seeded, seedSkipped, seedFailed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Health Check
// ─────────────────────────────────────────────────────────────────────────────
async function stepHealth() {
  let runHealthCheck;
  try {
    ({ runHealthCheck } = require('../database/health/db-health'));
  } catch {
    warn('Health check module not found, skipping');
    return { success: true, skipped: true };
  }

  const health = await runHealthCheck({ minimal: false });
  const statusEmoji = { healthy: '✅', warning: '⚠️ ', critical: '❌', info: 'ℹ️ ' };

  health.checks.forEach(check => {
    const emoji = statusEmoji[check.status] || '❓';
    console.log(`  ${emoji} ${check.name.padEnd(22)} ${check.message}`);
  });

  const overall = health.overall;
  if (overall === 'healthy') ok(`Overall health: HEALTHY`);
  else if (overall === 'warning') warn(`Overall health: WARNING`);
  else fail(`Overall health: CRITICAL`);

  return { success: overall !== 'critical', health };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK ONLY mode
// ─────────────────────────────────────────────────────────────────────────────
async function runCheckOnly() {
  banner('Al-Awael ERP - Database Check Mode');
  console.log(`\n  Environment: ${TARGET_ENV}`);
  console.log(`  MongoDB URI: ${process.env.MONGODB_URI || 'not set'}`);

  // Check connection
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    ok('Connection: SUCCESS');

    const stats = await mongoose.connection.db.stats();
    ok(`Collections: ${stats.collections}`);
    ok(`Data size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    ok(`Indexes: ${stats.indexes}`);

    await mongoose.disconnect();
  } catch (err) {
    fail(`Connection FAILED: ${err.message}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Setup Runner
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (CHECK_ONLY) {
    await runCheckOnly();
    return;
  }

  banner('Al-Awael ERP - Database Setup');
  console.log(`\n  Environment  : ${TARGET_ENV}`);
  console.log(`  Step filter  : ${STEP_FILTER || 'all'}`);
  console.log(`  Skip step    : ${SKIP_STEP || 'none'}`);
  console.log(`  Verbose      : ${VERBOSE}`);
  console.log(`  Timestamp    : ${new Date().toISOString()}\n`);

  const allSteps = [
    { key: 'connect', fn: stepConnect },
    { key: 'plugins', fn: stepPlugins },
    { key: 'migrate', fn: stepMigrate },
    { key: 'indexes', fn: stepIndexes },
    { key: 'seeds', fn: stepSeeds },
    { key: 'health', fn: stepHealth },
  ];

  // Apply filters
  let stepsToRun = allSteps;
  if (STEP_FILTER) {
    stepsToRun = allSteps.filter(s => s.key === STEP_FILTER);
    if (stepsToRun.length === 0) {
      console.error(`❌ Unknown step: ${STEP_FILTER}`);
      console.error(`   Valid steps: ${allSteps.map(s => s.key).join(', ')}`);
      process.exit(1);
    }
  }
  if (SKIP_STEP) {
    stepsToRun = stepsToRun.filter(s => s.key !== SKIP_STEP);
  }

  const results = {};
  const startTime = Date.now();
  let stepNum = 0;

  for (const { key, fn } of stepsToRun) {
    stepNum++;
    const stepDef = STEPS[key];
    step(stepNum, stepsToRun.length, stepDef.label);

    const stepStart = Date.now();
    try {
      const result = await fn();
      results[key] = { ...result, durationMs: Date.now() - stepStart };
      if (!result.skipped) {
        ok(`Completed in ${(results[key].durationMs / 1000).toFixed(2)}s`);
      }
    } catch (err) {
      results[key] = { success: false, error: err.message, durationMs: Date.now() - stepStart };
      fail(`Step failed: ${err.message}`);
      if (VERBOSE) console.error(err.stack);

      if (STEPS[key]?.required) {
        console.error(`\n❌ Required step "${key}" failed. Aborting setup.`);
        await safeDisconnect();
        process.exit(1);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalMs = Date.now() - startTime;

  banner('Setup Complete', '─');
  console.log(`\n  Total Duration: ${(totalMs / 1000).toFixed(2)}s\n`);

  const statusEmoji = { true: '✅', false: '❌', undefined: '⏩' };
  stepsToRun.forEach(({ key }) => {
    const r = results[key];
    const emoji = r?.skipped ? '⏩' : r?.success ? '✅' : '❌';
    const status = r?.skipped ? 'SKIPPED' : r?.success ? 'OK' : 'FAILED';
    const dur = r?.durationMs ? ` (${(r.durationMs / 1000).toFixed(1)}s)` : '';
    console.log(`  ${emoji} ${key.padEnd(12)} ${status}${dur}`);
  });

  const anyFailed = Object.values(results).some(r => r?.success === false && !r?.skipped);
  console.log(
    anyFailed ? '\n  ⚠️  Setup completed with errors.\n' : '\n  ✅ Setup completed successfully!\n'
  );

  await safeDisconnect();
  process.exit(anyFailed ? 1 : 0);
}

async function safeDisconnect() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────
main().catch(err => {
  console.error('\n❌ Fatal setup error:', err.message);
  if (VERBOSE) console.error(err.stack);
  process.exit(1);
});
