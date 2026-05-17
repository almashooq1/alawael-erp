'use strict';

/**
 * care-plan-validator.service.js — Wave 41 (Care Planning Phase 1).
 *
 * Pure quality-gate engine. Given a plan body, returns:
 *
 *   {
 *     readinessScore: 0-100,
 *     band: 'ready' | 'pending' | 'draft_only',
 *     hardFailures: [{ ruleId, elementId, message }],
 *     softWarnings: [{ ruleId, elementId, message }],
 *     blocking: boolean,
 *     verdict: 'ready_for_submission' | 'needs_revision' | 'draft_only',
 *     validatedAt: Date,
 *   }
 *
 * The validator is the ONLY gate that controls the readinessScore. It
 * runs the rule set from the registry against a plan-body shape. It does
 * NOT mutate the plan — callers persist the snapshot themselves.
 *
 * Side-input options:
 *   • beneficiaryAge          — number; enables age-band program checks
 *   • branchSessionCap        — number; enforces frequency_within_cap
 *   • resolveEvidenceRef(ref) — optional async fn; verifies an evidenceRef
 *                                resolves to a real record. If absent,
 *                                the evidence_refs_resolvable rule is skipped.
 *   • now                     — clock injection
 *
 * The validator is the chokepoint for the readinessScore formula
 * documented in spec §4.2:
 *
 *   readiness = 100
 *             - 15 * hardFailureCount
 *             -  3 * softWarningCount
 *             - 10 * (1 if missingReviewDate else 0)
 *             -  5 * lowConfidenceGoalCount(<0.5)
 *
 * Bands and verdicts mirror registry constants.
 */

const reg = require('./care-planning.registry');

const REASON = Object.freeze({
  VALIDATION_OK: 'VALIDATION_OK',
  HARD_FAILURES_PRESENT: 'HARD_FAILURES_PRESENT',
  LOW_READINESS: 'LOW_READINESS',
});

/**
 * @param {object} opts injected dependencies / context
 * @returns {object} validator API
 */
