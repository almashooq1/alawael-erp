'use strict';

/**
 * rehabPlanHealth.service.js — READ-ONLY per-beneficiary Rehabilitation Plan Health.
 * ════════════════════════════════════════════════════════════════════════════
 * The beneficiary-level analog of the branch-level operationsHealth service: it
 * answers ONE question for a clinician/case-manager — "is THIS beneficiary's
 * rehabilitation plan on track?" — by FUSING signals that already exist but are
 * scattered (and, for the W44/W50 intelligence, only run on cron):
 *
 *   1. GOAL PROGRESS   — the W44 progress-reviewer (reviewPlan): per-goal trend
 *                        (improving/plateau/regressing) + holistic verdict
 *                        (continue/revise/new_plan) + discharge readiness.
 *   2. GOLDEN THREAD   — goldenThread.traceByBeneficiary: how many goals carry the
 *                        full assessment→measure→baseline→outcome thread.
 *   3. REVIEW CADENCE  — is the plan's reviewDate overdue (W50 SLA bands)?
 *   4. SAFETY/PLATEAU  — triggers surfaced by the W44 reviewer.
 *
 * Computes NO new clinical logic — it re-uses the already-tested PURE functions
 * (reviewPlan / summarizeThread-via-trace) and folds them through one pure grader.
 * A single read-only pass over the beneficiary's active plan + goals. Safe vs prod.
 */

const mongoose = require('mongoose');
const progressReviewer = require('../intelligence/care-plan-progress-reviewer.service');
const goldenThread = require('./goldenThread.service');

// Overall rehab-plan health grade band.
const PLAN_HEALTH_GRADES = Object.freeze([
  'ON_TRACK',
  'DISCHARGE_READY',
  'NEEDS_ATTENTION',
  'AT_RISK',
  'NO_PLAN',
  'NO_DATA',
]);

// The UnifiedCarePlan (DDD) statuses that count as a "live" plan.
const ACTIVE_PLAN_STATUSES = Object.freeze(['active', 'under_review', 'modified']);

// The CarePlanVersion (W41-51 care-planning workflow) statuses that count as a
// "live" approved plan — matches the W44 plateau-detector's eligibleStatuses.
const CARE_PLAN_VERSION_LIVE_STATUSES = Object.freeze([
  'approved',
  'saved_to_record',
  'family_notification_sent',
]);

const REVIEW_OVERDUE_CRITICAL_DAYS = 14;

/**
 * PURE — map one TherapeuticGoal (lean doc) to the W44 reviewer's goal signal.
 * progressHistory[].value → measureSeries[{date,value}]; target.value → targetValue.
 * @param {object} goal
 * @returns {{ goalId:any, measureSeries:object[], targetValue:(number|undefined), attendance:(number|undefined), safetyEventLinked:boolean }}
 */
function buildGoalSignal(goal = {}) {
  const history = Array.isArray(goal.progressHistory) ? goal.progressHistory : [];
  const measureSeries = history
    .map(h => ({
      date: h.recordedAt || h.date || h.createdAt || null,
      value: typeof h.value === 'number' ? h.value : null,
    }))
    .filter(p => p.value !== null);
  const targetValue =
    goal.target && typeof goal.target.value === 'number' ? goal.target.value : undefined;
  return {
    goalId: goal._id,
    measureSeries,
    targetValue,
    attendance: typeof goal.attendance === 'number' ? goal.attendance : undefined,
    safetyEventLinked: Boolean(goal.safetyEventLinked),
  };
}

/**
 * PURE — fuse the goal-progress review + golden-thread summary + review-cadence
 * into ONE plan-health grade + 0-100 composite + priority-ordered action list.
 * No DB / no I/O — unit-testable in isolation.
 *
 * @param {{
 *   hasPlan?: boolean,
 *   goalCount?: number,
 *   review?: { onTrackRatio?: number, holisticVerdict?: string, dischargeReadiness?: { ready?: boolean }, triggers?: object[] },
 *   threadSummary?: { total?: number, completeCount?: number },
 *   reviewOverdueDays?: (number|null)
 * }} parts
 * @returns {{ grade:string, composite:(number|null), signals:object, actions:object[] }}
 */
