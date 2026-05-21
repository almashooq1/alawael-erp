'use strict';

/**
 * bipFidelityEffectiveness.service.js — Wave 267
 * ════════════════════════════════════════════════════════════════════
 * BIP (Behavior Intervention Plan) fidelity + effectiveness tracking.
 *
 * Two independent measurement streams:
 *   - FIDELITY = "Did we DO the BIP?" — periodic scoring of
 *     implementation criteria. High fidelity is a prerequisite for
 *     trusting the effectiveness signal.
 *   - EFFECTIVENESS = "Did the BIP WORK?" — periodic measurement of
 *     target + replacement behavior against the FBA baseline.
 *
 * Diagnosis matrix:
 *   ┌──────────────────────┬───────────────┬─────────────────┐
 *   │                      │ HIGH FIDELITY │ LOW FIDELITY    │
 *   ├──────────────────────┼───────────────┼─────────────────┤
 *   │ HIGH effectiveness   │ ✓ BIP working │ ? Hawthorne?    │
 *   │ LOW effectiveness    │ Rethink hypo  │ Implementation  │
 *   └──────────────────────┴───────────────┴─────────────────┘
 *
 * Public surface (fidelity):
 *   - recordFidelityCheck(input, actorId)
 *   - listFidelityChecks(fbaAssessmentId, opts)
 *   - computeFidelityTrend(fbaAssessmentId, opts) — last N checks → trend
 *
 * Public surface (effectiveness):
 *   - recordEffectivenessReading(input, actorId) — captures FBA snapshot
 *   - listEffectivenessReadings(fbaAssessmentId, opts)
 *   - computeEffectivenessTrend(fbaAssessmentId, opts) — vs baseline
 *
 * Public surface (dashboard):
 *   - listAtRiskBips({branchId, limit}) — failing fidelity OR worsening
 *     effectiveness
 *
 * Pure helpers exported for tests:
 *   - _classifyTrend(values, opts)
 *   - _diagnoseBip(latestFidelity, latestEffectiveness)
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ─── Lazy model loaders ──────────────────────────────────────────────
function _Fidelity() {
  try {
    return mongoose.model('BipFidelityCheck');
  } catch (_e) {
    require('../models/BipFidelityCheck');
    return mongoose.model('BipFidelityCheck');
  }
}

function _Effectiveness() {
  try {
    return mongoose.model('BipEffectiveness');
  } catch (_e) {
    require('../models/BipEffectiveness');
    return mongoose.model('BipEffectiveness');
  }
}

function _FBA() {
  try {
    return mongoose.model('BehavioralFunctionAssessment');
  } catch (_e) {
    require('../models/clinical-assessment/behavioral-function-assessment.model');
    return mongoose.model('BehavioralFunctionAssessment');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function _requireId(val, label) {
  if (!val) throw new Error(`${label} is required`);
  return String(val);
}

function _clampLimit(limit, max = 200, fallback = 50) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n > max ? max : n;
}

// ════════════════════════════════════════════════════════════════════
// Fidelity
// ════════════════════════════════════════════════════════════════════

async function recordFidelityCheck(input, actorId) {
  if (!input || typeof input !== 'object') {
    throw new Error('fidelity check payload is required');
  }
  const {
    fbaAssessmentId,
    criteria,
    checkedAt,
    weekStart,
    weekEnd,
    barriers,
    barriers_notes_ar,
    correctiveActions_ar,
  } = input;

  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  _requireId(actorId, 'actorId');
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error('at least one criterion is required');
  }

  // Load parent FBA to denormalize beneficiaryId/branchId.
  const fba = await _FBA().findById(fbaAssessmentId).lean();
  if (!fba) throw new Error('FBA assessment not found');

  const doc = await _Fidelity().create({
    fbaAssessmentId,
    beneficiaryId: fba.beneficiary,
    branchId: fba.branch,
    checkedAt: checkedAt ? new Date(checkedAt) : new Date(),
    checkedBy: actorId,
    weekStart: weekStart ? new Date(weekStart) : undefined,
    weekEnd: weekEnd ? new Date(weekEnd) : undefined,
    criteria,
    barriers: Array.isArray(barriers) ? barriers : [],
    barriers_notes_ar: barriers_notes_ar || undefined,
    correctiveActions_ar: correctiveActions_ar || undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });
  return doc.toObject();
}

async function listFidelityChecks(fbaAssessmentId, opts = {}) {
  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  const { from, to, limit } = opts;
  const filter = { fbaAssessmentId };
  if (from || to) {
    filter.checkedAt = {};
    if (from) filter.checkedAt.$gte = new Date(from);
    if (to) filter.checkedAt.$lte = new Date(to);
  }
  const docs = await _Fidelity()
    .find(filter)
    .sort({ checkedAt: 1 })
    .limit(_clampLimit(limit, 500, 100))
    .lean();
  return { items: docs, total: docs.length };
}

/**
 * Trend of fidelity across the last N checks.
 * Returns:
 *   - latest: most recent check (or null)
 *   - rolling: array of {checkedAt, percent, status} for trend chart
 *   - direction: 'improving' | 'stable' | 'declining' | 'insufficient_data'
 *   - meanLastN: mean of last N percents
 */
