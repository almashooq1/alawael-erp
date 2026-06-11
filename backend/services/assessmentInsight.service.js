'use strict';

/**
 * assessmentInsight.service.js — W563
 *
 * Turns a scored standardized administration into two clinician-facing
 * artifacts the platform did not previously generate:
 *
 *   1. A bilingual CLINICAL NARRATIVE — a prose interpretation of the
 *      result (band + comparison/trend + MCID significance + at-risk item
 *      count + the band's recommended action). Deterministic + template-
 *      driven — NO LLM dependency, so it is reliable, auditable, and unit-
 *      testable.
 *
 *   2. SMART GOAL DRAFTS — pre-filled TherapeuticGoal suggestions derived
 *      from the measure's domain + the current score (baseline) + a band-
 *      crossing target + the reassessment cadence (timeBound) + a measure
 *      link. These are SUGGESTIONS the clinician reviews and edits — they
 *      are NOT auto-persisted (clinician authority / anti-substitution).
 *
 * The generation core (`buildNarrative`, `suggestGoals`, `buildInsight`)
 * is PURE — it takes a normalized scored result + measure metadata. The
 * DB orchestrator `insightForApplication(applicationId)` loads a persisted
 * MeasureApplication + its Measure and feeds the core.
 *
 * Tenant scope: orchestrator does NOT enforce branch — the route layer
 * must call enforceBeneficiaryBranch first (W269).
 */

const mongoose = require('mongoose');

function _err(message, statusCode) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

// Measure category → suggested TherapeuticGoal.domain enum (clinician edits).
const DOMAIN_BY_CATEGORY = {
  quality_of_life: 'adaptive',
  diagnostic: 'social',
  screening: 'social',
  outcome: 'adaptive',
  functional_status: 'self_care',
  motor: 'motor_gross',
  developmental: 'cognitive',
  behavioral: 'behavioral',
  communication: 'communication',
  cognitive: 'cognitive',
};

const TREND_LABELS = {
  improving: { ar: 'تحسّن', en: 'improving' },
  declining: { ar: 'تراجع', en: 'declining' },
  stable: { ar: 'استقرار', en: 'stable' },
  insufficient_data: { ar: 'بيانات غير كافية للمقارنة', en: 'insufficient comparison data' },
};

/**
 * Find the band (scoringRule) containing a value. Pure.
 */
function _bandFor(value, rules) {
  if (typeof value !== 'number' || !Array.isArray(rules)) return null;
  return rules.find(r => value >= r.minScore && value <= r.maxScore) || null;
}

/**
 * Compute a clinically-interpretable, band-CROSSING target for the next
 * reassessment, honouring scoring direction. Returns { value, band } or
 * null when the beneficiary is already in the best band (→ maintenance).
 * Pure.
 */
function nextBetterBandTarget(value, direction, rules) {
  if (typeof value !== 'number' || !Array.isArray(rules) || rules.length === 0) return null;
  const current = _bandFor(value, rules);
  if (!current) return null;
  const sorted = [...rules].sort((a, b) => a.minScore - b.minScore);

  if (direction === 'higher_better') {
    // The next band whose floor is above the current band's ceiling.
    const better = sorted.find(r => r.minScore > current.maxScore);
    return better ? { value: better.minScore, band: better } : null;
  }
  // lower_better — the best band has the lowest scores.
  const descending = [...sorted].reverse();
  const better = descending.find(r => r.maxScore < current.minScore);
  return better ? { value: better.maxScore, band: better } : null;
}

/**
 * Build a bilingual clinical narrative paragraph. Pure.
 *
 * @param {Object} input
 * @param {Object} input.measure   { name, name_ar, abbreviation, scoringDirection }
 * @param {Object} input.result    { value, label_ar, label_en, severity }
 * @param {Object} [input.comparison] { baselineScore, changeFromBaseline, trend,
 *                                       previousScore, changeFromPrevious, isClinicallySignificant }
 * @param {number} [input.flaggedCount] at-risk item count
 * @param {string} [input.action_ar]  band action line (from scoring module / rule)
 * @param {Object} [input.mcid]      { value, status }
 */
