'use strict';

/**
 * insight.model.js — Wave 18 (Intelligence Layer foundation).
 *
 * Single canonical Insight document. Every recommendation surfaced
 * in the dashboards' Intelligence Feed is one of these.
 *
 * The schema enforces 5 explainability guarantees via a `validate`
 * pre-save hook — any insight that tries to land without them is
 * rejected at the DB layer, so downstream consumers (UI, tests,
 * audit) can trust that:
 *
 *   G1 — `reasoning.bulletsAr.length ≥ 2`  (and same for En)
 *   G2 — `supportingFacts.length ≥ 1`     (each fact has `value`)
 *   G3 — `confidence.factors.length ≥ 1`  (each ≥ 5 chars)
 *   G4 — `deepLink` OR `suggestedActions.length ≥ 1` is set
 *   G5 — `source.inputDigest` is a SHA-1 hex string
 *
 * Insights coexist with Alerts (Waves 11-16). When an Insight is
 * critical, it auto-promotes to an Alert document via the bridge
 * service (`intelligence/promotion.service.js`, Wave 19+); the
 * `promotedToAlertId` field carries the back-reference.
 *
 * Indexes are kept minimal — the dashboard route always supplies
 * `state`, often `kind`/`category`/`branchId`. The compound
 * (state, severity, generatedAt) reflects that.
 */

const mongoose = require('mongoose');
const { TENANT_FIELD } = require('../config/constants');

const INSIGHT_KINDS = [
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

const INSIGHT_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const INSIGHT_CATEGORIES = ['clinical', 'financial', 'hr', 'operational', 'quality', 'compliance'];
const INSIGHT_SCOPES = ['entity', 'branch', 'region', 'platform'];
const INSIGHT_STATES = ['active', 'dismissed', 'confirmed', 'resolved', 'expired'];
const SOURCE_TYPES = ['rule', 'statistical', 'llm', 'hybrid'];
const DISMISS_REASON_CODES = [
  'acted-on',
  'noise',
  'duplicate',
  'wrong-target',
  'not-applicable',
  'other',
];

// ─── Sub-schemas ────────────────────────────────────────────────

const SupportingFactSchema = new mongoose.Schema(
  {
    labelAr: { type: String, required: true, maxlength: 200 },
    labelEn: { type: String, required: true, maxlength: 200 },
    // `value` MUST be set — null/undefined fails G2 in the pre-save.
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    delta: { type: Number, default: null },
    unit: {
      type: String,
      enum: ['percent', 'days', 'hours', 'count', 'sar', 'ratio', 'score', null],
      default: null,
    },
    // Source pointer — e.g. "kpi:crm.complaints.sla_breach.count" or
    // "model:CarePlan:65f...". Optional but encouraged.
    source: { type: String, default: null, maxlength: 200 },
  },
  { _id: false }
);

const SuggestedActionSchema = new mongoose.Schema(
  {
    titleAr: { type: String, required: true, maxlength: 200 },
    titleEn: { type: String, required: true, maxlength: 200 },
    deepLink: { type: String, default: null, maxlength: 500 },
    estimatedMin: { type: Number, default: null, min: 1, max: 480 },
    severity: { type: String, enum: ['must', 'should', 'may'], default: 'should' },
  },
  { _id: false }
);

const DismissReasonSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reasonCode: { type: String, enum: DISMISS_REASON_CODES, required: true },
    note: { type: String, default: null, maxlength: 500 },
    at: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const UserNoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, default: Date.now, required: true },
  },
  { _id: true }
);

const RelatedEntitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, maxlength: 80 },
    id: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

// ─── Main schema ────────────────────────────────────────────────

const InsightSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: INSIGHT_KINDS, required: true, index: true },
    severity: { type: String, enum: INSIGHT_SEVERITIES, required: true, index: true },
    category: { type: String, enum: INSIGHT_CATEGORIES, required: true, index: true },
    scope: { type: String, enum: INSIGHT_SCOPES, required: true },
    [TENANT_FIELD]: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── The story (G-enforced minimum lengths) ──────────────
    titleAr: { type: String, required: true, minlength: 10, maxlength: 200 },
    titleEn: { type: String, required: true, minlength: 10, maxlength: 200 },
    summaryAr: { type: String, required: true, minlength: 10, maxlength: 1000 },
    summaryEn: { type: String, required: true, minlength: 10, maxlength: 1000 },

    // ── Why (G1 + G2) ───────────────────────────────────────
    reasoning: {
      bulletsAr: { type: [String], default: [] },
      bulletsEn: { type: [String], default: [] },
      supportingFacts: { type: [SupportingFactSchema], default: [] },
    },

    // ── Trust (G3) ──────────────────────────────────────────
    confidence: {
      level: { type: String, enum: ['low', 'medium', 'high'], required: true },
      score: { type: Number, required: true, min: 0, max: 1 },
      factors: { type: [String], default: [] },
    },

    // ── Provenance (G5) ─────────────────────────────────────
    source: {
      type: { type: String, enum: SOURCE_TYPES, required: true },
      detail: { type: String, required: true, maxlength: 300 },
      generatorId: { type: String, required: true, maxlength: 100 },
      inputDigest: { type: String, required: true, maxlength: 64 },
    },

    // ── Action (G4) ─────────────────────────────────────────
    deepLink: { type: String, default: null, maxlength: 500 },
    relatedEntities: { type: [RelatedEntitySchema], default: [] },
    suggestedActions: { type: [SuggestedActionSchema], default: [] },

    // ── Feedback loop ───────────────────────────────────────
    feedback: {
      confirmCount: { type: Number, default: 0, min: 0 },
      dismissCount: { type: Number, default: 0, min: 0 },
      confirmedBy: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'User' },
      dismissedBy: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'User' },
      dismissReasons: { type: [DismissReasonSchema], default: [] },
      userNotes: { type: [UserNoteSchema], default: [] },
    },

    // ── Lifecycle ───────────────────────────────────────────
    state: { type: String, enum: INSIGHT_STATES, default: 'active', index: true },
    generatedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, default: null, index: true },
    resolvedAt: { type: Date, default: null },

    // ── Cross-link with Alert engine ────────────────────────
    promotedToAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
      index: true,
    },
  },
  { timestamps: true, collection: 'insights' }
);

// ── Indexes ───────────────────────────────────────────────────
// Compound (state, severity, generatedAt DESC) handles the
// canonical Intelligence Feed query: "show me active insights,
// most severe first, latest first within severity".
InsightSchema.index({ state: 1, severity: 1, generatedAt: -1 });
// Per-generator audit (how is generator X performing?)
InsightSchema.index({ 'source.generatorId': 1, generatedAt: -1 });
// Branch-scoped Intelligence Feeds use this.
InsightSchema.index({ [TENANT_FIELD]: 1, state: 1, generatedAt: -1 });
// Dedup by inputDigest — same input shouldn't generate the same
// insight twice within the TTL window. Generators consult this
// before insert.
InsightSchema.index(
  { 'source.generatorId': 1, 'source.inputDigest': 1 },
  { name: 'generator_input_digest' }
);

// ── The 5 G-Guarantees (pre-save validation) ──────────────────

// The 5 G-Guarantees are enforced via Schema.path-level validators
// instead of a pre('validate') hook so they fire in BOTH async
// `save()` paths AND sync `validateSync()` paths. Mongoose runs path
// validators in both modes; pre('validate') hooks only fully apply
// to async paths, which would let tests that call validateSync()
// quietly bypass our guarantees. We attach a virtual placeholder
// path (`__gGuarantees`) so we have a hook point to inspect the
// whole document; its validator inspects siblings and throws.

InsightSchema.add({
  // Hidden field — purely a hook for the cross-field G-guarantee
  // validator. Stays unset on the wire (no enum, no index) but
  // Mongoose still calls its validator on every save/validateSync.
  __gGuarantees: { type: String, default: 'v1' },
});

