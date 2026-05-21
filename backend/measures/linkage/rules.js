'use strict';

/**
 * measures/linkage/rules.js — Wave 235
 *
 * Pure decision logic for the Goal-Measure Linkage layer. No DB, no I/O.
 * The orchestrator in services/goalMeasureLinkage.service.js feeds in
 * resolved context (goal + measures + W232 interpretations) and these
 * helpers return weighted progress + structured recommendations.
 *
 * Public functions:
 *   weightedProgress(links, interpretations) → { score, status, breakdown }
 *   modifyDecision(link, interpretation, context)        → Q2
 *   addSecondaryDecision(link, interpretation)           → Q3
 *   unlinkDecision(link, measure, beneficiary)           → Q4
 *   closeAchievedDecision(goal, links, interpretations)  → Q5
 *   closeFailedDecision(goal, links, interpretations)    → Q6
 *
 * `interpretation` shape (from W232):
 *   { category, confidence, caveats, numbers?, references? }
 *
 * Decision return shape (uniform):
 *   { recommend: boolean, action: string, reasoning: string[], blockers: string[] }
 *
 *   - recommend=true  → UI surfaces the action
 *   - recommend=false → action not appropriate; reasoning still listed
 *   - blockers        → hard gates that must clear before the action runs
 */

// ─── Category-to-score mapping ─────────────────────────────────────────
// 0..1 scale where 1.0 = goal fully met by this measure, 0 = failing.
// INSUFFICIENT_DATA is intentionally `null` → excluded from the mean.
const CATEGORY_SCORE = Object.freeze({
  SUSTAINED_IMPROVEMENT: 1.0,
  CEILING_ACHIEVED: 1.0,
  SLOW_PROGRESS: 0.6,
  STABLE: 0.3,
  MIXED_DOMAINS: 0.3,
  PLATEAU: 0.2,
  OSCILLATION: 0.2,
  STAGNANT: 0.1,
  REGRESSION: 0.0,
  INSUFFICIENT_DATA: null, // excluded
});

// Goal-progress status bands (worst-wins for the overall objective).
const PROGRESS_BANDS = Object.freeze([
  { min: 0.75, status: 'achieved_pending', label: 'achieved (pending clinician sign-off)' },
  { min: 0.4, status: 'progressing', label: 'progressing' },
  { min: 0.15, status: 'at_risk', label: 'at risk' },
  { min: 0, status: 'failing', label: 'failing — mandatory review' },
]);

function _safeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function _bandForScore(score) {
  if (score == null) return { status: 'insufficient_data', label: 'insufficient data' };
  for (const band of PROGRESS_BANDS) {
    if (score >= band.min) return band;
  }
  return PROGRESS_BANDS[PROGRESS_BANDS.length - 1];
}

// ─── weightedProgress ──────────────────────────────────────────────────

/**
 * @param {Array} links             — objective.measureLinks (contributing only — caller filters)
 * @param {Map|Object} interpretations — keyed by String(measureId) → W232 result
 * @returns {{ score: number|null, status: string, label: string, breakdown: Array }}
 */
function weightedProgress(links, interpretations) {
  if (!Array.isArray(links) || links.length === 0) {
    return { score: null, status: 'insufficient_data', label: 'no links', breakdown: [] };
  }
  const get = key =>
    interpretations instanceof Map ? interpretations.get(key) : interpretations?.[key];

  let weightedSum = 0;
  let weightUsed = 0;
  const breakdown = [];

  for (const link of links) {
    const interp = get(String(link.measureId));
    const cat = interp?.category;
    const baseScore = cat ? CATEGORY_SCORE[cat] : null;
    const weight = _safeNumber(link.weight) ?? 0;

    breakdown.push({
      measureId: String(link.measureId),
      measureCode: link.measureCode,
      linkType: link.linkType,
      weight,
      category: cat || 'NO_INTERPRETATION',
      score: baseScore,
      contributedToAvg: baseScore != null && weight > 0,
      // W243 — origIndex into goal.objectives[N].measureLinks[]. Callers
      // that enrich `links` with `_origIndex` (see service layer) get this
      // bubbled to the UI so the review/unlink modal can target the right
      // slot in the un-filtered array. Falls back to null for legacy
      // callers that pass raw filtered arrays.
      linkIndex: typeof link._origIndex === 'number' ? link._origIndex : null,
    });

    if (baseScore == null || weight <= 0) continue;
    weightedSum += baseScore * weight;
    weightUsed += weight;
  }

  if (weightUsed === 0) {
    return { score: null, status: 'insufficient_data', label: 'no interpretations', breakdown };
  }
  // Renormalize when some links contributed null — preserves intent that
  // weights sum to 1.0 when all measurable but degrades gracefully when
  // a SECONDARY has no data yet.
  const score = weightedSum / weightUsed;
  const band = _bandForScore(score);
  return {
    score: Number(score.toFixed(3)),
    status: band.status,
    label: band.label,
    breakdown,
  };
}