function buildNarrative({
  measure,
  result,
  comparison,
  flaggedCount,
  action_ar,
  action_en,
  mcid,
} = {}) {
  const name_ar = measure?.name_ar || measure?.abbreviation || measure?.name || 'المقياس';
  const name_en = measure?.name || measure?.abbreviation || 'the measure';
  const v = result?.value;

  const ar = [];
  const en = [];

  ar.push(`أظهر تطبيق «${name_ar}» درجة ${v}، ضمن فئة «${result?.label_ar || 'غير محدّدة'}».`);
  en.push(
    `Administration of "${name_en}" produced a score of ${v}, falling in the "${result?.label_en || 'undetermined'}" band.`
  );

  if (comparison && typeof comparison.changeFromBaseline === 'number') {
    const trend = TREND_LABELS[comparison.trend] || TREND_LABELS.stable;
    const sign = comparison.changeFromBaseline > 0 ? '+' : '';
    ar.push(
      `بالمقارنة مع خطّ الأساس (${comparison.baselineScore})، التغيّر ${sign}${comparison.changeFromBaseline} ` +
        `ويشير إلى ${trend.ar}.`
    );
    en.push(
      `Compared with baseline (${comparison.baselineScore}), the change of ${sign}${comparison.changeFromBaseline} ` +
        `indicates ${trend.en}.`
    );
    if (comparison.isClinicallySignificant === true) {
      ar.push('هذا التغيّر بلغ الحدّ الأدنى للدلالة السريرية (MCID).');
      en.push('This change meets the minimal clinically important difference (MCID).');
    } else if (comparison.isClinicallySignificant === false && mcid && mcid.value != null) {
      ar.push('لم يبلغ التغيّر الحدّ الأدنى للدلالة السريرية بعد.');
      en.push('The change has not yet reached the MCID threshold.');
    }
  } else if (comparison && comparison.trend === 'insufficient_data') {
    ar.push('هذا أول تطبيق — لا توجد مقارنة سابقة بعد.');
    en.push('This is the first administration — no prior comparison is available yet.');
  }

  if (typeof flaggedCount === 'number' && flaggedCount > 0) {
    ar.push(`تم رصد ${flaggedCount} بندًا ضمن نطاق الخطر يستحقّ المتابعة.`);
    en.push(`${flaggedCount} item(s) fell in the at-risk range and warrant follow-up.`);
  }

  if (action_ar) ar.push(`التوصية: ${action_ar}`);
  if (action_en) en.push(`Recommendation: ${action_en}`);

  return { narrative_ar: ar.join(' '), narrative_en: en.join(' ') };
}

/**
 * Suggest SMART goal drafts from a scored result. Pure. Returns an array
 * (usually 1) of un-persisted TherapeuticGoal-shaped drafts the clinician
 * reviews. Never auto-creates goals.
 *
 * @param {Object} input
 * @param {Object} input.measure   { code, name, name_ar, category, scoringDirection,
 *                                    minScore, maxScore, scoringRules[], reassessment,
 *                                    interpretation.mcid }
 * @param {Object} input.result    { value }
 * @param {string} [input.measureId] for the measureLink draft
 */
