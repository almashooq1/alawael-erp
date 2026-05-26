'use strict';

/**
 * aiRecommendation-plateau-adapter.service.js — W337.
 *
 * Bridges measureAlertEngine's PLATEAU_DETECTED alerts (W219/W211b/W215) into
 * AiRecommendationBundle drafts (W334). The W334 supervisor queue stays empty
 * until SOMETHING calls aiRecommendationService.createDraft({...}); this
 * adapter is the first such producer.
 *
 * The W337 design is two layers:
 *
 *   1. plateauAlertToDraftArgs(alert)  ← PURE function (this file)
 *      Converts an alert document into the args shape createDraft expects.
 *      No DB, no I/O. Confidence is heuristic — based on trend signal
 *      strength (n + spanDays + slope clamp + r2). Returns null when the
 *      alert is not a plateau (caller filters).
 *
 *   2. createBundlesFromOpenPlateauAlerts({alertModel, aiRecService})
 *      Async orchestrator (this file). Queries open PLATEAU_DETECTED
 *      alerts the engine hasn't yet linked to a Bundle, calls createDraft
 *      for each, and stamps the alert with `linkedRecommendationBundleId`
 *      to mark it as converted (idempotent — next sweep skips it).
 *
 * Cron wiring + listOpen scope filtering live in the upstream cron file
 * (or a future scheduler). This module is testable as pure-fn + thin
 * orchestrator.
 */

const lib = require('../intelligence/ai-recommendation-lifecycle.lib');

/**
 * Compute heuristic confidence for a plateau alert.
 * Rule of thumb (ADR-011 heuristic-first):
 *   - n ≥ 5 measurements: 0.30 weight
 *   - spanDays ≥ 90 days:  0.30 weight
 *   - |slopePerMonth| < 1 (flat): 0.25 weight
 *   - r² ≥ 0.5 (trend is well-fit): 0.15 weight
 * Max sum: 1.0. Clamped to [0, 1].
 *
 * @param {Object} evidence — alert.evidence (n, spanDays, slopePerMonth, r2)
 * @returns {number} confidence ∈ [0, 1]
 */
function scoreEvidence(evidence = {}) {
  let s = 0;
  if ((evidence.n || 0) >= 5) s += 0.3;
  if ((evidence.spanDays || 0) >= 90) s += 0.3;
  // Only credit slope when explicitly provided — undefined/null ≠ "perfectly flat"
  if (typeof evidence.slopePerMonth === 'number' && Math.abs(evidence.slopePerMonth) < 1) {
    s += 0.25;
  }
  if ((evidence.r2 || 0) >= 0.5) s += 0.15;
  return Math.max(0, Math.min(1, s));
}

/**
 * Build the signals[] payload for explainability (lib.classifyByConfidence
 * + AiRecommendationBundle.signals shape).
 */
function buildSignals(evidence = {}) {
  const signals = [];
  if ((evidence.n || 0) >= 5) {
    signals.push({
      name: 'measurement_count_sufficient',
      weight: 0.3,
      evidence: `n=${evidence.n} measurements over the window`,
    });
  }
  if ((evidence.spanDays || 0) >= 90) {
    signals.push({
      name: 'observation_span_long',
      weight: 0.3,
      evidence: `spanDays=${evidence.spanDays} (≥90 indicates persistent plateau)`,
    });
  }
  if (typeof evidence.slopePerMonth === 'number' && Math.abs(evidence.slopePerMonth) < 1) {
    const slope = Math.abs(evidence.slopePerMonth);
    signals.push({
      name: 'slope_flat',
      weight: 0.25,
      evidence: `|slopePerMonth|=${slope.toFixed(3)} (< 1 = effectively flat)`,
    });
  }
  if ((evidence.r2 || 0) >= 0.5) {
    signals.push({
      name: 'trend_well_fit',
      weight: 0.15,
      evidence: `r²=${evidence.r2.toFixed(2)} (the plateau classification is statistically well-supported)`,
    });
  }
  return signals;
}

/**
 * Pure converter — turn a MeasureAlert document into createDraft args.
 * Returns null when the alert is not a plateau or lacks required fields.
 *
 * Required alert shape:
 *   - alertType: 'PLATEAU_DETECTED'
 *   - beneficiaryId
 *   - evidence: { n, spanDays, slopePerMonth, r2, message_ar? }
 *   - (optional) branchId, episodeId, measureRef
 *
 * @returns {Object | null} args for aiRecommendationService.createDraft
 */