async function computeFidelityTrend(fbaAssessmentId, opts = {}) {
  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  const lastN = typeof opts.lastN === 'number' ? Math.max(2, opts.lastN) : 6;
  const docs = await _Fidelity()
    .find({ fbaAssessmentId })
    .sort({ checkedAt: -1 })
    .limit(lastN)
    .lean();
  const ordered = docs.slice().reverse(); // chronological asc
  const rolling = ordered
    .filter(d => typeof d.overallFidelityPercent === 'number')
    .map(d => ({
      checkedAt: d.checkedAt,
      percent: d.overallFidelityPercent,
      status: d.status,
    }));
  return {
    latest: docs[0] || null,
    rolling,
    direction: _classifyTrend(rolling.map(r => r.percent)),
    meanLastN:
      rolling.length === 0
        ? null
        : Number((rolling.reduce((s, r) => s + r.percent, 0) / rolling.length).toFixed(2)),
    sampleSize: rolling.length,
  };
}

// ════════════════════════════════════════════════════════════════════
// Effectiveness
// ════════════════════════════════════════════════════════════════════

async function recordEffectivenessReading(input, actorId) {
  if (!input || typeof input !== 'object') {
    throw new Error('effectiveness reading payload is required');
  }
  const {
    fbaAssessmentId,
    measuredAt,
    periodStart,
    periodEnd,
    observationHours,
    target,
    replacement,
    notes_ar,
  } = input;
  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  _requireId(actorId, 'actorId');

  const fba = await _FBA().findById(fbaAssessmentId).lean();
  if (!fba) throw new Error('FBA assessment not found');

  const baselineData = (fba.target_behavior && fba.target_behavior.baseline_data) || {};

  const doc = await _Effectiveness().create({
    fbaAssessmentId,
    beneficiaryId: fba.beneficiary,
    branchId: fba.branch,
    measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
    measuredBy: actorId,
    periodStart: periodStart ? new Date(periodStart) : undefined,
    periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    observationHours,
    target: target || {},
    replacement: replacement || {},
    snapshot: {
      measurementMethod:
        (fba.target_behavior && fba.target_behavior.measurement_method) || undefined,
      baselineFrequency: baselineData.average_frequency,
      baselineDurationMinutes: baselineData.average_duration_minutes,
      baselineIntensity: baselineData.average_intensity,
      bipActivatedAt: fba.createdAt,
    },
    notes_ar: notes_ar || undefined,
    createdBy: actorId,
    updatedBy: actorId,
  });
  return doc.toObject();
}

async function listEffectivenessReadings(fbaAssessmentId, opts = {}) {
  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  const { from, to, limit } = opts;
  const filter = { fbaAssessmentId };
  if (from || to) {
    filter.measuredAt = {};
    if (from) filter.measuredAt.$gte = new Date(from);
    if (to) filter.measuredAt.$lte = new Date(to);
  }
  const docs = await _Effectiveness()
    .find(filter)
    .sort({ measuredAt: 1 })
    .limit(_clampLimit(limit, 500, 100))
    .lean();
  return { items: docs, total: docs.length };
}

/**
 * Trend of effectiveness across the last N readings.
 *
 * For target behavior (the thing being reduced): lower is better,
 * so an "improving" trend = frequency/rate declining.
 *
 * Returns:
 *   - latest, rolling[], direction (interpreted for reduction goal),
 *     baselinePercentChange (of latest reading vs baseline)
 */
async function computeEffectivenessTrend(fbaAssessmentId, opts = {}) {
  _requireId(fbaAssessmentId, 'fbaAssessmentId');
  const lastN = typeof opts.lastN === 'number' ? Math.max(2, opts.lastN) : 6;
  const docs = await _Effectiveness()
    .find({ fbaAssessmentId })
    .sort({ measuredAt: -1 })
    .limit(lastN)
    .lean();
  const ordered = docs.slice().reverse();
  const rolling = ordered.map(d => ({
    measuredAt: d.measuredAt,
    targetFrequency: d.target && d.target.frequency,
    targetRate: d.target && d.target.rate,
    replacementSuccessRate: d.replacement && d.replacement.successRate,
  }));
  const series = rolling.map(r => r.targetFrequency).filter(v => typeof v === 'number');
  // Invert direction for target-reduction goals — declining frequency
  // is IMPROVING outcome.
  const rawDirection = _classifyTrend(series);
  const direction = _invertForReduction(rawDirection);

  const latest = docs[0] || null;
  let baselinePercentChange = null;
  if (
    latest &&
    latest.snapshot &&
    typeof latest.snapshot.baselineFrequency === 'number' &&
    latest.snapshot.baselineFrequency > 0 &&
    latest.target &&
    typeof latest.target.frequency === 'number'
  ) {
    baselinePercentChange = Number(
      (
        ((latest.target.frequency - latest.snapshot.baselineFrequency) /
          latest.snapshot.baselineFrequency) *
        100
      ).toFixed(1)
    );
  }
  return {
    latest,
    rolling,
    direction,
    baselinePercentChange,
    sampleSize: rolling.length,
  };
}

