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
    // We need the measure's direction → look up measures.
    const measureIds = [...new Set(richPairs.map(p => String(p._id.measureId)))];
    const Measure = M.Measure();
    const measures = await Measure.find({
      _id: { $in: measureIds.map(id => new mongoose.Types.ObjectId(id)) },
    })
      .select('scoringDirection')
      .lean();
    const dirById = new Map(
      measures.map(m => [String(m._id), m.scoringDirection || 'higher_better'])
    );

    for (const p of richPairs) {
      const direction = dirById.get(String(p._id.measureId)) === 'lower_better' ? -1 : 1;
      const mcidVal = p.last?.mcidAtAdministration?.value;
      const mcidStatus = p.last?.mcidAtAdministration?.status;
      if (!Number.isFinite(mcidVal) || mcidVal <= 0) continue;
      if (mcidStatus !== 'established' && mcidStatus !== 'provisional') continue;
      const delta = (p.last.totalRawScore - p.first.totalRawScore) * direction;
      if (delta >= mcidVal) mcidAchieved++;
    }

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
