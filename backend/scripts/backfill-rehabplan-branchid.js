#!/usr/bin/env node
'use strict';

/**
 * backfill-rehabplan-branchid.js — W629 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing UnifiedRehabPlan docs from the
 * (required) beneficiary's branch. Dry-run unless `--commit`; only SETS
 * a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-rehabplan-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-rehabplan-branchid.js --commit
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

  const { UnifiedRehabPlan } = require('../models/MDTCoordination');
  let Beneficiary = null;
  try {
    Beneficiary = require('../models/Beneficiary');
  } catch {
    Beneficiary = null;
  }

  const missing = await UnifiedRehabPlan.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id beneficiary')
    .lean();

  let resolved = 0;
  let skipped = 0;
  for (const p of missing) {
    let branchId = null;
    if (Beneficiary && p.beneficiary) {
      const b = await Beneficiary.findById(p.beneficiary).select('branchId').lean();
      if (b && b.branchId) branchId = b.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) await UnifiedRehabPlan.updateOne({ _id: p._id }, { $set: { branchId } });
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
    log(`W629 UnifiedRehabPlan.branchId backfill — ${summary.mode}`);
    log('────────────────────────────────────────────────');
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
  console.error('backfill-rehabplan-branchid failed:', err.message);
  process.exit(2);
});
