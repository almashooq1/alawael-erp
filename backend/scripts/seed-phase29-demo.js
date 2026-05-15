#!/usr/bin/env node
/**
 * seed-phase29-demo.js — end-to-end demo seed for the World-Class QMS.
 *
 * Populates every Phase 29 module with realistic Arabic + English
 * sample data so every dashboard renders meaningfully on a fresh
 * install.
 *
 * All records carry a `DEMO-Q29-*` marker so `--reset` can clean them
 * up without touching production data.
 *
 * Usage:
 *   node backend/scripts/seed-phase29-demo.js
 *   node backend/scripts/seed-phase29-demo.js --reset
 *   node backend/scripts/seed-phase29-demo.js --dry-run
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

  console.log('🌱 Phase 29 World-Class QMS demo seed\n');
  console.log(`   URI:     ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  console.log(`   Reset:   ${reset ? 'YES — will clear existing DEMO-Q29-* records' : 'no'}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'no'}\n`);

  if (!dryRun) {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');
  }

  const seed = require('../seeds/phase29-quality.seed');
  const started = Date.now();

  try {
    const result = await seed({ dryRun, reset });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n✅ Seed complete in ${elapsed}s`);
    if (!dryRun) {
      console.log(
        '\nNext step: open https://alaweal.org/admin/quality (or your dev URL) and explore:'
      );
      console.log('  /quality/fmea  •  /quality/rca  •  /quality/spc  •  /quality/a3');
      console.log('  /quality/standards  •  /quality/documents  •  /quality/supplier-quality');
      console.log(
        '  /quality/calibration  •  /quality/change-control  •  /quality/audit-scheduler'
      );
      console.log('  /quality/coq  •  /quality/predictive-risk  •  /quality/trend-forecast');
      console.log('  /quality/narratives  •  /quality/inspections  •  /quality/benchmarks');
    }
    return result;
  } finally {
    if (!dryRun && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Seed failed:', err.message);
      console.error(err.stack);
      process.exit(1);
    });
}
