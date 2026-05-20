'use strict';

/**
 * measureTrendEngine.service.js — Wave 219
 *
 * Computes longitudinal trends across MeasureApplication history for
 * a (beneficiary, measure) pair. Returns slope, CI95, R², trajectory
 * classification, and an estimate of days-to-target if a goal is
 * supplied.
 *
 * Version pinning (W211b handshake):
 *   The engine ONLY mixes administrations sharing the same MAJOR
 *   version of scoredWithMeasureVersion. A 2.x admin will not be
 *   regressed against 1.x admins — historical scores from a
 *   different algorithm version aren't comparable. The cutoff is
 *   major-version because patch/minor bumps are explicitly
 *   non-breaking per W210 SemVer rules.
 *
 *   When a beneficiary spans multiple major versions, the engine
 *   uses the LATEST major and reports older admins in `excluded[]`
 *   for transparency.
 *
 * Direction handling:
 *   Pulled from Measure.scoringDirection (W210 schema). Defaults to
 *   higher_better when absent — matches the W212 module contract.
 *
 * Public API:
 *   analyze(beneficiaryId, measureRef, opts) → trend block
 *   recentTrend(beneficiaryId, measureRef, {windowDays=180}) → trend
 *     restricted to the last N days (catches recent backslides that
 *     a longer fit would average away)
 *
 * Pure orchestration around backend/measures/trend/{regression,classify}.js.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { fitLinear, buildPoints } = require('../measures/trend/regression');
const { classify, CLASSIFICATIONS } = require('../measures/trend/classify');

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
};

async function _resolveMeasure(measureRef) {
  const Measure = M.Measure();
  if (!Measure) return null;
  if (measureRef && typeof measureRef === 'object' && measureRef.code) return measureRef;
  if (mongoose.Types.ObjectId.isValid(measureRef)) {
    return Measure.findById(measureRef).lean();
  }
  return Measure.findOne({ code: measureRef }).lean();
}

function _majorVersion(semver) {
  if (!semver || typeof semver !== 'string') return null;
  const m = /^(\d+)\./.exec(semver);
  return m ? m[1] : null;
}

/**
 * Filter administrations to ONLY those sharing the latest major
 * version of `scoredWithMeasureVersion`. Returns
 *   { kept[], excluded[], dominantMajor, hadVersionMix }
 *
 * When NO admin has a version pinned, we keep them all (pre-W211b
 * legacy data — the caller gets `dominantMajor=null` so they know).
 */
function _filterByMajorVersion(admins) {
  if (!admins.length) {
    return { kept: [], excluded: [], dominantMajor: null, hadVersionMix: false };
  }
  const withMajor = admins.map(a => ({
    a,
    major: _majorVersion(a.scoredWithMeasureVersion),
  }));
  const havePin = withMajor.filter(x => x.major != null);
  if (havePin.length === 0) {
    return {
      kept: admins,
      excluded: [],
      dominantMajor: null,
      hadVersionMix: false,
    };
  }
  // Determine the dominant major as the most-recent admin's major.
  const sorted = withMajor
    .slice()
    .sort((x, y) => new Date(y.a.applicationDate) - new Date(x.a.applicationDate));
  const dominantMajor = sorted.find(x => x.major != null)?.major;
  const kept = [];
  const excluded = [];
  for (const item of withMajor) {
    if (item.major === dominantMajor) {
      kept.push(item.a);
    } else {
      excluded.push({
        applicationId: String(item.a._id),
        applicationDate: item.a.applicationDate,
        scoredWithMeasureVersion: item.a.scoredWithMeasureVersion || null,
        reason: item.major == null ? 'no_version_pin' : 'cross_major_bump',
      });
    }
  }
  return {
    kept,
    excluded,
    dominantMajor,
    hadVersionMix: excluded.length > 0,
  };
}

function _spanDays(admins) {
  if (admins.length < 2) return 0;
  const dates = admins.map(a => new Date(a.applicationDate).getTime());
  return (Math.max(...dates) - Math.min(...dates)) / 86400000;
}

