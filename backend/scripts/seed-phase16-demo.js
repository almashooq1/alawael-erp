#!/usr/bin/env node
/**
 * seed-phase16-demo.js — end-to-end demo seed for the Phase-16
 * Operations Control Tower.
 *
 * Populates all 8 Phase-16 subjects (facilities, inspections,
 * findings, work orders, purchase requests, meetings, decisions,
 * route jobs, notification preferences) with ~25 realistic records
 * so every UI page has meaningful data on a fresh install.
 *
 * Safe by construction: all records prefixed `DEMO-OPS-*` so
 * `--reset` cleans them up without touching real data.
 *
 * Usage:
 *   node backend/scripts/seed-phase16-demo.js
 *   node backend/scripts/seed-phase16-demo.js --reset   # clear existing demo first
 *   node backend/scripts/seed-phase16-demo.js --dry-run # plan only, no DB writes
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

  console.log('🌱 Phase-16 Ops Control Tower demo seed\n');
  console.log(`   URI:     ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  console.log(`   Reset:   ${reset ? 'YES — will clear existing DEMO-OPS-* records' : 'no'}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'no'}\n`);

  if (!dryRun) {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');
  }

  const seed = require('../seeds/phase16-ops.seed');
  const started = Date.now();

  try {
    const result = await seed({ dryRun, reset });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    if (result.dryRun) {
      console.log('(dry-run)');
      console.log('  ' + result.message);
      return 0;
    }

    console.log(`\n✓ Seeding complete in ${elapsed}s\n`);

    if (result.cleared && Object.keys(result.cleared).length > 0) {
      console.log('Cleared (reset):');
      for (const [k, v] of Object.entries(result.cleared)) {
        console.log(`   ${k.padEnd(18)} ${v}`);
      }
      console.log('');
    }

    console.log('Created:');
    for (const [k, v] of Object.entries(result.summary || {})) {
      console.log(`   ${k.padEnd(18)} ${v}`);
    }

    if (result.notes && result.notes.length > 0) {
      console.log('\nNotes:');
      for (const n of result.notes) console.log(`   • ${n}`);
    }

    if (result.branchId) {
      console.log(`\nDemo branch id:  ${result.branchId}`);
    }

    if (result.hint) {
      console.log(`\n💡 ${result.hint}`);
    }

    console.log('\nNext steps:');
    console.log('  1. Start the backend:  npm run dev  (or node server.js)');
    console.log(
      '  2. Start web-admin:    cd ../alawael-rehab-platform/apps/web-admin && npm run dev'
    );
    console.log('  3. Visit /ops         — hub showing all 8 Phase-16 pages');
    console.log('  4. Visit /ops/branch-board — paste the Demo branch id above');
    return 0;
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    if (err.stack) console.error(err.stack);
    return 1;
  } finally {
    if (!dryRun && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

main()
  .then(code => process.exit(code ?? 0))
  .catch(err => {
    console.error(err);
    process.exit(2);
  });