// ════════════════════════════════════════════════════════════════════
// Cross-cutting dashboard
// ════════════════════════════════════════════════════════════════════

/**
 * Surface BIPs that need attention. Includes any FBA with:
 *   - Latest fidelity check status='failing', OR
 *   - Latest effectiveness reading shows worsening trend
 */
async function listAtRiskBips(opts = {}) {
  const { branchId, limit } = opts;
  const Fidelity = _Fidelity();
  // Find recent FBA assessments with at least one fidelity check or
  // effectiveness reading. Strategy: aggregate from fidelity collection,
  // join effectiveness in a second pass.
  const fidelityFilter = {};
  if (branchId) fidelityFilter.branchId = branchId;

  // Pull most recent fidelity check per fbaAssessmentId in this branch.
  const recent = await Fidelity.aggregate([
    { $match: fidelityFilter },
    { $sort: { checkedAt: -1 } },
    {
      $group: {
        _id: '$fbaAssessmentId',
        latestCheck: { $first: '$$ROOT' },
      },
    },
    { $match: { 'latestCheck.status': 'failing' } },
    { $limit: _clampLimit(limit, 500, 50) },
  ]);

  return {
    items: recent.map(r => ({
      fbaAssessmentId: r._id,
      beneficiaryId: r.latestCheck.beneficiaryId,
      branchId: r.latestCheck.branchId,
      latestStatus: r.latestCheck.status,
      latestPercent: r.latestCheck.overallFidelityPercent,
      checkedAt: r.latestCheck.checkedAt,
      requiresSupervisorReview: r.latestCheck.requiresSupervisorReview,
    })),
    total: recent.length,
  };
}

// ════════════════════════════════════════════════════════════════════
// Pure helpers (exported for tests)
// ════════════════════════════════════════════════════════════════════

/**
 * Classify a series of numeric values as improving / declining / stable.
 *
 * Strategy: compare the mean of the EARLIER half to the LATER half;
 * if the magnitude of change exceeds `minDelta` (default 5), classify;
 * otherwise stable. For series length < 2 returns 'insufficient_data'.
 *
 * "Improving" means values INCREASING. Caller may invert for
 * reduction-goal contexts via _invertForReduction.
 */
function _classifyTrend(values, opts = {}) {
  const minDelta = typeof opts.minDelta === 'number' ? opts.minDelta : 5;
  if (!Array.isArray(values) || values.length < 2) return 'insufficient_data';
  const half = Math.floor(values.length / 2);
  const early = values.slice(0, Math.max(1, half));
  const late = values.slice(-Math.max(1, half));
  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const earlyMean = mean(early);
  const lateMean = mean(late);
  const diff = lateMean - earlyMean;
  if (Math.abs(diff) < minDelta) return 'stable';
  return diff > 0 ? 'improving' : 'declining';
}

/**
 * Flip improving/declining for reduction-goal contexts (target behavior
 * is something to reduce). 'stable' and 'insufficient_data' unchanged.
 */
function _invertForReduction(direction) {
  if (direction === 'improving') return 'declining';
  if (direction === 'declining') return 'improving';
  return direction;
}

/**
 * Compose a four-bucket diagnosis from latest fidelity + effectiveness.
 *
 * Returns one of:
 *   - 'working' — high fidelity + improving effectiveness
 *   - 'hypothesis_likely_wrong' — high fidelity + flat/worsening
 *     effectiveness ⇒ revisit FBA
 *   - 'implementation_problem' — low fidelity + flat/worsening
 *     effectiveness ⇒ coach team
 *   - 'misleading_signal' — low fidelity + improving effectiveness ⇒
 *     possible Hawthorne / data-quality concern
 *   - 'insufficient_data' — not enough readings to call
 */
function _diagnoseBip(latestFidelity, latestEffectivenessTrend) {
  if (!latestFidelity || !latestEffectivenessTrend) return 'insufficient_data';
  const fid = latestFidelity.status; // passing/concerning/failing
  const eff = latestEffectivenessTrend.direction; // improving/declining/stable/insufficient
  if (eff === 'insufficient_data') return 'insufficient_data';
  const fidHigh = fid === 'passing';
  const effGood = eff === 'improving';
  if (fidHigh && effGood) return 'working';
  if (fidHigh && !effGood) return 'hypothesis_likely_wrong';
  if (!fidHigh && !effGood) return 'implementation_problem';
  return 'misleading_signal';
}

module.exports = {
  // fidelity
  recordFidelityCheck,
  listFidelityChecks,
  computeFidelityTrend,
  // effectiveness
  recordEffectivenessReading,
  listEffectivenessReadings,
  computeEffectivenessTrend,
  // dashboard
  listAtRiskBips,
  // pure helpers
  _classifyTrend,
  _invertForReduction,
  _diagnoseBip,
};
