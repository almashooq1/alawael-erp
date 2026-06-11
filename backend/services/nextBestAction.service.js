'use strict';

/**
 * nextBestAction.service.js — W1206 (Blueprint 43, R6: محرّك الإجراء الأفضل التالي)
 *
 * The unifying CDSS layer (§4.2): reads the beneficiary state machine + the
 * golden thread + the alert producers and returns ONE ranked action list per
 * beneficiary. READ-ONLY — this service never mutates; recommendations that
 * need a lifecycle (approve/reject) already flow through the W334 AI
 * recommendation queue via the W337/W338 adapters. NBA is the morning-triage
 * read layer on top.
 *
 * Five signal sources, each gathered defensively (Promise.allSettled — a
 * missing model or empty collection degrades to "no signal", never a 500):
 *
 *   1. golden-thread trace      → LINK_MEASURE / CAPTURE_BASELINE /
 *                                 RECORD_PROGRESS / NO_SESSIONS  (W1156/W1158)
 *   2. episode phase machine    → STALE_ASSESSMENT (>14d in assessment phase
 *                                 with an incomplete thread)
 *   3. open MeasureAlerts       → REVIEW_PLAN (plateau/regression/forecast)
 *   4. active goals ≥90%        → SUGGEST_GOAL_CLOSURE
 *   5. latest RiskSnapshot      → ESCALATE_SAFETY (tier high/critical)
 *
 * Every action carries: unified priority (registry), source, evidence.
 * Pure ranking helpers are exported for unit tests.
 */

const mongoose = require('mongoose');
const goldenThread = require('./goldenThread.service');
const registry = require('../intelligence/next-best-action.registry');

function model(name) {
  return mongoose.model(name);
}

const DAY_MS = 24 * 3600 * 1000;

/* ─────────────────────────── pure helpers ─────────────────────────── */

/**
 * PURE — decorate golden-thread actions with unified catalogue metadata.
 */
function decorateThreadActions(nextActions = []) {
  const out = [];
  for (const a of nextActions) {
    const decorated = registry.decorate(a.code, {
      evidence: { goalId: a.goalId ? String(a.goalId) : null, goalTitle: a.title || null },
      detailAr: a.action || null,
    });
    if (decorated) out.push(decorated);
  }
  return out;
}

/**
 * PURE — stale-assessment rule (§4.2 row 1). An episode sitting in an
 * assessment-family phase for > STALE_ASSESSMENT_DAYS while the thread still
 * has goals without baselines (or no goals at all) → STALE_ASSESSMENT.
 */
function deriveStaleAssessment(episode, trace, now = new Date()) {
  if (!episode || episode.status !== 'active') return null;
  if (!registry.ASSESSMENT_PHASES.includes(episode.currentPhase)) return null;

  const phaseEntry = (episode.phases || []).find(
    p => p.name === episode.currentPhase && p.status === 'in_progress'
  );
  const phaseStart =
    (phaseEntry && phaseEntry.startedAt) || episode.startDate || episode.createdAt || null;
  if (!phaseStart) return null;
  const days = Math.floor((now.getTime() - new Date(phaseStart).getTime()) / DAY_MS);
  if (days <= registry.STALE_ASSESSMENT_DAYS) return null;

  const threads = (trace && trace.threads) || [];
  const baselineMissing =
    threads.length === 0 ||
    threads.some(
      t => t.threadStage === 'no_measure_link' || t.threadStage === 'linked_no_baseline'
    );
  if (!baselineMissing) return null;

  return registry.decorate('STALE_ASSESSMENT', {
    evidence: {
      episodeId: String(episode._id),
      phase: episode.currentPhase,
      daysInPhase: days,
    },
  });
}

/**
 * PURE — plan-review rule from open measure alerts (§4.2 row 4). One NBA per
 * alert type present (not per alert — the queue stays readable).
 */
function deriveReviewPlan(alerts = []) {
  const byType = new Map();
  for (const alert of alerts) {
    if (!registry.PLAN_REVIEW_ALERT_TYPES.includes(alert.alertType)) continue;
    if (!byType.has(alert.alertType)) byType.set(alert.alertType, []);
    byType.get(alert.alertType).push(String(alert._id));
  }
  const out = [];
  for (const [alertType, alertIds] of byType) {
    out.push(
      registry.decorate('REVIEW_PLAN', {
        evidence: { alertType, alertIds, count: alertIds.length },
      })
    );
  }
  return out;
}

/**
 * PURE — closure-suggestion rule (§4.2 row 3).
 */
function deriveGoalClosure(goals = []) {
  return goals
    .filter(
      g =>
        g.status === 'active' &&
        typeof g.currentProgress === 'number' &&
        g.currentProgress >= registry.CLOSURE_SUGGESTION_PROGRESS
    )
    .map(g =>
      registry.decorate('SUGGEST_GOAL_CLOSURE', {
        evidence: {
          goalId: String(g._id),
          goalTitle: g.title || null,
          currentProgress: g.currentProgress,
        },
      })
    );
}

/**
 * PURE — safety escalation rule (§4.2 row 5).
 */
