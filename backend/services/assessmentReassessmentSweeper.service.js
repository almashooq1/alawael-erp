'use strict';

/**
 * assessmentReassessmentSweeper.service.js — Wave 206e
 *
 * Companion to stagnantGoalScheduler. Where stagnant detects "no
 * progress in 28 days", this one detects "deadline passed without
 * completion" — a stronger trigger that should prompt re-running
 * the W206 engine with fresh scores.
 *
 * Two signals raised:
 *
 *   1. GOAL_OVERDUE_REASSESS — SmartGoal where
 *        status === 'active'
 *        && overallProgress < 100
 *        && timeBoundDate < now
 *
 *   2. BUNDLE_REVIEW_DUE — the most recent
 *      AssessmentRecommendationBundle for a beneficiary is older
 *      than `bundleReviewAfterDays` (default 90). The W206
 *      bundles already have a 90-day TTL so this flags before
 *      they vanish.
 *
 * Pure factory + dependency injection. No DB / no cron / no
 * notifications wiring assumed — caller passes the models and
 * optionally a `cron` impl + `notifier`.
 *
 * The optional notifier is invoked once per run with an array of
 * findings; idempotency is the caller's problem (most callers will
 * be the route handler exposing GET /reassessment-due, which is
 * read-only and inherently idempotent).
 */

const DEFAULT_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };

const OVERDUE_GRACE_DAYS = 0; // strict — deadline passed = overdue
const BUNDLE_REVIEW_AFTER_DAYS = 90;

