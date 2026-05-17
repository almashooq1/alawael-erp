'use strict';

/**
 * care-plan-progress-reviewer.service.js — Wave 44 (P-PRG-010).
 *
 * Pure deterministic Progress Reviewer. Takes per-goal measurement
 * series + attendance + safety events and emits:
 *
 *   • per-goal verdict (continue | revise | close | escalate)
 *   • per-goal suggestedRevision (when applicable)
 *   • holistic verdict (continue_plan | revise_plan | new_plan |
 *     discharge_readiness)
 *   • dischargeReadiness flag
 *   • plan-modification triggers per spec §13.2
 *
 * No LLM. No randomness. Same inputs → same outputs.
 *
 * The reviewer is meant to run periodically (cron) AND on-demand. It
 * does NOT mutate plans — it returns a verdict; the Wave-41 service
 * decides whether to open a new revision flow.
 *
 * Triggers encoded (spec §13.2):
 *   plateau ≥ 6 weeks (one goal)                → revise (that goal)
 *   regression ≥ 3 weeks                        → escalate
 *   attendance < 60% for full cycle             → warn (do NOT revise blindly)
 *   ≥ 80% goals on-track + reviewDate close     → discharge readiness
 *   safety event linked to a goal               → mandatory case conference
 *   reviewDate overdue ≥ 14 d                   → flag
 */

const reg = require('./care-planning.registry');

const VERDICTS = Object.freeze({
  CONTINUE: 'continue',
  REVISE: 'revise',
  CLOSE: 'close',
  ESCALATE: 'escalate',
});

const HOLISTIC_VERDICTS = Object.freeze({
  CONTINUE_PLAN: 'continue_plan',
  REVISE_PLAN: 'revise_plan',
  NEW_PLAN: 'new_plan',
  DISCHARGE_READINESS: 'discharge_readiness',
});

const TREND_STATES = Object.freeze({
  IMPROVING: 'improving',
  PLATEAU: 'plateau',
  REGRESSING: 'regressing',
  INSUFFICIENT_DATA: 'insufficient_data',
});

const THRESHOLDS = Object.freeze({
  PLATEAU_WEEKS: 6,
  REGRESSION_WEEKS: 3,
  ATTENDANCE_FLOOR: 0.6,
  DISCHARGE_ON_TRACK_RATIO: 0.8,
  IMPROVING_SLOPE: 0.05, // per week, normalized to goal target
  REGRESSING_SLOPE: -0.05,
  MIN_POINTS_FOR_TREND: 3,
  OVERDUE_REVIEW_DAYS: 14,
});

// ─── Helpers ───────────────────────────────────────────────────

function parseDate(d) {
  if (!d) return null;
  const ts = d instanceof Date ? d : new Date(d);
  return Number.isNaN(ts.getTime()) ? null : ts;
}

function weeksBetween(a, b) {
  if (!a || !b) return null;
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 7);
}

function safeNumber(x) {
  return typeof x === 'number' && !Number.isNaN(x) ? x : null;
}

/**
 * Compute a simple slope (least-squares) from time-series points.
 * Returns slope per week, or null if insufficient data.
 */
function computeWeeklySlope(series) {
  const points = (series || [])
    .map(p => ({ t: parseDate(p.date), v: safeNumber(p.value) }))
    .filter(p => p.t && typeof p.v === 'number')
    .sort((a, b) => a.t - b.t);

  if (points.length < THRESHOLDS.MIN_POINTS_FOR_TREND) return null;

  const t0 = points[0].t.getTime();
  const xs = points.map(p => (p.t.getTime() - t0) / (1000 * 60 * 60 * 24 * 7)); // weeks
  const ys = points.map(p => p.v);

  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return 0;
  const slope = num / den;
  // Normalize against absolute mean (avoid divide-by-zero)
  const denom = Math.max(1, Math.abs(meanY));
  return slope / denom;
}