InsightSchema.path('__gGuarantees').validate(function () {
  // Each guarantee gets its own pseudo-path via `this.invalidate()`.
  // That gives us:
  //   - Individual messages preserved (`err.errors.G1.message`)
  //   - Multiple errors surface together (a missing-bullets +
  //     missing-facts insight gets BOTH errors, not just the first)
  //   - Works identically under validateSync() AND async save()
  //     because `invalidate` is the canonical way Mongoose collects
  //     custom validation errors.

  let failed = false;
  const fail = (path, message) => {
    failed = true;
    this.invalidate(path, message);
  };

  // G1 — reasoning bullets ≥ 2 in both languages, same count
  const ar = (this.reasoning && this.reasoning.bulletsAr) || [];
  const en = (this.reasoning && this.reasoning.bulletsEn) || [];
  if (ar.length < 2) fail('G1', 'G1: reasoning.bulletsAr must have ≥ 2 entries');
  if (en.length < 2) fail('G1', 'G1: reasoning.bulletsEn must have ≥ 2 entries');
  if (ar.length !== en.length) fail('G1', 'G1: bulletsAr and bulletsEn must have the same length');

  // G2 — ≥ 1 supportingFact with non-null value
  const facts = (this.reasoning && this.reasoning.supportingFacts) || [];
  if (facts.length < 1) fail('G2', 'G2: reasoning.supportingFacts requires ≥ 1 fact');
  for (let i = 0; i < facts.length; i += 1) {
    if (facts[i] && (facts[i].value === null || facts[i].value === undefined)) {
      fail('G2', `G2: supportingFacts[${i}].value cannot be null/undefined`);
    }
  }

  // G3 — confidence.factors ≥ 1 entry, each ≥ 5 chars
  const cf = (this.confidence && this.confidence.factors) || [];
  if (cf.length < 1) fail('G3', 'G3: confidence.factors requires ≥ 1 entry');
  for (let i = 0; i < cf.length; i += 1) {
    if (typeof cf[i] !== 'string' || cf[i].trim().length < 5) {
      fail('G3', `G3: confidence.factors[${i}] must be a string ≥ 5 chars`);
    }
  }

  // G4 — deepLink OR ≥ 1 suggestedAction
  const actions = this.suggestedActions || [];
  if (!this.deepLink && actions.length < 1) {
    fail('G4', 'G4: insight must have a deepLink OR ≥ 1 suggestedAction');
  }

  // G5 — inputDigest is a hex string (16..64 chars).
  const digest = this.source && this.source.inputDigest;
  if (!digest || !/^[a-f0-9]{16,64}$/i.test(digest)) {
    fail('G5', 'G5: source.inputDigest must be a hex string of 16-64 chars');
  }

  // Confidence level/score alignment — derived from score if missing.
  // (Safe to mutate inside the validator; the doc isn't persisted yet.)
  if (this.confidence && typeof this.confidence.score === 'number') {
    const s = this.confidence.score;
    const derived = s >= 0.85 ? 'high' : s >= 0.6 ? 'medium' : 'low';
    if (!this.confidence.level) this.confidence.level = derived;
    if (this.confidence.level !== derived && cf.length > 0) {
      const note = `level=${this.confidence.level} (overrides score=${s.toFixed(2)})`;
      if (!cf.includes(note)) cf.push(note);
    }
  }

  // Return value: `false` if we invalidated anything, `true` otherwise.
  // Returning false also marks the __gGuarantees path itself as failed,
  // which keeps `validateSync()` reporting an error even if Mongoose
  // decides to GC pseudo-paths on a future major.
  return !failed;
});

// ── Instance + static helpers ─────────────────────────────────

InsightSchema.methods.isExpired = function (now = new Date()) {
  return !!(this.expiresAt && this.expiresAt < now);
};

InsightSchema.statics.findActiveForBranch = function (branchId, opts = {}) {
  const limit = Math.min(200, Math.max(1, opts.limit || 50));
  const filter = {
    state: 'active',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };
  if (branchId) filter[TENANT_FIELD] = branchId;
  return this.find(filter).sort({ severity: 1, generatedAt: -1 }).limit(limit);
};

module.exports = {
  InsightSchema,
  INSIGHT_KINDS,
  INSIGHT_SEVERITIES,
  INSIGHT_CATEGORIES,
  INSIGHT_SCOPES,
  INSIGHT_STATES,
  SOURCE_TYPES,
  DISMISS_REASON_CODES,
  get model() {
    return mongoose.models.Insight || mongoose.model('Insight', InsightSchema);
  },
};
