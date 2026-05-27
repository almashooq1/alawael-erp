'use strict';

/**
 * disparity-detection.lib.js — W484 (Phase G: Equity Engine).
 *
 * Pure library that computes disparity statistics across protected
 * groups (gender / age band / disability type / region / language /
 * insurance band). Detects equity gaps in service delivery, outcomes,
 * and access — flags statistically + clinically meaningful disparities
 * for branch + national review.
 *
 * Pattern: cohorts → per-cohort summary stats → pairwise comparison
 * vs. reference cohort → disparity index + significance flag.
 *
 * Per v3 §6 Innovation 8 (Equity Engine). Pure functions only.
 */

const DISPARITY_DIMENSIONS = Object.freeze([
  'gender',
  'age_band',
  'disability_type',
  'region',
  'primary_language',
  'insurance_band',
  'nationality_band',
]);

const SIGNIFICANCE_THRESHOLDS = Object.freeze({
  // Cohen's d / effect size on continuous outcomes
  effectSizeMinor: 0.2,
  effectSizeModerate: 0.5,
  effectSizeMajor: 0.8,
  // Relative risk for binary outcomes (1.0 = no disparity)
  riskRatioMinor: 1.2,
  riskRatioModerate: 1.5,
  riskRatioMajor: 2.0,
  // Minimum cohort size for reliable detection (CMS guidance)
  minCohortSize: 30,
});

const METRIC_KINDS = Object.freeze([
  'gas_avg_tscore',
  'icf_avg_qualifier',
  'session_attendance_rate',
  'goal_achievement_rate',
  'wait_time_days',
  'complaint_rate',
  'wbci_avg',
]);

/**
 * Group beneficiary observations by dimension value.
 *
 * @param {Array} observations — [{ beneficiaryId, [dimension]: value, metricValue }]
 * @param {string} dimension — one of DISPARITY_DIMENSIONS
 * @returns {Object} — { dimensionValue: [observations] }
 */
function groupByDimension(observations, dimension) {
  const grouped = {};
  for (const obs of observations || []) {
    const key = obs[dimension];
    if (key === undefined || key === null) continue;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(obs);
  }
  return grouped;
}

/**
 * Compute summary statistics (mean, sd, n) for each cohort.
 */
function computeCohortStats(grouped) {
  const stats = {};
  for (const [key, observations] of Object.entries(grouped)) {
    const values = observations
      .filter(o => o.metricValue !== null && o.metricValue !== undefined)
      .map(o => Number(o.metricValue))
      .filter(v => Number.isFinite(v));
    const n = values.length;
    if (n === 0) {
      stats[key] = { n: 0, mean: null, sd: null };
      continue;
    }
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = n > 1 ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    stats[key] = { n, mean, sd };
  }
  return stats;
}

/**
 * Pairwise compare each cohort against the reference cohort.
 * Returns effect-size disparities.
 *
 * @param {Object} cohortStats — output of computeCohortStats
 * @param {string} [referenceKey] — key to use as reference; if omitted,
 *                                  uses the largest cohort
 * @returns {Array} — [{ cohort, n, mean, vsReference: { effectSize, severity, flagged } }]
 */
function detectDisparities(cohortStats, referenceKey) {
  const keys = Object.keys(cohortStats);
  if (keys.length < 2) return [];

  const refKey =
    referenceKey || keys.reduce((a, b) => (cohortStats[a].n >= cohortStats[b].n ? a : b));
  const ref = cohortStats[refKey];
  if (!ref || ref.n === 0 || ref.mean === null) return [];

  const results = [];
  for (const key of keys) {
    if (key === refKey) continue;
    const c = cohortStats[key];
    if (c.n < SIGNIFICANCE_THRESHOLDS.minCohortSize) {
      results.push({
        cohort: key,
        n: c.n,
        mean: c.mean,
        vsReference: { effectSize: null, severity: 'insufficient_n', flagged: false },
      });
      continue;
    }
    const pooledSd = Math.sqrt(((c.sd || 0) ** 2 + (ref.sd || 0) ** 2) / 2) || 1;
    const effectSize = (c.mean - ref.mean) / pooledSd;
    const absEs = Math.abs(effectSize);
    let severity = 'none';
    if (absEs >= SIGNIFICANCE_THRESHOLDS.effectSizeMajor) severity = 'major';
    else if (absEs >= SIGNIFICANCE_THRESHOLDS.effectSizeModerate) severity = 'moderate';
    else if (absEs >= SIGNIFICANCE_THRESHOLDS.effectSizeMinor) severity = 'minor';
    results.push({
      cohort: key,
      n: c.n,
      mean: c.mean,
      vsReference: {
        referenceKey: refKey,
        referenceMean: ref.mean,
        effectSize,
        severity,
        flagged: severity === 'moderate' || severity === 'major',
      },
    });
  }
  return results;
}

