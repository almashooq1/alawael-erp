#!/usr/bin/env node
'use strict';

/**
 * backfill-meeting-branchid.js — W635 (R4 denormalization).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing MDTMeeting docs from the (required)
 * organizer's User.branchId (a meeting's branch = its organizer's branch;
 * NOT cases[].beneficiary, which may span beneficiaries). Dry-run unless
 * `--commit`; only SETS a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-meeting-branchid.js          # dry-run
 *   MONGODB_URI=... node scripts/backfill-meeting-branchid.js --commit
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

  const { MDTMeeting } = require('../models/MDTCoordination');
  let User = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }

  const missing = await MDTMeeting.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id organizer')
    .lean();

  let resolved = 0;
  let skipped = 0;
  for (const m of missing) {
    let branchId = null;
    if (User && m.organizer) {
      const u = await User.findById(m.organizer).select('branchId').lean();
      if (u && u.branchId) branchId = u.branchId;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    resolved++;
    if (COMMIT) await MDTMeeting.updateOne({ _id: m._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromOrganizer: resolved,
    skippedNoAnchor: skipped,
    wouldUpdate: resolved,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W635 MDTMeeting.branchId backfill — ${summary.mode}`);
    log('────────────────────────────────────────────');
    log(`Missing branchId:        ${summary.missingBranchId}`);
    log(`  → from organizer:      ${summary.resolvedFromOrganizer}`);
    log(`  → skipped (no anchor): ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-meeting-branchid failed:', err.message);
  process.exit(2);
});
