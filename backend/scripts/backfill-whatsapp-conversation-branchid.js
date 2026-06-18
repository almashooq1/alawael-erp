#!/usr/bin/env node
'use strict';

/**
 * backfill-whatsapp-conversation-branchid.js — W1407 (tenant isolation).
 * ════════════════════════════════════════════════════════════════════
 * Backfills `branchId` on existing WhatsAppConversation docs that predate the
 * W1407 tenancy fix (conversations were scoped by a never-set `organizationId`,
 * leaking across branches; scoping is now by `branchId`).
 *
 * Source of truth: beneficiaryId → Beneficiary.branchId (the only branch anchor
 * a conversation has). Conversations with no matched beneficiary are left unset
 * (reported "skipped") — they remain visible only to cross-branch roles
 * (fail-closed), never leaked to a branch-restricted user.
 *
 * SAFE BY DEFAULT: dry-run unless `--commit` is passed. Only ever SETS branchId
 * on docs where it is currently missing — never overwrites.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/backfill-whatsapp-conversation-branchid.js            # dry-run
 *   MONGODB_URI=mongodb://... node scripts/backfill-whatsapp-conversation-branchid.js --commit   # apply
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

  const Conversation = require('../models/WhatsAppConversation');
  let Beneficiary = null;
  try {
    Beneficiary = require('../models/Beneficiary');
  } catch {
    Beneficiary = null;
  }

  const missing = await Conversation.find({
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  })
    .select('_id beneficiaryId')
    .lean();

  let fromBeneficiary = 0;
  let skipped = 0;

  for (const c of missing) {
    let branchId = null;
    if (Beneficiary && c.beneficiaryId) {
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
      await Conversation.updateOne({ _id: c._id }, { $set: { branchId } });
    }
  }

  const summary = {
    mode: COMMIT ? 'commit' : 'dry-run',
    missingBranchId: missing.length,
    resolvedFromBeneficiary: fromBeneficiary,
    skippedNoAnchor: skipped,
    wouldUpdate: fromBeneficiary,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    log('');
    log(`W1407 WhatsAppConversation.branchId backfill — ${summary.mode}`);
    log('──────────────────────────────────────────────');
    log(`Missing branchId:          ${summary.missingBranchId}`);
    log(`  → from beneficiary:      ${summary.resolvedFromBeneficiary}`);
    log(`  → skipped (no anchor):   ${summary.skippedNoAnchor}`);
    log(`${COMMIT ? 'Updated' : 'Would update'}: ${summary.wouldUpdate}`);
    if (!COMMIT && summary.wouldUpdate > 0) log('Re-run with --commit to apply.');
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('backfill-whatsapp-conversation-branchid failed:', err.message);
  process.exit(2);
});