function gradeRehabPlanHealth(parts = {}) {
  const hasPlan = parts.hasPlan !== false;
  const goalCount = typeof parts.goalCount === 'number' ? parts.goalCount : 0;
  const review = parts.review || {};
  const threadSummary = parts.threadSummary || null;
  const overdueDays =
    typeof parts.reviewOverdueDays === 'number' && parts.reviewOverdueDays > 0
      ? parts.reviewOverdueDays
      : 0;

  const onTrackRatio = typeof review.onTrackRatio === 'number' ? review.onTrackRatio : null;
  const holistic = review.holisticVerdict || null;
  const dischargeReady = Boolean(review.dischargeReadiness && review.dischargeReadiness.ready);
  const triggers = Array.isArray(review.triggers) ? review.triggers : [];
  const safety = triggers.some(t => t && (t.kind === 'safety' || t.kind === 'safety_event'));
  const plateau = triggers.some(t => t && (t.kind === 'plateau' || t.kind === 'regression'));

  const threadPct =
    threadSummary && typeof threadSummary.total === 'number' && threadSummary.total > 0
      ? Math.round((100 * (threadSummary.completeCount || 0)) / threadSummary.total)
      : null;

  // ── grade band ──
  let grade;
  if (!hasPlan) {
    grade = 'NO_PLAN';
  } else if (goalCount === 0) {
    grade = 'NO_DATA';
  } else {
    const atRisk =
      holistic === 'new_plan' ||
      safety ||
      overdueDays >= REVIEW_OVERDUE_CRITICAL_DAYS ||
      (onTrackRatio !== null && onTrackRatio < 0.4);
    const needsAttention =
      holistic === 'revise_plan' ||
      overdueDays > 0 ||
      plateau ||
      (onTrackRatio !== null && onTrackRatio < 0.7) ||
      (threadPct !== null && threadPct < 60);
    if (atRisk) grade = 'AT_RISK';
    else if (dischargeReady) grade = 'DISCHARGE_READY';
    else if (needsAttention) grade = 'NEEDS_ATTENTION';
    else grade = 'ON_TRACK';
  }

  // ── composite 0-100 (only when there is goal data) ──
  let composite = null;
  if (hasPlan && goalCount > 0) {
    const onTrackComponent = onTrackRatio !== null ? onTrackRatio * 100 : 60;
    const threadComponent = threadPct !== null ? threadPct : onTrackComponent;
    let score = Math.round(onTrackComponent * 0.6 + threadComponent * 0.4);
    if (overdueDays >= REVIEW_OVERDUE_CRITICAL_DAYS) score -= 20;
    else if (overdueDays > 0) score -= 10;
    if (safety) score -= 25;
    composite = Math.max(0, Math.min(100, score));
  }

  // ── priority-ordered actions (highest-leverage first) ──
  const actions = [];
  if (safety) {
    actions.push({
      priority: 'P1',
      dimension: 'safety',
      action: 'هدف مرتبط بحدث سلامة — راجِع الخطة وخفّف الخطر فوراً.',
    });
  }
  if (holistic === 'new_plan') {
    actions.push({
      priority: 'P1',
      dimension: 'goal_progress',
      action: 'المراجعة الكلّية توصي بخطة جديدة — أهداف متعدّدة متعثّرة؛ أعِد بناء الخطة.',
    });
  } else if (holistic === 'revise_plan') {
    actions.push({
      priority: 'P2',
      dimension: 'goal_progress',
      action: 'المراجعة الكلّية توصي بمراجعة الخطة — عدّل الأهداف المتعثّرة.',
    });
  }
  if (overdueDays >= REVIEW_OVERDUE_CRITICAL_DAYS) {
    actions.push({
      priority: 'P1',
      dimension: 'review_cadence',
      action: `مراجعة الخطة متأخّرة ${overdueDays} يوماً (حرِجة) — جدوِل المراجعة الآن.`,
    });
  } else if (overdueDays > 0) {
    actions.push({
      priority: 'P2',
      dimension: 'review_cadence',
      action: `مراجعة الخطة متأخّرة ${overdueDays} يوماً — جدوِل المراجعة.`,
    });
  }
  if (plateau) {
    actions.push({
      priority: 'P2',
      dimension: 'goal_progress',
      action: 'أهداف على هضبة/تراجع — راجِع التدخّلات أو خط الأساس.',
    });
  }
  if (threadPct !== null && threadPct < 60) {
    actions.push({
      priority: 'P2',
      dimension: 'golden_thread',
      action: `اكتمال الخيط الذهبي ${threadPct}% — اربط مقاييس/خطوط أساس لإغلاق حلقة النتائج.`,
    });
  }
  if (dischargeReady) {
    actions.push({
      priority: 'P3',
      dimension: 'discharge',
      action: 'جاهزية الخروج: ≥80% من الأهداف على المسار — قيّم خطة الخروج/الانتقال.',
    });
  }
  const rank = { P1: 0, P2: 1, P3: 2 };
  actions.sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9));

  return {
    grade,
    composite,
    signals: {
      goalCount,
      onTrackRatio,
      holisticVerdict: holistic,
      dischargeReady,
      reviewOverdueDays: overdueDays,
      threadCompletePct: threadPct,
      safety,
      plateau,
    },
    actions,
  };
}

function resolveModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

/**
 * READ-ONLY — resolve the beneficiary's current active plan + review cadence,
 * normalised to one shape, preferring the live CarePlanVersion over UnifiedCarePlan.
 * @param {string|ObjectId} beneficiaryId
 * @returns {Promise<({ planId:any, source:string, type:any, status:string, reviewDate:(Date|null) }|null)>}
 */
async function resolveActivePlan(beneficiaryId) {
  const CarePlanVersion = resolveModel('CarePlanVersion');
  if (CarePlanVersion) {
    const cpv = await CarePlanVersion.findOne({
      beneficiaryId,
      status: { $in: CARE_PLAN_VERSION_LIVE_STATUSES },
    })
      .sort({ approvedAt: -1, createdAt: -1 })
      .lean();
    if (cpv) {
      return {
        planId: cpv._id,
        source: 'CarePlanVersion',
        type: cpv.planType,
        status: cpv.status,
        reviewDate: cpv.reviewSchedule ? cpv.reviewSchedule.nextReviewAt || null : null,
      };
    }
  }
  const UnifiedCarePlan = resolveModel('UnifiedCarePlan');
  if (UnifiedCarePlan) {
    const ucp = await UnifiedCarePlan.findOne({
      beneficiaryId,
      status: { $in: ACTIVE_PLAN_STATUSES },
      isDeleted: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .lean();
    if (ucp) {
      return {
        planId: ucp._id,
        source: 'UnifiedCarePlan',
        type: ucp.type,
        status: ucp.status,
        reviewDate: ucp.reviewDate || ucp.nextReviewAt || null,
      };
    }
  }
  return null;
}

/**
 * READ-ONLY — assemble the rehab-plan health snapshot for one beneficiary:
 * load the active UnifiedCarePlan + the beneficiary's TherapeuticGoals, build W44
 * signals, run reviewPlan, trace the golden thread, and grade. Degrades
 * gracefully (NO_PLAN / NO_DATA) when models/data are missing.
 * @param {string|ObjectId} beneficiaryId
 * @param {{ now?: Date }} [opts]
 */
async function assembleBeneficiaryPlanHealth(beneficiaryId, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const TherapeuticGoal = resolveModel('TherapeuticGoal');

  // 1. The active plan + its review cadence. Plan-model fragmentation is real:
  //    PREFER the live CarePlanVersion (the care-planning W41-51 workflow + the
  //    W44/W50 intelligence run on it — review cadence = reviewSchedule.nextReviewAt),
  //    fall back to the DDD UnifiedCarePlan (reviewDate). Normalised to one shape.
  const plan = await resolveActivePlan(beneficiaryId);

  // 2. The beneficiary's goals (canonical TherapeuticGoal, golden-thread-linked,
  //    with progressHistory for the W44 signals).
  let goals = [];
  if (TherapeuticGoal) {
    goals = await TherapeuticGoal.find({ beneficiaryId, isDeleted: { $ne: true } })
      .select('target progressHistory status attendance safetyEventLinked')
      .lean();
  }

  // 3. W44 review (pure) over the goal signals.
  const goalSignals = goals.map(buildGoalSignal);
  const planReviewDueAt = plan ? plan.reviewDate : null;
  const review = progressReviewer.reviewPlan({ goalSignals, now, planReviewDueAt });

  // 4. Golden-thread completeness for this beneficiary.
  let threadSummary = null;
  try {
    const trace = await goldenThread.traceByBeneficiary(beneficiaryId);
    threadSummary = trace && trace.summary ? trace.summary : null;
  } catch {
    /* golden-thread unavailable — leave null */
  }

  // 5. Review-overdue days.
  let reviewOverdueDays = null;
  if (planReviewDueAt) {
    const due = new Date(planReviewDueAt).getTime();
    reviewOverdueDays = Math.floor((now.getTime() - due) / (1000 * 60 * 60 * 24));
  }

  const grade = gradeRehabPlanHealth({
    hasPlan: Boolean(plan),
    goalCount: goals.length,
    review,
    threadSummary,
    reviewOverdueDays,
  });

  return {
    beneficiaryId: String(beneficiaryId),
    generatedAt: now,
    plan, // normalised { planId, source, type, status, reviewDate } | null
    review: {
      holisticVerdict: review.holisticVerdict,
      onTrackRatio: review.onTrackRatio,
      counts: review.counts,
      dischargeReadiness: review.dischargeReadiness,
      triggers: review.triggers,
    },
    threadSummary,
    grade,
  };
}

// ── #3 — branch "plans needing review" worklist (W50 read-side, on-demand) ──

const REVIEW_SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

/**
 * PURE — classify a plan's review-overdue days into the W50 SLA severity band
 * (matches care-plan-overdue-review.scanner: <1d info · 1–13d warning · 14+ critical).
 * Returns null when the review is not yet due (negative overdue).
 * @param {number} overdueDays
 * @returns {('critical'|'warning'|'info'|null)}
 */
function classifyReviewSeverity(overdueDays) {
  if (typeof overdueDays !== 'number' || overdueDays < 0) return null;
  if (overdueDays >= REVIEW_OVERDUE_CRITICAL_DAYS) return 'critical';
  if (overdueDays >= 1) return 'warning';
  return 'info';
}

/**
 * READ-ONLY — the branch worklist of live plans whose review is due/overdue:
 * the on-demand read-side of the W50 overdue-review cron, branch-scoped, sorted
 * most-overdue-first. The supervisor's "which plans need review now" list.
 * @param {{ branchId?: any, now?: Date, limit?: number }} [opts]
 */
async function reviewWorklist(opts = {}) {
  const at = opts.now instanceof Date ? opts.now : new Date();
  const cap = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : 200;
  const counts = { critical: 0, warning: 0, info: 0 };
  const CarePlanVersion = resolveModel('CarePlanVersion');
  if (!CarePlanVersion || !opts.branchId) {
    return { branchId: opts.branchId ? String(opts.branchId) : null, total: 0, counts, items: [] };
  }

  const rows = await CarePlanVersion.find({
    branchId: opts.branchId,
    status: { $in: CARE_PLAN_VERSION_LIVE_STATUSES },
    'reviewSchedule.nextReviewAt': { $ne: null, $lte: at },
  })
    .select('beneficiaryId planType status reviewSchedule')
    .sort({ 'reviewSchedule.nextReviewAt': 1 })
    .limit(cap)
    .lean();

  const items = [];
  for (const r of rows) {
    const due = r.reviewSchedule && r.reviewSchedule.nextReviewAt;
    if (!due) continue;
    const overdueDays = Math.floor((at.getTime() - new Date(due).getTime()) / 86400000);
    const severity = classifyReviewSeverity(overdueDays);
    if (!severity) continue;
    counts[severity] += 1;
    items.push({
      planId: r._id,
      beneficiaryId: r.beneficiaryId,
      planType: r.planType,
      status: r.status,
      dueAt: due,
      overdueDays,
      severity,
    });
  }
  return { branchId: String(opts.branchId), total: items.length, counts, items };
}

module.exports = {
  PLAN_HEALTH_GRADES,
  ACTIVE_PLAN_STATUSES,
  CARE_PLAN_VERSION_LIVE_STATUSES,
  REVIEW_SEVERITIES,
  buildGoalSignal,
  gradeRehabPlanHealth,
  classifyReviewSeverity,
  resolveActivePlan,
  assembleBeneficiaryPlanHealth,
  reviewWorklist,
};
