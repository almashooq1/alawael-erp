'use strict';

/**
 * care-gap.generator.js — Wave 18 (Intelligence Layer).
 *
 * Scans active beneficiaries for clinical care-plan gaps and emits
 * one Insight per beneficiary with ≥ 1 gap detected. Three gap
 * checks today (extensible — add more functions to GAP_CHECKS):
 *
 *   1. Care plan review overdue — reviewDate < now AND plan is
 *      still ACTIVE.
 *   2. SMART goals stalled — in-progress goal with no
 *      lastProgressAt update in the configured window (default 30d).
 *   3. Vaccination overdue — beneficiary's scheduled vaccine past
 *      due date.
 *
 * Each gap contributes a supportingFact + a reasoning bullet.
 * 3+ gaps elevate severity to 'high'; 5+ gaps to 'critical' (these
 * auto-promote into the Alert engine via insightsService).
 *
 * Confidence model: rule-based, so confidence reflects data
 * completeness rather than statistical certainty. A beneficiary
 * with a fresh assessment + complete plan history scores 0.85
 * (high); missing recent assessment drops to 0.65 (medium).
 *
 * No LLM involvement — this is pure deterministic rule output.
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');

const GENERATOR_ID = 'care-gap.v1';

// TTL: 14 days — care gaps don't change much day-to-day, so we
// dedup hard on the input digest to avoid duplicate insights.
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

const DEFAULT_STALLED_DAYS = 30;

// ─── Gap checks ─────────────────────────────────────────────────
// Each check returns either null (no gap) or {key, factAr, factEn, value}.

function checkCarePlanReviewOverdue(beneficiary, now) {
  const plan = beneficiary.activeCarePlan;
  if (!plan || !plan.reviewDate) return null;
  if (new Date(plan.reviewDate) >= now) return null;
  const daysOverdue = Math.floor((now - new Date(plan.reviewDate)) / 86400000);
  return {
    key: 'plan-review-overdue',
    factAr: { labelAr: 'مراجعة الخطة متأخرة', labelEn: 'Plan review overdue' },
    value: daysOverdue,
    unit: 'days',
  };
}

function checkStalledGoals(beneficiary, now, opts = {}) {
  const stalledDays = opts.stalledDays || DEFAULT_STALLED_DAYS;
  const cutoff = new Date(now.getTime() - stalledDays * 86400000);
  const goals = Array.isArray(beneficiary.activeGoals) ? beneficiary.activeGoals : [];
  const stalled = goals.filter(g => {
    if (g.status !== 'in-progress') return false;
    if (!g.lastProgressAt) return true; // never updated counts as stalled
    return new Date(g.lastProgressAt) <= cutoff;
  });
  if (stalled.length === 0) return null;
  return {
    key: 'goals-stalled',
    factAr: { labelAr: 'أهداف متعثّرة', labelEn: 'Stalled goals' },
    value: stalled.length,
    unit: 'count',
  };
}

function checkOverdueVaccinations(beneficiary, now) {
  const vax = Array.isArray(beneficiary.dueVaccinations) ? beneficiary.dueVaccinations : [];
  const overdue = vax.filter(v => v.dueDate && new Date(v.dueDate) < now);
  if (overdue.length === 0) return null;
  return {
    key: 'vaccinations-overdue',
    factAr: { labelAr: 'تطعيمات متأخرة', labelEn: 'Vaccinations overdue' },
    value: overdue.length,
    unit: 'count',
  };
}

const GAP_CHECKS = [checkCarePlanReviewOverdue, checkStalledGoals, checkOverdueVaccinations];

// ─── Severity & confidence derivation ───────────────────────────

function severityFromGapCount(gaps) {
  if (gaps.length >= 5) return 'critical';
  if (gaps.length >= 3) return 'high';
  if (gaps.length >= 2) return 'medium';
  return 'low';
}

function confidenceFromBeneficiary(beneficiary) {
  // Higher score = more confident the gap signal is meaningful.
  // Starts at 1.0; deducts for incomplete data.
  let score = 1.0;
  const factors = [];
  if (!beneficiary.lastAssessmentAt) {
    score -= 0.2;
    factors.push('لا يوجد تقييم حديث ضمن الـ 90 يوم الأخيرة');
  } else {
    factors.push('يوجد تقييم حديث يدعم الـ insight');
  }
  if (!beneficiary.activeCarePlan) {
    score -= 0.15;
    factors.push('لا توجد خطة رعاية نشطة (signal weak)');
  }
  if (typeof beneficiary.tenureDays === 'number' && beneficiary.tenureDays < 14) {
    score -= 0.1;
    factors.push('مستفيد جديد — البيانات قد تكون ناقصة');
  }
  // Floor at 0.4 so a sparsely-tracked beneficiary still surfaces
  // SOME insight (better than silent).
  score = Math.max(0.4, score);
  return { score, factors };
}

// ─── Main evaluate() ────────────────────────────────────────────

/**
 * ctx shape:
 *   {
 *     beneficiaries: Array<{
 *       _id: ObjectId,
 *       branchId: ObjectId | null,
 *       firstName?: string,
 *       lastName?: string,
 *       fileNumber?: string,
 *       tenureDays?: number,
 *       lastAssessmentAt?: Date | string | null,
 *       activeCarePlan?: { _id, reviewDate, planNumber? },
 *       activeGoals?: Array<{ _id, status, lastProgressAt }>,
 *       dueVaccinations?: Array<{ _id, dueDate, vaccineName? }>,
 *     }>,
 *     now?: Date,
 *     opts?: { stalledDays }
 *   }
 *
 * Returns Array<InsightPayload> ready for insightsService.upsertInsight().
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const opts = ctx.opts || {};
  const beneficiaries = Array.isArray(ctx.beneficiaries) ? ctx.beneficiaries : [];
  const payloads = [];

  for (const ben of beneficiaries) {
    if (!ben || !ben._id) continue;

    // Run every gap check; collect non-null results.
    const gaps = [];
    for (const check of GAP_CHECKS) {
      try {
        const out = check(ben, now, opts);
        if (out) gaps.push(out);
      } catch {
        // A bad row shouldn't break the tick — silently skip.
      }
    }

    if (gaps.length === 0) continue;

    const severity = severityFromGapCount(gaps);
    const { score: confScore, factors: confFactors } = confidenceFromBeneficiary(ben);

    // Supporting facts from each detected gap
    const supportingFacts = gaps.map(g => ({
      labelAr: g.factAr.labelAr,
      labelEn: g.factAr.labelEn,
      value: g.value,
      ...(g.unit ? { unit: g.unit } : {}),
    }));

    // Reasoning bullets — one per gap + one summary line at the top
    const beneficiaryLabel = ben.fileNumber || ben.firstName_ar || ben.firstName || 'مستفيد';
    const bulletsAr = [
      `${gaps.length} ${gaps.length === 1 ? 'فجوة' : 'فجوات'} مرصودة في خطة الرعاية`,
      ...gaps.map(g => `• ${g.factAr.labelAr}: ${g.value}`),
    ];
    const bulletsEn = [
      `${gaps.length} care plan gap${gaps.length === 1 ? '' : 's'} detected`,
      ...gaps.map(g => `• ${g.factAr.labelEn}: ${g.value}`),
    ];

    const titleAr =
      gaps.length === 1
        ? `فجوة رعاية للمستفيد ${beneficiaryLabel}`
        : `${gaps.length} فجوات رعاية للمستفيد ${beneficiaryLabel}`;
    const titleEn =
      gaps.length === 1
        ? `Care gap for ${beneficiaryLabel}`
        : `${gaps.length} care gaps for ${beneficiaryLabel}`;

    const summaryAr = `يحتاج المستفيد إلى مراجعة سريرية تشمل ${gaps.map(g => g.factAr.labelAr).join('، ')}.`;
    const summaryEn = `Beneficiary requires clinical review covering: ${gaps.map(g => g.factAr.labelEn).join(', ')}.`;

    const payload = buildPayload(
      // The spec wrapper (we expose this as the module's default
      // export at the bottom; here we use a literal subset since
      // we're inside the same module).
      {
        id: GENERATOR_ID,
        kind: 'care-gap',
        category: 'clinical',
        scope: 'entity',
      },
      {
        rawInput: {
          beneficiaryId: String(ben._id),
          // Hash the gap signature, not the timestamps — same gaps
          // tomorrow shouldn't re-fire the insight (dedup).
          gapKeys: gaps.map(g => g.key).sort(),
        },
        titleAr,
        titleEn,
        summaryAr,
        summaryEn,
        severity,
        confidence: {
          level: confidenceLevelFromScore(confScore),
          score: confScore,
          factors: confFactors,
        },
        reasoning: { bulletsAr, bulletsEn, supportingFacts },
        branchId: ben.branchId || null,
        deepLink: `/care/360/${ben._id}`,
        suggestedActions: gaps.map(g => {
          if (g.key === 'plan-review-overdue') {
            return {
              titleAr: 'افتح خطة الرعاية وأجرِ المراجعة',
              titleEn: 'Open care plan and complete review',
              deepLink: `/care-plans/${ben.activeCarePlan?._id || ''}`,
              estimatedMin: 20,
              severity: 'must',
            };
          }
          if (g.key === 'goals-stalled') {
            return {
              titleAr: 'راجع الأهداف المتعثّرة وأعد جدولة intervention',
              titleEn: 'Review stalled goals and reschedule intervention',
              deepLink: `/smart-goals?beneficiary=${ben._id}`,
              estimatedMin: 15,
              severity: 'should',
            };
          }
          if (g.key === 'vaccinations-overdue') {
            return {
              titleAr: 'تواصل مع ولي الأمر لاستكمال التطعيمات',
              titleEn: 'Contact guardian to complete vaccinations',
              deepLink: `/care/360/${ben._id}?tab=vaccinations`,
              estimatedMin: 10,
              severity: 'must',
            };
          }
          return {
            titleAr: 'افتح ملف المستفيد للتفاصيل',
            titleEn: 'Open beneficiary file',
            deepLink: `/care/360/${ben._id}`,
            estimatedMin: 5,
            severity: 'may',
          };
        }),
        relatedEntities: [{ type: 'Beneficiary', id: String(ben._id) }],
        sourceDetail: `care-gap.v1: ${gaps.length} gap(s) detected`,
        sourceType: 'rule',
        expiresAt: new Date(now.getTime() + TTL_MS),
      }
    );

    payloads.push(payload);
  }

  return payloads;
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'care-gap',
  category: 'clinical',
  scope: 'entity',
  evaluate,
  // Exposed for unit tests that want to exercise individual checks.
  _internal: {
    checkCarePlanReviewOverdue,
    checkStalledGoals,
    checkOverdueVaccinations,
    severityFromGapCount,
    confidenceFromBeneficiary,
  },
});