function classifyTrend(slope) {
  if (slope == null) return TREND_STATES.INSUFFICIENT_DATA;
  if (slope >= THRESHOLDS.IMPROVING_SLOPE) return TREND_STATES.IMPROVING;
  if (slope <= THRESHOLDS.REGRESSING_SLOPE) return TREND_STATES.REGRESSING;
  return TREND_STATES.PLATEAU;
}

/**
 * Detect consecutive weeks of a given trend at the END of the series.
 * Used to flag "≥ N weeks plateau / regression".
 */
function trailingTrendWeeks(series, expected) {
  const points = (series || [])
    .map(p => ({ t: parseDate(p.date), v: safeNumber(p.value) }))
    .filter(p => p.t && typeof p.v === 'number')
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) return 0;

  let lastImprovingIdx = -1;
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].v - points[i - 1].v;
    const denom = Math.max(1, Math.abs(points[i - 1].v));
    const normalised = delta / denom;
    if (expected === TREND_STATES.PLATEAU) {
      if (Math.abs(normalised) > THRESHOLDS.IMPROVING_SLOPE) {
        lastImprovingIdx = i;
      }
    } else if (expected === TREND_STATES.REGRESSING) {
      if (normalised > THRESHOLDS.REGRESSING_SLOPE) {
        lastImprovingIdx = i;
      }
    }
  }
  const startIdx = lastImprovingIdx === -1 ? 0 : lastImprovingIdx;
  const w = weeksBetween(points[startIdx].t, points[points.length - 1].t);
  return w == null ? 0 : Number(w.toFixed(2));
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Review a single goal's progress signal. Returns a structured verdict.
 *
 * @param {object} signal — { goalId, measureSeries:[{date,value,source}],
 *                           attendance, safetyEventLinked, targetValue,
 *                           successCriterion }
 */
function reviewGoal(signal = {}) {
  const series = signal.measureSeries || [];
  const slope = computeWeeklySlope(series);
  const trend = classifyTrend(slope);

  const points = series
    .map(p => ({ t: parseDate(p.date), v: safeNumber(p.value) }))
    .filter(p => p.t && typeof p.v === 'number')
    .sort((a, b) => a.t - b.t);

  // Plateau / regression duration (trailing)
  const plateauWeeks = trailingTrendWeeks(series, TREND_STATES.PLATEAU);
  const regressionWeeks = trailingTrendWeeks(series, TREND_STATES.REGRESSING);

  // Check target reached
  const lastValue = points.length > 0 ? points[points.length - 1].v : null;
  const target = safeNumber(signal.targetValue);
  const targetReached = target != null && lastValue != null && lastValue >= target;

  let verdict;
  const reasons = [];
  let suggestedRevision = null;
  let caseConferenceRecommended = false;
  let reassessmentNeeded = false;

  // Safety event always escalates
  if (signal.safetyEventLinked) {
    verdict = VERDICTS.ESCALATE;
    reasons.push('safety_event_linked_to_goal');
    caseConferenceRecommended = true;
  } else if (trend === TREND_STATES.REGRESSING && regressionWeeks >= THRESHOLDS.REGRESSION_WEEKS) {
    verdict = VERDICTS.ESCALATE;
    reasons.push(`regression_${regressionWeeks.toFixed(1)}_weeks`);
    reassessmentNeeded = true;
  } else if (targetReached) {
    verdict = VERDICTS.CLOSE;
    reasons.push('target_reached');
  } else if (trend === TREND_STATES.PLATEAU && plateauWeeks >= THRESHOLDS.PLATEAU_WEEKS) {
    verdict = VERDICTS.REVISE;
    reasons.push(`plateau_${plateauWeeks.toFixed(1)}_weeks`);
    suggestedRevision = {
      adjustIntensity: true,
      considerProgramChange: true,
      reassessmentNeeded: false,
    };
  } else if (trend === TREND_STATES.INSUFFICIENT_DATA) {
    verdict = VERDICTS.CONTINUE;
    reasons.push('insufficient_data_for_revision');
  } else {
    verdict = VERDICTS.CONTINUE;
    reasons.push(`trend_${trend}`);
  }

  // Attendance qualifier: low attendance OVERRIDES revise/escalate
  // because the plan didn't actually get a fair test
  const attendance = safeNumber(signal.attendance);
  let attendanceWarning = null;
  if (attendance != null && attendance < THRESHOLDS.ATTENDANCE_FLOOR) {
    attendanceWarning = {
      attendance,
      floor: THRESHOLDS.ATTENDANCE_FLOOR,
      message:
        'attendance below floor — interpret revise/escalate with caution; fix logistics first',
    };
    // Demote escalate to continue+warning if attendance is the likely cause
    // (don't apply to safety events though)
    if (verdict === VERDICTS.REVISE) {
      verdict = VERDICTS.CONTINUE;
      reasons.push('low_attendance_blocks_revise');
    }
  }

  return {
    goalId: signal.goalId,
    verdict,
    reasons,
    trend,
    slope: slope == null ? null : Number(slope.toFixed(4)),
    plateauWeeks,
    regressionWeeks,
    targetReached,
    lastValue,
    suggestedRevision,
    caseConferenceRecommended,
    reassessmentNeeded,
    attendanceWarning,
  };
}