function createCarePlanValidator({
  resolveEvidenceRef = null,
  now = () => new Date(),
  logger = console,
} = {}) {
  // ─── SMART checker ───────────────────────────────────────────

  function isGoalSmart(goal) {
    const smart = {
      specific: typeof goal.statement === 'string' && goal.statement.trim().length >= 20,
      measurable: !!(goal.targetValue && goal.targetUnit),
      achievable: typeof goal.priorityScore === 'number',
      relevant: !!goal.domain,
      timeBound: typeof goal.targetHorizonWeeks === 'number' && goal.targetHorizonWeeks > 0,
    };
    smart.allPass =
      smart.specific && smart.measurable && smart.achievable && smart.relevant && smart.timeBound;
    return smart;
  }

  // ─── Single rule evaluators ─────────────────────────────────

  function evalGoalRules(plan, ctx) {
    const hardFailures = [];
    const softWarnings = [];

    (plan.goals || []).forEach(goal => {
      const elementId = goal.goalId || goal.id || '<unnamed-goal>';

      // baseline
      if (!goal.baselineLink) {
        hardFailures.push({
          ruleId: 'goal_has_baseline',
          elementId,
          message: `الهدف ${elementId} بلا baseline link`,
        });
      }

      // evidenceRefs
      const refs = Array.isArray(goal.evidenceRefs) ? goal.evidenceRefs : [];
      if (refs.length === 0) {
        hardFailures.push({
          ruleId: 'goal_has_evidence_refs',
          elementId,
          message: `الهدف ${elementId} بلا evidenceRefs`,
        });
      }

      // assessment link
      if (!goal.assessmentLink) {
        hardFailures.push({
          ruleId: 'goal_has_assessment_link',
          elementId,
          message: `الهدف ${elementId} بلا ربط بتقييم`,
        });
      }

      // SMART
      const smart = isGoalSmart(goal);
      if (!smart.allPass) {
        const missing = Object.entries(smart)
          .filter(([k, v]) => k !== 'allPass' && !v)
          .map(([k]) => k);
        hardFailures.push({
          ruleId: 'goal_is_smart',
          elementId,
          message: `الهدف ${elementId} لا يحقق SMART (مفقود: ${missing.join(', ')})`,
        });
      }

      // measure link
      if (!goal.measureLink) {
        hardFailures.push({
          ruleId: 'goal_has_measure',
          elementId,
          message: `الهدف ${elementId} بلا measure مرتبط`,
        });
      }

      // evidence recency (soft)
      const cutoffDays = 90;
      const nowMs = ctx.nowDate.getTime();
      const hasRecent = refs.some(
        r => r.capturedAt && (nowMs - new Date(r.capturedAt).getTime()) / 86400000 <= cutoffDays
      );
      if (refs.length > 0 && !hasRecent) {
        softWarnings.push({
          ruleId: 'evidence_recency',
          elementId,
          message: `أدلة الهدف ${elementId} أقدم من 90 يومًا`,
        });
      }

      // low confidence (soft)
      if (typeof goal.confidence === 'number' && goal.confidence < 0.5) {
        softWarnings.push({
          ruleId: 'low_confidence_goal',
          elementId,
          message: `ثقة الهدف ${elementId} منخفضة (${goal.confidence.toFixed(2)})`,
        });
      }

      // measure-domain mismatch (soft, heuristic)
      if (goal.measureLink && goal.domain) {
        // soft check only when both present — placeholder for richer mapping later
      }
    });

    return { hardFailures, softWarnings };
  }

  function evalProgramRules(plan, ctx) {
    const hardFailures = [];
    const softWarnings = [];

    const goalIds = new Set((plan.goals || []).map(g => g.goalId || g.id));
    const programs = plan.programs || [];

    let weeklyFreqSum = 0;
    programs.forEach(p => {
      const elementId = p.programId || p.id || '<unnamed-program>';
      const refs = Array.isArray(p.goalRefs) ? p.goalRefs : [];
      if (refs.length === 0 || !refs.some(r => goalIds.has(r))) {
        hardFailures.push({
          ruleId: 'no_orphan_program',
          elementId,
          message: `البرنامج ${elementId} بلا goalRef صالح`,
        });
      }
      weeklyFreqSum += Number(p.frequencyPerWeek || 0);

      // age-appropriate (only if beneficiary age provided + program has minAge/maxAge)
      if (
        ctx.beneficiaryAge != null &&
        ((p.minAge != null && ctx.beneficiaryAge < p.minAge) ||
          (p.maxAge != null && ctx.beneficiaryAge > p.maxAge))
      ) {
        hardFailures.push({
          ruleId: 'program_age_appropriate',
          elementId,
          message: `البرنامج ${elementId} لا يناسب عمر المستفيد`,
        });
      }
    });

    // frequency cap
    const cap = Number(plan.sessionsPerWeekCap || ctx.branchSessionCap || 0);
    if (cap > 0 && weeklyFreqSum > cap) {
      hardFailures.push({
        ruleId: 'frequency_within_cap',
        elementId: 'plan',
        message: `إجمالي ${weeklyFreqSum} جلسة/أسبوع يتجاوز السقف ${cap}`,
      });
    }

    return { hardFailures, softWarnings };
  }

  function evalPlanRules(plan, ctx) {
    const hardFailures = [];
    const softWarnings = [];

    // review date
    const nextReview = plan.reviewSchedule && plan.reviewSchedule.nextReviewAt;
    if (!nextReview || new Date(nextReview).getTime() <= ctx.nowDate.getTime()) {
      hardFailures.push({
        ruleId: 'has_review_date',
        elementId: 'plan',
        message: 'تاريخ المراجعة القادم غير موجود أو في الماضي',
      });
    }

    // safety mitigation
    const flags = plan.safetyFlags || [];
    flags.forEach(f => {
      if (!f.mitigation) {
        hardFailures.push({
          ruleId: 'safety_has_mitigation',
          elementId: f.flag || '<safety-flag>',
          message: `علم الخطر "${f.flag}" بلا mitigation`,
        });
      }
    });

    // contradictions (heuristic: duplicate goal statements within same domain)
    const seen = new Map();
    (plan.goals || []).forEach(g => {
      const key = `${g.domain}::${(g.statement || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        hardFailures.push({
          ruleId: 'no_goal_contradictions',
          elementId: g.goalId || g.id,
          message: `هدف مكرر في النطاق ${g.domain}`,
        });
      } else {
        seen.set(key, true);
      }
    });

    // family role (soft)
    const role = plan.familyRole || {};
    const hasHomeProgram = Array.isArray(role.homeProgram) && role.homeProgram.length > 0;
    const hasCoachingPlan = typeof role.coachingPlan === 'string' && role.coachingPlan.length > 10;
    if (!hasHomeProgram && !hasCoachingPlan) {
      softWarnings.push({
        ruleId: 'family_role_defined',
        elementId: 'plan',
        message: 'دور الأسرة غير محدد (لا homeProgram ولا coachingPlan)',
      });
    }

    // support services (soft, only flag if plan body declares supportServicesExpected = true)
    const supportServicesExpected = Array.isArray(plan.expectedSupportServices)
      ? plan.expectedSupportServices
      : [];
    if (supportServicesExpected.length > 0) {
      const wired = new Set((plan.supportServices || []).map(s => s.service));
      const missing = supportServicesExpected.filter(s => !wired.has(s));
      if (missing.length > 0) {
        softWarnings.push({
          ruleId: 'support_service_linked',
          elementId: 'plan',
          message: `خدمات مساندة متوقعة وغير مربوطة: ${missing.join(', ')}`,
        });
      }
    }

    return { hardFailures, softWarnings };
  }

  async function evalResolvableEvidence(plan) {
    const hardFailures = [];
    if (typeof resolveEvidenceRef !== 'function') return { hardFailures };

    for (const goal of plan.goals || []) {
      const elementId = goal.goalId || goal.id;
      const refs = Array.isArray(goal.evidenceRefs) ? goal.evidenceRefs : [];
      for (const ref of refs) {
        let resolved = false;
        try {
          resolved = await resolveEvidenceRef(ref);
        } catch (err) {
          logger.warn && logger.warn(`[validator] evidenceRef resolution threw: ${err.message}`);
          resolved = false;
        }
        if (!resolved) {
          hardFailures.push({
            ruleId: 'evidence_refs_resolvable',
            elementId,
            message: `evidenceRef ${ref.kind}:${ref.refId} غير قابل للتحقق`,
          });
          break; // one per goal is enough
        }
      }
    }
    return { hardFailures };
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Run the full validator chain.
   *
   * @param {object} plan         Plan body (raw doc or .toObject())
   * @param {object} options      { beneficiaryAge, branchSessionCap }
   * @returns {object} validation snapshot
   */
  async function validate(plan, options = {}) {
    const ctx = {
      nowDate: now(),
      beneficiaryAge: options.beneficiaryAge != null ? Number(options.beneficiaryAge) : null,
      branchSessionCap: options.branchSessionCap != null ? Number(options.branchSessionCap) : null,
    };

    const allHard = [];
    const allSoft = [];

    const g = evalGoalRules(plan, ctx);
    allHard.push(...g.hardFailures);
    allSoft.push(...g.softWarnings);

    const p = evalProgramRules(plan, ctx);
    allHard.push(...p.hardFailures);
    allSoft.push(...p.softWarnings);

    const pl = evalPlanRules(plan, ctx);
    allHard.push(...pl.hardFailures);
    allSoft.push(...pl.softWarnings);

    const ev = await evalResolvableEvidence(plan);
    allHard.push(...ev.hardFailures);

    // ── Compute readiness score per §4.2 formula ──
    const missingReviewDate = allHard.some(f => f.ruleId === 'has_review_date');
    const lowConfidenceCount = (plan.goals || []).filter(
      g2 => typeof g2.confidence === 'number' && g2.confidence < 0.5
    ).length;

    let score = 100;
    score -= 15 * allHard.length;
    score -= 3 * allSoft.length;
    if (missingReviewDate) score -= 10;
    score -= 5 * lowConfidenceCount;
    score = Math.max(0, Math.min(100, score));

    const band = reg.classifyReadiness(score, allHard.length);

    let verdict;
    if (band === 'ready' && allHard.length === 0) {
      verdict = 'ready_for_submission';
    } else if (band === 'pending') {
      verdict = 'needs_revision';
    } else {
      verdict = 'draft_only';
    }

    return {
      readinessScore: score,
      band,
      hardFailures: allHard,
      softWarnings: allSoft,
      blocking: allHard.length > 0,
      verdict,
      validatedAt: ctx.nowDate,
      missingFields: collectMissingFields(plan, allHard),
    };
  }

  function collectMissingFields(plan, hardFailures) {
    const missing = new Set();
    hardFailures.forEach(f => {
      if (f.ruleId === 'goal_has_baseline') missing.add('goal.baselineLink');
      if (f.ruleId === 'goal_has_evidence_refs') missing.add('goal.evidenceRefs');
      if (f.ruleId === 'goal_has_assessment_link') missing.add('goal.assessmentLink');
      if (f.ruleId === 'goal_has_measure') missing.add('goal.measureLink');
      if (f.ruleId === 'has_review_date') missing.add('reviewSchedule.nextReviewAt');
      if (f.ruleId === 'safety_has_mitigation') missing.add('safetyFlags[*].mitigation');
    });
    return Array.from(missing);
  }

  /**
   * Compute confidence per spec §3.2 formula.
   * Inputs: evidence summary metrics. Returns 0..1 (capped).
   */
  function computeConfidence({
    daysSinceLatestEvidence,
    agreementRatioAcrossSources,
    hasNumericBaselineWithUnit,
    assessmentValidityScore, // 0..1: 1 standardized, 0.6 observational, 0.3 anecdotal
    missingRequiredFields,
    totalRequiredFields,
    hasRecentStandardizedAssessment,
  }) {
    const w = reg.CONFIDENCE_WEIGHTS;
    const evidenceRecency = Math.exp(-((daysSinceLatestEvidence || 0) / 90));
    const evidenceConsistency = Math.max(0, Math.min(1, agreementRatioAcrossSources || 0));
    const baselineClarity = hasNumericBaselineWithUnit ? 1 : 0.4;
    const assessmentValidity = Math.max(0, Math.min(1, assessmentValidityScore || 0.3));
    const dataGapPenalty =
      totalRequiredFields > 0 ? (missingRequiredFields || 0) / totalRequiredFields : 0;

    let confidence =
      w.evidenceRecency * evidenceRecency +
      w.evidenceConsistency * evidenceConsistency +
      w.baselineClarity * baselineClarity +
      w.assessmentValidity * assessmentValidity +
      w.dataGapPenalty * (1 - dataGapPenalty);

    confidence = Math.max(0, Math.min(1, confidence));

    if (!hasRecentStandardizedAssessment) {
      confidence = Math.min(confidence, reg.CONFIDENCE_CAP_WITHOUT_RECENT_ASSESSMENT);
    }
    return Number(confidence.toFixed(3));
  }

  return Object.freeze({
    validate,
    isGoalSmart,
    computeConfidence,
    REASON,
  });
}

module.exports = {
  createCarePlanValidator,
  REASON,
};