// ─── modifyDecision (Q2) ──────────────────────────────────────────────

/**
 * Should this link's expectedTarget or measure be modified?
 *
 * Trigger conditions (any → recommend=true):
 *   • PRIMARY link interpretation = STAGNANT and history.length >= 5
 *   • interpretation = PLATEAU and plateauDays > plannedDurationDays/2
 *   • ALL contributing links flagged
 *
 * Action priority within recommend=true:
 *   1. lower_target  — expectedTarget unrealistic
 *   2. extend_date   — timeline too aggressive
 *   3. change_measure— W218 strategist replacement
 *   4. close_goal    — last resort, requires sign-off
 */
function modifyDecision(link, interpretation, context = {}) {
  if (!link) return { recommend: false, action: null, reasoning: ['no link'], blockers: [] };
  const reasoning = [];
  const blockers = [];

  if (link.linkType !== 'PRIMARY') {
    return {
      recommend: false,
      action: null,
      reasoning: ['modifyDecision only meaningful for PRIMARY link'],
      blockers,
    };
  }

  const cat = interpretation?.category;
  const n = context.historyCount ?? interpretation?.references?.historyCount ?? 0;
  const plateauDays = context.plateauDays ?? 0;
  const plannedDurationDays = context.plannedDurationDays ?? 180;

  let trigger = null;
  if (cat === 'STAGNANT' && n >= 5) trigger = 'STAGNANT_AFTER_5';
  else if (cat === 'PLATEAU' && plateauDays > plannedDurationDays / 2)
    trigger = 'PLATEAU_HALF_DURATION';
  else if (context.allLinksFlagged === true) trigger = 'ALL_LINKS_FLAGGED';

  if (!trigger) {
    return {
      recommend: false,
      action: null,
      reasoning: [`category=${cat || 'unknown'}: no modification trigger`],
      blockers,
    };
  }

  reasoning.push(`trigger=${trigger}`);

  // Decide action.
  let action;
  if (cat === 'STAGNANT') {
    action = 'lower_target';
    reasoning.push('STAGNANT suggests target is unrealistic for this beneficiary');
  } else if (cat === 'PLATEAU') {
    action = 'change_measure';
    reasoning.push('PLATEAU on PRIMARY suggests the measure is ceiling-bound for this case');
  } else {
    action = 'extend_date';
    reasoning.push('All links flagged — first try extending timeline before scope change');
  }

  // Blockers — locked baseline required so changes are auditable
  if (!context.baselineLocked) {
    blockers.push('baseline must be locked before modify');
  }

  return { recommend: blockers.length === 0, action, reasoning, blockers };
}

// ─── addSecondaryDecision (Q3) ────────────────────────────────────────

/**
 * Should a SECONDARY link be added? Trigger:
 *   PRIMARY.mcid is missing (fell back to %-of-range)
 *   AND history.length >= 3
 *   AND interpretation caveats include 'mcidMissing' marker
 */
