#!/usr/bin/env node
/**
 * seed-insurance-tariffs.js — populates the InsuranceTariff table with
 * starter pricing for the 5 major Saudi private insurers across the 5
 * rehab CPT codes mapped in sessionToClaimBridge.
 *
 * Usage:
 *   node scripts/seed-insurance-tariffs.js              # apply
 *   node scripts/seed-insurance-tariffs.js --dry-run    # report only
 *   node scripts/seed-insurance-tariffs.js --json       # JSON summary
 *
 * IMPORTANT — pricing is starter-only. Replace per negotiated contract
 * before going live. See `services/finance/insuranceTariffsBootstrap.js`
 * for the data set + idempotency rules.
 *
 * Idempotent: re-running only updates rows whose unitPrice has drifted
 * from the source-of-truth dataset; never deletes; never auto-restores
 * soft-disabled rows.
 *
 * Exits 0 on success, 1 on failure.
 */

'use strict';

const mongoose = require('mongoose');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const json = args.includes('--json');

  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alawael-erp';

  if (!json) {
    console.log(`[tariffs-seed] connecting to ${uri.replace(/:([^:@/]+)@/, ':****@')}`);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const InsuranceTariff = require('../models/InsuranceTariff');
  const { bootstrap } = require('../services/finance/insuranceTariffsBootstrap');

  const result = await bootstrap({ tariffModel: InsuranceTariff, dryRun });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('[tariffs-seed] result:', result);
    if (dryRun) {
      console.log('[tariffs-seed] DRY-RUN — nothing was written.');
    }
  }

  await mongoose.disconnect();
}

main().then(
  () => process.exit(0),
  err => {
    console.error('[tariffs-seed] failed:', err.message);
    mongoose.disconnect().finally(() => process.exit(1));
  }
);
