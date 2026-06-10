#!/usr/bin/env node
'use strict';

/**
 * operations-health.js — READ-ONLY unified "Branch Operations Health" snapshot (W1195).
 * ════════════════════════════════════════════════════════════════════════════
 * The capstone read view over the golden-thread + supervisor-ops arc. It fuses
 * the FOUR independent health signals the center already exposes as separate
 * CLIs/endpoints into ONE executive snapshot with a single overall grade and a
 * priority-ordered action list — the COO / center-supervisor's single pane:
 *
 *   1. CLINICAL THREAD  — golden-thread completeness (goal→measure→baseline→outcome)
 *                         via scripts/golden-thread-integrity (buildStagePipeline).
 *   2. DOCUMENTATION    — sessions that HAPPENED but are un-documented (the
 *                         supervisor's "In-Process" backlog) via supervisorOps.
 *   3. PRODUCTIVITY     — per-therapist throughput / therapy minutes delivered.
 *   4. OVERDUE REPORTS  — periodic reassessment reports in OVERDUE/ESCALATED/
 *                         BREACHED phase via the W222 reassessment lifecycle.
 *
 * It computes NO new clinical/operational logic — it only re-uses the already
 * tested pure shapers (summarizeThread / documentationBacklog / branchProductivity
 * / summarizeOverdueReports) and folds them through one pure grader. A single
 * read-only pass per dimension. Safe against prod.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js --branch=<branchId>
 *   MONGODB_URI=mongodb://... node scripts/operations-health.js --days=14 --json
 *
 * Exit codes: 0 = snapshot ran · 2 = usage/connection error.
 */

const goldenThread = require('./golden-thread-integrity');
const ops = require('../services/supervisorOps.service');
const reassessmentLifecycle = require('../services/reassessmentLifecycle.service');

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

// Overall operations-health grade band.
const HEALTH_GRADES = Object.freeze(['HEALTHY', 'WATCH', 'AT_RISK', 'NO_DATA']);

/**
 * PURE — fuse the four dimension reports into a single operations-health grade,
 * a 0-100 composite headline, and a priority-ordered action list (the single
 * highest-leverage fix first). No DB / no I/O — unit-testable in isolation.
 *
 * Each dimension contributes a 0-100 score OR `null` when it has no data; the
 * grade considers only dimensions that have data, so an empty branch reads
 * NO_DATA rather than a false AT_RISK.
 *
 * @param {{
 *   thread?: { total?: number, percentages?: Record<string, number>, counts?: Record<string, number> },
 *   documentation?: { completedScanned?: number, documentedRate?: number, awaitingCount?: number },
 *   overdue?: { total?: number, counts?: { OVERDUE?: number, ESCALATED?: number, BREACHED?: number } },
 *   productivity?: { therapistCount?: number }
 * }} parts
 * @returns {{ grade:string, composite:(number|null), scores:object, overdue:object, productivity:object, actions:object[] }}
 */
