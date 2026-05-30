#!/usr/bin/env node
'use strict';

/**
 * backfill-maintenancerequest-branchid.js — W665 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing MaintenanceRequest docs from the
 * createdBy → requestedBy User.branchId (the raising branch). Dry-run unless
 * `--commit`; only SETS a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-maintenancerequest-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-maintenancerequest-branchid.js --commit
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

  const MaintenanceRequest = require('../models/MaintenanceRequest');
  let User = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }

  const missing = await MaintenanceRequest.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id createdBy requestedBy')
    .lean();

  let resolved = 0;
  let skipped = 0;
  for (const mr of missing) {
    let branchId = null;
    const userId = mr.createdBy || mr.requestedBy;
    if (User && userId) {
      const u = await User.findById(userId).select('branchId').lean();
      if (u && u.branchId) branchId = u.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) await MaintenanceRequest.updateOne({ _id: mr._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromUser: resolved,
    skippedNoAnchor: skipped,
    wouldUpdate: resolved,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W665 MaintenanceRequest.branchId backfill — ${summary.mode}`);
    log('────────────────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from createdBy/req:  ${summary.resolvedFromUser}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-maintenancerequest-branchid failed:', err.message);
  process.exit(2);
});
