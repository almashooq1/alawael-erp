#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Database Reset & Reseed
 * نظام الأوائل — إعادة تهيئة قاعدة البيانات
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/db-reset.js                  # Drop & reseed (with confirmation)
 *   node scripts/db-reset.js --force          # Skip confirmation
 *   node scripts/db-reset.js --seed-only      # Seed without drop
 *   node scripts/db-reset.js --collections    # Show all collections
 *   node scripts/db-reset.js --status         # Show DB stats
 *
 * ⚠️  WARNING: This will DROP all data! Use only in development.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const readline = require('readline');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const seedOnly = args.includes('--seed-only');
const showCollections = args.includes('--collections');
const showStatus = args.includes('--status');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

// ─── Confirmation Prompt ────────────────────────────────────────────────────
function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ─── Connect to DB ──────────────────────────────────────────────────────────
async function connectDB() {
  console.log(`\n${C.cyan}📡 Connecting to MongoDB...${C.reset}`);
  console.log(`   ${C.cyan}URI: ${MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')}${C.reset}`);

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`   ${C.green}✅ Connected${C.reset}\n`);
}

// ─── Show Status ────────────────────────────────────────────────────────────
async function dbStatus() {
  const db = mongoose.connection.db;
  const stats = await db.stats();
  const collections = await db.listCollections().toArray();

  console.log(`${C.bold}📊 Database Status${C.reset}`);
  console.log(`   Database:    ${stats.db}`);
  console.log(`   Collections: ${stats.collections}`);
  console.log(`   Documents:   ${stats.objects}`);
  console.log(`   Data Size:   ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Index Size:  ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Storage:     ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);

  if (showCollections && collections.length > 0) {
    console.log(`\n${C.bold}📋 Collections:${C.reset}`);
    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const colStats = await db.collection(col.name).countDocuments();
      console.log(`   ${C.cyan}${col.name}${C.reset} — ${colStats} documents`);
    }
  }
}

// ─── Drop Database ──────────────────────────────────────────────────────────
async function dropDatabase() {
  console.log(`${C.red}${C.bold}🗑️  Dropping database...${C.reset}`);
  await mongoose.connection.db.dropDatabase();
  console.log(`${C.green}✅ Database dropped${C.reset}\n`);
}

// ─── Seed Database ──────────────────────────────────────────────────────────
async function seedDatabase() {
  console.log(`${C.cyan}🌱 Seeding database...${C.reset}\n`);

  const seedFiles = [
    { path: '../seed/users-seed.js', label: 'Users' },
    { path: '../seed/system-settings-seed.js', label: 'System Settings' },
    { path: '../seed/disability-rehabilitation-seed.js', label: 'Disability & Rehabilitation' },
    { path: '../seed/payroll-seed-data.js', label: 'Payroll Data' },
  ];

  for (const seed of seedFiles) {
    try {
      const fullPath = path.join(__dirname, seed.path);
      const { existsSync } = require('fs');
      if (!existsSync(fullPath)) {
        console.log(`  ${C.yellow}⏭️  ${seed.label} — file not found, skipping${C.reset}`);
        continue;
      }

      console.log(`  ${C.cyan}📦 ${seed.label}...${C.reset}`);

      // Clear require cache to ensure fresh execution
      delete require.cache[require.resolve(seed.path)];

      const seedModule = require(seed.path);

      // Handle different export styles
      if (typeof seedModule === 'function') {
        await seedModule();
      } else if (seedModule.seed) {
        await seedModule.seed();
      } else if (seedModule.run) {
        await seedModule.run();
      } else if (seedModule.default && typeof seedModule.default === 'function') {
        await seedModule.default();
      }

      console.log(`  ${C.green}✅ ${seed.label}${C.reset}`);
    } catch (err) {
      console.log(`  ${C.red}❌ ${seed.label}: ${err.message}${C.reset}`);
    }
  }

  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  // Safety check
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n${C.red}${C.bold}🚫 Cannot reset production database!${C.reset}\n`);
    process.exit(1);
  }

  try {
    await connectDB();

    // Status mode
    if (showStatus || showCollections) {
      await dbStatus();
      await mongoose.disconnect();
      process.exit(0);
    }

    // Seed only mode
    if (seedOnly) {
      await seedDatabase();
      await dbStatus();
      await mongoose.disconnect();
      console.log(`${C.green}${C.bold}✅ Seed complete!${C.reset}\n`);
      process.exit(0);
    }

    // Full reset
    await dbStatus();

    if (!forceMode) {
      console.log(`\n${C.red}${C.bold}⚠️  This will DELETE ALL DATA in the database!${C.reset}`);
      const yes = await confirm(`  ${C.yellow}Continue? (y/N): ${C.reset}`);
      if (!yes) {
        console.log(`\n${C.cyan}Aborted.${C.reset}\n`);
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    await dropDatabase();
    await seedDatabase();
    await dbStatus();

    await mongoose.disconnect();
    console.log(`${C.green}${C.bold}✅ Database reset & seeded successfully!${C.reset}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${C.red}Fatal: ${err.message}${C.reset}\n`);
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
}

main();
