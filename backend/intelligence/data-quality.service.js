'use strict';

/**
 * data-quality.service.js — Wave 22.
 *
 * Computes the 8-dimension data quality score for a dataset snapshot.
 *
 *   Input  (per dataset, supplied by the caller — typically the
 *           orchestrator or a route handler):
 *     { datasetId, lastRefreshAt, arrivalLatencyMs, sampleSize,
 *       presentCount, ruleViolations, crossSourceDelta, duplicates,
 *       sources, aiConfidenceScore }
 *
 *   Output:
 *     { composite, level, dimensions: { freshness, timeliness,
 *       completeness, validity, consistency, uniqueness, source,
 *       aiConfidence }, sources, maskValue, breaches[] }
 *
 * Mongo-free. The orchestrator (Wave 20) supplies the snapshot from
 * whatever query it ran; this service does the math + level mapping.
 */

const DefaultRegistry = require('./data-quality.registry');

function scoreToLevel(score) {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.75) return 'good';
  if (score >= 0.6) return 'fair';
  if (score >= 0.4) return 'poor';
  return 'critical';
}

function clamp01(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Freshness: 1.0 if refreshed within cadence; decays linearly to 0
 * at 4× cadence. After 4×, score floors at 0.0.
 */
function freshnessScore({ lastRefreshAt, expectedCadenceMin }, now = new Date()) {
  if (!lastRefreshAt) return 0; // never refreshed = critical
  if (!expectedCadenceMin || expectedCadenceMin <= 0) return 1; // cadence not declared = trust it
  const ageMin = (now - new Date(lastRefreshAt)) / 60_000;
  if (ageMin <= expectedCadenceMin) return 1;
  if (ageMin >= 4 * expectedCadenceMin) return 0;
  // Linear decay over the [1× .. 4×] band → [1.0 .. 0.0]
  const fraction = (ageMin - expectedCadenceMin) / (3 * expectedCadenceMin);
  return clamp01(1 - fraction);
}

/**
 * Timeliness: 1.0 if arrived within SLA; decays to 0 at 5× SLA.
 */
function timelinessScore({ arrivalLatencyMs, slaMs }) {
  if (typeof arrivalLatencyMs !== 'number') return 1; // no measurement = trust
  if (!slaMs || slaMs <= 0) return 1;
  if (arrivalLatencyMs <= slaMs) return 1;
  const ratio = arrivalLatencyMs / slaMs;
  if (ratio >= 5) return 0;
  return clamp01(1 - (ratio - 1) / 4);
}

/**
 * Completeness: presentCount / sampleSize, clamped.
 * Returns 1.0 when sampleSize=0 (nothing missing if nothing expected).
 */
function completenessScore({ presentCount, sampleSize }) {
  if (typeof sampleSize !== 'number' || sampleSize <= 0) return 1;
  if (typeof presentCount !== 'number' || presentCount < 0) return 0;
  return clamp01(presentCount / sampleSize);
}

/**
 * Validity: (sampleSize − ruleViolations) / sampleSize.
 */
function validityScore({ ruleViolations, sampleSize }) {
  if (typeof sampleSize !== 'number' || sampleSize <= 0) return 1;
  const v = typeof ruleViolations === 'number' && ruleViolations >= 0 ? ruleViolations : 0;
  return clamp01(1 - v / sampleSize);
}

/**
 * Consistency: cross-source delta vs tolerance. crossSourceDelta is
 * fractional (0.04 = 4%). When delta = 0, score = 1.0. When delta
 * ≥ 5× tolerance, score = 0.
 */
function consistencyScore({ crossSourceDelta, tolerance }) {
  if (typeof crossSourceDelta !== 'number') return 1;
  if (typeof tolerance !== 'number' || tolerance < 0) return 1;
  if (crossSourceDelta <= tolerance) return 1;
  if (tolerance === 0) {
    // Zero-tolerance — any drift means critical
    return crossSourceDelta === 0 ? 1 : 0;
  }
  const ratio = crossSourceDelta / tolerance;
  if (ratio >= 5) return 0;
  return clamp01(1 - (ratio - 1) / 4);
}

/**
 * Uniqueness: 1.0 if dup rate within threshold; decays linearly to 0
 * at 5× threshold.
 */
function uniquenessScore({ duplicates, sampleSize, duplicateThreshold }) {
  if (typeof sampleSize !== 'number' || sampleSize <= 0) return 1;
  if (typeof duplicates !== 'number' || duplicates < 0) return 1;
  const rate = duplicates / sampleSize;
  if (typeof duplicateThreshold !== 'number' || duplicateThreshold <= 0) {
    return rate === 0 ? 1 : Math.max(0, 1 - rate * 100);
  }
  if (rate <= duplicateThreshold) return 1;
  const ratio = rate / duplicateThreshold;
  if (ratio >= 5) return 0;
  return clamp01(1 - (ratio - 1) / 4);
}

/**
 * Source: MINIMUM trust score across declared sources.
 * Returns 0.5 (neutral) when no sources are declared.
 */
function sourceScore({ sources, getSourceTrustScore }) {
  if (!Array.isArray(sources) || sources.length === 0) return 0.5;
  let min = 1;
  for (const s of sources) {
    const score = getSourceTrustScore(s.category);
    if (score < min) min = score;
  }
  return clamp01(min);
}

/**
 * AI confidence: pass-through, clamped.
 */
function aiConfidenceScore({ aiConfidenceScore: raw, isAIDerived }) {
  if (!isAIDerived) return null; // N/A — not part of composite
  if (typeof raw !== 'number') return 0;
  return clamp01(raw);
}

/**
 * Build the dimension breaches list: which dimensions crossed
 * warn/critical thresholds and at what severity.
 */
function detectBreaches({ dimensions, thresholds }) {
  const breaches = [];
  for (const dim of Object.keys(dimensions)) {
    const v = dimensions[dim];
    if (v === null) continue; // N/A
    const t = thresholds[dim];
    if (!t) continue;
    if (typeof t.critical === 'number' && v < t.critical) {
      breaches.push({ dimension: dim, score: v, severity: 'critical', threshold: t.critical });
    } else if (typeof t.warn === 'number' && v < t.warn) {
      breaches.push({ dimension: dim, score: v, severity: 'medium', threshold: t.warn });
    }
  }
  return breaches;
}

function compositeOf({ dimensions, weights }) {
  let weightSum = 0;
  let total = 0;
  for (const dim of Object.keys(dimensions)) {
    const v = dimensions[dim];
    if (v === null) continue; // N/A skips
    const w = weights[dim] ?? 1;
    weightSum += w;
    total += v * w;
  }
  if (weightSum === 0) return 1;
  return clamp01(total / weightSum);
}

// ─── createDataQualityService factory ───────────────────────────

function createDataQualityService({
  registry = DefaultRegistry,
  logger = console,
  now = () => new Date(),
} = {}) {
  void logger;

  /**
   * Compute the quality bundle for a single dataset snapshot.
   * Snapshot fields come from the caller (the orchestrator or a
   * route). Missing fields fall back to safe defaults documented
   * in each scoreXxx function.
   *
   * Returns:
   *   { ok: true, datasetId, category, composite, level, dimensions,
   *     sources, maskValue, breaches, computedAt }
   */
  function computeQuality(snapshot) {
    if (!snapshot || !snapshot.datasetId) {
      return { ok: false, reason: 'INVALID_SNAPSHOT' };
    }
    const datasetId = snapshot.datasetId;
    const cfg = registry.getDatasetConfig(datasetId);
    if (!cfg) return { ok: false, reason: 'DATASET_NOT_REGISTERED' };

    const thresholds = registry.getThresholdsFor(datasetId);
    const weights = registry.getWeightsFor(datasetId);
    const dimensions = {
      freshness: freshnessScore(
        { lastRefreshAt: snapshot.lastRefreshAt, expectedCadenceMin: cfg.expectedCadenceMin },
        now()
      ),
      timeliness: timelinessScore({
        arrivalLatencyMs: snapshot.arrivalLatencyMs,
        slaMs: cfg.slaMs,
      }),
      completeness: completenessScore({
        presentCount: snapshot.presentCount,
        sampleSize: snapshot.sampleSize,
      }),
      validity: validityScore({
        ruleViolations: snapshot.ruleViolations,
        sampleSize: snapshot.sampleSize,
      }),
      consistency: consistencyScore({
        crossSourceDelta: snapshot.crossSourceDelta,
        tolerance: cfg.crossSourceTolerance,
      }),
      uniqueness: uniquenessScore({
        duplicates: snapshot.duplicates,
        sampleSize: snapshot.sampleSize,
        duplicateThreshold: cfg.duplicateThreshold,
      }),
      source: sourceScore({
        sources: snapshot.sources || cfg.sources,
        getSourceTrustScore: registry.getSourceTrustScore,
      }),
      aiConfidence: aiConfidenceScore({
        aiConfidenceScore: snapshot.aiConfidenceScore,
        isAIDerived: cfg.isAIDerived,
      }),
    };

    const composite = compositeOf({ dimensions, weights });
    const level = scoreToLevel(composite);
    const breaches = detectBreaches({ dimensions, thresholds });

    const maskValue = cfg.maskOnCritical && level === 'critical';

    return {
      ok: true,
      datasetId,
      category: cfg.category,
      composite,
      level,
      dimensions,
      thresholds,
      weights,
      sources: (snapshot.sources || cfg.sources || []).map(s => ({
        id: s.id,
        category: s.category,
        trustScore: registry.getSourceTrustScore(s.category),
      })),
      maskValue,
      breaches,
      lastRefreshAt: snapshot.lastRefreshAt || null,
      computedAt: now(),
    };
  }

  /**
   * Batch compute across multiple datasets. Returns an array; never
   * throws on individual failures (registers as ok:false in the
   * result row).
   */
  function computeQualityBatch(snapshots) {
    if (!Array.isArray(snapshots)) return [];
    return snapshots.map(s => {
      try {
        return computeQuality(s);
      } catch (err) {
        return { ok: false, datasetId: s?.datasetId, reason: 'COMPUTE_ERROR', error: err.message };
      }
    });
  }

  /**
   * Return the source catalog for the routes layer.
   */
  function getSourceCatalog() {
    return Object.entries(registry.SOURCE_CATEGORIES).map(([category, meta]) => ({
      category,
      trustScore: meta.trustScore,
      descriptionAr: meta.descriptionAr,
      descriptionEn: meta.descriptionEn,
    }));
  }

  return {
    computeQuality,
    computeQualityBatch,
    getSourceCatalog,
    // Exposed for unit tests on individual dimensions
    _internal: {
      freshnessScore,
      timelinessScore,
      completenessScore,
      validityScore,
      consistencyScore,
      uniquenessScore,
      sourceScore,
      aiConfidenceScore,
      scoreToLevel,
      detectBreaches,
      compositeOf,
    },
  };
}

module.exports = { createDataQualityService };
