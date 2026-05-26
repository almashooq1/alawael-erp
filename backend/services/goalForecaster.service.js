'use strict';

/**
 * goalForecaster.service.js — Wave 430 (Phase B2 — Outcome Forecasting producer).
 *
 * The PRODUCER side of the Phase B chain. Closes the loop:
 *
 *   TherapeuticGoal (active, has targetDate + target.value)
 *     └─→ MeasureApplication series (score, applicationDate)
 *           └─→ goal-forecaster.lib.forecast(series, {horizonAt: targetDate})
 *                 └─→ evaluateAgainstTarget(forecast, goal)
 *                       └─→ off-track? → upsert MeasureAlert{alertType:'FORECAST_OFF_TRACK'}
 *                             └─→ W338 cron picks it up via TYPE_CONVERTERS dispatch
 *                                   └─→ forecastAlertToDraftArgs (W429)
 *                                         └─→ aiRecommendationService.createDraft
 *                                               └─→ supervisor queue
 *                                                     └─→ (Phase A) realtime SSE push
 *
 * This service is the FIRST consumer of intelligence/goal-forecaster.lib.js
 * in production. Pattern mirrors measureAlertEngine.service.js (W220):
 * upsert-by-(beneficiaryId, measureId, alertType, status='open') with the
 * partial unique index providing concurrency safety + idempotency.
 *
 * Auto-resolve: if a goal that previously had a FORECAST_OFF_TRACK alert
 * is now back on track, the open alert is moved to status='resolved' so
 * the supervisor queue doesn't carry stale signals.
 *
 * Off-switch: process.env.GOAL_FORECASTER='off' disables scan().
 * Cron gate: ENABLE_FORECAST_OFF_TRACK_SWEEPER (handled by bootstrap).
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { forecast, evaluateAgainstTarget } = require('../intelligence/goal-forecaster.lib');

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
};

function _isEnabled() {
  const flag = (process.env.GOAL_FORECASTER || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

/**
 * Resolve the measure(s) attached to a goal.
 *
 * Two linkage paths coexist (W235 design):
 *   - LEGACY: objective.measureId (single ObjectId per objective)
 *   - W235:   objective.measureLinks[] (rich linkage with PRIMARY/SECONDARY)
 *
 * We pull PRIMARY links + legacy measureIds, dedupe, and return the set.
 */
function _measureIdsForGoal(goal) {
  const set = new Set();
  for (const obj of goal.objectives || []) {
    if (obj.measureId) set.add(String(obj.measureId));
    if (Array.isArray(obj.measureLinks)) {
      for (const link of obj.measureLinks) {
        if (link.linkType === 'PRIMARY' && link.measureId) {
          set.add(String(link.measureId));
        }
      }
    }
  }
  return Array.from(set);
}

/**
 * Map TherapeuticGoal target structure → goal-forecaster.lib direction.
 * The Measure model carries scoringDirection ('higher_better'|'lower_better').
 * Without measure-level scoringDirection, falls back to 'higher'.
 */
function _resolveDirection(measure) {
  return measure?.scoringDirection === 'lower_better' ? 'lower' : 'higher';
}

/**
 * Scan a single (goal, measure) pair. Forecasts the goal's measure score
 * at goal.targetDate (or default 30-day horizon if not set), grades vs
 * goal.target.value, and upserts / auto-resolves the alert.
 *
 * @returns {{action: 'created'|'updated'|'resolved'|'skipped', reason?: string, alert?: object}}
 */
