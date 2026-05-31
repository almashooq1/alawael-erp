#!/usr/bin/env node
'use strict';

/**
 * backfill-referral-branchid.js — W621 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing MedicalReferral docs that predate the
 * W621 tenancy denormalization, from the (required) beneficiary's branch.
 *
 * SAFE BY DEFAULT: dry-run unless `--commit`. Only SETS branchId where it
 * is currently missing — never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-referral-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-referral-branchid.js --commit
 *   ... --json
 *
 * Exit: 0 ok · 2 usage/connection error.
 */

const COMMIT = process.argv.includes('--commit');
const JSON_OUT = process.argv.includes('--json');

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  const { MedicalReferral } = require('../models/medicalReferral.model');
  let Beneficiary = null;
  try {
    Beneficiary = require('../models/Beneficiary');
  } catch {
    Beneficiary = null;
  }

  const missing = await MedicalReferral.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id beneficiary')
    .lean();

  let resolved = 0;
  let skipped = 0;

  for (const r of missing) {
    let branchId = null;
    if (Beneficiary && r.beneficiary) {
      const b = await Beneficiary.findById(r.beneficiary).select('branchId').lean();
      if (b && b.branchId) branchId = b.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) {
      await MedicalReferral.updateOne({ _id: r._id }, { $set: { branchId } });
    }
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
    log(`W621 MedicalReferral.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────────');
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
  console.error('backfill-referral-branchid failed:', err.message);
  process.exit(2);
});
