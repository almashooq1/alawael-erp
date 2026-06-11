#!/usr/bin/env node
'use strict';

/**
 * session-documentation-audit.js — READ-ONLY supervisor documentation backlog.
 * ════════════════════════════════════════════════════════════════════
 * The "In-Process vs Complete" board (W1169): across a branch, which sessions
 * HAPPENED (status=completed) but are still un-documented (empty SOAP + no goal
 * progress)? Answers the supervisor's "who has documentation pending, and how
 * complete is each therapist's documentation?" — the workflow-cycle's open tail.
 *
 * Builds on supervisorOps.service (W1169). Never mutates — only .find().lean().
 *
 * Usage:
 *   MONGODB_URI=... node scripts/session-documentation-audit.js --branch=<id>
 *   MONGODB_URI=... node scripts/session-documentation-audit.js --branch=<id> --days=14 --json
 *
 * Exit codes: 0 = ran · 2 = usage/connection error.
 */

const JSON_OUT = process.argv.includes('--json');
const BRANCH_ARG = (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;
const DAYS_ARG = parseInt(
  (process.argv.find(a => a.startsWith('--days=')) || '').split('=')[1],
  10
);
const DAYS = Number.isFinite(DAYS_ARG) && DAYS_ARG > 0 ? DAYS_ARG : 7;

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);
  require('../domains/sessions/models/ClinicalSession'); // register model
  const { documentationBacklog } = require('../services/supervisorOps.service');

  const branchId =
    BRANCH_ARG && mongoose.isValidObjectId(BRANCH_ARG)
      ? new mongoose.Types.ObjectId(BRANCH_ARG)
      : null;

  const result = await documentationBacklog({ branchId, sinceDays: DAYS });
  const therapists = Object.entries(result.byTherapist).sort((a, b) => b[1].length - a[1].length);

  if (JSON_OUT) {
    console.log(JSON.stringify({ branch: BRANCH_ARG || 'all', ...result }, null, 2));
  } else {
    log('');
    log(
      `Session documentation backlog (READ-ONLY) — last ${result.windowDays} days${BRANCH_ARG ? ` · branch ${BRANCH_ARG}` : ''}`
    );
    log('──────────────────────────────────────────────────────────────────');
    log(
      `  Completed sessions scanned: ${result.completedScanned}    Documented: ${result.documentedRate}%`
    );
    log(`  Awaiting documentation: ${result.awaitingCount}`);
    log('');
    if (result.awaitingCount === 0) {
      log('  ✓ No documentation backlog — every completed session is documented.');
    } else {
      log('  By therapist (most pending first):');
      for (const [therapistId, rows] of therapists.slice(0, 50)) {
        log(`   • therapist ${therapistId}: ${rows.length} session(s) awaiting documentation`);
      }
      if (therapists.length > 50)
        log(`   … and ${therapists.length - 50} more therapists (use --json).`);
    }
    log('');
  }

  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('session-documentation-audit failed:', err.message);
    process.exit(2);
  });
}
