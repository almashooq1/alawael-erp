#!/usr/bin/env node
/**
 * Backfill universal codes for existing entities.
 *
 * Usage:
 *   node scripts/backfill-universal-codes.js              # all 9 types
 *   node scripts/backfill-universal-codes.js --dry-run    # preview only
 *   node scripts/backfill-universal-codes.js --types=BNF,EMP
 *   node scripts/backfill-universal-codes.js --uri=mongodb://...  # override
 */

'use strict';

const path = require('path');
process.env.NODE_PATH = path.join(__dirname, '..');
require('module').Module._initPaths();

const mongoose = require('mongoose');
const { runBackfill } = require('../services/universalCode/backfill');

// Force-load every model that opted into the plugin so mongoose registers them.
require('../models/Beneficiary');
require('../models/HR/Employee');
require('../models/InventoryItem');
require('../models/FixedAsset');
require('../models/Document');
require('../models/Invoice');
require('../models/TherapySession');
require('../models/Appointment');
require('../models/Vehicle');
require('../models/UniversalCode');

function parseArgs() {
  const out = { dryRun: false, types: undefined, uri: undefined };
  for (const a of process.argv.slice(2)) {
    if (a === '--dry-run' || a === '-n') out.dryRun = true;
    else if (a.startsWith('--types='))
      out.types = a
        .slice(8)
        .split(',')
        .map(s => s.trim().toUpperCase());
    else if (a.startsWith('--uri=')) out.uri = a.slice(6);
    else if (a === '--help' || a === '-h') {
      console.log(
        'usage: node scripts/backfill-universal-codes.js [--dry-run] [--types=BNF,EMP] [--uri=...]'
      );
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const uri = args.uri || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('No MongoDB URI. Set MONGODB_URI env var or pass --uri=...');
    process.exit(1);
  }
  console.log(`[backfill] connecting to ${uri.replace(/:\/\/[^@]+@/, '://***@')}`);
  await mongoose.connect(uri);
  console.log(`[backfill] starting ${args.dryRun ? '(DRY RUN)' : ''}`);
  if (args.types) console.log(`[backfill] types: ${args.types.join(', ')}`);

  const t0 = Date.now();
  const summary = await runBackfill({
    entityTypes: args.types,
    dryRun: args.dryRun,
    onProgress: ({ entityType, scanned, total }) =>
      console.log(`[backfill] ${entityType}: ${scanned}/${total}`),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n=== Backfill ${args.dryRun ? 'DRY-RUN ' : ''}complete in ${dt}s ===`);
  console.log('Totals:', summary.totals);
  console.log('\nBy type:');
  for (const r of summary.byType) {
    const note = r.missingModel ? ' (model not loaded)' : '';
    console.log(
      `  ${r.entityType}: scanned=${r.scanned || 0}, issued=${r.issued || 0}, skipped=${r.skipped || 0}${note}`
    );
  }
  await mongoose.disconnect();
  console.log('\n[backfill] done.');
}

main().catch(err => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
