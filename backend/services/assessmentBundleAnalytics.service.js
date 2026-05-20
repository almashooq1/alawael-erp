'use strict';

/**
 * assessmentBundleAnalytics.service.js — Wave 206f
 *
 * Aggregations over AssessmentRecommendationBundle docs persisted by
 * the W206 engine. Surfaces the training signal a clinical director
 * needs to tune the GOAL_TEMPLATES:
 *
 *   1. Volume — bundles per day across the period
 *   2. Accept rate — accepted vs suggested counts (proxy for how
 *      well the engine's defaults match clinical judgement)
 *   3. By-measure breakdown — which measures trigger the most
 *      bundles and how confident the engine was
 *   4. By-therapist breakdown — accept-rate-per-therapist signals
 *      either great calibration or a therapist who overrides too
 *      much
 *   5. Confidence distribution — high vs medium vs needs_review
 *   6. LLM polish adoption — what % of accepted bundles ran through
 *      Claude Haiku
 *
 * Pure factory + DI. No cron. Read-only.
 */

const DEFAULT_FROM_DAYS = 30;

function createBundleAnalytics(deps = {}) {
  const BundleModel = deps.AssessmentRecommendationBundle;
  if (!BundleModel || typeof BundleModel.aggregate !== 'function') {
    throw new Error('bundleAnalytics: AssessmentRecommendationBundle model is required');
  }

  function resolveRange({ from, to, defaultFromDays = DEFAULT_FROM_DAYS } = {}) {
    const toDate = to instanceof Date ? to : to ? new Date(to) : new Date();
    const fromDate =
      from instanceof Date
        ? from
        : from
          ? new Date(from)
          : new Date(toDate.getTime() - defaultFromDays * 24 * 3600 * 1000);
    return { fromDate, toDate };
  }

  function baseMatch({ fromDate, toDate, therapistId, branchId }) {
    const m = { createdAt: { $gte: fromDate, $lte: toDate } };
    if (therapistId) m.therapist = therapistId;
    if (branchId) m.branch = branchId;
    return m;
  }

  /**
   * Volume: bundles/day series + total + uniqueBeneficiaries
   */
  async function getVolume(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    const [series, totals] = await Promise.all([
      BundleModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),
      BundleModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            uniqueBeneficiaries: { $addToSet: '$beneficiary' },
            uniqueTherapists: { $addToSet: '$therapist' },
          },
        },
      ]),
    ]);
    const top = totals[0] || { total: 0, uniqueBeneficiaries: [], uniqueTherapists: [] };
    return {
      series,
      total: top.total,
      uniqueBeneficiaries: (top.uniqueBeneficiaries || []).filter(Boolean).length,
      uniqueTherapists: (top.uniqueTherapists || []).filter(Boolean).length,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }

  /**
   * Accept-rate stats over the period.
   *
   * acceptRate is computed against the bundle.bundle.suggestedGoals
   * length when available, otherwise falls back to acceptedGoalCount
   * (in which case the ratio degenerates to 1.0 — surfaced separately).
   */
  async function getAcceptRate(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    const rows = await BundleModel.aggregate([
      { $match: match },
      {
        $project: {
          acceptedGoals: '$acceptedGoalCount',
          acceptedPrograms: '$acceptedProgramCount',
          suggestedGoalsCount: {
            $cond: [
              { $isArray: '$bundle.suggestedGoals' },
              { $size: '$bundle.suggestedGoals' },
              null,
            ],
          },
          suggestedProgramsCount: {
            $cond: [
              { $isArray: '$bundle.suggestedPrograms' },
              { $size: '$bundle.suggestedPrograms' },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalBundles: { $sum: 1 },
          totalAcceptedGoals: { $sum: '$acceptedGoals' },
          totalSuggestedGoals: { $sum: { $ifNull: ['$suggestedGoalsCount', '$acceptedGoals'] } },
          totalAcceptedPrograms: { $sum: '$acceptedPrograms' },
          totalSuggestedPrograms: {
            $sum: { $ifNull: ['$suggestedProgramsCount', '$acceptedPrograms'] },
          },
          bundlesWithSuggestedData: {
            $sum: { $cond: [{ $gt: ['$suggestedGoalsCount', 0] }, 1, 0] },
          },
        },
      },
    ]);
    const r = rows[0] || {
      totalBundles: 0,
      totalAcceptedGoals: 0,
      totalSuggestedGoals: 0,
      totalAcceptedPrograms: 0,
      totalSuggestedPrograms: 0,
      bundlesWithSuggestedData: 0,
    };
    return {
      totalBundles: r.totalBundles,
      totalAcceptedGoals: r.totalAcceptedGoals,
      totalSuggestedGoals: r.totalSuggestedGoals,
      totalAcceptedPrograms: r.totalAcceptedPrograms,
      totalSuggestedPrograms: r.totalSuggestedPrograms,
      goalAcceptRate: r.totalSuggestedGoals > 0 ? r.totalAcceptedGoals / r.totalSuggestedGoals : 0,
      programAcceptRate:
        r.totalSuggestedPrograms > 0 ? r.totalAcceptedPrograms / r.totalSuggestedPrograms : 0,
      // Fraction of bundles where we had the full suggested counts (not just accepted)
      coverageRatio: r.totalBundles > 0 ? r.bundlesWithSuggestedData / r.totalBundles : 0,
    };
  }

  async function getConfidenceDistribution(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    const rows = await BundleModel.aggregate([
      { $match: match },
      { $group: { _id: '$overallConfidence', count: { $sum: 1 } } },
    ]);
    const out = { high: 0, medium: 0, needs_therapist_review: 0 };
    for (const r of rows) {
      if (r._id && out[r._id] !== undefined) out[r._id] = r.count;
    }
    return out;
  }

  async function getLlmAdoption(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    const rows = await BundleModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          refined: { $sum: { $cond: ['$refinedByLlm', 1, 0] } },
        },
      },
    ]);
    const r = rows[0] || { total: 0, refined: 0 };
    return {
      total: r.total,
      refined: r.refined,
      adoptionRate: r.total > 0 ? r.refined / r.total : 0,
    };
  }

  /**
   * Top measures that triggered bundles. Looks into the persisted
   * scoresInput array to count occurrences.
   */
  async function getMeasureBreakdown(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    return BundleModel.aggregate([
      { $match: match },
      { $unwind: { path: '$scoresInput', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$scoresInput.measureKey',
          count: { $sum: 1 },
          acceptedGoalsTotal: { $sum: '$acceptedGoalCount' },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, measureKey: '$_id', count: 1, acceptedGoalsTotal: 1 } },
    ]);
  }

  async function getTherapistBreakdown(opts = {}) {
    const { fromDate, toDate } = resolveRange(opts);
    const match = baseMatch({ fromDate, toDate, ...opts });
    // W209: $lookup against Employee for name_ar so the UI doesn't
    // have to display raw ObjectIds. Employee model lives in HR/.
    return BundleModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$therapist',
          bundles: { $sum: 1 },
          acceptedGoals: { $sum: '$acceptedGoalCount' },
          suggestedGoals: {
            $sum: {
              $cond: [
                { $isArray: '$bundle.suggestedGoals' },
                { $size: '$bundle.suggestedGoals' },
                '$acceptedGoalCount',
              ],
            },
          },
          highConfidence: {
            $sum: { $cond: [{ $eq: ['$overallConfidence', 'high'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'therapistDoc',
          pipeline: [{ $project: { name_ar: 1, name_en: 1, _id: 0 } }],
        },
      },
      {
        $project: {
          _id: 0,
          therapistId: '$_id',
          therapistName: {
            $ifNull: [
              { $arrayElemAt: ['$therapistDoc.name_ar', 0] },
              { $arrayElemAt: ['$therapistDoc.name_en', 0] },
            ],
          },
          bundles: 1,
          acceptedGoals: 1,
          suggestedGoals: 1,
          acceptRate: {
            $cond: [
              { $gt: ['$suggestedGoals', 0] },
              { $divide: ['$acceptedGoals', '$suggestedGoals'] },
              0,
            ],
          },
          highConfidence: 1,
        },
      },
      { $sort: { bundles: -1 } },
      { $limit: 50 },
    ]);
  }

  /**
   * One-shot report — bundles every metric for the analytics page.
   */
  async function getReport(opts = {}) {
    const [volume, acceptRate, confidence, llm, measures, therapists] = await Promise.all([
      getVolume(opts),
      getAcceptRate(opts),
      getConfidenceDistribution(opts),
      getLlmAdoption(opts),
      getMeasureBreakdown(opts),
      getTherapistBreakdown(opts),
    ]);
    return { volume, acceptRate, confidence, llm, measures, therapists };
  }

  return {
    getVolume,
    getAcceptRate,
    getConfidenceDistribution,
    getLlmAdoption,
    getMeasureBreakdown,
    getTherapistBreakdown,
    getReport,
  };
}

module.exports = createBundleAnalytics;
module.exports.DEFAULT_FROM_DAYS = DEFAULT_FROM_DAYS;
