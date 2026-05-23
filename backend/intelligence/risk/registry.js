'use strict';

/**
 * risk/registry.js — Wave 286
 * ═════════════════════════════════════════════════════════════════
 * Configuration single-source-of-truth for the unified risk
 * orchestrator. Defines:
 *   - Tier thresholds (aligned with existing RiskScoringService:
 *     low<25, moderate 25-49, high 50-74, critical >=75)
 *   - Per-source default weights for the overall composite
 *   - Source slot names (extensible — add to SOURCE_WEIGHTS)
 *
 * Public API:
 *   TIER_THRESHOLDS, SOURCE_WEIGHTS, tierFromScore(score)
 *   normalise01(value)  — clamp + round 4dp
 *   weightedComposite(sourceScores) — {score, weightUsed, sourceCount}
 */

const TIER_THRESHOLDS = Object.freeze({
  critical: 75,
  high: 50,
  moderate: 25,
  low: 0,
});

const TIERS_AR = Object.freeze({
  critical: 'حرج',
  high: 'مرتفع',
  moderate: 'متوسط',
  low: 'منخفض',
});

/**
 * Source weights for the composite score. Sources missing at runtime
 * are dropped and the remaining weights are renormalised — so adding
 * or removing a source never silently changes the others' relative
 * contribution.
 *
 * Adding a new source: add it here + create the matching plugin in
 * sources/ and register it in orchestrator.js LOAD_SOURCES.
 */
const SOURCE_WEIGHTS = Object.freeze({
  clinical: 0.4, // ClinicalRiskScore — most authoritative, rule-engine driven
  psych_flags: 0.25, // PsychRiskFlag — active flags raised by clinicians
  dropout: 0.2, // AiPrediction (dropout_risk) — ML / rule-based churn signal
  cdss: 0.15, // CdssRiskAssessment — fall / pressure ulcer / NEWS etc.
});

function tierFromScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score >= TIER_THRESHOLDS.critical) return 'critical';
  if (score >= TIER_THRESHOLDS.high) return 'high';
  if (score >= TIER_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

function normalise01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(1, n));
  return Math.round(clamped * 10000) / 10000;
}

/**
 * Compose a weighted average score in 0..100 from a partial map of
 * {sourceName: score0to100}. Missing sources are dropped and the
 * remaining weights renormalised. Returns null score if no sources.
 */
function weightedComposite(sourceScores) {
  const entries = Object.entries(sourceScores || {}).filter(
    ([k, v]) => SOURCE_WEIGHTS[k] != null && typeof v === 'number' && Number.isFinite(v)
  );
  if (entries.length === 0) {
    return { score: null, weightUsed: 0, sourceCount: 0 };
  }
  const totalWeight = entries.reduce((s, [k]) => s + SOURCE_WEIGHTS[k], 0);
  const weighted = entries.reduce((s, [k, v]) => s + (SOURCE_WEIGHTS[k] / totalWeight) * v, 0);
  return {
    score: Math.round(Math.max(0, Math.min(100, weighted))),
    weightUsed: Math.round(totalWeight * 10000) / 10000,
    sourceCount: entries.length,
  };
}

module.exports = {
  TIER_THRESHOLDS,
  TIERS_AR,
  SOURCE_WEIGHTS,
  tierFromScore,
  normalise01,
  weightedComposite,
};