function suggestGoals({ measure, result, measureId } = {}) {
  if (!measure || !result || typeof result.value !== 'number') return [];
  const rules = measure.scoringRules || [];
  if (rules.length === 0) return [];

  const direction = measure.scoringDirection || 'higher_better';
  const intervalDays = measure.reassessment?.standardIntervalDays || 90;
  const weeks = Math.round(intervalDays / 7);
  const domain = DOMAIN_BY_CATEGORY[measure.category] || 'other';
  const name_ar = measure.name_ar || measure.abbreviation || measure.code;
  const name_en = measure.name || measure.code;

  const target = nextBetterBandTarget(result.value, direction, rules);
  const mcid = measure.interpretation?.mcid;
  const mcidNote =
    mcid && mcid.value != null ? ` (الحد الأدنى للدلالة السريرية ≈ ${mcid.value})` : '';

  const measureLink = measureId
    ? {
        measureId,
        measureCode: measure.code,
        linkType: 'primary',
        targetDirection: direction === 'higher_better' ? 'reach_at_least' : 'reach_at_most',
        linkRationale: `هدف مشتقّ تلقائيًّا من تطبيق ${measure.code} كخطّ أساس (W563) — يراجعه الأخصائي.`,
      }
    : null;

  if (!target) {
    // Already in the best band → maintenance goal.
    return [
      {
        type: 'maintenance',
        domain,
        priority: 'medium',
        title: `Maintain ${name_en} performance`,
        title_ar: `الحفاظ على مستوى الأداء في ${name_ar}`,
        specific: `Sustain the current band on ${name_en}.`,
        measurable: `Keep ${measure.code} at or better than ${result.value}${mcidNote}.`,
        achievable: 'Continue the current intervention plan.',
        relevant: `Preserves the gains already achieved on ${name_en}.`,
        timeBound: `Re-administer ${measure.code} in ${weeks} week(s).`,
        baseline: {
          value: result.value,
          date: new Date(),
          description: `${measure.code} baseline`,
        },
        target: {
          value: result.value,
          description: 'Maintain current band',
          criteria: 'no regression',
        },
        measureLinks: measureLink ? [measureLink] : [],
        _autoSuggested: true,
        _source: { kind: 'assessment', measureCode: measure.code },
      },
    ];
  }

  const verb_ar = direction === 'higher_better' ? 'رفع' : 'خفض';
  const verb_en = direction === 'higher_better' ? 'increase' : 'reduce';

  return [
    {
      type: 'short_term',
      domain,
      priority: 'high',
      title: `Improve ${name_en} into the "${target.band.rangeLabel}" band`,
      title_ar: `الانتقال بفئة «${name_ar}» إلى «${target.band.rangeLabel_ar || target.band.rangeLabel}»`,
      specific: `${verb_en === 'increase' ? 'Increase' : 'Reduce'} the ${name_en} score from ${result.value} toward ${target.value}.`,
      measurable: `${measure.code}: ${verb_en} from ${result.value} to ${target.value}${mcidNote}.`,
      achievable: 'Through the targeted intervention plan over the reassessment interval.',
      relevant: `Moves the beneficiary into the "${target.band.rangeLabel_ar || target.band.rangeLabel}" range on a validated outcome measure.`,
      timeBound: `Reassess with ${measure.code} in ${weeks} week(s).`,
      baseline: { value: result.value, date: new Date(), description: `${measure.code} baseline` },
      target: {
        value: target.value,
        description: `${verb_ar} درجة ${measure.code} إلى ${target.value}`,
        criteria: `reach the "${target.band.rangeLabel}" band`,
      },
      measureLinks: measureLink ? [measureLink] : [],
      _autoSuggested: true,
      _source: { kind: 'assessment', measureCode: measure.code },
    },
  ];
}

/**
 * Compose the full insight from normalized inputs. Pure.
 */
function buildInsight({
  measure,
  result,
  comparison,
  flaggedCount,
  action_ar,
  action_en,
  measureId,
}) {
  const narrative = buildNarrative({
    measure,
    result,
    comparison,
    flaggedCount,
    action_ar,
    action_en,
    mcid: measure?.interpretation?.mcid,
  });
  const goalSuggestions = suggestGoals({ measure, result, measureId });
  return {
    generatedAt: new Date(),
    measureCode: measure?.code || null,
    ...narrative,
    goalSuggestions,
  };
}

class AssessmentInsightService {
  /**
   * Build the insight (narrative + SMART goal drafts) for one persisted
   * MeasureApplication.
   *
   * @param {string} applicationId
   */
  async insightForApplication(applicationId) {
    if (!mongoose.isValidObjectId(applicationId)) throw _err('valid applicationId required', 400);
    const MeasureApplication = mongoose.model('MeasureApplication');
    const Measure = mongoose.model('Measure');

    const app = await MeasureApplication.findById(applicationId).lean();
    if (!app) throw _err('administration not found', 404);

    const measure = await Measure.findById(app.measureId)
      .select(
        'code name name_ar abbreviation category scoringDirection minScore maxScore scoringRules reassessment interpretation reporting'
      )
      .lean();
    if (!measure) throw _err('measure not found for this administration', 404);

    // at-risk item count across domainScores (digital administrations only).
    let flaggedCount = 0;
    for (const d of app.domainScores || []) {
      for (const is of d.itemScores || []) {
        // We don't have responseOptions here; the digital report computes
        // atRisk. Count flagged via the scoring notes when present instead.
        void is;
      }
    }
    const notesFlagged = app.scoringNotes?.flaggedItems?.length;
    if (typeof notesFlagged === 'number') flaggedCount = notesFlagged;

    const result = {
      value: app.totalRawScore,
      label_ar: app.overallInterpretation_ar,
      label_en: app.overallInterpretation,
      severity: app.overallSeverity,
    };

    const matched = _bandFor(app.totalRawScore, measure.scoringRules || []);

    return buildInsight({
      measure,
      result,
      comparison: app.comparison || null,
      flaggedCount,
      action_ar: matched?.interpretation_ar || null,
      action_en: matched?.interpretation || null,
      measureId: app.measureId,
    });
  }