function plateauAlertToDraftArgs(alert) {
  if (!alert || alert.alertType !== 'PLATEAU_DETECTED') return null;
  if (!alert.beneficiaryId) return null;
  const evidence = alert.evidence || {};
  const confidence = scoreEvidence(evidence);
  const signals = buildSignals(evidence);
  const measureLabel =
    alert.measureRef?.code || alert.measureRef?.name || alert.measureRef || 'unknown measure';
  const reviewerHint =
    evidence.message_ar ||
    `Plateau detected on ${measureLabel}: ${evidence.n || '?'} measurements over ` +
      `${evidence.spanDays || '?'} days with |slope|=${Math.abs(evidence.slopePerMonth || 0).toFixed(2)}/month. ` +
      `Consider increasing dosage and triggering reassessment.`;
  return {
    beneficiaryId: alert.beneficiaryId,
    branchId: alert.branchId || null,
    episodeId: alert.episodeId || null,
    type: 'INCREASE_DOSAGE_AND_REASSESS',
    confidence,
    signals,
    draftAction: {
      basis: 'plateau-alert',
      sourceAlertId: alert._id,
      measureRef: alert.measureRef,
      suggestedAction: 'review session frequency + schedule reassessment',
    },
    reviewerHint,
    llmTelemetryCallId: null, // no LLM draft yet — pure heuristic
  };
}

/**
 * Thin orchestrator. Finds open PLATEAU_DETECTED alerts not yet linked to a
 * Bundle, converts each, calls createDraft, then stamps the alert. Idempotent
 * by virtue of the linkedRecommendationBundleId field.
 *
 * Dependencies are injected so the function is testable with mock model + svc.
 *
 * @param {Object} args
 * @param {Object} args.alertModel       — Mongoose model for MeasureAlert (find + updateOne)
 * @param {Object} args.aiRecService     — aiRecommendationService (uses .createDraft)
 * @param {number} args.limit            — batch cap, default 200
 * @returns {{scanned, converted, skipped, errors}}
 */
