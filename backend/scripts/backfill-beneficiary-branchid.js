#!/usr/bin/env node
'use strict';

/**
 * backfill-beneficiary-branchid.js — W926.
 * ════════════════════════════════════════════════════════════════════
 * Repairs Beneficiary docs created before the W926 fix, which saved with
 * `branchId = null` (the POST /api/v1/beneficiaries handler never stamped
 * the creator's branch). Those orphaned records are invisible to the
 * branch-scoped list query (branchFilter), so registration "looked" lost.
 *
 * Anchor for resolving the branch = the creating user's branch
 * (`createdBy` → User.branchId). A beneficiary has no other reliable
 * branch signal at creation time. Records with no resolvable anchor are
 * skipped (left null) and reported, never guessed.
 *
 * Dry-run unless `--commit`; only SETS a missing branchId, never overwrites.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/backfill-beneficiary-branchid.js              # dry-run
 *   MONGODB_URI=... node scripts/backfill-beneficiary-branchid.js --commit
 *   MONGODB_URI=... node scripts/backfill-beneficiary-branchid.js --branch=<id>  # fallback for unanchored
 *   ... --json
 */

const COMMIT = process.argv.includes('--commit');
const JSON_OUT = process.argv.includes('--json');
const FALLBACK_BRANCH =
  (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;
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

  const Beneficiary = require('../models/Beneficiary');
  let User = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }

  // Treat both the canonical `branchId` and the legacy `branch_id` alias as
  // present — only repair docs that have neither.
  const missing = await Beneficiary.find({
    $and: [
      { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
      { $or: [{ branch_id: { $exists: false } }, { branch_id: null }] },
    ],
  })
    .select('_id createdBy')
    .lean();

  let resolvedFromCreator = 0;
  let resolvedFromFallback = 0;
  let skipped = 0;
  const updates = [];
  for (const b of missing) {
    let branchId = null;
    if (User && b.createdBy) {
      const u = await User.findById(b.createdBy).select('branchId').lean();
      if (u && u.branchId) branchId = u.branchId;
    }
    if (!branchId && FALLBACK_BRANCH) {
      branchId = FALLBACK_BRANCH;
      if (branchId) resolvedFromFallback++;
    } else if (branchId) {
      resolvedFromCreator++;
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    updates.push({ _id: b._id, branchId });
    if (COMMIT) await Beneficiary.updateOne({ _id: b._id }, { $set: { branchId } });
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromCreator,
    resolvedFromFallback,
    skippedNoAnchor: skipped,
    wouldUpdate: updates.length,
  };
  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W926 Beneficiary.branchId backfill — ${summary.mode}`);
    log('───────────────────────────────────────────');
    log(`Missing branchId:          ${summary.missingBranchId}`);
    log(`  → from creator's branch: ${summary.resolvedFromCreator}`);
    log(`  → from --branch fallback:${summary.resolvedFromFallback}`);
    log(`  → skipped (no anchor):   ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    if (summary.skippedNoAnchor > 0) {
      log(
        `Tip: ${summary.skippedNoAnchor} record(s) had no resolvable creator branch — ` +
          're-run with --branch=<branchId> to assign them explicitly.'
      );
    }
    log('');
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-beneficiary-branchid failed:', err.message);
  process.exit(2);
});