async function scanGoalMeasure({ goal, measureId }) {
  if (!_isEnabled()) return { action: 'skipped', reason: 'disabled' };
  const Measure = M.Measure();
  const MeasureApplication = M.MeasureApplication();
  const MeasureAlert = M.MeasureAlert();
  if (!Measure || !MeasureApplication || !MeasureAlert) {
    return { action: 'skipped', reason: 'models_unavailable' };
  }

  // Goal must have a numeric target to forecast against.
  const targetValue = goal?.target?.value;
  if (!Number.isFinite(targetValue)) {
    return { action: 'skipped', reason: 'goal_missing_target_value' };
  }

  const measure = await Measure.findById(measureId).lean();
  if (!measure || measure.status !== 'active') {
    return { action: 'skipped', reason: 'measure_inactive' };
  }

  const admins = await MeasureApplication.find({
    beneficiaryId: goal.beneficiaryId,
    measureId: measure._id,
    status: { $in: ['completed', 'locked'] },
  })
    .sort({ applicationDate: 1 })
    .select('_id applicationDate totalRawScore')
    .lean();

  if (admins.length < 3) {
    // Auto-resolve any existing open alert — insufficient data invalidates
    // the previous forecast.
    const resolved = await _autoResolveIfOpen(
      MeasureAlert,
      goal.beneficiaryId,
      measure._id,
      'insufficient_admins_now'
    );
    return resolved
      ? { action: 'resolved', reason: 'insufficient_admins', alert: resolved }
      : { action: 'skipped', reason: 'insufficient_admins' };
  }

  const series = admins
    .map(a => ({ at: a.applicationDate, score: a.totalRawScore }))
    .filter(p => Number.isFinite(p.score));

  // Horizon = goal.targetDate (preferred) or default
  const horizonAt = goal.targetDate ? new Date(goal.targetDate) : undefined;
  const f = forecast(series, horizonAt ? { horizonAt } : undefined);
  if (!f.ok) {
    // Auto-resolve if forecast couldn't compute (e.g. all same date)
    const resolved = await _autoResolveIfOpen(
      MeasureAlert,
      goal.beneficiaryId,
      measure._id,
      `forecast_failed_${f.reason}`
    );
    return resolved
      ? { action: 'resolved', reason: f.reason, alert: resolved }
      : { action: 'skipped', reason: f.reason };
  }

  const direction = _resolveDirection(measure);
  const verdict = evaluateAgainstTarget(f, {
    targetValue,
    direction,
    toleranceBand: 0, // strict — any miss is a signal; severity grades it
  });

  if (verdict.onTrack !== false) {
    // On track — clear any prior open alert.
    const resolved = await _autoResolveIfOpen(
      MeasureAlert,
      goal.beneficiaryId,
      measure._id,
      'back_on_track'
    );
    return resolved
      ? { action: 'resolved', reason: 'back_on_track', alert: resolved }
      : { action: 'skipped', reason: 'on_track' };
  }

  // Off-track → upsert the alert with full forecast evidence.
  const evidence = {
    n: f.n,
    spanDays: f.spanDays,
    slopePerMonth: f.slopePerMonth,
    r2: f.r2,
    projected: f.projected,
    projectedAt: f.projectedAt,
    target: targetValue,
    severity: verdict.severity,
    gap: verdict.gap,
    ciMisses: verdict.ciMisses,
    ci95: f.ci95,
    slopeAcceleration: f.slopeAcceleration,
    goalId: goal._id,
    goalTitle: goal.title,
    direction,
    message_ar:
      `الإسقاط ${f.projected.toFixed(2)} على ${horizonAt ? horizonAt.toISOString().slice(0, 10) : 'الأفق الافتراضي'} ` +
      `لا يبلغ الهدف ${targetValue.toFixed(2)} — درجة الخطورة ${verdict.severity}.`,
  };

  const upsert = await _upsertAlert(MeasureAlert, {
    beneficiaryId: goal.beneficiaryId,
    measureId: measure._id,
    measureCode: measure.code,
    branchId: goal.branchId || null,
    severity: verdict.severity,
    evidence,
  });

  return { action: upsert.created ? 'created' : 'updated', alert: upsert.doc };
}

/**
 * Scan a single beneficiary's active goals × their attached measures.
 */
async function scanBeneficiary(beneficiaryId) {
  if (!_isEnabled()) return { disabled: true, scanned: 0, results: [] };
  const TherapeuticGoal = M.TherapeuticGoal();
  if (!TherapeuticGoal) return { scanned: 0, results: [], reason: 'goal_model_unavailable' };

  const goals = await TherapeuticGoal.find({
    beneficiaryId,
    status: 'active',
    isDeleted: { $ne: true },
  }).lean();

  const results = [];
  for (const goal of goals) {
    const measureIds = _measureIdsForGoal(goal);
    for (const measureId of measureIds) {
      try {
        const r = await scanGoalMeasure({ goal, measureId });
        results.push({ goalId: goal._id, measureId, ...r });
      } catch (err) {
        logger.warn(
          '[GoalForecaster] scan failed for goal=%s measure=%s: %s',
          goal._id,
          measureId,
          err.message
        );
        results.push({
          goalId: goal._id,
          measureId,
          action: 'error',
          error: err.message,
        });
      }
    }
  }
  return { scanned: goals.length, results };
}

