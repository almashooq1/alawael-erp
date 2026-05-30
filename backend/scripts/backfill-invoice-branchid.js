#!/usr/bin/env node
'use strict';

/**
 * backfill-invoice-branchid.js — W651 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing `models/Invoice.js` docs from the
 * (required) beneficiary's branch. (The separate models/finance/Invoice.js
 * already carries a required `branch_id` — no backfill needed there.)
 * Dry-run unless `--commit`; only SETS a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-invoice-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-invoice-branchid.js --commit
 *   ... --json
 */

const COMMIT = process.argv.includes('--commit');
const JSON_OUT = process.argv.includes('--json');
const log = (...a) => {
  if (!JSON_OUT) console.log(...a);
};

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  const Invoice = require('../models/Invoice');
  let Beneficiary = null;
  try {
    Beneficiary = require('../models/Beneficiary');
  } catch {
    Beneficiary = null;
  }

  const missing = await Invoice.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id beneficiary')
    .lean();

  let resolved = 0;
  let skipped = 0;
  for (const inv of missing) {
    let branchId = null;
    if (Beneficiary && inv.beneficiary) {
      const b = await Beneficiary.findById(inv.beneficiary).select('branchId').lean();
      if (b && b.branchId) branchId = b.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) await Invoice.updateOne({ _id: inv._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromBeneficiary: resolved,
    skippedNoAnchor: skipped,
    wouldUpdate: resolved,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W651 Invoice.branchId backfill — ${summary.mode}`);
    log('────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from beneficiary:    ${summary.resolvedFromBeneficiary}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-invoice-branchid failed:', err.message);
  process.exit(2);
});
