'use strict';

/**
 * base.js — Wave 18.
 *
 * Generator contract. Every concrete intelligence generator
 * (anomaly, care-gap, attendance-risk, …) exports an object that
 * conforms to:
 *
 *   {
 *     id:          'anomaly.v1' | 'care-gap.v1' | ...,  // versioned
 *     kind:        InsightKind,
 *     category:    InsightCategory,
 *     scope:       'entity' | 'branch' | 'region' | 'platform',
 *     evaluate(ctx) → Array<InsightPayload>,
 *   }
 *
 * The orchestrator (`intelligence/orchestrator.service.js`, Wave 19)
 * calls each generator with a shared context every tick. The
 * generator's `evaluate()` returns zero-or-more **payload candidates**;
 * the orchestrator hands each candidate to `insightsService.upsertInsight()`
 * which enforces the 5 G-guarantees + dedup.
 *
 * Why "evaluate returns payloads, doesn't write": keeps the
 * generator pure + testable without Mongo. Same pattern as the
 * Alert engine's `rule.evaluate()` (Phase 11 baseline).
 *
 * This file ships:
 *   - `defineGenerator(spec)` — validation wrapper that catches
 *     missing fields at boot rather than at runtime.
 *   - `buildPayload(generator, opts)` — helper that fills the
 *     boilerplate fields (source.generatorId, source.inputDigest,
 *     generatedAt) so concrete generators stay focused on the
 *     domain logic.
 *   - `severityFromScore(score)` — canonical mapping.
 *   - `confidenceLevelFromScore(score)` — canonical mapping.
 */

const crypto = require('crypto');

const VALID_KINDS = [
  'anomaly',
  'trend-deviation',
  'risk-score',
  'opportunity',
  'workflow-delay',
  'branch-underperform',
  'attendance-risk',
  'care-gap',
  'executive-digest',
  'weekly-summary',
];

const VALID_CATEGORIES = ['clinical', 'financial', 'hr', 'operational', 'quality', 'compliance'];
const VALID_SCOPES = ['entity', 'branch', 'region', 'platform'];

/**
 * Throws at boot if a generator spec is malformed. We'd rather
 * crash on app startup than half-silently skip generators in
 * production.
 */
function defineGenerator(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('defineGenerator: spec must be an object');
  }
  if (typeof spec.id !== 'string' || !spec.id.length) {
    throw new Error('defineGenerator: spec.id is required');
  }
  if (!VALID_KINDS.includes(spec.kind)) {
    throw new Error(`defineGenerator(${spec.id}): unknown kind '${spec.kind}'`);
  }
  if (!VALID_CATEGORIES.includes(spec.category)) {
    throw new Error(`defineGenerator(${spec.id}): unknown category '${spec.category}'`);
  }
  if (!VALID_SCOPES.includes(spec.scope)) {
    throw new Error(`defineGenerator(${spec.id}): unknown scope '${spec.scope}'`);
  }
  if (typeof spec.evaluate !== 'function') {
    throw new Error(`defineGenerator(${spec.id}): evaluate() is required`);
  }
  return spec;
}

/**
 * Canonical score-to-severity mapping used by every generator that
 * doesn't want to roll its own.
 */
function severityFromScore(score) {
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function confidenceLevelFromScore(score) {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

/**
 * Build an inputDigest a generator can reuse across ticks. We
 * canonicalise the input (sorted keys, no whitespace) so two
 * semantically identical inputs hash to the same string.
 */
function digestOf(input) {
  const canonical = JSON.stringify(input, replacer);
  return crypto.createHash('sha1').update(canonical).digest('hex');
}

function replacer(key, value) {
  // Sort object keys so { a: 1, b: 2 } and { b: 2, a: 1 } hash
  // identically.
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = value[k];
    return out;
  }
  return value;
}

/**
 * Assemble the boilerplate fields onto a partial insight payload.
 * Concrete generators provide the domain bits; this fills in:
 *
 *   - source.generatorId  ← spec.id
 *   - source.inputDigest  ← digestOf(rawInput)
 *   - source.type         ← spec.sourceType
 *   - generatedAt         ← now
 *   - kind / category / scope ← spec
 *
 * Returns the full payload ready for insightsService.upsertInsight().
 */
function buildPayload(spec, opts) {
  if (!opts || typeof opts !== 'object') {
    throw new Error('buildPayload: opts is required');
  }
  const {
    rawInput,
    titleAr,
    titleEn,
    summaryAr,
    summaryEn,
    severity,
    confidence,
    reasoning,
    branchId = null,
    deepLink = null,
    suggestedActions = [],
    relatedEntities = [],
    sourceDetail = `${spec.id}`,
    sourceType = 'rule',
    expiresAt = null,
  } = opts;

  return {
    kind: spec.kind,
    category: spec.category,
    scope: spec.scope,
    severity,
    titleAr,
    titleEn,
    summaryAr,
    summaryEn,
    reasoning,
    confidence,
    source: {
      type: sourceType,
      detail: sourceDetail,
      generatorId: spec.id,
      inputDigest: digestOf(rawInput),
    },
    branchId,
    deepLink,
    suggestedActions,
    relatedEntities,
    generatedAt: new Date(),
    ...(expiresAt ? { expiresAt } : {}),
  };
}

module.exports = {
  defineGenerator,
  buildPayload,
  digestOf,
  severityFromScore,
  confidenceLevelFromScore,
  VALID_KINDS,
  VALID_CATEGORIES,
  VALID_SCOPES,
};