/**
 * Holistic review across all goals + plan-level signals.
 *
 * @param {object} planSignals
 *   - goalSignals: [{...per reviewGoal input}]
 *   - planReviewDueAt: Date | string
 *   - planSafetyEvents: bool | array
 *   - aggregateAttendance: number 0..1
 *   - now: Date (injectable for tests)
 */
function reviewPlan(planSignals = {}) {
  const goalSignals = Array.isArray(planSignals.goalSignals) ? planSignals.goalSignals : [];
  const now = parseDate(planSignals.now) || new Date();
  const perGoal = goalSignals.map(reviewGoal);

  // Aggregate
  const counts = {
    continue: 0,
    revise: 0,
    close: 0,
    escalate: 0,
    total: perGoal.length,
  };
  perGoal.forEach(r => {
    counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  });

  const onTrack = counts.continue + counts.close; // close = target reached, that's good
  const onTrackRatio = perGoal.length > 0 ? onTrack / perGoal.length : 0;

  // Discharge readiness: most goals closed OR clearly on-track + due review
  const dueDate = parseDate(planSignals.planReviewDueAt);
  const reviewDueSoon =
    dueDate && weeksBetween(now, dueDate) != null && weeksBetween(now, dueDate) <= 2;
  const closedRatio = perGoal.length > 0 ? counts.close / perGoal.length : 0;

  let holisticVerdict;
  const reasons = [];

  if (counts.escalate > 0) {
    holisticVerdict = HOLISTIC_VERDICTS.REVISE_PLAN;
    reasons.push(`${counts.escalate}_goals_escalated`);
  } else if (closedRatio >= 0.7) {
    holisticVerdict = HOLISTIC_VERDICTS.DISCHARGE_READINESS;
    reasons.push('70pct_goals_closed');
  } else if (onTrackRatio >= THRESHOLDS.DISCHARGE_ON_TRACK_RATIO && reviewDueSoon) {
    holisticVerdict = HOLISTIC_VERDICTS.DISCHARGE_READINESS;
    reasons.push('80pct_on_track_and_review_due');
  } else if (counts.revise / Math.max(1, counts.total) >= 0.5) {
    holisticVerdict = HOLISTIC_VERDICTS.NEW_PLAN;
    reasons.push('half_or_more_goals_need_revision');
  } else if (counts.revise > 0) {
    holisticVerdict = HOLISTIC_VERDICTS.REVISE_PLAN;
    reasons.push(`${counts.revise}_goals_need_revision`);
  } else {
    holisticVerdict = HOLISTIC_VERDICTS.CONTINUE_PLAN;
    reasons.push('all_goals_on_track_or_continuing');
  }

  // Discharge readiness criteria detail
  const dischargeReadiness = {
    ready: holisticVerdict === HOLISTIC_VERDICTS.DISCHARGE_READINESS,
    criteriaMet: [],
    missing: [],
  };
  if (closedRatio >= 0.7) dischargeReadiness.criteriaMet.push('most_goals_closed');
  else dischargeReadiness.missing.push('most_goals_closed');

  if (onTrackRatio >= THRESHOLDS.DISCHARGE_ON_TRACK_RATIO)
    dischargeReadiness.criteriaMet.push('on_track_ratio_met');
  else dischargeReadiness.missing.push('on_track_ratio_met');

  if (counts.escalate === 0) dischargeReadiness.criteriaMet.push('no_escalations');
  else dischargeReadiness.missing.push('no_escalations');

  // Overdue review flag
  const overdueWeeks = dueDate && now > dueDate ? weeksBetween(dueDate, now) : 0;
  const overdueReview = overdueWeeks * 7 >= THRESHOLDS.OVERDUE_REVIEW_DAYS;

  // Next review date suggestion: 12 weeks default unless escalation
  const nextWeeks = counts.escalate > 0 ? 4 : 12;
  const nextReviewDate = new Date(now.getTime() + nextWeeks * 7 * 86400000);

  return {
    perGoal,
    counts,
    onTrackRatio: Number(onTrackRatio.toFixed(2)),
    closedRatio: Number(closedRatio.toFixed(2)),
    holisticVerdict,
    reasons,
    dischargeReadiness,
    overdueReview,
    overdueDays: Math.round(overdueWeeks * 7),
    nextReviewDate: nextReviewDate.toISOString(),
    triggers: collectTriggers(perGoal, planSignals, now),
    reviewedAt: now.toISOString(),
  };
}

