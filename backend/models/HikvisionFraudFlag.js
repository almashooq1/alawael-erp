'use strict';

/**
 * HikvisionFraudFlag — Wave 100 Phase 5.
 *
 * One record per detected fraud signal. Detection emits a flag; the
 * score service aggregates flags into a per-employee rolling score.
 *
 * Lifecycle:
 *   open         → detected by engine, awaiting operator action
 *   acknowledged → operator confirmed real → counts on score
 *   dismissed    → operator confirmed false-positive → removed from score
 *   escalated    → bumped to security/DPO
 *   expired      → time-based decay (no longer contributes to score)
 *
 * Wave-18 invariants:
 *   • kind ∈ FRAUD_KINDS
 *   • severity ∈ FRAUD_SEVERITIES
 *   • evidenceProcessedEventIds non-empty (the audit trail)
 *   • state='dismissed' requires resolverId + resolverNote
 *   • scoreImpact > 0 unless state=dismissed (then must be 0)
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionFraudFlagSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: reg.FRAUD_KINDS, required: true, index: true },
    severity: { type: String, enum: reg.FRAUD_SEVERITIES, required: true, index: true },

    // The actor under suspicion. employeeId is REQUIRED for kinds that
    // reference a known employee; UNREGISTERED_REPEAT flags have null
    // employeeId + a non-null personId.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionFaceTemplateLink',
      default: null,
      index: true,
    },
    hikvisionPersonId: { type: String, default: null, maxlength: 128 },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // Evidence chain — the processed events that triggered the flag.
    evidenceProcessedEventIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HikvisionProcessedEvent' }],
      default: () => [],
    },

    // Detection metadata
    detectedAt: { type: Date, required: true, default: Date.now, index: true },
    detectedBy: { type: String, default: 'engine', maxlength: 80 }, // 'engine' | 'manual' | actor userId
    summary: { type: String, default: null, maxlength: 500 },

    // Score contribution (drives the rolling score)
    scoreImpact: { type: Number, default: 0, min: 0, max: 100 },

    state: {
      type: String,
      enum: reg.FRAUD_FLAG_STATES,
      default: reg.FRAUD_FLAG_STATE.OPEN,
      index: true,
    },

    // Resolution metadata (acknowledged / dismissed / escalated)
    resolverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolverRole: { type: String, default: null, maxlength: 100 },
    resolverNote: { type: String, default: null, maxlength: 1000 },
    resolvedAt: { type: Date, default: null },
    escalatedToRole: { type: String, default: null, maxlength: 100 },

    // Free-form context — detection engine writes the raw rule output
    // here for forensic replay later (e.g. {windowMs, threshold,
    // observedCount}). NOT trusted by the score service.
    detectorContext: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'hikvision_fraud_flags' }
);

HikvisionFraudFlagSchema.index({ employeeId: 1, state: 1, detectedAt: -1 });
HikvisionFraudFlagSchema.index({ kind: 1, severity: 1, detectedAt: -1 });
HikvisionFraudFlagSchema.index({ state: 1, detectedAt: 1 }); // sweep candidates
HikvisionFraudFlagSchema.index({ templateId: 1, detectedAt: -1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
HikvisionFraudFlagSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionFraudFlagSchema.path('__invariants').validate(function () {
  let ok = true;

  if (
    !Array.isArray(this.evidenceProcessedEventIds) ||
    this.evidenceProcessedEventIds.length === 0
  ) {
    this.invalidate(
      'evidenceProcessedEventIds',
      'every flag must cite at least one processed event as evidence'
    );
    ok = false;
  }

  if (this.state === reg.FRAUD_FLAG_STATE.DISMISSED) {
    if (!this.resolverId) {
      this.invalidate('resolverId', 'dismissed flags require resolverId');
      ok = false;
    }
    if (!this.resolverNote) {
      this.invalidate('resolverNote', 'dismissed flags require resolverNote');
      ok = false;
    }
    if (this.scoreImpact !== 0) {
      this.invalidate('scoreImpact', 'dismissed flags must have scoreImpact = 0');
      ok = false;
    }
  }

  if (this.state === reg.FRAUD_FLAG_STATE.ESCALATED && !this.escalatedToRole) {
    this.invalidate('escalatedToRole', 'escalated flags require escalatedToRole');
    ok = false;
  }

  // UNREGISTERED_REPEAT flags must carry hikvisionPersonId (or null
  // OK) but employeeId should be null. All other kinds need employee.
  if (this.kind !== reg.FRAUD_KIND.UNREGISTERED_REPEAT && !this.employeeId) {
    this.invalidate('employeeId', `${this.kind} flags require employeeId`);
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionFraudFlag ||
  mongoose.model('HikvisionFraudFlag', HikvisionFraudFlagSchema);

module.exports.HikvisionFraudFlagSchema = HikvisionFraudFlagSchema;
