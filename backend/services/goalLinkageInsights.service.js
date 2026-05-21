'use strict';

/**
 * goalLinkageInsights.service.js — Wave 237
 * ════════════════════════════════════════════════════════════════════
 * Reverse views + ops KPIs over W235 goal-measure linkage data.
 * Phase d of the Goal-Measure Linkage Architect.
 *
 * Powers two consumer surfaces:
 *
 *   1. Measure-side dashboards
 *      - findOrphanedMeasures: active measures with zero active links —
 *        archival candidates for the W210 governance review.
 *      - findOverloadedMeasures: measures linked to > threshold goals —
 *        concentration risk if measure deprecated.
 *
 *   2. Admin/ops linkage health dashboard (`/admin/ops/goal-linkage`)
 *      - linkageKpis: org-wide signals:
 *          % goals with PRIMARY link set (target: 100%)
 *          % links with verbose rationale (≥ 20 chars)
 *          % overdue link reviews
 *          avg admins-to-link-flag
 *          total contributing links / unlinked / under_review / flagged
 *
 * Pure read-side — never mutates. All queries scoped by `branchId` when
 * provided. Aggregations done in MongoDB ($group + $facet) rather than
 * app-side filtering — cheap at any scale.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const M = {
  TherapeuticGoal: () => {
    try {
      return mongoose.model('TherapeuticGoal');
    } catch {
      try {
        require('../domains/goals/models/TherapeuticGoal');
        return mongoose.model('TherapeuticGoal');
      } catch {
        return null;
      }
    }
  },
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
};

function _asObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id;
}

class GoalLinkageInsightsSvc {
  /**
   * Active measures with zero ACTIVE links across the org (or branch).
   * Returns sorted descending by historical-admin count (archival
   * decisions prefer measures with the LEAST activity).
   *
   * @param {Object} [opts]
   * @param {string|ObjectId} [opts.branchId]
   * @param {number} [opts.limit=50]
   * @returns {Promise<Array>} [{ measureId, code, name, name_ar,
   *   activeLinks: 0, totalLinks, lastLinkedAt? }]
   */
  async findOrphanedMeasures({ branchId, limit = 50 } = {}) {
    const Measure = M.Measure();
    const Goal = M.TherapeuticGoal();
    if (!Measure || !Goal) return [];

    // 1. All active measures (universe).
    const activeMeasures = await Measure.find(
      { status: 'active', isDeleted: { $ne: true } },
      { code: 1, name: 1, name_ar: 1 }
    ).lean();
    if (activeMeasures.length === 0) return [];

    // 2. Count links per measure (status='active'). Optionally branch-scoped.
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = _asObjectId(branchId);

    const linkCounts = await Goal.aggregate([
      { $match: match },
      { $unwind: { path: '$objectives', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$objectives.measureLinks', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'objectives.measureLinks.measureId': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$objectives.measureLinks.measureId',
          totalLinks: { $sum: 1 },
          activeLinks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$objectives.measureLinks.status', 'active'] },
                    { $ne: ['$objectives.measureLinks.linkType', 'CONTRAINDICATED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastLinkedAt: { $max: '$objectives.measureLinks.linkedAt' },
        },
      },
    ]);
    const byMeasure = new Map(linkCounts.map(r => [String(r._id), r]));

    const orphans = [];
    for (const m of activeMeasures) {
      const counts = byMeasure.get(String(m._id));
      const activeLinks = counts?.activeLinks || 0;
      if (activeLinks > 0) continue;
      orphans.push({
        measureId: String(m._id),
        code: m.code,
        name: m.name,
        name_ar: m.name_ar,
        activeLinks,
        totalLinks: counts?.totalLinks || 0,
        lastLinkedAt: counts?.lastLinkedAt || null,
      });
    }

    // Sort: totalLinks asc (least activity first), then code.
    orphans.sort((a, b) => {
      const t = (a.totalLinks || 0) - (b.totalLinks || 0);
      if (t !== 0) return t;
      return String(a.code).localeCompare(String(b.code));
    });
    return orphans.slice(0, limit);
  }

  /**
   * Measures with active links across > threshold distinct goals.
   * Concentration risk indicator — if such a measure deprecates, many
   * goals need re-wiring.
   *
   * @returns {Promise<Array>} [{ measureId, code, goalCount, ... }]
   */
  async findOverloadedMeasures({ branchId, threshold = 50, limit = 50 } = {}) {
    const Goal = M.TherapeuticGoal();
    const Measure = M.Measure();
    if (!Goal || !Measure) return [];

    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = _asObjectId(branchId);

    const linkCounts = await Goal.aggregate([
      { $match: match },
      { $unwind: '$objectives' },
      { $unwind: '$objectives.measureLinks' },
      {
        $match: {
          'objectives.measureLinks.status': 'active',
          'objectives.measureLinks.linkType': { $ne: 'CONTRAINDICATED' },
        },
      },
      {
        $group: {
          // distinct goals per measure
          _id: {
            measureId: '$objectives.measureLinks.measureId',
            goalId: '$_id',
          },
        },
      },
      {
        $group: {
          _id: '$_id.measureId',
          goalCount: { $sum: 1 },
        },
      },
      { $match: { goalCount: { $gt: threshold } } },
      { $sort: { goalCount: -1 } },
      { $limit: limit },
    ]);

    if (linkCounts.length === 0) return [];

    // Hydrate measure metadata.
    const ids = linkCounts.map(r => r._id);
    const measures = await Measure.find(
      { _id: { $in: ids } },
      { code: 1, name: 1, name_ar: 1, status: 1 }
    ).lean();
    const byId = new Map(measures.map(m => [String(m._id), m]));

    return linkCounts.map(row => {
      const m = byId.get(String(row._id)) || {};
      return {
        measureId: String(row._id),
        code: m.code,
        name: m.name,
        name_ar: m.name_ar,
        status: m.status,
        goalCount: row.goalCount,
      };
    });
  }

  /**
   * Org-wide / branch-wide linkage KPIs. Single pipeline produces all
   * counts; consumer formats as percent or absolute.
   *
   * @returns {Promise<Object>}
   *   {
   *     goals: {
   *       total, withMeasureLinks, withPrimaryLink, primaryCoverage (0-1)
   *     },
   *     links: {
   *       total, active, flagged, underReview, unlinked,
   *       withVerboseRationale (≥20 chars), rationaleCoverage (0-1),
   *       overdueReviews
   *     },
   *     ranges: { generatedAt }
   *   }
   */
  async linkageKpis({ branchId, rationaleMinChars = 20 } = {}) {
    const Goal = M.TherapeuticGoal();
    if (!Goal) return null;

    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = _asObjectId(branchId);
    const now = new Date();

    // Goal-level facet
    const [goalAgg] = await Goal.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $project: {
                hasLinks: {
                  $gt: [
                    {
                      $size: {
                        $reduce: {
                          input: { $ifNull: ['$objectives', []] },
                          initialValue: [],
                          in: {
                            $concatArrays: ['$$value', { $ifNull: ['$$this.measureLinks', []] }],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                hasPrimary: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: {
                            $reduce: {
                              input: { $ifNull: ['$objectives', []] },
                              initialValue: [],
                              in: {
                                $concatArrays: [
                                  '$$value',
                                  { $ifNull: ['$$this.measureLinks', []] },
                                ],
                              },
                            },
                          },
                          as: 'l',
                          cond: {
                            $and: [
                              { $eq: ['$$l.linkType', 'PRIMARY'] },
                              { $ne: ['$$l.status', 'unlinked'] },
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                withMeasureLinks: { $sum: { $cond: ['$hasLinks', 1, 0] } },
                withPrimaryLink: { $sum: { $cond: ['$hasPrimary', 1, 0] } },
              },
            },
          ],
        },
      },
    ]);

    const goalTotals = goalAgg.totals[0] || { total: 0, withMeasureLinks: 0, withPrimaryLink: 0 };

    // Link-level facet (unwind both arrays once).
    const linkAgg = await Goal.aggregate([
      { $match: match },
      { $unwind: { path: '$objectives', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$objectives.measureLinks', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$objectives.measureLinks.status', 'active'] }, 1, 0] },
          },
          flagged: {
            $sum: { $cond: [{ $eq: ['$objectives.measureLinks.status', 'flagged'] }, 1, 0] },
          },
          underReview: {
            $sum: {
              $cond: [{ $eq: ['$objectives.measureLinks.status', 'under_review'] }, 1, 0],
            },
          },
          unlinked: {
            $sum: { $cond: [{ $eq: ['$objectives.measureLinks.status', 'unlinked'] }, 1, 0] },
          },
          withVerboseRationale: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    { $strLenCP: { $ifNull: ['$objectives.measureLinks.linkRationale', ''] } },
                    rationaleMinChars,
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdueReviews: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$objectives.measureLinks.status', 'unlinked'] },
                    { $ne: ['$objectives.measureLinks.nextLinkReviewAt', null] },
                    { $lt: ['$objectives.measureLinks.nextLinkReviewAt', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    const linkTotals = linkAgg[0] || {
      total: 0,
      active: 0,
      flagged: 0,
      underReview: 0,
      unlinked: 0,
      withVerboseRationale: 0,
      overdueReviews: 0,
    };

    const primaryCoverage =
      goalTotals.total > 0 ? goalTotals.withPrimaryLink / goalTotals.total : null;
    const rationaleCoverage =
      linkTotals.total > 0 ? linkTotals.withVerboseRationale / linkTotals.total : null;

    return {
      goals: {
        total: goalTotals.total,
        withMeasureLinks: goalTotals.withMeasureLinks,
        withPrimaryLink: goalTotals.withPrimaryLink,
        primaryCoverage: primaryCoverage != null ? Number(primaryCoverage.toFixed(3)) : null,
      },
      links: {
        total: linkTotals.total,
        active: linkTotals.active,
        flagged: linkTotals.flagged,
        underReview: linkTotals.underReview,
        unlinked: linkTotals.unlinked,
        withVerboseRationale: linkTotals.withVerboseRationale,
        rationaleCoverage: rationaleCoverage != null ? Number(rationaleCoverage.toFixed(3)) : null,
        overdueReviews: linkTotals.overdueReviews,
      },
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Per-link distribution by linkType — useful for "what's the mix
   * of PRIMARY vs SECONDARY in this branch?" dashboards.
   */
  async linkTypeDistribution({ branchId } = {}) {
    const Goal = M.TherapeuticGoal();
    if (!Goal) return {};
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = _asObjectId(branchId);

    const rows = await Goal.aggregate([
      { $match: match },
      { $unwind: '$objectives' },
      { $unwind: '$objectives.measureLinks' },
      {
        $match: { 'objectives.measureLinks.status': { $ne: 'unlinked' } },
      },
      {
        $group: {
          _id: '$objectives.measureLinks.linkType',
          count: { $sum: 1 },
        },
      },
    ]);
    const out = {
      PRIMARY: 0,
      SECONDARY: 0,
      SCREENING_ONLY: 0,
      PROXY: 0,
      CONTRAINDICATED: 0,
    };
    for (const row of rows) {
      if (out[row._id] !== undefined) out[row._id] = row.count;
    }
    return out;
  }
}

const singleton = new GoalLinkageInsightsSvc();
module.exports = singleton;