function addSecondaryDecision(link, interpretation) {
  if (!link || link.linkType !== 'PRIMARY') {
    return { recommend: false, action: null, reasoning: ['PRIMARY link required'], blockers: [] };
  }
  const reasoning = [];
  const caveats = interpretation?.caveats || [];
  const mcidMissing =
    caveats.some(c => /MCID derived from percent-of-range/i.test(c)) ||
    interpretation?.numbers?.mcidMissing === true;
  const n = interpretation?.references?.historyCount ?? 0;

  if (!mcidMissing) {
    return {
      recommend: false,
      action: null,
      reasoning: ['PRIMARY measure has established MCID'],
      blockers: [],
    };
  }
  if (n < 3) {
    return {
      recommend: false,
      action: null,
      reasoning: [`only ${n} admins — too early`],
      blockers: [],
    };
  }

  reasoning.push('PRIMARY MCID is a percent-of-range fallback');
  reasoning.push(`history (${n}) is enough to commit to a co-measure`);
  return {
    recommend: true,
    action: 'add_secondary_with_established_mcid',
    reasoning,
    blockers: [],
  };
}

// ─── unlinkDecision (Q4) ──────────────────────────────────────────────

/**
 * Should this link be unlinked?
 *
 * Trigger conditions (any):
 *   • measure.status ∈ {deprecated, retired}
 *   • measure.supersededBy.measureCode is set
 *   • linkType=CONTRAINDICATED + 3+ reviews all 'continue' (mis-tagged)
 *   • beneficiary.status='discharged' AND link.weight < 0.5 (peripheral link)
 */
function unlinkDecision(link, measure, beneficiary) {
  const reasoning = [];
  const blockers = [];

  if (!link) return { recommend: false, action: null, reasoning: ['no link'], blockers };
  if (link.status === 'unlinked') {
    return { recommend: false, action: null, reasoning: ['already unlinked'], blockers };
  }

  if (measure && (measure.status === 'deprecated' || measure.status === 'retired')) {
    reasoning.push(`measure status=${measure.status}`);
    return {
      recommend: true,
      action: measure?.supersededBy?.measureCode ? 'unlink_and_replace' : 'unlink',
      reasoning,
      blockers,
    };
  }
  if (measure?.supersededBy?.measureCode) {
    reasoning.push(`measure superseded by ${measure.supersededBy.measureCode}`);
    return { recommend: true, action: 'unlink_and_replace', reasoning, blockers };
  }
  if (link.linkType === 'CONTRAINDICATED') {
    const continueCount = (link.reviewHistory || []).filter(r => r.verdict === 'continue').length;
    if (continueCount >= 3) {
      reasoning.push('CONTRAINDICATED but 3+ reviews continued — likely mis-tagged');
      return { recommend: true, action: 'retag_or_unlink', reasoning, blockers };
    }
  }
  if (beneficiary?.status === 'discharged' && (link.weight ?? 1) < 0.5) {
    reasoning.push('beneficiary discharged + peripheral link');
    return { recommend: true, action: 'unlink', reasoning, blockers };
  }

  return { recommend: false, action: null, reasoning: ['no unlink trigger met'], blockers };
}

// ─── closeAchievedDecision (Q5) ───────────────────────────────────────

/**
 * Should the goal be closed as 'achieved'? Cumulative conditions — all
 * must hold:
 *   1. weighted score >= 0.75
 *   2. PRIMARY interpretation ∈ {SUSTAINED_IMPROVEMENT, CEILING_ACHIEVED}
 *   3. latest admin within 30 days
 *   4. baseline locked
 *   5. no open REGRESSION alerts on any contributing link
 *
 * Clinician sign-off remains required — function returns recommend=true
 * but never auto-closes.
 */
