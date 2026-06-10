'use strict';

/**
 * operationsHealth.service.js — READ-ONLY unified "Branch Operations Health" (W1196).
 * ════════════════════════════════════════════════════════════════════════════
 * Canonical home for the operations-health composition: the pure grader
 * `gradeOperationsHealth()` + the read-only `gatherBranchHealth()` gatherer.
 * Both the CLI (scripts/operations-health.js) AND the live route
 * (domains/goals/routes/supervisor-ops.routes.js → GET /supervisor-ops/operations-health)
 * import from HERE, so the executive snapshot is computed by exactly one code path.
 *
 * It fuses the FOUR independent health signals the center already exposes into
 * ONE snapshot with a single overall grade + priority-ordered action list:
 *   1. CLINICAL THREAD  — golden-thread completeness (goal→measure→baseline→outcome)
 *   2. DOCUMENTATION    — sessions that happened but are un-documented (In-Process)
 *   3. PRODUCTIVITY     — per-therapist throughput / therapy minutes delivered
 *   4. OVERDUE REPORTS  — reassessment reports in OVERDUE/ESCALATED/BREACHED phase
 *
 * Computes NO new clinical/operational logic — re-uses the already-tested pure
 * shapers (summarizeThread / documentationBacklog / branchProductivity /
 * summarizeOverdueReports). A single read-only pass per dimension. Safe vs prod.
 */

// The break-stage histogram pipeline + thread summarizer live in the
// golden-thread-integrity module (pure exports; tests already import them).
const { buildStagePipeline, summarizeThread } = require('../scripts/golden-thread-integrity');
const ops = require('./supervisorOps.service');
const reassessmentLifecycle = require('./reassessmentLifecycle.service');

// Overall operations-health grade band.
const HEALTH_GRADES = Object.freeze(['HEALTHY', 'WATCH', 'AT_RISK', 'NO_DATA']);

const DEFAULT_WINDOW_DAYS = 7;

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
 * when branchId is null) and fold them through the pure grader. Each dimension
 * degrades gracefully (try/catch → empty shape) if its model isn't registered.
 * @param {import('mongoose')} mongoose - the mongoose instance to query through
 * @param {{ branchId?: any, sinceDays?: number }} [opts]
 */
async function gatherBranchHealth(mongoose, opts = {}) {
  const branchId = opts.branchId || null;
  const sinceDays =
    Number.isFinite(opts.sinceDays) && opts.sinceDays > 0 ? opts.sinceDays : DEFAULT_WINDOW_DAYS;

  // 1. CLINICAL THREAD — single read-only aggregation over TherapeuticGoal.
  let thread = { total: 0, counts: {}, percentages: {}, grade: 'NO_DATA', findings: [] };
  try {
    const Goal = mongoose.model('TherapeuticGoal');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = branchId;
    const rows = await Goal.aggregate(buildStagePipeline(match));
    const byStage = {};
    let total = 0;
    for (const r of rows) {
      byStage[r._id] = r.count;
      total += r.count;
    }
    thread = summarizeThread({ total, byStage });
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

module.exports = {
  HEALTH_GRADES,
  DEFAULT_WINDOW_DAYS,
  gradeOperationsHealth,
  gatherBranchHealth,
};