function deriveSafetyEscalation(snapshot) {
  if (!snapshot || !registry.SAFETY_TIERS.includes(snapshot.overallTier)) return null;
  return registry.decorate('ESCALATE_SAFETY', {
    evidence: {
      snapshotId: String(snapshot._id),
      tier: snapshot.overallTier,
      score: snapshot.overallScore,
      tierDelta: snapshot.tierDelta || null,
      computedAt: snapshot.computedAt,
    },
  });
}

/**
 * PURE — final ranking: priority asc, then source for stable grouping.
 */
function rankActions(actions = []) {
  return [...actions]
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority || String(a.source).localeCompare(String(b.source)));
}

/* ─────────────────────────── signal gathering ─────────────────────────── */

async function gatherEpisode(beneficiaryId) {
  const EpisodeOfCare = model('EpisodeOfCare');
  return EpisodeOfCare.findOne({ beneficiaryId, status: 'active' })
    .select('status currentPhase phases startDate createdAt')
    .sort({ createdAt: -1 })
    .lean();
}

async function gatherOpenAlerts(beneficiaryId) {
  const MeasureAlert = model('MeasureAlert');
  return MeasureAlert.find({
    beneficiaryId,
    status: 'open',
    alertType: { $in: [...registry.PLAN_REVIEW_ALERT_TYPES] },
  })
    .select('alertType severity firstSeenAt')
    .limit(50)
    .lean();
}

async function gatherActiveGoals(beneficiaryId) {
  const TherapeuticGoal = model('TherapeuticGoal');
  return TherapeuticGoal.find({ beneficiaryId, status: 'active', isDeleted: { $ne: true } })
    .select('title status currentProgress')
    .limit(100)
    .lean();
}

async function gatherLatestRiskSnapshot(beneficiaryId) {
  const RiskSnapshot = model('RiskSnapshot');
  return RiskSnapshot.findOne({ beneficiaryId })
    .select('overallTier overallScore tierDelta computedAt')
    .sort({ computedAt: -1 })
    .lean();
}

/* ─────────────────────────── public surface ─────────────────────────── */

/**
 * Compute the unified ranked Next-Best-Action list for one beneficiary.
 * READ-ONLY. Sources that fail/are unregistered degrade to no-signal.
 */
async function computeForBeneficiary(beneficiaryId, { now = new Date() } = {}) {
  const [traceR, episodeR, alertsR, goalsR, riskR] = await Promise.allSettled([
    goldenThread.traceByBeneficiary(beneficiaryId),
    gatherEpisode(beneficiaryId),
    gatherOpenAlerts(beneficiaryId),
    gatherActiveGoals(beneficiaryId),
    gatherLatestRiskSnapshot(beneficiaryId),
  ]);

  const trace = traceR.status === 'fulfilled' ? traceR.value : null;
  const episode = episodeR.status === 'fulfilled' ? episodeR.value : null;
  const alerts = alertsR.status === 'fulfilled' ? alertsR.value || [] : [];
  const goals = goalsR.status === 'fulfilled' ? goalsR.value || [] : [];
  const risk = riskR.status === 'fulfilled' ? riskR.value : null;

  const degraded = [traceR, episodeR, alertsR, goalsR, riskR]
    .map((r, i) =>
      r.status === 'rejected' ? ['thread', 'episode', 'alerts', 'goals', 'risk'][i] : null
    )
    .filter(Boolean);

  const actions = rankActions([
    deriveSafetyEscalation(risk),
    ...decorateThreadActions(trace ? trace.nextActions : []),
    deriveStaleAssessment(episode, trace, now),
    ...deriveReviewPlan(alerts),
    ...deriveGoalClosure(goals),
  ]);

  return {
    beneficiaryId: String(beneficiaryId),
    generatedAt: now,
    actions,
    summary: {
      total: actions.length,
      urgent: actions.filter(a => a.priority <= 1).length,
      bySource: actions.reduce((acc, a) => {
        acc[a.source] = (acc[a.source] || 0) + 1;
        return acc;
      }, {}),
      threadSummary: trace ? trace.summary : null,
      degradedSources: degraded,
    },
  };
}

/**
 * Batch triage across a caseload (bounded). Returns per-beneficiary rows
 * (only those WITH actions) + an aggregate summary for the queue header.
 */
async function computeForCaseload(beneficiaryIds = []) {
  const rows = [];
  let totalActions = 0;
  let urgentCount = 0;
  for (const id of beneficiaryIds) {
    // Sequential on purpose: caseload sizes are route-capped and each compute
    // already fans out 5 parallel queries — N×5 concurrent would spike Mongo.

    const result = await computeForBeneficiary(id);
    if (result.actions.length === 0) continue;
    totalActions += result.actions.length;
    urgentCount += result.summary.urgent;
    rows.push({
      beneficiaryId: result.beneficiaryId,
      topAction: result.actions[0],
      actionCount: result.actions.length,
      urgent: result.summary.urgent,
    });
  }
  rows.sort((a, b) => a.topAction.priority - b.topAction.priority || b.urgent - a.urgent);
  return {
    rows,
    summary: {
      beneficiariesNeedingAction: rows.length,
      totalActions,
      urgentCount,
    },
  };
}

module.exports = {
  computeForBeneficiary,
  computeForCaseload,
  // pure helpers (unit-tested)
  decorateThreadActions,
  deriveStaleAssessment,
  deriveReviewPlan,
  deriveGoalClosure,
  deriveSafetyEscalation,
  rankActions,
};
