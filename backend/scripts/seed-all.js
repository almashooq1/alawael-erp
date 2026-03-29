#!/usr/bin/env node
/**
 * @file seed-all.js
 * @description نظام البذر الشامل لقاعدة البيانات - Al-Awael ERP
 * Master seed runner for Al-Awael ERP database
 *
 * الاستخدام / Usage:
 *   node backend/scripts/seed-all.js                    # seed all
 *   node backend/scripts/seed-all.js --env development  # specific env
 *   node backend/scripts/seed-all.js --only branches    # specific seeder
 *   node backend/scripts/seed-all.js --dry-run          # preview only
 *   node backend/scripts/seed-all.js --reset            # clear + reseed
 */

'use strict';

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// CLI Arguments
// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isReset = args.includes('--reset');
const onlyIdx = args.indexOf('--only');
const onlyFilter = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const envIdx = args.indexOf('--env');
const targetEnv = envIdx !== -1 ? args[envIdx + 1] : process.env.NODE_ENV || 'development';

// ─────────────────────────────────────────────────────────────────────────────
// Seed Registry (ordered - dependencies first)
// ─────────────────────────────────────────────────────────────────────────────
const SEED_REGISTRY = [
  {
    name: 'system-settings',
    file: '../seeds/system-settings.seed.js',
    description: 'إعدادات النظام الأساسية',
    order: 1,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'branches',
    file: '../seeds/branches.seed.js',
    description: 'الفروع (13 فرعاً في السعودية)',
    order: 2,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'roles-permissions',
    file: '../seeds/roles-permissions.seed.js',
    description: 'الأدوار والصلاحيات',
    order: 3,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'admin-users',
    file: '../seeds/admin-users.seed.js',
    description: 'المستخدمون الإداريون الافتراضيون',
    order: 4,
    envs: ['development', 'staging'],
  },
  {
    name: 'programs',
    file: '../seeds/programs.seed.js',
    description: 'برامج التأهيل والخدمات',
    order: 5,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'disability-types',
    file: '../seeds/disability-types.seed.js',
    description: 'أنواع الإعاقة والتصنيفات',
    order: 6,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'departments',
    file: '../seeds/departments.seed.js',
    description: 'الأقسام والمسميات الوظيفية',
    order: 7,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'measurement-programs',
    file: '../seeds/advanced-measurements-programs.seed.js',
    description: 'مقاييس التقييم وبرامج التأهيل المتقدمة',
    order: 8,
    envs: ['development', 'staging'],
  },
  {
    name: 'leave-types',
    file: '../seeds/leave-types.seed.js',
    description: 'أنواع الإجازات',
    order: 9,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'notification-templates',
    file: '../seeds/notification-templates.seed.js',
    description: 'قوالب الإشعارات',
    order: 10,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'chart-of-accounts',
    file: '../seeds/chart-of-accounts.seed.js',
    description: 'دليل الحسابات المحاسبي',
    order: 11,
    envs: ['development', 'production', 'staging'],
  },
  {
    name: 'sample-beneficiaries',
    file: '../seeds/sample-beneficiaries.seed.js',
    description: 'بيانات تجريبية للمستفيدين',
    order: 12,
    envs: ['development'],
  },
  {
    name: 'sample-employees',
    file: '../seeds/sample-employees.seed.js',
    description: 'بيانات تجريبية للموظفين',
    order: 13,
    envs: ['development'],
  },
  {
    name: 'fiscal-periods',
    file: '../seeds/fiscal-periods.seed.js',
    description: 'الفترات المالية',
    order: 14,
    envs: ['development', 'production', 'staging'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DB Connection
// ─────────────────────────────────────────────────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  console.log(`\n🔗 Connecting to MongoDB...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Run a single seeder
// ─────────────────────────────────────────────────────────────────────────────
async function runSeeder(seedConfig, options = {}) {
  const { isDryRun, isReset } = options;
  const seederPath = path.join(__dirname, seedConfig.file);

  let seeder;
  try {
    seeder = require(seederPath);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      return { status: 'skipped', reason: 'file not found' };
    }
    throw e;
  }

  if (isDryRun) {
    return { status: 'dry-run', description: seedConfig.description };
  }

  if (isReset && typeof seeder.down === 'function') {
    await seeder.down(mongoose.connection);
  }

  if (typeof seeder.seed === 'function') {
    await seeder.seed(mongoose.connection);
  } else if (typeof seeder.up === 'function') {
    await seeder.up(mongoose.connection);
  } else if (typeof seeder === 'function') {
    await seeder(mongoose.connection);
  } else {
    return { status: 'skipped', reason: 'no seed/up function exported' };
  }

  return { status: 'success' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      Al-Awael ERP - Database Seed Runner         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Environment : ${targetEnv}`);
  console.log(`  Dry Run     : ${isDryRun}`);
  console.log(`  Reset Mode  : ${isReset}`);
  console.log(`  Filter      : ${onlyFilter || 'all'}`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  if (isReset && !isDryRun) {
    console.log('\n⚠️  RESET MODE - Existing seed data will be cleared\n');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    await new Promise(resolve => {
      readline.question('  Are you sure? Type "yes" to continue: ', answer => {
        readline.close();
        if (answer.toLowerCase() !== 'yes') {
          console.log('  Aborted.');
          process.exit(0);
        }
        resolve();
      });
    });
  }

  await connectDB();

  // Filter seeders
  let seedersToRun = SEED_REGISTRY.filter(s => s.envs.includes(targetEnv));
  if (onlyFilter) {
    seedersToRun = seedersToRun.filter(s => s.name === onlyFilter || s.name.includes(onlyFilter));
  }
  seedersToRun.sort((a, b) => a.order - b.order);

  console.log(`\n📋 Running ${seedersToRun.length} seeder(s)...\n`);

  const results = { success: 0, skipped: 0, failed: 0 };
  const startTime = Date.now();

  for (const seedConfig of seedersToRun) {
    const prefix = `  [${String(seedConfig.order).padStart(2, '0')}] ${seedConfig.name}`;
    process.stdout.write(`${prefix} ... `);

    try {
      const result = await runSeeder(seedConfig, { isDryRun, isReset });
      if (result.status === 'success') {
        console.log(`✅ ${seedConfig.description}`);
        results.success++;
      } else if (result.status === 'dry-run') {
        console.log(`🔍 [DRY RUN] ${seedConfig.description}`);
        results.skipped++;
      } else {
        console.log(`⏩ Skipped (${result.reason})`);
        results.skipped++;
      }
    } catch (err) {
      console.log(`❌ FAILED`);
      console.error(`     Error: ${err.message}`);
      results.failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  Seed Complete - ${elapsed}s`);
  console.log(
    `║  ✅ Success: ${results.success}  ⏩ Skipped: ${results.skipped}  ❌ Failed: ${results.failed}`
  );
  console.log('╚══════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();

  if (results.failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal seed error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
