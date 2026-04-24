/**
 * redFlagAggregateService.js — Beneficiary-360 Foundation Commit 9.
 *
 * Cross-beneficiary rollup of red-flag state for the admin/quality
 * dashboard. Reads directly from the Mongoose models (state +
 * override log) and produces a flat summary — severity split,
 * domain split, blocking count, top offending beneficiaries, and
 * override velocity for the last 7/30 days.
 *
 * Design decisions:
 *
 *   1. Reads only. No mutations, no cache. The per-request cost is
 *      one indexed query plus two count queries — fine for a
 *      dashboard refresh.
 *
 *   2. Top-beneficiaries aggregation uses a `$group` pipeline so
 *      the DB does the counting; we don't fetch every active doc
 *      into memory. For a branch with thousands of beneficiaries
 *      this matters.
 *
 *   3. Clock is injected via `now()` so tests can freeze "last 7
 *      days" windows deterministically.
 *
 *   4. When the models aren't connected (tests using plain stubs),
 *      the service still works — we treat any `countDocuments` /
 *      `aggregate` as async and forward results verbatim.
 */

'use strict';

const MS_PER_DAY = 24 * 3600 * 1000;

function createAggregateService(deps = {}) {
  const stateModel = deps.stateModel;
  const overrideModel = deps.overrideModel;
  const now = deps.now || (() => new Date());

  if (stateModel == null) {
    throw new Error('redFlagAggregateService: stateModel is required');
  }

  async function aggregate() {
    const snapshotTime = now();
    const nowMs = snapshotTime instanceof Date ? snapshotTime.getTime() : Date.now();

    const [bySeverityAgg, byDomainAgg, blockingCount, totalActive, topBeneficiaries] =
      await Promise.all([
        stateModel.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        stateModel.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$domain', count: { $sum: 1 } } },
        ]),
        stateModel.countDocuments({ status: 'active', blocking: true }),
        stateModel.countDocuments({ status: 'active' }),
        stateModel.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: '$beneficiaryId',
              totalFlags: { $sum: 1 },
              critical: {
                $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
              },
              blocking: { $sum: { $cond: [{ $eq: ['$blocking', true] }, 1, 0] } },
            },
          },
          { $sort: { critical: -1, blocking: -1, totalFlags: -1 } },
          { $limit: 20 },
        ]),
      ]);

    let overridesLast7d = 0;
    let overridesLast30d = 0;
    if (overrideModel != null) {
      const since7 = new Date(nowMs - 7 * MS_PER_DAY);
      const since30 = new Date(nowMs - 30 * MS_PER_DAY);
      [overridesLast7d, overridesLast30d] = await Promise.all([
        overrideModel.countDocuments({ overriddenAt: { $gte: since7 } }),
        overrideModel.countDocuments({ overriddenAt: { $gte: since30 } }),
      ]);
    }

    const bySeverity = zeroFill(
      { critical: 0, warning: 0, info: 0 },
      bySeverityAgg.map(a => ({ key: a._id, count: a.count }))
    );
    const byDomain = zeroFill(
      {
        clinical: 0,
        behavioral: 0,
        operational: 0,
        attendance: 0,
        compliance: 0,
        safety: 0,
        family: 0,
        financial: 0,
      },
      byDomainAgg.map(a => ({ key: a._id, count: a.count }))
    );

    return {
      generatedAt:
        snapshotTime instanceof Date ? snapshotTime.toISOString() : new Date(nowMs).toISOString(),
      totals: {
        active: totalActive,
        blocking: blockingCount,
      },
      bySeverity,
      byDomain,
      topBeneficiaries: topBeneficiaries.map(t => ({
        beneficiaryId: t._id,
        totalFlags: t.totalFlags,
        critical: t.critical,
        blocking: t.blocking,
      })),
      overrides: {
        last7d: overridesLast7d,
        last30d: overridesLast30d,
      },
    };
  }

  return Object.freeze({ aggregate });
}

function zeroFill(template, entries) {
  const result = { ...template };
  for (const { key, count } of entries) {
    result[key] = count;
  }
  return result;
}

module.exports = { createAggregateService };