function closeAchievedDecision(goal, links, interpretations) {
  const reasoning = [];
  const blockers = [];
  const get = k => (interpretations instanceof Map ? interpretations.get(k) : interpretations?.[k]);

  const contributing = (links || []).filter(
    l => l.linkType !== 'CONTRAINDICATED' && l.status !== 'unlinked'
  );
  const primary = contributing.find(l => l.linkType === 'PRIMARY');
  if (!primary) {
    blockers.push('no PRIMARY link');
    return { recommend: false, action: null, reasoning, blockers };
  }
  const wp = weightedProgress(contributing, interpretations);
  if (wp.score == null || wp.score < 0.75) {
    blockers.push(`weighted score ${wp.score ?? 'n/a'} < 0.75`);
  }
  const primaryInterp = get(String(primary.measureId));
  const goodCat = ['SUSTAINED_IMPROVEMENT', 'CEILING_ACHIEVED'];
  if (!primaryInterp || !goodCat.includes(primaryInterp.category)) {
    blockers.push(
      `PRIMARY interpretation must be SUSTAINED_IMPROVEMENT or CEILING_ACHIEVED (got ${primaryInterp?.category || 'none'})`
    );
  }
  const latestDate =
    primaryInterp?.numbers?.currentDate || primaryInterp?.references?.currentApplicationId;
  // We don't have direct date in interpretation; allow ageDaysFromCurrentAdmin via context if passed.
  // For correctness we use the daysSinceBaseline + (history-driven) freshness check elsewhere.
  // Here we accept the interpretation's freshness via `staleness=false` signal.
  if (primaryInterp?.signals?.staleness === true) {
    blockers.push('latest PRIMARY admin is stale');
  }
  // Open REGRESSION alerts
  const hasRegressionAlert = contributing.some(l => {
    const interp = get(String(l.measureId));
    return interp?.category === 'REGRESSION';
  });
  if (hasRegressionAlert) blockers.push('open REGRESSION on a contributing link');

  if (blockers.length > 0) {
    return { recommend: false, action: null, reasoning, blockers };
  }
  reasoning.push(`weighted=${wp.score}, PRIMARY=${primaryInterp.category}`);
  return {
    recommend: true,
    action: 'recommend_close_achieved_with_signoff',
    reasoning,
    blockers,
  };
}

// ─── closeFailedDecision (Q6) ─────────────────────────────────────────

/**
 * Should the goal be closed as 'not_achieved'?
 *
 * Cumulative conditions:
 *   1. weighted score < 0.15 for at least 60 days (context.daysAtFailing)
 *   2. PRIMARY interpretation ∈ {REGRESSION, STAGNANT}
 *   3. ≥ 2 modify attempts already recorded (context.modifyAttempts)
 *   4. NOT auto-closeable — requires MDT review (returned as blocker)
 */
function closeFailedDecision(goal, links, interpretations, context = {}) {
  const reasoning = [];
  const blockers = [];
  const get = k => (interpretations instanceof Map ? interpretations.get(k) : interpretations?.[k]);

  const contributing = (links || []).filter(
    l => l.linkType !== 'CONTRAINDICATED' && l.status !== 'unlinked'
  );
  const primary = contributing.find(l => l.linkType === 'PRIMARY');
  if (!primary) return { recommend: false, action: null, reasoning, blockers: ['no PRIMARY link'] };

  const wp = weightedProgress(contributing, interpretations);
  const passingScore = wp.score != null && wp.score < 0.15;
  if (!passingScore) blockers.push(`weighted score ${wp.score ?? 'n/a'} not < 0.15`);
  if ((context.daysAtFailing ?? 0) < 60) {
    blockers.push(`need 60+ days at failing (got ${context.daysAtFailing ?? 0})`);
  }
  const primaryInterp = get(String(primary.measureId));
  const badCat = ['REGRESSION', 'STAGNANT'];
  if (!primaryInterp || !badCat.includes(primaryInterp.category)) {
    blockers.push(
      `PRIMARY interpretation must be REGRESSION or STAGNANT (got ${primaryInterp?.category || 'none'})`
    );
  }
  if ((context.modifyAttempts ?? 0) < 2) {
    blockers.push(`need ≥ 2 modify attempts (got ${context.modifyAttempts ?? 0})`);
  }
  // Always require MDT sign-off — blocker even when conditions hold.
  blockers.push('MDT review required — cannot auto-close as failed');

  if (blockers.length > 1) {
    // More than just the MDT blocker means conditions also failed.
    return { recommend: false, action: null, reasoning, blockers };
  }
  reasoning.push('all clinical conditions met; MDT sign-off remains');
  return {
    recommend: true,
    action: 'recommend_close_failed_with_mdt_review',
    reasoning,
    blockers, // still has the MDT blocker — caller surfaces to UI
  };
}

module.exports = {
  CATEGORY_SCORE,
  PROGRESS_BANDS,
  weightedProgress,
  modifyDecision,
  addSecondaryDecision,
  unlinkDecision,
  closeAchievedDecision,
  closeFailedDecision,
};
