#!/usr/bin/env node
'use strict';

/**
 * backfill-safetyincident-branchid.js — W664 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing SafetyIncident docs from the (required)
 * reporter's User.branchId (the incident's filing branch; `location` is
 * free text, not a Branch ref). Dry-run unless `--commit`; only SETS a
 * missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-safetyincident-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-safetyincident-branchid.js --commit
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

  const { SafetyIncident } = require('../models/HSE');
  let User = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }

  const missing = await SafetyIncident.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id reportedBy')
    .lean();

  let resolved = 0;
  let skipped = 0;
  for (const inc of missing) {
    let branchId = null;
    if (User && inc.reportedBy) {
      const u = await User.findById(inc.reportedBy).select('branchId').lean();
      if (u && u.branchId) branchId = u.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) await SafetyIncident.updateOne({ _id: inc._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromReporter: resolved,
    skippedNoAnchor: skipped,
    wouldUpdate: resolved,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W664 SafetyIncident.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from reporter:       ${summary.resolvedFromReporter}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-safetyincident-branchid failed:', err.message);
  process.exit(2);
});
