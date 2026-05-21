'use strict';

/**
 * measureOutcomesAggregator.service.js — Wave 229
 *
 * The rollup layer that turns per-administration data (MeasureApplication
 * W211b), per-pair trends (W219), per-pair alerts (W221), and per-goal
 * progress (W216) into beneficiary / branch / program-level summaries
 * suitable for dashboards + monthly reports.
 *
 * Three public entry points:
 *
 *   aggregateBeneficiary(beneficiaryId)
 *     → per-measure latest score + trend classification + open alerts
 *       + linked goals progress, plus an overallStatus heuristic
 *       (progressing | mixed | concerning) so a UI can show a single
 *       traffic-light at a glance.
 *
 *   aggregateBranch(branchId, {from, to})
 *     → MCID achievement rate, regression rate, plateau rate, goals
 *       achieved rate, active alerts count. The denominators are
 *       "(beneficiary, measure) pairs with ≥3 admins in window" — pairs
 *       with thinner history can't have a trend, so they don't dilute
 *       the rates.
 *
 *   aggregateBranchTimeseries(branchId, {bucket='month', months=6})
 *     → per-bucket admin volume + MCID-achievement-count + alerts-raised
 *       count for trend charts.
 *
 * All three are read-only and idempotent — safe to call from cron,
 * route handlers, or report generators. Heavy aggregation uses
 * MongoDB's `aggregate()` pipelines so the DB does the work.
 *
 * No HTTP routes in this wave — those land separately (next agent
 * picks them up as W229+) to avoid the cross-agent races that have
 * dogged this domain. Service can be consumed via direct require.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const M = {
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
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
  MeasureAlert: () => {
    try {
      return mongoose.model('MeasureAlert');
    } catch {
      try {
        require('../domains/goals/models/MeasureAlert');
        return mongoose.model('MeasureAlert');
      } catch {
        return null;
      }
    }
  },
  MeasureReassessmentTask: () => {
    try {
      return mongoose.model('MeasureReassessmentTask');
    } catch {
      try {
        require('../domains/goals/models/MeasureReassessmentTask');
        return mongoose.model('MeasureReassessmentTask');
      } catch {
        return null;
      }
    }
  },
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
  // W256: name-resolution for the drill-through pair list.
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      try {
        require('../models/Beneficiary');
        return mongoose.model('Beneficiary');
      } catch {
        return null;
      }
    }
  },
};

// ─── Pure rollup helpers ──────────────────────────────────────────

/**
 * Overall status heuristic per-beneficiary:
 *   concerning  : any open REGRESSION alert OR any goal status='not_achieved'
 *   mixed       : any open PLATEAU|MCID_NOT_MET alert AND any improving signal
 *   progressing : at least one improving trend AND no concerning signals
 *   insufficient: not enough data to judge
 */
function _deriveOverallStatus({ alertsByType, measures, goals }) {
  const hasRegression = (alertsByType.REGRESSION_DETECTED || 0) > 0;
  const hasPlateau = (alertsByType.PLATEAU_DETECTED || 0) > 0;
  const hasMcidIssue = (alertsByType.MCID_NOT_MET || 0) > 0;
  const hasFailedGoal = goals.some(g => g.status === 'not_achieved' || g.status === 'discontinued');

  if (hasRegression || hasFailedGoal) return 'concerning';

  const improving = measures.filter(
    m => m.trend === 'linear_improvement' || m.trend === 'slow_improvement'
  );
  if (improving.length === 0) {
    return measures.length === 0 ? 'insufficient' : 'mixed';
  }

  if (hasPlateau || hasMcidIssue) return 'mixed';
  return 'progressing';
}

