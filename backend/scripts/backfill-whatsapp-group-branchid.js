#!/usr/bin/env node
'use strict';

/**
 * backfill-whatsapp-group-branchid.js — W1412 (tenant isolation).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing WhatsAppContactGroup docs that predate the
 * W1412 fix (groups were scoped by a never-set `organizationId`, leaking across
 * branches; scoping is now by `branchId`).
 *
 * Source of truth: createdBy → User.branchId (the group's creator's branch).
 * Groups whose creator has no branch (or no createdBy) are left unset
 * (reported "skipped") — they remain visible only to cross-branch roles
 * (fail-closed), never leaked to a branch-restricted user.
 *
 * SAFE BY DEFAULT: dry-run unless `--commit` is passed. Only ever SETS branchId
 * on docs where it is currently missing — never overwrites.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/backfill-whatsapp-group-branchid.js            # dry-run
 *   MONGODB_URI=mongodb://... node scripts/backfill-whatsapp-group-branchid.js --commit   # apply
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

  const Group = require('../models/WhatsAppContactGroup');
  let User = null;
  try {
    User = require('../models/User');
  } catch {
    User = null;
  }

  const missing = await Group.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id createdBy')
    .lean();

  let fromCreator = 0;
  let skipped = 0;

  for (const g of missing) {
    let branchId = null;
    if (User && g.createdBy) {
      const u = await User.findById(g.createdBy).select('branchId').lean();
      if (u && u.branchId) {
        branchId = u.branchId;
        fromCreator++;
      }
    }
    if (!branchId) {
      skipped++;
      continue;
    }
    if (COMMIT) {
      await Group.updateOne({ _id: g._id }, { $set: { branchId } });
    }
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromCreator: fromCreator,
    skippedNoAnchor: skipped,
    wouldUpdate: fromCreator,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W1412 WhatsAppContactGroup.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────────');
    log(`Missing branchId:          ${summary.missingBranchId}`);
    log(`  → from creator (User):   ${summary.resolvedFromCreator}`);
    log(`  → skipped (no anchor):   ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-whatsapp-group-branchid failed:', err.message);
  process.exit(2);
});