function _daysToTarget(slopePerDay, currentValue, targetValue, direction) {
  if (!Number.isFinite(slopePerDay) || slopePerDay === 0) return null;
  if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return null;
  const sign = direction === 'lower_better' ? -1 : 1;
  const remaining = (targetValue - currentValue) * sign;
  const progressPerDay = slopePerDay * sign;
  if (remaining <= 0) return 0; // already at/past target
  if (progressPerDay <= 0) return null; // moving wrong direction
  return Math.ceil(remaining / progressPerDay);
}

class MeasureTrendEngineSvc {
  /**
   * Run a full longitudinal analysis for (beneficiary, measure).
   *
   * @param {string|ObjectId} beneficiaryId
   * @param {string|ObjectId|Object} measureRef
   * @param {Object} [opts]
   * @param {number} [opts.windowDays] — restrict to last N days
   * @param {Object} [opts.goal] — { baseline.value, target.value, currentValue } for days-to-target
   * @returns {Promise<Object>}
   */
  async analyze(beneficiaryId, measureRef, opts = {}) {
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) {
      throw new Error('trend engine: MeasureApplication model unavailable');
    }
    const measure = await _resolveMeasure(measureRef);
    if (!measure) throw new Error(`trend engine: measure not found: ${measureRef}`);

    const filter = {
      beneficiaryId: mongoose.Types.ObjectId.isValid(beneficiaryId)
        ? new mongoose.Types.ObjectId(beneficiaryId)
        : beneficiaryId,
      measureId: measure._id,
      status: { $in: ['completed', 'locked'] },
    };
    if (Number.isFinite(opts.windowDays)) {
      const cutoff = new Date(Date.now() - opts.windowDays * 86400000);
      filter.applicationDate = { $gte: cutoff };
    }

    const admins = await MeasureApplication.find(filter)
      .sort({ applicationDate: 1 })
      .select('_id applicationDate totalRawScore scoredWithMeasureVersion')
      .lean();

    return this._analyzeRecords(admins, measure, opts);
  }

  /**
   * Inner pure function — accepts already-fetched records. Useful for
   * tests + for callers that want to batch-fetch and analyze.
   */
  _analyzeRecords(admins, measure, opts = {}) {
    const versionFilter = _filterByMajorVersion(admins || []);
    const { kept, excluded, dominantMajor, hadVersionMix } = versionFilter;

    if (kept.length < 3) {
      return {
        measureCode: measure.code,
        n: kept.length,
        classification: CLASSIFICATIONS.INSUFFICIENT,
        message_ar: 'بيانات غير كافية — يلزم 3 قياسات على الأقل من نفس النسخة الرئيسية',
        dominantMajor,
        hadVersionMix,
        excluded,
      };
    }

    const { points } = buildPoints(kept);
    if (points.length < 3) {
      return {
        measureCode: measure.code,
        n: points.length,
        classification: CLASSIFICATIONS.INSUFFICIENT,
        message_ar: 'بيانات غير كافية لإجراء انحدار خطي',
        dominantMajor,
        hadVersionMix,
        excluded,
      };
    }

    const fit = fitLinear(points);
    const direction = measure.scoringDirection || 'higher_better';
    const spanDays = _spanDays(kept);
    const sdc = measure.interpretation?.sdc?.value;

    const cls = classify(fit, { direction, sdc, spanDays });

    let daysToTarget = null;
    if (opts.goal && fit) {
      const current = points[points.length - 1].y;
      daysToTarget = _daysToTarget(fit.slope, current, opts.goal.target?.value, direction);
    }

    return {
      measureCode: measure.code,
      n: kept.length,
      direction,
      spanDays: Math.round(spanDays),
      firstDate: points[0].date,
      lastDate: points[points.length - 1].date,
      firstScore: points[0].y,
      lastScore: points[points.length - 1].y,
      ...cls,
      daysToTarget,
      r2: fit.r2,
      standardError: fit.standardError,
      dominantMajor,
      hadVersionMix,
      excluded,
    };
  }

  /**
   * Convenience: limits analysis to the last N days (default 180).
   * Catches recent backslides that a full-history fit would dilute.
   */
  async recentTrend(beneficiaryId, measureRef, { windowDays = 180, goal } = {}) {
    return this.analyze(beneficiaryId, measureRef, { windowDays, goal });
  }
}

const svc = new MeasureTrendEngineSvc();
module.exports = svc;
void logger;