function createReassessmentSweeper(deps = {}) {
  const SmartGoal = deps.SmartGoal;
  const BundleModel = deps.AssessmentRecommendationBundle;
  const logger = deps.logger || DEFAULT_LOGGER;
  const overdueGraceDays = Number.isFinite(deps.overdueGraceDays)
    ? Number(deps.overdueGraceDays)
    : OVERDUE_GRACE_DAYS;
  const bundleReviewAfterDays = Number.isFinite(deps.bundleReviewAfterDays)
    ? Number(deps.bundleReviewAfterDays)
    : BUNDLE_REVIEW_AFTER_DAYS;

  if (!SmartGoal || typeof SmartGoal.find !== 'function') {
    throw new Error('reassessmentSweeper: SmartGoal model is required');
  }
  if (!BundleModel || typeof BundleModel.aggregate !== 'function') {
    throw new Error('reassessmentSweeper: AssessmentRecommendationBundle model is required');
  }

  /**
   * Pure list: SmartGoals whose deadline has passed.
   */
  async function listOverdueGoals({ now = new Date() } = {}) {
    const cutoff = new Date(now.getTime() - overdueGraceDays * 24 * 3600 * 1000);
    const goals = await SmartGoal.find({
      status: 'active',
      overallProgress: { $lt: 100 },
      timeBoundDate: { $ne: null, $lt: cutoff },
      deletedAt: null,
    })
      .select('_id beneficiary therapist title timeBoundDate overallProgress branch')
      .lean();
    return goals.map(g => ({
      kind: 'GOAL_OVERDUE_REASSESS',
      goalId: String(g._id),
      beneficiaryId: g.beneficiary ? String(g.beneficiary) : null,
      therapistId: g.therapist ? String(g.therapist) : null,
      branchId: g.branch ? String(g.branch) : null,
      title: g.title,
      timeBoundDate: g.timeBoundDate,
      overallProgress: g.overallProgress || 0,
      daysOverdue: g.timeBoundDate
        ? Math.floor((now.getTime() - new Date(g.timeBoundDate).getTime()) / (24 * 3600 * 1000))
        : null,
    }));
  }

  /**
   * Per-beneficiary view: most recent bundle older than the
   * threshold (or never had one but has overdue goals — caller
   * may combine signals).
   */
  async function listBundleReviewsDue({ now = new Date() } = {}) {
    const cutoff = new Date(now.getTime() - bundleReviewAfterDays * 24 * 3600 * 1000);
    // Aggregate: take the latest bundle per beneficiary
    const latestPerBene = await BundleModel.aggregate([
      { $sort: { beneficiary: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$beneficiary',
          lastBundleAt: { $first: '$createdAt' },
          lastBundleId: { $first: '$_id' },
          lastEngineVersion: { $first: '$engineVersion' },
          totalBundles: { $sum: 1 },
        },
      },
      { $match: { lastBundleAt: { $lt: cutoff } } },
    ]);
    return latestPerBene.map(row => ({
      kind: 'BUNDLE_REVIEW_DUE',
      beneficiaryId: row._id ? String(row._id) : null,
      lastBundleId: row.lastBundleId ? String(row.lastBundleId) : null,
      lastBundleAt: row.lastBundleAt,
      lastEngineVersion: row.lastEngineVersion || null,
      totalBundles: row.totalBundles,
      daysSinceLastBundle: row.lastBundleAt
        ? Math.floor((now.getTime() - new Date(row.lastBundleAt).getTime()) / (24 * 3600 * 1000))
        : null,
    }));
  }

  /**
   * One-pass scan. Returns a summary + findings grouped by
   * beneficiary so a single UI badge can surface "كم مستفيد
   * يحتاج لمراجعة".
   */
  async function runOnce({ now = new Date(), notify = false } = {}) {
    const [overdueGoals, bundleReviews] = await Promise.all([
      listOverdueGoals({ now }),
      listBundleReviewsDue({ now }),
    ]);

    // Group findings per beneficiary
    const byBene = new Map();
    for (const g of overdueGoals) {
      if (!g.beneficiaryId) continue;
      if (!byBene.has(g.beneficiaryId)) {
        byBene.set(g.beneficiaryId, {
          beneficiaryId: g.beneficiaryId,
          overdueGoalCount: 0,
          overdueGoals: [],
          bundleReviewDue: false,
          daysSinceLastBundle: null,
        });
      }
      const entry = byBene.get(g.beneficiaryId);
      entry.overdueGoalCount++;
      entry.overdueGoals.push({
        goalId: g.goalId,
        title: g.title,
        daysOverdue: g.daysOverdue,
        progress: g.overallProgress,
      });
    }
    for (const b of bundleReviews) {
      if (!b.beneficiaryId) continue;
      if (!byBene.has(b.beneficiaryId)) {
        byBene.set(b.beneficiaryId, {
          beneficiaryId: b.beneficiaryId,
          overdueGoalCount: 0,
          overdueGoals: [],
          bundleReviewDue: true,
          daysSinceLastBundle: b.daysSinceLastBundle,
        });
      } else {
        const entry = byBene.get(b.beneficiaryId);
        entry.bundleReviewDue = true;
        entry.daysSinceLastBundle = b.daysSinceLastBundle;
      }
    }

    const findingsByBeneficiary = [...byBene.values()].sort(
      (a, b) => b.overdueGoalCount - a.overdueGoalCount
    );

    const summary = {
      scannedAt: now.toISOString(),
      overdueGoalsTotal: overdueGoals.length,
      bundleReviewsDue: bundleReviews.length,
      beneficiariesAffected: findingsByBeneficiary.length,
    };

    logger.info(summary, 'reassessmentSweeper: scan complete');

    if (notify && deps.notifier && typeof deps.notifier === 'function') {
      try {
        await deps.notifier({ summary, findingsByBeneficiary });
      } catch (err) {
        logger.warn({ err: err && err.message }, 'reassessmentSweeper: notifier failed');
      }
    }

    return { summary, findingsByBeneficiary, overdueGoals, bundleReviews };
  }

  function start({ schedule = '0 4 * * *', cron } = {}) {
    if (!cron || typeof cron.schedule !== 'function') {
      throw new Error('reassessmentSweeper.start: node-cron compatible cron is required');
    }
    const job = cron.schedule(schedule, () => {
      runOnce({ notify: true }).catch(err =>
        logger.error({ err: err && err.message }, 'reassessmentSweeper: sweep failed')
      );
    });
    return { stop: () => job.stop() };
  }

  return { runOnce, start, listOverdueGoals, listBundleReviewsDue };
}

module.exports = createReassessmentSweeper;
module.exports.OVERDUE_GRACE_DAYS = OVERDUE_GRACE_DAYS;
module.exports.BUNDLE_REVIEW_AFTER_DAYS = BUNDLE_REVIEW_AFTER_DAYS;
