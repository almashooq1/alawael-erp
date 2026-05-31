#!/usr/bin/env node
'use strict';

/**
 * backfill-complaint-branchid.js — W613 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing Complaint docs that predate the W613
 * tenancy denormalization. Source of truth (in priority order):
 *   1. submittedBy → User.branchId        (the filer's branch)
 *   2. beneficiaryId → Beneficiary.branchId (the linked beneficiary)
 * Docs that resolve to neither are left unset (reported as "skipped" —
 * e.g. legacy customer/anonymous complaints with no branch anchor).
 *
 * SAFE BY DEFAULT: dry-run unless `--commit` is passed. Only ever SETS
 * branchId on docs where it is currently missing — never overwrites.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/backfill-complaint-branchid.js            # dry-run
 *   MONGODB_URI=mongodb://... node scripts/backfill-complaint-branchid.js --commit   # apply
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

  const Complaint = require('../models/Complaint');
  let User = null;
  let Beneficiary = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }
  try {
    Beneficiary = require('../models/Beneficiary');
  } catch {
    Beneficiary = null;
  }

  const missing = await Complaint.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id submittedBy beneficiaryId')
    .lean();

  let fromUser = 0;
  let fromBeneficiary = 0;
  let skipped = 0;

  for (const c of missing) {
    let branchId = null;
    if (User && c.submittedBy) {
      const u = await User.findById(c.submittedBy).select('branchId').lean();
      if (u && u.branchId) {
        branchId = u.branchId;
        fromUser++;
      }
    }
    if (!branchId && Beneficiary && c.beneficiaryId) {
      const b = await Beneficiary.findById(c.beneficiaryId).select('branchId').lean();
      if (b && b.branchId) {
        branchId = b.branchId;
        fromBeneficiary++;
      }
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    if (COMMIT) {
      await Complaint.updateOne({ _id: c._id }, { $set: { branchId } });
    }
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromUser: fromUser,
    resolvedFromBeneficiary: fromBeneficiary,
    skippedNoAnchor: skipped,
    wouldUpdate: fromUser + fromBeneficiary,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W613 Complaint.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from filer (User):   ${summary.resolvedFromUser}`);
    log(`  → from beneficiary:    ${summary.resolvedFromBeneficiary}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-complaint-branchid failed:', err.message);
  process.exit(2);
});
