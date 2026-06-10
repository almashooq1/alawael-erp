#!/usr/bin/env node
'use strict';

/**
 * operations-health.js — READ-ONLY unified "Branch Operations Health" CLI (W1195/W1196).
 * ════════════════════════════════════════════════════════════════════════════
 * Thin CLI over services/operationsHealth.service.js (the canonical composition,
 * also served live at GET /api(/v1)/goals/supervisor-ops/operations-health). It
 * fuses the FOUR independent health signals the center already exposes into ONE
 * executive snapshot with a single overall grade and a priority-ordered action
 * list — the COO / center-supervisor's single pane:
 *
 *   1. CLINICAL THREAD  — golden-thread completeness (goal→measure→baseline→outcome)
 *   2. DOCUMENTATION    — sessions that HAPPENED but are un-documented (In-Process)
 *   3. PRODUCTIVITY     — per-therapist throughput / therapy minutes delivered
 *   4. OVERDUE REPORTS  — reassessment reports in OVERDUE/ESCALATED/BREACHED phase
 *
 * Computes NO new logic — re-uses the already-tested pure shapers via the
 * service. A single read-only pass per dimension. Safe against prod.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js --branch=<branchId>
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js --days=14 --json
 *
 * Exit codes: 0 = snapshot ran · 2 = usage/connection error.
 */

const {
  gatherBranchHealth,
  gradeOperationsHealth,
  HEALTH_GRADES,
} = require('../services/operationsHealth.service');

const JSON_OUT = process.argv.includes('--json');
const BRANCH_ARG = (process.argv.find(a => a.startsWith('--branch=')) || '').split('=')[1] || null;
const DAYS_ARG = parseInt(
  (process.argv.find(a => a.startsWith('--days=')) || '').split('=')[1],
  10
);
const SINCE_DAYS = Number.isFinite(DAYS_ARG) && DAYS_ARG > 0 ? DAYS_ARG : 7;

function log(...a) {
  if (!JSON_OUT) console.log(...a);
}

function printReport(r) {
  const g = r.grade;
  log('');
  log(`Branch Operations Health (READ-ONLY) — branch ${r.branch}, window ${r.windowDays}d`);
  log('════════════════════════════════════════════════════════════════════');
  log(`  OVERALL: ${g.grade}${g.composite !== null ? `   (composite ${g.composite}/100)` : ''}`);
  log('');
  log(
    `  1. Clinical thread     ${g.scores.thread === null ? 'NO_DATA' : g.scores.thread + '% complete'}   [${r.thread.grade}]`
  );
  log(
    `     goals: ${r.thread.total}   no-link ${r.thread.counts.no_measure_link || 0} · no-baseline ${r.thread.counts.linked_no_baseline || 0} · no-outcome ${r.thread.counts.linked_no_outcome || 0}`
  );
  log(
    `  2. Documentation       ${g.scores.documentation === null ? 'NO_DATA' : g.scores.documentation + '% documented'}`
  );
  log(
    `     happened: ${r.documentation.completedScanned}   awaiting documentation: ${r.documentation.awaitingCount}`
  );
  log(`  3. Productivity         therapists active: ${g.productivity.therapistCount}`);
  log(
    `  4. Overdue reports      ${g.overdue.total}${g.overdue.breached ? ` (${g.overdue.breached} BREACHED)` : ''}`
  );
  log('');
  if (g.actions.length === 0) {
    log('  ✓ No priority actions — all dimensions healthy.');
  } else {
    log('  Priority actions (highest-leverage first):');
    for (const a of g.actions) log(`    [${a.priority}] ${a.action}`);
  }
  log('');
  log('  This snapshot is read-only. It fuses golden-thread + documentation +');
  log('  productivity + overdue-reports into one grade. Drill into any dimension');
  log('  with: audit:golden-thread · supervisor-ops/documentation-backlog · overdue-reports.');
  log('');
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable required.');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI);

  let branchId = null;
  if (BRANCH_ARG && mongoose.isValidObjectId(BRANCH_ARG)) {
    branchId = new mongoose.Types.ObjectId(BRANCH_ARG);
  }

  const report = await gatherBranchHealth(mongoose, { branchId, sinceDays: SINCE_DAYS });

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  await mongoose.disconnect();
  process.exit(0);
}

// Re-export the service helpers so existing importers/tests keep working; only
// run the CLI when invoked directly.
module.exports = { gradeOperationsHealth, gatherBranchHealth, HEALTH_GRADES };

if (require.main === module) {
  main().catch(err => {
    console.error('operations-health failed:', err.message);
    process.exit(2);
  });
}