function gradeOperationsHealth(parts = {}) {
  const thread = parts.thread || {};
  const documentation = parts.documentation || {};
  const overdue = parts.overdue || {};
  const productivity = parts.productivity || {};

  // ── per-dimension scores (0-100) or null when there is no data ──
  const threadScore =
    typeof thread.total === 'number' && thread.total > 0
      ? thread.percentages && typeof thread.percentages.complete === 'number'
        ? thread.percentages.complete
        : 0
      : null;

  const docScanned =
    typeof documentation.completedScanned === 'number' ? documentation.completedScanned : 0;
  const docScore =
    docScanned > 0
      ? typeof documentation.documentedRate === 'number'
        ? documentation.documentedRate
        : 0
      : null;

  const breached = (overdue.counts && overdue.counts.BREACHED) || 0;
  const overdueTotal = typeof overdue.total === 'number' ? overdue.total : 0;

  // ── overall grade (only dimensions with data participate) ──
  const scored = [threadScore, docScore].filter(v => v !== null);
  let grade;
  if (scored.length === 0 && overdueTotal === 0) {
    grade = 'NO_DATA';
  } else {
    const atRisk =
      (threadScore !== null && threadScore < 50) ||
      (docScore !== null && docScore < 60) ||
      breached > 0;
    const watch =
      (threadScore !== null && threadScore < 80) ||
      (docScore !== null && docScore < 85) ||
      overdueTotal > 0;
    grade = atRisk ? 'AT_RISK' : watch ? 'WATCH' : 'HEALTHY';
  }

  // ── composite headline 0-100: mean of scored dims minus an overdue penalty ──
  let composite = null;
  if (scored.length > 0) {
    const mean = scored.reduce((a, b) => a + b, 0) / scored.length;
    const penalty = Math.min(30, breached * 10 + overdueTotal * 2);
    composite = Math.max(0, Math.round(mean - penalty));
  }

  // ── priority-ordered actions (single highest-leverage fix first) ──
  const actions = [];
  if (threadScore !== null && threadScore < 80) {
    const c = thread.counts || {};
    const noLink = c.no_measure_link || 0;
    const noBaseline = c.linked_no_baseline || 0;
    const noOutcome = c.linked_no_outcome || 0;
    const worst =
      noLink >= noBaseline && noLink >= noOutcome
        ? 'link a PRIMARY measure to the goals that have none'
        : noBaseline >= noOutcome
          ? 'capture BASELINE results for measure-linked goals'
          : 'record session PROGRESS to close the outcome loop';
    actions.push({
      priority: threadScore < 50 ? 'P1' : 'P2',
      dimension: 'golden_thread',
      action: `Golden thread ${threadScore}% complete — ${worst}.`,
    });
  }
  if (docScore !== null && docScore < 85) {
    actions.push({
      priority: docScore < 60 ? 'P1' : 'P2',
      dimension: 'documentation',
      action: `Documentation rate ${docScore}% — ${
        documentation.awaitingCount || 0
      } session(s) happened but are un-documented; clear the In-Process backlog.`,
    });
  }
  if (overdueTotal > 0) {
    actions.push({
      priority: breached > 0 ? 'P1' : 'P2',
      dimension: 'overdue_reports',
      action: `${overdueTotal} overdue reassessment report(s)${
        breached > 0 ? ` (${breached} BREACHED)` : ''
      } — complete + finalize.`,
    });
  }
  actions.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'P1' ? -1 : 1));

  return {
    grade,
    composite,
    scores: { thread: threadScore, documentation: docScore },
    overdue: { total: overdueTotal, breached },
    productivity: {
      therapistCount:
        typeof productivity.therapistCount === 'number' ? productivity.therapistCount : 0,
    },
    actions,
  };
}

/**
 * READ-ONLY — gather all four dimension reports for one branch (or all branches
 * when branchId is null) and fold them through the pure grader.
 * @param {import('mongoose')} mongoose
 * @param {{ branchId?: any, sinceDays?: number }} opts
 */
async function gatherBranchHealth(mongoose, opts = {}) {
  const branchId = opts.branchId || null;
  const sinceDays = opts.sinceDays || SINCE_DAYS;

  // 1. CLINICAL THREAD — single read-only aggregation over TherapeuticGoal.
  let thread = { total: 0, counts: {}, percentages: {}, grade: 'NO_DATA', findings: [] };
  try {
    const Goal = mongoose.model('TherapeuticGoal');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = branchId;
    const rows = await Goal.aggregate(goldenThread.buildStagePipeline(match));
    const byStage = {};
    let total = 0;
    for (const r of rows) {
      byStage[r._id] = r.count;
      total += r.count;
    }
    thread = goldenThread.summarizeThread({ total, byStage });
  } catch {
    /* TherapeuticGoal not registered — leave NO_DATA */
  }

  // 2. DOCUMENTATION backlog + 3. PRODUCTIVITY (both over ClinicalSession).
  let documentation = {
    windowDays: sinceDays,
    completedScanned: 0,
    awaitingCount: 0,
    documentedRate: 100,
    byTherapist: {},
  };
  let productivity = { windowDays: sinceDays, therapistCount: 0, byTherapist: {} };
  try {
    documentation = await ops.documentationBacklog({ branchId, sinceDays });
    productivity = await ops.branchProductivity({ branchId, sinceDays });
  } catch {
    /* ClinicalSession not registered — leave zeros */
  }

  // 4. OVERDUE REPORTS — reuse the W222 reassessment lifecycle read-side.
  let overdue = { total: 0, counts: { OVERDUE: 0, ESCALATED: 0, BREACHED: 0 }, tasks: [] };
  try {
    const tasks = await reassessmentLifecycle.listByPhase({ branchId });
    overdue = ops.summarizeOverdueReports(tasks);
  } catch {
    /* reassessment tasks unavailable — leave zeros */
  }

  const grade = gradeOperationsHealth({ thread, documentation, overdue, productivity });
  return {
    branch: branchId ? String(branchId) : 'all',
    windowDays: sinceDays,
    thread,
    documentation,
    productivity,
    overdue,
    grade,
  };
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

// Export the pure grader for unit tests; only run the CLI when invoked directly.
module.exports = { gradeOperationsHealth, gatherBranchHealth, HEALTH_GRADES };

if (require.main === module) {
  main().catch(err => {
    console.error('operations-health failed:', err.message);
    process.exit(2);
  });
}