/**
 * Cron-tick scan across a branch (or all branches). Returns aggregate counters.
 */
async function sweep({ branchId = null, limit = 1000 } = {}) {
  if (!_isEnabled()) return { disabled: true, scanned: 0 };
  const TherapeuticGoal = M.TherapeuticGoal();
  if (!TherapeuticGoal) return { scanned: 0, reason: 'goal_model_unavailable' };

  const match = {
    status: 'active',
    isDeleted: { $ne: true },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const beneficiaryIds = await TherapeuticGoal.distinct('beneficiaryId', match);
  const slice = beneficiaryIds.slice(0, limit);

  const tally = {
    beneficiariesScanned: 0,
    created: 0,
    updated: 0,
    resolved: 0,
    skipped: 0,
    errors: 0,
  };

  for (const benId of slice) {
    try {
      const r = await scanBeneficiary(benId);
      tally.beneficiariesScanned++;
      for (const item of r.results || []) {
        if (item.action === 'created') tally.created++;
        else if (item.action === 'updated') tally.updated++;
        else if (item.action === 'resolved') tally.resolved++;
        else if (item.action === 'error') tally.errors++;
        else tally.skipped++;
      }
    } catch (err) {
      tally.errors++;
      logger.warn('[GoalForecaster] beneficiary sweep failed for %s: %s', benId, err.message);
    }
  }
  return tally;
}

// ── helpers ────────────────────────────────────────────────────────

async function _upsertAlert(MeasureAlert, args) {
  const existing = await MeasureAlert.findOne({
    beneficiaryId: args.beneficiaryId,
    measureId: args.measureId,
    alertType: 'FORECAST_OFF_TRACK',
    status: 'open',
  });
  if (existing) {
    existing.evidence = {
      ...(existing.evidence?.toObject?.() ?? existing.evidence ?? {}),
      ...args.evidence,
    };
    existing.severity = args.severity;
    existing.lastEvaluatedAt = new Date();
    await existing.save();
    return { created: false, doc: existing.toObject() };
  }
  try {
    const doc = await MeasureAlert.create({
      beneficiaryId: args.beneficiaryId,
      measureId: args.measureId,
      measureCode: args.measureCode,
      branchId: args.branchId,
      alertType: 'FORECAST_OFF_TRACK',
      severity: args.severity,
      status: 'open',
      evidence: args.evidence,
      firstSeenAt: new Date(),
      lastEvaluatedAt: new Date(),
    });
    return { created: true, doc: doc.toObject() };
  } catch (err) {
    if (err && err.code === 11000) {
      // Concurrent race — re-fetch.
      const found = await MeasureAlert.findOne({
        beneficiaryId: args.beneficiaryId,
        measureId: args.measureId,
        alertType: 'FORECAST_OFF_TRACK',
        status: 'open',
      }).lean();
      return { created: false, doc: found };
    }
    throw err;
  }
}

async function _autoResolveIfOpen(MeasureAlert, beneficiaryId, measureId, reason) {
  const open = await MeasureAlert.findOne({
    beneficiaryId,
    measureId,
    alertType: 'FORECAST_OFF_TRACK',
    status: 'open',
  });
  if (!open) return null;
  open.status = 'resolved';
  open.resolvedAt = new Date();
  open.resolutionMode = 'auto';
  open.evidence = {
    ...(open.evidence?.toObject?.() ?? open.evidence ?? {}),
    autoResolveReason: reason,
  };
  await open.save();
  return open.toObject();
}

module.exports = {
  scanGoalMeasure,
  scanBeneficiary,
  sweep,
  // Internal helpers exported for unit tests
  _measureIdsForGoal,
  _resolveDirection,
};