function collectTriggers(perGoal, planSignals, now) {
  const triggers = [];
  for (const g of perGoal) {
    if (g.plateauWeeks >= THRESHOLDS.PLATEAU_WEEKS) {
      triggers.push({
        kind: 'plateau',
        goalId: g.goalId,
        weeks: g.plateauWeeks,
        action: 'review_goal_or_program',
      });
    }
    if (g.regressionWeeks >= THRESHOLDS.REGRESSION_WEEKS) {
      triggers.push({
        kind: 'regression',
        goalId: g.goalId,
        weeks: g.regressionWeeks,
        action: 'reassessment_recommended',
      });
    }
    if (g.caseConferenceRecommended) {
      triggers.push({
        kind: 'safety_event',
        goalId: g.goalId,
        action: 'mandatory_case_conference',
      });
    }
  }
  if (
    typeof planSignals.aggregateAttendance === 'number' &&
    planSignals.aggregateAttendance < THRESHOLDS.ATTENDANCE_FLOOR
  ) {
    triggers.push({
      kind: 'low_attendance',
      attendance: planSignals.aggregateAttendance,
      action: 'fix_logistics_before_modifying_plan',
    });
  }
  const dueDate = parseDate(planSignals.planReviewDueAt);
  if (dueDate && now > dueDate) {
    const w = weeksBetween(dueDate, now);
    if (w != null && w * 7 >= THRESHOLDS.OVERDUE_REVIEW_DAYS) {
      triggers.push({
        kind: 'overdue_review',
        days: Math.round(w * 7),
        action: 'escalate_to_branch_manager',
      });
    }
  }
  return triggers;
}

module.exports = {
  reviewGoal,
  reviewPlan,
  computeWeeklySlope,
  classifyTrend,
  trailingTrendWeeks,
  VERDICTS,
  HOLISTIC_VERDICTS,
  TREND_STATES,
  THRESHOLDS,
};

// Reserved for future registry rebinding via DI
void reg;
