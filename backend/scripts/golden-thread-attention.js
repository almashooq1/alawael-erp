#!/usr/bin/env node
'use strict';

/**
 * golden-thread-attention.js — READ-ONLY caseload/branch attention triage.
 * ════════════════════════════════════════════════════════════════════
 * The blueprint §4.3 "Smart Attention Queue" at caseload scale: across all
 * beneficiaries of a branch, which ones have the most urgent BROKEN golden
 * threads, and what is the single next-best-action for each? Answers the
 * clinician's morning question — "who do I need to act on first?"
 *
 * Builds on the W1156 traversal + W1158 next-action derivation: it traces each
 * beneficiary and folds the per-beneficiary attention queues into one ranked
 * triage (most-urgent first). Never mutates — only .find().lean() reads.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/golden-thread-attention.js --branch=<branchId>
 *   MONGODB_URI=... node scripts/golden-thread-attention.js --branch=<id> --limit=200 --json
 *
 * Exit codes: 0 = ran · 2 = usage/connection error.
 */

const JSON_OUT = process.argv.includes('--json');
const BRANCH_ARG = (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;
const LIMIT_ARG = parseInt(
  (process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1],
  10
);
const LIMIT = Number.isFinite(LIMIT_ARG) && LIMIT_ARG > 0 ? LIMIT_ARG : 500;

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }
  if (!BRANCH_ARG) {
    console.error('Error: --branch=<branchId> required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  // Load models the traversal needs (register them against the live connection).
  require('../domains/goals/models/TherapeuticGoal');
  require('../domains/sessions/models/ClinicalSession');
  const { attentionForBeneficiaries } = require('../services/goldenThread.service');

  const Beneficiary = mongoose.model('Beneficiary');
  const filter = { isDeleted: { $ne: true } };
  if (mongoose.isValidObjectId(BRANCH_ARG))
    filter.branchId = new mongoose.Types.ObjectId(BRANCH_ARG);

  const beneficiaries = await Beneficiary.find(filter).select('_id').limit(LIMIT).lean();
  const ids = beneficiaries.map(b => b._id);
  const capped = beneficiaries.length >= LIMIT;

  const { rows, summary } = await attentionForBeneficiaries(ids);

  if (JSON_OUT) {
    console.log(
      JSON.stringify({ branch: BRANCH_ARG, scanned: ids.length, capped, summary, rows }, null, 2)
    );
  } else {
    log('');
    log(`Golden-thread caseload attention triage (READ-ONLY) — branch ${BRANCH_ARG}`);
    log('──────────────────────────────────────────────────────────────────');
    log(`  Beneficiaries scanned: ${ids.length}${capped ? ` (capped at --limit=${LIMIT})` : ''}`);
    log(
      `  Needing attention: ${summary.beneficiariesNeedingAttention}    Urgent (P1): ${summary.urgentCount}    Total actions: ${summary.totalActions}`
    );
    log('');
    if (rows.length === 0) {
      log('  ✓ No outstanding attention items — every traced thread is on track.');
    } else {
      log('  Most-urgent first:');
      for (const r of rows.slice(0, 50)) {
        log(
          `   • [P${r.topPriority} ${r.topAction.code}] beneficiary ${r.beneficiaryId} — ${r.attentionCount} item(s): ${r.topAction.action}`
        );
      }
      if (rows.length > 50)
        log(`   … and ${rows.length - 50} more (use --json for the full list).`);
    }
    log('');
    if (capped) {
      log(
        `  NOTE: scan was capped at ${LIMIT} beneficiaries; raise --limit to cover the whole branch.`
      );
      log('');
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('golden-thread-attention failed:', err.message);
    process.exit(2);
  });
}