function _monthBucket(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function _quarterBucket(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

// ─── Service ───────────────────────────────────────────────────────

class MeasureOutcomesAggregatorSvc {
  /**
   * Per-beneficiary rollup. Single round-trip per collection; all
   * cross-collection joins happen in app code (cheaper than $lookup
   * for this fan-out).
   */
  async aggregateBeneficiary(beneficiaryId) {
    const MeasureApplication = M.MeasureApplication();
    const MeasureAlert = M.MeasureAlert();
    const MeasureReassessmentTask = M.MeasureReassessmentTask();
    const TherapeuticGoal = M.TherapeuticGoal();
    const Measure = M.Measure();
    if (!MeasureApplication || !Measure) {
      return { error: 'models_unavailable' };
    }

    const benObjectId = mongoose.Types.ObjectId.isValid(beneficiaryId)
      ? new mongoose.Types.ObjectId(beneficiaryId)
      : beneficiaryId;

    // ─── Latest admin per measure ────────────────────────────────
    const latests = await MeasureApplication.aggregate([
      { $match: { beneficiaryId: benObjectId, status: { $in: ['completed', 'locked'] } } },
      { $sort: { applicationDate: -1 } },
      {
        $group: {
          _id: '$measureId',
          latestApplicationId: { $first: '$_id' },
          latestScore: { $first: '$totalRawScore' },
          latestDate: { $first: '$applicationDate' },
          baselineScore: { $last: '$totalRawScore' },
          baselineDate: { $last: '$applicationDate' },
          admins: { $sum: 1 },
          mcidValue: { $first: '$mcidAtAdministration.value' },
          mcidStatus: { $first: '$mcidAtAdministration.status' },
        },
      },
    ]);

    if (latests.length === 0) {
      return {
        beneficiaryId: String(benObjectId),
        measures: [],
        alerts: { open: 0, byType: {} },
        tasks: { pending: 0, overdue: 0 },
        goals: { total: 0, active: 0, achieved: 0 },
        overallStatus: 'insufficient',
      };
    }

    // Hydrate measure metadata
    const measureIds = latests.map(l => l._id);
    const measures = await Measure.find({ _id: { $in: measureIds } })
      .select('code name name_ar scoringDirection interpretation.mcid')
      .lean();
    const measureById = new Map(measures.map(m => [String(m._id), m]));

    // ─── Trend per (beneficiary, measure) via lazy-load engine ───
    const trendEngine = require('./measureTrendEngine.service');
    const measureRows = await Promise.all(
      latests.map(async l => {
        const m = measureById.get(String(l._id));
        if (!m) return null;
        let trend = null;
        try {
          trend = await trendEngine.analyze(benObjectId, m);
        } catch (err) {
          logger.warn('[OutcomesAggregator] trend failed for %s: %s', m.code, err.message);
        }
        const direction = m.scoringDirection === 'lower_better' ? -1 : 1;
        const deltaFromBaseline = (l.latestScore - l.baselineScore) * direction;
        const mcidAchieved =
          Number.isFinite(l.mcidValue) &&
          l.mcidValue > 0 &&
          (l.mcidStatus === 'established' || l.mcidStatus === 'provisional') &&
          deltaFromBaseline >= l.mcidValue;
        return {
          measureId: String(l._id),
          measureCode: m.code,
          measureName_ar: m.name_ar || m.name,
          adminCount: l.admins,
          baselineScore: l.baselineScore,
          baselineDate: l.baselineDate,
          latestScore: l.latestScore,
          latestDate: l.latestDate,
          deltaFromBaseline: Math.round(deltaFromBaseline * 100) / 100,
          mcidValue: l.mcidValue || null,
          mcidAchieved,
          trend: trend?.classification || null,
          slopePerMonth: trend?.slopePerMonth ?? null,
          confidence: trend?.confidence || null,
        };
      })
    );
    const filteredMeasures = measureRows.filter(Boolean);

    // ─── Alerts ───────────────────────────────────────────────────
    const alertsByType = {};
    let openAlerts = 0;
    if (MeasureAlert) {
      const alertAgg = await MeasureAlert.aggregate([
        { $match: { beneficiaryId: benObjectId, status: 'open' } },
        { $group: { _id: '$alertType', count: { $sum: 1 } } },
      ]);
      for (const a of alertAgg) {
        alertsByType[a._id] = a.count;
        openAlerts += a.count;
      }
    }

    // ─── Tasks ────────────────────────────────────────────────────
    let pendingTasks = 0;
    let overdueTasks = 0;
    if (MeasureReassessmentTask) {
      const now = new Date();
      const taskAgg = await MeasureReassessmentTask.aggregate([
        { $match: { beneficiaryId: benObjectId, status: 'pending' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            overdue: {
              $sum: { $cond: [{ $lt: ['$dueAt', now] }, 1, 0] },
            },
          },
        },
      ]);
      if (taskAgg.length) {
        pendingTasks = taskAgg[0].total || 0;
        overdueTasks = taskAgg[0].overdue || 0;
      }
    }

    // ─── Goals ────────────────────────────────────────────────────
    let goals = [];
    if (TherapeuticGoal) {
      goals = await TherapeuticGoal.find({
        beneficiaryId: benObjectId,
        isDeleted: { $ne: true },
      })
        .select('status currentProgress')
        .lean()
        .catch(() => []);
    }
    const goalsActive = goals.filter(g => g.status === 'active').length;
    const goalsAchieved = goals.filter(g => g.status === 'achieved').length;

    return {
      beneficiaryId: String(benObjectId),
      measures: filteredMeasures,
      alerts: { open: openAlerts, byType: alertsByType },
      tasks: { pending: pendingTasks, overdue: overdueTasks },
      goals: { total: goals.length, active: goalsActive, achieved: goalsAchieved },
      overallStatus: _deriveOverallStatus({
        alertsByType,
        measures: filteredMeasures,
        goals,
      }),
    };
  }

  /**
   * Per-branch rollup over a date window. Denominators:
   *   "(beneficiary, measure) pairs with ≥3 admins in window" — pairs
   *   with thinner history can't have a meaningful trend, so they
   *   would dilute rates if included. The output reports those as
   *   `pairsThinHistory` for transparency.
   */
  async aggregateBranch(branchId, opts = {}) {
    const MeasureApplication = M.MeasureApplication();
    const MeasureAlert = M.MeasureAlert();
    const TherapeuticGoal = M.TherapeuticGoal();
    if (!MeasureApplication) return { error: 'models_unavailable' };

    const branchObjectId = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;

    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 90 * 86400000);
    const to = opts.to ? new Date(opts.to) : new Date();

    // ─── (beneficiary, measure) admin counts in window ────────────
    const pairStats = await MeasureApplication.aggregate([
      {
        $match: {
          branchId: branchObjectId,
          status: { $in: ['completed', 'locked'] },
          applicationDate: { $gte: from, $lte: to },
        },
      },
      { $sort: { applicationDate: 1 } },
      {
        $group: {
          _id: { beneficiaryId: '$beneficiaryId', measureId: '$measureId' },
          admins: { $sum: 1 },
          first: { $first: '$$ROOT' },
          last: { $last: '$$ROOT' },
        },
      },
    ]);

    const pairsThinHistory = pairStats.filter(p => p.admins < 3).length;
    const richPairs = pairStats.filter(p => p.admins >= 3);
    const denom = richPairs.length;

    let mcidAchieved = 0;
    let admins = 0;
    const beneficiarySet = new Set();
    for (const p of pairStats) {
      admins += p.admins;
      beneficiarySet.add(String(p._id.beneficiaryId));
    }

    // ─── MCID achievement count among rich pairs ─────────────────
    // Per-measure breakdown (W249) computed in the same pass — needs
    // measure code+name from the same lookup, so we widen the select
    // here rather than firing a second query.
    const measureIds = [...new Set(richPairs.map(p => String(p._id.measureId)))];
    const Measure = M.Measure();
    const measures = await Measure.find({
      _id: { $in: measureIds.map(id => new mongoose.Types.ObjectId(id)) },
    })
      .select('scoringDirection code name_ar name_en name')
      .lean();
    const dirById = new Map(
      measures.map(m => [String(m._id), m.scoringDirection || 'higher_better'])
    );
    // Side map for W249 per-measure breakdown — keeps the existing
    // dirById API untouched for any external caller that reaches here.
    const metaById = new Map(
      measures.map(m => [
        String(m._id),
        {
          code: m.code || '—',
          nameAr: m.name_ar || m.name || m.code || '—',
        },
      ])
    );

    // Per-measure tally accumulated alongside the global MCID loop so we
    // walk richPairs only once.
    const byMeasureMap = new Map();
    function _ensureRow(mid) {
      let row = byMeasureMap.get(mid);
      if (!row) {
        const meta = metaById.get(mid) || { code: '—', nameAr: '—' };
        row = {
          measureId: mid,
          measureCode: meta.code,
          measureNameAr: meta.nameAr,
          pairsAnalysed: 0,
          mcidAchievedCount: 0,
        };
        byMeasureMap.set(mid, row);
      }
      return row;
    }

    for (const p of richPairs) {
      const mid = String(p._id.measureId);
      const row = _ensureRow(mid);
      row.pairsAnalysed++;

      const direction = dirById.get(mid) === 'lower_better' ? -1 : 1;
      const mcidVal = p.last?.mcidAtAdministration?.value;
      const mcidStatus = p.last?.mcidAtAdministration?.status;
      if (!Number.isFinite(mcidVal) || mcidVal <= 0) continue;
      if (mcidStatus !== 'established' && mcidStatus !== 'provisional') continue;
      const delta = (p.last.totalRawScore - p.first.totalRawScore) * direction;
      if (delta >= mcidVal) {
        mcidAchieved++;
        row.mcidAchievedCount++;
      }
    }

    // Sort by evidence weight (pairsAnalysed desc) — directors should see
    // the most-tracked measures first; sorting by rate would surface
    // small-n outliers misleadingly. Round rate to 3 decimals to match
    // the top-level mcidAchievementRate scaling.
    const byMeasure = Array.from(byMeasureMap.values())
      .map(r => ({
        ...r,
        mcidAchievementRate: r.pairsAnalysed
          ? Math.round((r.mcidAchievedCount / r.pairsAnalysed) * 1000) / 1000
          : 0,
      }))
      .sort((a, b) => {
        if (b.pairsAnalysed !== a.pairsAnalysed) return b.pairsAnalysed - a.pairsAnalysed;
        return a.measureCode.localeCompare(b.measureCode);
      });

    // ─── Open alert distribution (window-agnostic — alerts open NOW) ─
    let regressionCount = 0;
    let plateauCount = 0;
    let mcidAlertCount = 0;
    let activeAlertsTotal = 0;
    if (MeasureAlert) {
      const alertAgg = await MeasureAlert.aggregate([
        { $match: { branchId: branchObjectId, status: 'open' } },
        { $group: { _id: '$alertType', count: { $sum: 1 } } },
      ]);
      for (const a of alertAgg) {
        activeAlertsTotal += a.count;
        if (a._id === 'REGRESSION_DETECTED') regressionCount = a.count;
        if (a._id === 'PLATEAU_DETECTED') plateauCount = a.count;
        if (a._id === 'MCID_NOT_MET') mcidAlertCount = a.count;
      }
    }

    // ─── Goals rolled up at branch level ─────────────────────────
    let goalsTotal = 0;
    let goalsActive = 0;
    let goalsAchieved = 0;
    if (TherapeuticGoal) {
      const goalAgg = await TherapeuticGoal.aggregate([
        { $match: { branchId: branchObjectId, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      for (const g of goalAgg) {
        goalsTotal += g.count;
        if (g._id === 'active') goalsActive = g.count;
        if (g._id === 'achieved') goalsAchieved = g.count;
      }
    }

    return {
      branchId: String(branchObjectId),
      period: { from, to, days: Math.round((to - from) / 86400000) },
      beneficiariesWithAdmin: beneficiarySet.size,
      administrationsTotal: admins,
      pairsAnalysed: denom,
      pairsThinHistory,
      mcidAchievedCount: mcidAchieved,
      mcidAchievementRate: denom ? Math.round((mcidAchieved / denom) * 1000) / 1000 : 0,
      alerts: {
        total: activeAlertsTotal,
        regression: regressionCount,
        plateau: plateauCount,
        mcidNotMet: mcidAlertCount,
      },
      // Alert-driven rates use total alerts as denom approximation; with
      // small populations the per-pair MCID rate above is sturdier.
      regressionRate: denom ? Math.round((regressionCount / denom) * 1000) / 1000 : 0,
      plateauRate: denom ? Math.round((plateauCount / denom) * 1000) / 1000 : 0,
      goals: {
        total: goalsTotal,
        active: goalsActive,
        achieved: goalsAchieved,
        achievedRate: goalsTotal ? Math.round((goalsAchieved / goalsTotal) * 1000) / 1000 : 0,
      },
      // W249: per-measure breakdown — directors use this to spot which
      // measures track well at this site and which need training/protocol
      // review. Only includes measures with ≥3 admins (richPairs);
      // sorted by pairsAnalysed desc.
      byMeasure,
    };
  }

  /**
   * Per-branch time series for trend charts. Returns one row per
   * bucket with admin volume + MCID achievement count (computed as
   * pairs whose `last admin in bucket` flips them across the MCID
   * threshold) + alerts raised in bucket.
   *
   * @param {string|ObjectId} branchId
   * @param {Object} opts
   * @param {'month'|'quarter'} [opts.bucket='month']
   * @param {number} [opts.months=6]
   */
  async aggregateBranchTimeseries(branchId, opts = {}) {
    const MeasureApplication = M.MeasureApplication();
    const MeasureAlert = M.MeasureAlert();
    if (!MeasureApplication) return { error: 'models_unavailable' };

    const branchObjectId = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;
    const bucket = opts.bucket === 'quarter' ? 'quarter' : 'month';
    const months = Number.isFinite(opts.months) ? opts.months : 6;
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - months);

    const admins = await MeasureApplication.find({
      branchId: branchObjectId,
      status: { $in: ['completed', 'locked'] },
      applicationDate: { $gte: from },
    })
      .select('applicationDate beneficiaryId measureId')
      .lean();

    const adminsByBucket = new Map();
    for (const a of admins) {
      const key =
        bucket === 'quarter' ? _quarterBucket(a.applicationDate) : _monthBucket(a.applicationDate);
      adminsByBucket.set(key, (adminsByBucket.get(key) || 0) + 1);
    }

    const alerts = MeasureAlert
      ? await MeasureAlert.find({
          branchId: branchObjectId,
          firstSeenAt: { $gte: from },
        })
          .select('firstSeenAt alertType')
          .lean()
      : [];
    const alertsByBucket = new Map();
    for (const a of alerts) {
      const key =
        bucket === 'quarter' ? _quarterBucket(a.firstSeenAt) : _monthBucket(a.firstSeenAt);
      alertsByBucket.set(key, (alertsByBucket.get(key) || 0) + 1);
    }

    const keys = [...new Set([...adminsByBucket.keys(), ...alertsByBucket.keys()])].sort();
    return {
      branchId: String(branchObjectId),
      bucket,
      from,
      points: keys.map(k => ({
        bucket: k,
        administrations: adminsByBucket.get(k) || 0,
        alertsRaised: alertsByBucket.get(k) || 0,
      })),
    };
  }

  /**
   * Drill-through for the W255 per-measure compare cell. Lists the
   * actual (beneficiary × measure) pairs that contribute to
   * aggregateBranch's `byMeasure[measureId]` rollup — same window,
   * same status filter, same ≥3-admins criterion.
   *
   * Director clicks "FIM at 25% in Branch B" → this returns the
   * 12 pairs, showing which 3 achieved MCID and which 9 didn't,
   * with beneficiary names + first/last scores so they can act.
   *
   * @param {string|ObjectId} args.branchId
   * @param {string|ObjectId} args.measureId
   * @param {Date|string} [args.from] — default: 90 days ago
   * @param {Date|string} [args.to]   — default: now
   * @returns {Promise<{
   *   branchId: string,
   *   measureId: string,
   *   measureCode: string | null,
   *   measureNameAr: string | null,
   *   period: { from: Date, to: Date, days: number },
   *   pairs: Array<{
   *     beneficiaryId: string,
   *     beneficiaryNameAr: string,
   *     beneficiaryNumber: string | null,
   *     adminCount: number,
   *     firstScore: number,
   *     firstDate: string,
   *     lastScore: number,
   *     lastDate: string,
   *     delta: number,
   *     mcidValue: number | null,
   *     mcidStatus: string | null,
   *     mcidAchieved: boolean,
   *     scoreHistory: Array<{date: string, score: number}>, // W257 sparkline
   *   }>,
   *   pairsThinHistory: number, // pairs with <3 admins NOT in `pairs[]`
   * } | { error: 'models_unavailable' }>}
   */
  async listMeasurePairsAt({ branchId, measureId, from, to } = {}) {
    const MeasureApplication = M.MeasureApplication();
    const Measure = M.Measure();
    const Beneficiary = M.Beneficiary();
    if (!MeasureApplication || !Beneficiary) return { error: 'models_unavailable' };
    if (!branchId || !measureId) {
      throw new Error('[OutcomesAggregator] branchId + measureId required');
    }

    const branchObj = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;
    const measureObj = mongoose.Types.ObjectId.isValid(measureId)
      ? new mongoose.Types.ObjectId(measureId)
      : measureId;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    // Same pipeline as aggregateBranch, scoped to one measure.
    const pairStats = await MeasureApplication.aggregate([
      {
        $match: {
          branchId: branchObj,
          measureId: measureObj,
          status: { $in: ['completed', 'locked'] },
          applicationDate: { $gte: fromDate, $lte: toDate },
        },
      },
      { $sort: { applicationDate: 1 } },
      {
        $group: {
          _id: '$beneficiaryId',
          admins: { $sum: 1 },
          first: { $first: '$$ROOT' },
          last: { $last: '$$ROOT' },
          // W257: full score trajectory ordered by applicationDate asc.
          // Pre-sort above guarantees order; $push preserves it.
          // Small per pair (mean ~5, p99 ~15-20 admins) → ~120-480 numbers
          // total for a typical 24-pair branch view. Acceptable size for
          // the UI sparkline render — no separate roundtrip needed.
          history: {
            $push: { date: '$applicationDate', score: '$totalRawScore' },
          },
        },
      },
    ]);

    const richPairs = pairStats.filter(p => p.admins >= 3);
    const thinCount = pairStats.length - richPairs.length;

    // Measure direction + meta — same lookup widening used by W249.
    let measureCode = null;
    let measureNameAr = null;
    let direction = 1;
    if (Measure) {
      const measureDoc = await Measure.findById(measureObj)
        .select('code name_ar name_en name scoringDirection')
        .lean();
      if (measureDoc) {
        measureCode = measureDoc.code || null;
        measureNameAr = measureDoc.name_ar || measureDoc.name_en || measureDoc.name || measureCode;
        direction = measureDoc.scoringDirection === 'lower_better' ? -1 : 1;
      }
    }

    // Beneficiary name lookup — one query for the whole set.
    const beneficiaryIds = richPairs.map(p => p._id).filter(Boolean);
    const beneficiaries = await Beneficiary.find({ _id: { $in: beneficiaryIds } })
      .select('firstName_ar lastName_ar firstName_en lastName_en beneficiaryNumber')
      .lean();
    const benMap = new Map(
      beneficiaries.map(b => {
        const nameAr =
          [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() ||
          [b.firstName_en, b.lastName_en].filter(Boolean).join(' ').trim() ||
          '—';
        return [String(b._id), { nameAr, number: b.beneficiaryNumber || null }];
      })
    );

    // W261: per-pair W221 alert events. Single MeasureAlert.find for ALL
    // beneficiaries in richPairs, then group in app code. Window matches
    // the admin window (firstSeenAt ∈ [from, to]) so the UI markers line
    // up with the score trajectory on the W260 detail chart.
    const MeasureAlert = M.MeasureAlert();
    const alertsByBen = new Map();
    if (MeasureAlert && beneficiaryIds.length > 0) {
      const alertDocs = await MeasureAlert.find({
        measureId: measureObj,
        beneficiaryId: { $in: beneficiaryIds },
        firstSeenAt: { $gte: fromDate, $lte: toDate },
      })
        .select(
          '_id beneficiaryId alertType severity status firstSeenAt acknowledgedAt resolvedAt dismissedAt evidence'
        )
        .sort({ firstSeenAt: 1 })
        .lean();
      for (const a of alertDocs) {
        const key = String(a.beneficiaryId);
        if (!alertsByBen.has(key)) alertsByBen.set(key, []);
        alertsByBen.get(key).push({
          id: String(a._id),
          alertType: a.alertType,
          severity: a.severity || 'medium',
          status: a.status,
          firstSeenAt: new Date(a.firstSeenAt).toISOString(),
          acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString() : null,
          resolvedAt: a.resolvedAt ? new Date(a.resolvedAt).toISOString() : null,
          dismissedAt: a.dismissedAt ? new Date(a.dismissedAt).toISOString() : null,
          messageAr: a.evidence?.message_ar || null,
        });
      }
    }

    // Build the rows. Achievement matches aggregateBranch's criterion exactly
    // (direction-aware delta ≥ mcidValue, mcidStatus ∈ established|provisional).
    const pairs = richPairs.map(p => {
      const meta = benMap.get(String(p._id)) || { nameAr: '—', number: null };
      const firstScore = Number(p.first.totalRawScore);
      const lastScore = Number(p.last.totalRawScore);
      const delta = (lastScore - firstScore) * direction;
      const mcidVal = p.last?.mcidAtAdministration?.value;
      const mcidStatus = p.last?.mcidAtAdministration?.status || null;
      const mcidEligible =
        Number.isFinite(mcidVal) &&
        mcidVal > 0 &&
        (mcidStatus === 'established' || mcidStatus === 'provisional');
      const mcidAchieved = mcidEligible && delta >= mcidVal;
      // W257: score trajectory for the inline sparkline. Walk the $push
      // result, dropping null/NaN scores defensively so the UI doesn't
      // have to. Order preserved from the pipeline's pre-sort.
      const scoreHistory = Array.isArray(p.history)
        ? p.history
            .filter(h => Number.isFinite(Number(h.score)))
            .map(h => ({
              date: new Date(h.date).toISOString(),
              score: Number(h.score),
            }))
        : [];
      // W261: W221 alert events for this (beneficiary, measure) within
      // the window. UI renders these as vertical markers on the W260
      // detail chart. Empty array when no alerts fired.
      const alerts = alertsByBen.get(String(p._id)) || [];
      return {
        beneficiaryId: String(p._id),
        beneficiaryNameAr: meta.nameAr,
        beneficiaryNumber: meta.number,
        adminCount: p.admins,
        firstScore,
        firstDate: new Date(p.first.applicationDate).toISOString(),
        lastScore,
        lastDate: new Date(p.last.applicationDate).toISOString(),
        delta: Math.round(delta * 100) / 100,
        mcidValue: Number.isFinite(mcidVal) ? mcidVal : null,
        mcidStatus,
        mcidAchieved,
        scoreHistory,
        alerts,
      };
    });

    // Sort: achieved=false first (action items), then by adminCount desc,
    // then by absolute delta desc. The director's eye lands on
    // non-achievers immediately.
    pairs.sort((a, b) => {
      if (a.mcidAchieved !== b.mcidAchieved) return a.mcidAchieved ? 1 : -1;
      if (b.adminCount !== a.adminCount) return b.adminCount - a.adminCount;
      return Math.abs(b.delta) - Math.abs(a.delta);
    });

    return {
      branchId: String(branchObj),
      measureId: String(measureObj),
      measureCode,
      measureNameAr,
      period: {
        from: fromDate,
        to: toDate,
        days: Math.round((toDate - fromDate) / 86400000),
      },
      pairs,
      pairsThinHistory: thinCount,
    };
  }

  // ─── Pure helpers exposed for tests ──────────────────────────────
  _deriveOverallStatus(input) {
    return _deriveOverallStatus(input);
  }
  _monthBucket(d) {
    return _monthBucket(d);
  }
  _quarterBucket(d) {
    return _quarterBucket(d);
  }
}

module.exports = new MeasureOutcomesAggregatorSvc();
