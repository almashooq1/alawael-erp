'use strict';

/**
 * BeneficiaryLifecycleTransition — Wave 39 (Beneficiary 360 Phase 1).
 *
 * Append-only workflow record for every lifecycle state transition.
 * Each transition is a multi-stage workflow:
 *
 *   1. requestTransition()  — service creates the record in `pending`
 *   2. approveTransition()  — each required approver signs;
 *                              status flips to `approved` when all in
 *   3. executeTransition()  — side-effects dispatched; status → executed
 *   4. cancelTransition()   — initiator/DPO cancels; status → cancelled
 *   5. reverseTransition()  — within reversalWindowDays; status → reversed
 *
 * High-sensitivity transitions (severity = critical/high per the
 * registry) get an AnchorLedger commit on execute for tamper-evidence.
 *
 * Cross-field invariants via the Wave-18 virtual-path pattern:
 *   • status === 'executed' requires ALL required approvers signed
 *   • reasonCode (when required) must be in the transition's allowlist
 *   • fromState must match a valid transition.from for transitionId
 *   • status === 'reversed' requires executedAt set + within reversal window
 *
 * Branch scope: this collection is scoped to the beneficiary's branch
 * but cross-branch transfers carry sourceBranchId + destinationBranchId
 * so both branches see the same transition row from their side.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/beneficiary-lifecycle.registry');

const ApprovalSchema = new mongoose.Schema(
  {
    approverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approverRole: { type: String, required: true, maxlength: 100 },
    decision: { type: String, enum: ['approve', 'reject'], required: true },
    signedAt: { type: Date, required: true, default: Date.now },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },
    comment: { type: String, default: null, maxlength: 2000 },
  },
  { _id: false }
);

// Wave 91 — subject-state snapshot captured at request time for
// HIGH/CRITICAL transitions. Closes U6 from the Wave-87 canonical
// analysis (lifecycle had no proof of what the approver saw).
const SubjectSnapshotSchema = new mongoose.Schema(
  {
    takenAt: { type: Date, required: true },
    dataKinds: { type: [{ type: String, maxlength: 100 }], default: () => [] },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadHash: { type: String, required: true, maxlength: 128 },
    hashEncodingVersion: { type: String, default: 'epoch-ms', maxlength: 20 },
  },
  { _id: false }
);

const SideEffectAuditSchema = new mongoose.Schema(
  {
    operation: { type: String, required: true, maxlength: 100 },
    status: { type: String, enum: ['ok', 'failed', 'skipped'], required: true },
    completedAt: { type: Date, required: true, default: Date.now },
    error: { type: String, default: null, maxlength: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const BeneficiaryLifecycleTransitionSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    sourceBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    destinationBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    transitionId: { type: String, required: true, maxlength: 50 },
    fromState: { type: String, enum: reg.STATES, required: true },
    toState: { type: String, enum: reg.STATES, required: true },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestedAt: { type: Date, required: true, default: Date.now },
    approvals: { type: [ApprovalSchema], default: () => [] },
    reason: { type: String, default: null, maxlength: 4000 },
    reasonCode: { type: String, default: null, maxlength: 100 },
    evidenceLinks: { type: [{ type: String, maxlength: 500 }], default: () => [] },
    status: {
      type: String,
      enum: reg.STATUSES,
      required: true,
      default: reg.TRANSITION_STATUS.PENDING,
      index: true,
    },
    executedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    reversedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    correlationId: { type: String, default: null, maxlength: 100, index: true },
    sideEffectsAudit: { type: [SideEffectAuditSchema], default: () => [] },
    compensationEffectsAudit: { type: [SideEffectAuditSchema], default: () => [] },
    anchorTxId: { type: String, default: null, maxlength: 200 },
    // Wave 91 — null for LOW/MEDIUM transitions, populated for HIGH/CRITICAL
    // via evidence-snapshot.lib at request time.
    subjectSnapshot: { type: SubjectSnapshotSchema, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'beneficiary_lifecycle_transitions' }
);

// Indexes
BeneficiaryLifecycleTransitionSchema.index({ beneficiaryId: 1, requestedAt: -1 });
BeneficiaryLifecycleTransitionSchema.index({ sourceBranchId: 1, status: 1, requestedAt: -1 });
BeneficiaryLifecycleTransitionSchema.index({ status: 1, requestedAt: -1 });
BeneficiaryLifecycleTransitionSchema.index({ transitionId: 1, executedAt: -1 });

// ─── Cross-field invariants (Wave-18 virtual-path pattern) ────────

BeneficiaryLifecycleTransitionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

BeneficiaryLifecycleTransitionSchema.path('__invariants').validate(function () {
  let ok = true;

  // 1. fromState must match the registry transition's `from` set
  const t = reg.findTransition(this.transitionId);
  if (!t) {
    this.invalidate('transitionId', `unknown transition: ${this.transitionId}`);
    return false; // can't continue without the def
  }
  if (!t.from.includes(this.fromState)) {
    this.invalidate(
      'fromState',
      `fromState '${this.fromState}' not allowed for ${this.transitionId}; allowed: ${t.from.join(', ')}`
    );
    ok = false;
  }
  if (this.toState !== t.to) {
    this.invalidate(
      'toState',
      `toState '${this.toState}' does not match transition's target '${t.to}'`
    );
    ok = false;
  }

  // 2. Reason required + reasonCode allowlist
  if (t.requiresReason && !this.reason && !this.reasonCode) {
    this.invalidate('reason', `${this.transitionId} requires a reason or reasonCode`);
    ok = false;
  }
  if (this.reasonCode && !reg.isValidReasonCode(this.transitionId, this.reasonCode)) {
    this.invalidate(
      'reasonCode',
      `reasonCode '${this.reasonCode}' not in allowlist for ${this.transitionId}`
    );
    ok = false;
  }

  // 3. status === 'executed' requires all approvers + Nafath if required
  if (this.status === reg.TRANSITION_STATUS.EXECUTED) {
    const approvals = (this.approvals || []).filter(a => a.decision === 'approve');
    const approvedRoles = new Set(approvals.map(a => a.approverRole));
    const missing = t.requiredApproverRoles.filter(r => !approvedRoles.has(r));
    if (missing.length > 0) {
      this.invalidate('status', `cannot be executed; missing approvers: ${missing.join(', ')}`);
      ok = false;
    }
    if (t.requiresNafath) {
      const allHaveNafath = approvals.every(a => !!a.nafathSignatureId);
      if (!allHaveNafath) {
        this.invalidate(
          'approvals',
          `${this.transitionId} requires Nafath signature on every approval`
        );
        ok = false;
      }
    }
    if (!this.executedAt) {
      this.invalidate('executedAt', 'executed records must have executedAt');
      ok = false;
    }
  }

  // 4. status === 'reversed' requires executedAt + within reversal window
  if (this.status === reg.TRANSITION_STATUS.REVERSED) {
    if (!this.executedAt) {
      this.invalidate('executedAt', 'cannot reverse a transition that was never executed');
      ok = false;
    }
    if (!this.reversedAt) {
      this.invalidate('reversedAt', 'reversed records must have reversedAt');
      ok = false;
    }
    if (t.reversalWindowDays && this.executedAt && this.reversedAt) {
      const ageDays = (this.reversedAt - this.executedAt) / (24 * 60 * 60 * 1000);
      if (ageDays > t.reversalWindowDays) {
        this.invalidate(
          'reversedAt',
          `reversal window of ${t.reversalWindowDays}d exceeded (was ${ageDays.toFixed(1)}d)`
        );
        ok = false;
      }
    } else if (!t.reversalWindowDays) {
      this.invalidate('status', `${this.transitionId} is not reversible`);
      ok = false;
    }
  }

  // 5. Self-approval guard — requestedBy cannot also be in approvals
  if (Array.isArray(this.approvals)) {
    const selfApprovals = this.approvals.filter(
      a =>
        this.requestedBy &&
        a.approverUserId &&
        String(a.approverUserId) === String(this.requestedBy)
    );
    if (selfApprovals.length > 0) {
      this.invalidate('approvals', 'requester cannot also approve their own transition request');
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.BeneficiaryLifecycleTransition ||
  mongoose.model('BeneficiaryLifecycleTransition', BeneficiaryLifecycleTransitionSchema);

module.exports.BeneficiaryLifecycleTransitionSchema = BeneficiaryLifecycleTransitionSchema;
