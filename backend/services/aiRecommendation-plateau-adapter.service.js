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

module.exports = {
  scoreEvidence,
  buildSignals,
  plateauAlertToDraftArgs,
  createBundlesFromOpenPlateauAlerts,
  // re-export confidence thresholds for callers building UI summaries
  CONFIDENCE_THRESHOLDS: lib.CONFIDENCE_THRESHOLDS,
};