  /**
   * W568 — Materialize ONE assessment-derived SMART goal draft into a real
   * persisted TherapeuticGoal. This closes the loop: the insight SUGGESTS,
   * the clinician ACCEPTS, and a goal is created with the clinician as author.
   *
   * The goal is created WITHOUT an objective-level measureLink — the W235
   * goal↔measure linkage carries its own strict invariants (PRIMARY weight,
   * interventionRefs, etc.) that are a deliberate clinical step, not an
   * auto-fill. The source measure is recorded in tags + notes; the clinician
   * formally links it afterward via the existing goal-linkage surface.
   *
   * @param {Object} input
   * @param {string} input.applicationId
   * @param {number} [input.goalIndex=0]  which suggestion to materialize
   * @param {string} [input.episodeId]    required if the administration has none
   * @param {string} input.assessorId     author (clinician)
   * @param {string} [input.branchId]
   * @returns {Promise<Object>} the created TherapeuticGoal
   */
  async createGoalFromSuggestion({
    applicationId,
    goalIndex = 0,
    episodeId,
    assessorId,
    branchId,
  }) {
    if (!mongoose.isValidObjectId(applicationId)) throw _err('valid applicationId required', 400);
    if (!assessorId) throw _err('assessorId required', 400);

    const MeasureApplication = mongoose.model('MeasureApplication');
    const TherapeuticGoal = mongoose.model('TherapeuticGoal');

    const app = await MeasureApplication.findById(applicationId)
      .select('beneficiaryId episodeId measureId')
      .lean();
    if (!app) throw _err('administration not found', 404);

    const insight = await this.insightForApplication(applicationId);
    const draft = (insight.goalSuggestions || [])[goalIndex];
    if (!draft) throw _err(`no goal suggestion at index ${goalIndex}`, 400);

    const resolvedEpisode = episodeId || app.episodeId;
    if (!resolvedEpisode) {
      throw _err('episodeId required — this administration is not linked to an episode', 400);
    }

    const goal = await TherapeuticGoal.create({
      beneficiaryId: app.beneficiaryId,
      episodeId: resolvedEpisode,
      // gap #3 — record the assessment→goal provenance (was previously dropped;
      // the source only survived as a free-text tag/note). Makes the golden
      // thread traversable: MeasureApplication._id ↔ TherapeuticGoal.measureApplicationId.
      measureApplicationId: applicationId,
      title: draft.title,
      title_ar: draft.title_ar,
      description: draft.specific || draft.title,
      specific: draft.specific,
      measurable: draft.measurable,
      achievable: draft.achievable,
      relevant: draft.relevant,
      timeBound: draft.timeBound,
      type: draft.type,
      domain: draft.domain,
      priority: draft.priority || 'medium',
      baseline: draft.baseline
        ? {
            value: draft.baseline.value,
            description: draft.baseline.description,
            date: new Date(),
          }
        : undefined,
      target: {
        value: draft.target?.value,
        description: draft.target?.description,
        criteria: draft.target?.criteria,
      },
      startDate: new Date(),
      status: 'draft',
      createdBy: assessorId,
      assignedTo: assessorId,
      branchId,
      tags: ['assessment-derived', insight.measureCode].filter(Boolean),
      notes:
        `هدف مشتقّ تلقائيًّا من تطبيق المقياس ${insight.measureCode || ''} (W568). ` +
        'اربط المقياس رسميًّا عبر واجهة ربط الأهداف عند الحاجة.',
    });

    return goal;
  }
}

const assessmentInsightService = new AssessmentInsightService();

module.exports = {
  AssessmentInsightService,
  assessmentInsightService,
  // Pure helpers exported for unit tests.
  buildNarrative,
  suggestGoals,
  buildInsight,
  nextBetterBandTarget,
  DOMAIN_BY_CATEGORY,
};
