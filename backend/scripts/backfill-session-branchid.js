#!/usr/bin/env node
'use strict';

/**
 * backfill-session-branchid.js — W647 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing TherapySession docs. Source order:
 *   1. beneficiary → Beneficiary.branchId   (preferred)
 *   2. therapist   → Employee.branchId       (fallback; beneficiary is optional)
 * Dry-run unless `--commit`; only SETS a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-session-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-session-branchid.js --commit
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

  const TherapySession = require('../models/TherapySession');
  const loadOpt = n => {
    try {
      return require(`../models/${n}`);
    } catch {
      try {
        return mongoose.model(n);
      } catch {
        return null;
      }
    }
  };
  const Beneficiary = loadOpt('Beneficiary');
  const Employee = loadOpt('HR/Employee') || loadOpt('Employee');

  const missing = await TherapySession.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id beneficiary therapist')
    .lean();

  let fromBen = 0;
  let fromEmp = 0;
  let skipped = 0;
  for (const s of missing) {
    let branchId = null;
    if (Beneficiary && s.beneficiary) {
      const b = await Beneficiary.findById(s.beneficiary).select('branchId').lean();
      if (b && b.branchId) {
        branchId = b.branchId;
        fromBen++;
      }
    }
    if (!branchId && Employee && s.therapist) {
      const e = await Employee.findById(s.therapist).select('branchId').lean();
      if (e && e.branchId) {
        branchId = e.branchId;
        fromEmp++;
      }
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    if (COMMIT) await TherapySession.updateOne({ _id: s._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromBeneficiary: fromBen,
    resolvedFromTherapist: fromEmp,
    skippedNoAnchor: skipped,
    wouldUpdate: fromBen + fromEmp,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W647 TherapySession.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from beneficiary:    ${summary.resolvedFromBeneficiary}`);
    log(`  → from therapist:      ${summary.resolvedFromTherapist}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-session-branchid failed:', err.message);
  process.exit(2);
});