async function createBundlesFromOpenPlateauAlerts({ alertModel, aiRecService, limit = 200 } = {}) {
  if (!alertModel || typeof alertModel.find !== 'function') {
    throw new Error('plateauAdapter: alertModel with .find required');
  }
  if (!aiRecService || typeof aiRecService.createDraft !== 'function') {
    throw new Error('plateauAdapter: aiRecService.createDraft required');
  }

  const alerts = await alertModel
    .find({
      alertType: 'PLATEAU_DETECTED',
      status: 'open',
      linkedRecommendationBundleId: null,
    })
    .limit(limit);

  const result = { scanned: alerts.length, converted: 0, skipped: 0, errors: [] };
  for (const alert of alerts) {
    const args = plateauAlertToDraftArgs(alert);
    if (!args) {
      result.skipped++;
      continue;
    }
    try {
      const bundle = await aiRecService.createDraft(args);
      await alertModel.updateOne(
        { _id: alert._id },
        { $set: { linkedRecommendationBundleId: bundle._id } }
      );
      result.converted++;
    } catch (err) {
      result.errors.push({ alertId: alert._id, code: err.code || 'UNKNOWN', message: err.message });
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// W339 — REGRESSION_DETECTED adapter (sibling of plateau)
// ═══════════════════════════════════════════════════════════════════════
//
// Regression alerts are MORE urgent than plateau alerts (measureAlertEngine
// flags them severity:'high' vs 'medium' for plateau). The converter routes
// them to type 'ESCALATE_TO_QUALITY' so the supervisor queue surfaces them
// distinctly from plateau-driven dosage recommendations.

/**
 * Heuristic confidence for a regression alert.
 *   - n ≥ 5            +0.25
 *   - spanDays ≥ 60    +0.20  (shorter than plateau's 90 — regression is more urgent)
 *   - slope < -1       +0.30  (strict — only negative AND |slope|>1 counts)
 *   - r² ≥ 0.5         +0.15
 *   - delta worsens MCID +0.10 (mcidViolated truthy)
 */
function scoreRegressionEvidence(evidence = {}) {
  let s = 0;
  if ((evidence.n || 0) >= 5) s += 0.25;
  if ((evidence.spanDays || 0) >= 60) s += 0.2;
  if (typeof evidence.slopePerMonth === 'number' && evidence.slopePerMonth < -1) {
    s += 0.3;
  }
  if ((evidence.r2 || 0) >= 0.5) s += 0.15;
  if (evidence.mcidViolated) s += 0.1;
  return Math.max(0, Math.min(1, s));
}

function buildRegressionSignals(evidence = {}) {
  const signals = [];
  if ((evidence.n || 0) >= 5) {
    signals.push({
      name: 'measurement_count_sufficient',
      weight: 0.25,
      evidence: `n=${evidence.n} measurements over the window`,
    });
  }
  if ((evidence.spanDays || 0) >= 60) {
    signals.push({
      name: 'observation_span_sufficient',
      weight: 0.2,
      evidence: `spanDays=${evidence.spanDays} (≥60 — regression confirmed not noise)`,
    });
  }
  if (typeof evidence.slopePerMonth === 'number' && evidence.slopePerMonth < -1) {
    signals.push({
      name: 'slope_declining',
      weight: 0.3,
      evidence: `slopePerMonth=${evidence.slopePerMonth.toFixed(3)} (negative + |slope|>1)`,
    });
  }
  if ((evidence.r2 || 0) >= 0.5) {
    signals.push({
      name: 'trend_well_fit',
      weight: 0.15,
      evidence: `r²=${evidence.r2.toFixed(2)} (decline is statistically well-supported)`,
    });
  }
  if (evidence.mcidViolated) {
    signals.push({
      name: 'mcid_violated',
      weight: 0.1,
      evidence: `score worsened by more than MCID — clinically significant decline`,
    });
  }
  return signals;
}

/**
 * Pure converter — turn a REGRESSION_DETECTED alert into createDraft args.
 * Type: ESCALATE_TO_QUALITY (regression = clinical safety signal, not just a
 * dosage tuning suggestion). Routes the bundle to the supervisor queue with
 * higher visual priority than plateau bundles.
 */
function regressionAlertToDraftArgs(alert) {
  if (!alert || alert.alertType !== 'REGRESSION_DETECTED') return null;
  if (!alert.beneficiaryId) return null;
  const evidence = alert.evidence || {};
  const confidence = scoreRegressionEvidence(evidence);
  const signals = buildRegressionSignals(evidence);
  const measureLabel =
    alert.measureRef?.code || alert.measureRef?.name || alert.measureRef || 'unknown measure';
  const reviewerHint =
    evidence.message_ar ||
    `Regression on ${measureLabel}: ${evidence.n || '?'} measurements over ` +
      `${evidence.spanDays || '?'} days with slope=${(evidence.slopePerMonth || 0).toFixed(2)}/month. ` +
      `Consider quality escalation + reassessment + plan review.`;
  return {
    beneficiaryId: alert.beneficiaryId,
    branchId: alert.branchId || null,
    episodeId: alert.episodeId || null,
    type: 'ESCALATE_TO_QUALITY',
    confidence,
    signals,
    draftAction: {
      basis: 'regression-alert',
      sourceAlertId: alert._id,
      measureRef: alert.measureRef,
      suggestedAction:
        'flag to clinical supervisor + clinical lead; trigger reassessment + plan review',
    },
    reviewerHint,
    llmTelemetryCallId: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// W339 — Generic orchestrator (handles any alertType via converter dispatch)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// W429 — FORECAST_OFF_TRACK adapter (Phase B Outcome Forecasting)
// ═══════════════════════════════════════════════════════════════════════
//
// Forecast alerts are PROACTIVE — even when current score is still on-track,
// if the linear-regression projection at goal.targetDate misses goal.target,
// surface it NOW so the team can intervene before the deadline. The
// upstream producer (goal-forecaster sweeper, follow-up wave) creates a
// MeasureAlert with alertType='FORECAST_OFF_TRACK' whose evidence carries
// the full forecast object from intelligence/goal-forecaster.lib.js.

/**
 * Heuristic confidence for a forecast-off-track alert. Higher confidence
 * when: more data points, longer span, well-fit trend (r²), wider miss,
 * and (most importantly) ciMisses=true (even the optimistic 95% CI
 * upper bound still misses the target).
 *
 *   - n ≥ 5            +0.20
 *   - spanDays ≥ 60    +0.15  (need history depth to forecast credibly)
 *   - r² ≥ 0.5         +0.20  (linear assumption is justified)
 *   - severity high+   +0.20  (forecast gap > 2× tolerance)
 *   - severity critical +0.15  (ciMisses — even best-case fails)
 *   - slopeAcceleration negative (worsening) +0.10
 */
function scoreForecastEvidence(evidence = {}) {
  let s = 0;
  if ((evidence.n || 0) >= 5) s += 0.2;
  if ((evidence.spanDays || 0) >= 60) s += 0.15;
  if ((evidence.r2 || 0) >= 0.5) s += 0.2;
  const sev = evidence.severity;
  if (sev === 'high' || sev === 'critical') s += 0.2;
  if (sev === 'critical') s += 0.15;
  if (typeof evidence.slopeAcceleration === 'number' && evidence.slopeAcceleration < 0) {
    s += 0.1;
  }
  return Math.max(0, Math.min(1, s));
}

function buildForecastSignals(evidence = {}) {
  const signals = [];
  if ((evidence.n || 0) >= 5) {
    signals.push({
      name: 'measurement_count_sufficient',
      weight: 0.2,
      evidence: `n=${evidence.n} measurements in the regression window`,
    });
  }
  if ((evidence.spanDays || 0) >= 60) {
    signals.push({
      name: 'observation_span_sufficient',
      weight: 0.15,
      evidence: `spanDays=${evidence.spanDays} (≥60 = forecast horizon credible)`,
    });
  }
  if ((evidence.r2 || 0) >= 0.5) {
    signals.push({
      name: 'trend_well_fit',
      weight: 0.2,
      evidence: `r²=${evidence.r2.toFixed(2)} (linear model captures the trajectory)`,
    });
  }
  if (evidence.severity === 'high' || evidence.severity === 'critical') {
    signals.push({
      name: 'forecast_gap_material',
      weight: 0.2,
      evidence: `severity=${evidence.severity} (projected gap > 2× tolerance band)`,
    });
  }
  if (evidence.severity === 'critical') {
    signals.push({
      name: 'ci_upper_misses',
      weight: 0.15,
      evidence: `Even the 95% CI optimistic bound misses the target — high-confidence off-track`,
    });
  }
  if (typeof evidence.slopeAcceleration === 'number' && evidence.slopeAcceleration < 0) {
    signals.push({
      name: 'slope_decelerating',
      weight: 0.1,
      evidence: `slopeAcceleration=${evidence.slopeAcceleration.toFixed(3)} (trend worsening half-on-half)`,
    });
  }
  return signals;
}

/**
 * Pure converter — FORECAST_OFF_TRACK alert → createDraft args. Type
 * is INCREASE_DOSAGE_AND_REASSESS by default — same therapeutic
 * intervention as plateau, but the trigger is predictive rather than
 * reactive. critical-severity forecasts (ciMisses) escalate to
 * ESCALATE_TO_QUALITY since they're as urgent as W339 regressions.
 */
function forecastAlertToDraftArgs(alert) {
  if (!alert || alert.alertType !== 'FORECAST_OFF_TRACK') return null;
  if (!alert.beneficiaryId) return null;
  const evidence = alert.evidence || {};
  const confidence = scoreForecastEvidence(evidence);
  const signals = buildForecastSignals(evidence);
  const measureLabel =
    alert.measureRef?.code || alert.measureRef?.name || alert.measureRef || 'unknown measure';
  const projected = evidence.projected;
  const target = evidence.target;
  const projectedAt = evidence.projectedAt;
  const reviewerHint =
    evidence.message_ar ||
    `Forecast off-track on ${measureLabel}: projection=${projected != null ? projected.toFixed(2) : '?'} ` +
      `vs target=${target != null ? target.toFixed(2) : '?'} at ${projectedAt || 'horizon'}. ` +
      `Severity=${evidence.severity || 'unknown'}. Consider raising frequency or revisiting goal target.`;
  return {
    beneficiaryId: alert.beneficiaryId,
    branchId: alert.branchId || null,
    episodeId: alert.episodeId || null,
    // critical → escalate; otherwise standard dosage increase suggestion
    type: evidence.severity === 'critical' ? 'ESCALATE_TO_QUALITY' : 'INCREASE_DOSAGE_AND_REASSESS',
    confidence,
    signals,
    draftAction: {
      basis: 'forecast-alert',
      sourceAlertId: alert._id,
      measureRef: alert.measureRef,
      forecast: {
        projected,
        target,
        projectedAt,
        ci95: evidence.ci95 || null,
        slopePerMonth: evidence.slopePerMonth || null,
      },
      suggestedAction:
        evidence.severity === 'critical'
          ? 'flag to clinical supervisor + clinical lead; reassess goal feasibility'
          : 'review session frequency + consider intermediate target',
    },
    reviewerHint,
    llmTelemetryCallId: null,
  };
}

const TYPE_CONVERTERS = Object.freeze({
  PLATEAU_DETECTED: plateauAlertToDraftArgs,
  REGRESSION_DETECTED: regressionAlertToDraftArgs,
  FORECAST_OFF_TRACK: forecastAlertToDraftArgs,
});

/**
 * Generic orchestrator — finds open alerts of `alertType` not yet linked,
 * converts via TYPE_CONVERTERS[alertType], creates draft, stamps alert.
 * This generalizes the W337 createBundlesFromOpenPlateauAlerts logic so
 * new producer types (MCID_NOT_MET, overdue, etc.) only need to add a
 * converter + register in TYPE_CONVERTERS.
 */
async function createBundlesFromOpenAlertsOfType({
  alertModel,
  aiRecService,
  alertType,
  limit = 200,
} = {}) {
  if (!alertModel || typeof alertModel.find !== 'function') {
    throw new Error('plateauAdapter: alertModel with .find required');
  }
  if (!aiRecService || typeof aiRecService.createDraft !== 'function') {
    throw new Error('plateauAdapter: aiRecService.createDraft required');
  }
  const converter = TYPE_CONVERTERS[alertType];
  if (!converter) {
    throw new Error(`plateauAdapter: no converter registered for alertType=${alertType}`);
  }

  const alerts = await alertModel
    .find({
      alertType,
      status: 'open',
      linkedRecommendationBundleId: null,
    })
    .limit(limit);

  const result = { scanned: alerts.length, converted: 0, skipped: 0, errors: [], alertType };
  for (const alert of alerts) {
    const args = converter(alert);
    if (!args) {
      result.skipped++;
      continue;
    }
    try {
      const bundle = await aiRecService.createDraft(args);
      await alertModel.updateOne(
        { _id: alert._id },
        { $set: { linkedRecommendationBundleId: bundle._id } }
      );
      result.converted++;
    } catch (err) {
      result.errors.push({
        alertId: alert._id,
        code: err.code || 'UNKNOWN',
        message: err.message,
      });
    }
  }
  return result;
}

/**
 * Backward-compat wrapper (W337 callers stay valid).
 */
async function createBundlesFromOpenRegressionAlerts({
  alertModel,
  aiRecService,
  limit = 200,
} = {}) {
  return createBundlesFromOpenAlertsOfType({
    alertModel,
    aiRecService,
    alertType: 'REGRESSION_DETECTED',
    limit,
  });
}

module.exports = {
  // Plateau (W337)
  scoreEvidence,
  buildSignals,
  plateauAlertToDraftArgs,
  createBundlesFromOpenPlateauAlerts,
  // Regression (W339)
  scoreRegressionEvidence,
  buildRegressionSignals,
  regressionAlertToDraftArgs,
  createBundlesFromOpenRegressionAlerts,
  // Forecast off-track (W429 — Phase B Outcome Forecasting)
  scoreForecastEvidence,
  buildForecastSignals,
  forecastAlertToDraftArgs,
  // Generic dispatch (W339 — auto picks up FORECAST_OFF_TRACK via TYPE_CONVERTERS)
  TYPE_CONVERTERS,
  createBundlesFromOpenAlertsOfType,
  // Lib re-exports for UI summaries
  CONFIDENCE_THRESHOLDS: lib.CONFIDENCE_THRESHOLDS,
};