/**
 * Detect binary-outcome disparities (e.g. complaint rate, no-show rate)
 * using relative risk vs reference cohort.
 *
 * @param {Object} grouped — observations grouped by dimension
 * @param {string} [referenceKey]
 * @returns {Array} — pairwise risk ratios
 */
function detectBinaryDisparities(grouped, referenceKey) {
  const stats = {};
  for (const [key, obs] of Object.entries(grouped)) {
    const total = obs.length;
    const events = obs.filter(o => o.metricValue === true || o.metricValue === 1).length;
    stats[key] = { n: total, events, rate: total > 0 ? events / total : 0 };
  }
  const keys = Object.keys(stats);
  if (keys.length < 2) return [];

  const refKey = referenceKey || keys.reduce((a, b) => (stats[a].n >= stats[b].n ? a : b));
  const ref = stats[refKey];
  if (!ref || ref.n === 0 || ref.rate === 0) return [];

  const results = [];
  for (const key of keys) {
    if (key === refKey) continue;
    const c = stats[key];
    if (c.n < SIGNIFICANCE_THRESHOLDS.minCohortSize) {
      results.push({
        cohort: key,
        n: c.n,
        rate: c.rate,
        vsReference: { riskRatio: null, severity: 'insufficient_n', flagged: false },
      });
      continue;
    }
    const riskRatio = c.rate / ref.rate;
    let severity = 'none';
    if (
      riskRatio >= SIGNIFICANCE_THRESHOLDS.riskRatioMajor ||
      riskRatio <= 1 / SIGNIFICANCE_THRESHOLDS.riskRatioMajor
    )
      severity = 'major';
    else if (
      riskRatio >= SIGNIFICANCE_THRESHOLDS.riskRatioModerate ||
      riskRatio <= 1 / SIGNIFICANCE_THRESHOLDS.riskRatioModerate
    )
      severity = 'moderate';
    else if (
      riskRatio >= SIGNIFICANCE_THRESHOLDS.riskRatioMinor ||
      riskRatio <= 1 / SIGNIFICANCE_THRESHOLDS.riskRatioMinor
    )
      severity = 'minor';
    results.push({
      cohort: key,
      n: c.n,
      rate: c.rate,
      vsReference: {
        referenceKey: refKey,
        referenceRate: ref.rate,
        riskRatio,
        severity,
        flagged: severity === 'moderate' || severity === 'major',
      },
    });
  }
  return results;
}

/**
 * Full disparity audit across one dimension + one metric.
 */
function auditDimension({ observations, dimension, metricKind, isBinary, referenceKey }) {
  if (!DISPARITY_DIMENSIONS.includes(dimension)) {
    return { error: 'INVALID_DIMENSION' };
  }
  if (metricKind && !METRIC_KINDS.includes(metricKind)) {
    return { error: 'INVALID_METRIC_KIND' };
  }
  const grouped = groupByDimension(observations, dimension);
  const findings = isBinary
    ? detectBinaryDisparities(grouped, referenceKey)
    : detectDisparities(computeCohortStats(grouped), referenceKey);
  const flaggedCount = findings.filter(f => f.vsReference?.flagged).length;
  return {
    dimension,
    metricKind,
    cohortCount: Object.keys(grouped).length,
    findings,
    flaggedCount,
    overallSeverity: _summarizeSeverity(findings),
  };
}

function _summarizeSeverity(findings) {
  if (findings.some(f => f.vsReference?.severity === 'major')) return 'major';
  if (findings.some(f => f.vsReference?.severity === 'moderate')) return 'moderate';
  if (findings.some(f => f.vsReference?.severity === 'minor')) return 'minor';
  return 'none';
}

module.exports = Object.freeze({
  groupByDimension,
  computeCohortStats,
  detectDisparities,
  detectBinaryDisparities,
  auditDimension,
  // Constants
  DISPARITY_DIMENSIONS,
  SIGNIFICANCE_THRESHOLDS,
  METRIC_KINDS,
});
