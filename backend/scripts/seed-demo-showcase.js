#!/usr/bin/env node
/**
 * seed-demo-showcase.js — runs the end-to-end demo seed.
 *
 * Creates ~60 records distributed across branches, employees, guardians,
 * beneficiaries, sessions, assessments, care plans, invoices (with ZATCA
 * envelope + Fatoora submission), and NPHIES claims — each hitting various
 * mock-adapter states so every UI screen has meaningful data.
 *
 * Usage:
 *   node backend/scripts/seed-demo-showcase.js
 *   node backend/scripts/seed-demo-showcase.js --reset   # clears first
 *   node backend/scripts/seed-demo-showcase.js --dry-run
 */

'use strict';

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reset = args.includes('--reset');

async function main() {
  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alawael-demo';

  console.log('🌱 Demo showcase seed\n');
  console.log(`   URI: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  console.log(`   Reset: ${reset ? 'YES — will delete existing DEMO-* records' : 'no'}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'no'}\n`);

  if (!dryRun) {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');
  }

  const seed = require('../seeds/demo-showcase.seed');
  const started = Date.now();
  try {
    const result = await seed({ dryRun, reset });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log('\n✓ Seeding complete in', elapsed + 's\n');
    console.log('Summary:');
    for (const [k, v] of Object.entries(result.summary || {})) {
      console.log(`   ${k.padEnd(16)} ${v}`);
    }
    if (result.credentials) {
      console.log('\nDemo credentials (password: Demo@2026):');
      console.log('  Parents:');
      for (const e of result.credentials.parents) console.log(`    • ${e}`);
      console.log('  Therapists:');
      for (const e of result.credentials.therapists) console.log(`    • ${e}`);
    }
    if (result.dryRun) {
      console.log('\n(dry-run — no changes persisted)');
    }
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

main();
