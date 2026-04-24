'use strict';

/**
 * SLABreach.model.js — Phase 16 Commit 1 (4.0.66).
 *
 * Immutable audit record emitted every time an SLA crosses a
 * material threshold:
 *
 *   • `response_breached`    — first-response target missed
 *   • `pre_breach`           — warning threshold crossed (≥ warnAtPct %)
 *   • `resolution_breached`  — resolution target missed
 *   • `escalation_fired`     — escalation step notified
 *
 * Breach records never update — they are an append-only log so
 * regulators/auditors can prove the timeline. The live state lives
 * on the parent SLA document.
 *
 * Why separate from SLA:
 *
 *   1. Keeps the active SLA document small and read-heavy friendly.
 *   2. Lets us run queries like "all breaches last 30d by module"
 *      without scanning every SLA instance.
 *   3. Gives notifications a stable event record to link to in logs.
 */

const mongoose = require('mongoose');
const { OPS_MODULES } = require('../../config/sla.registry');

const BREACH_KINDS = Object.freeze([
  'response_breached',
  'pre_breach',
  'resolution_breached',
  'escalation_fired',
]);

const slaBreachSchema = new mongoose.Schema(
  {
    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', required: true, index: true },
    policyId: { type: String, required: true, index: true },
    module: { type: String, enum: OPS_MODULES, required: true, index: true },
    severity: { type: String, required: true, index: true },

    subjectType: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectRef: { type: String, default: null },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    kind: { type: String, enum: BREACH_KINDS, required: true, index: true },
    firedAt: { type: Date, required: true, default: Date.now, index: true },

    // kind-specific fields (optional)
    escalationStepIndex: { type: Number, default: null },
    notifiedRoles: { type: [String], default: [] },
    elapsedMinutes: { type: Number, default: null },
    targetMinutes: { type: Number, default: null },
    pctOfTarget: { type: Number, default: null },

    emittedEvent: { type: String, default: null }, // event name published on bus
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

slaBreachSchema.index({ module: 1, kind: 1, firedAt: -1 });
slaBreachSchema.index({ slaId: 1, kind: 1 }, { unique: false });

const SLABreach = mongoose.models.SLABreach || mongoose.model('SLABreach', slaBreachSchema);

module.exports = SLABreach;
module.exports.BREACH_KINDS = BREACH_KINDS;
