'use strict';

/**
 * ManagementReview — Phase 13 Commit 1 (4.0.55).
 *
 * Closes the #1 CBAHI gap surfaced by the 2026-04-23 QMS audit.
 * Tracks the full lifecycle of an ISO 9001:2015 §9.3 management
 * review cycle: scheduling → agenda → minutes → decisions → actions
 * → closure → next-cycle scheduling.
 *
 * Data model decisions:
 *
 *   1. `status` is a state machine governed by the service layer.
 *      The Mongoose schema enforces the enum but not the transitions
 *      — those live in `services/quality/managementReview.service.js`
 *      so invariants are unit-testable without a DB.
 *
 *   2. `inputs[]` and `outputs[]` use `code` values from
 *      `config/management-review.registry.js`. That gives us a
 *      closed vocabulary so the UI can map a code → localized label
 *      without round-tripping the whole taxonomy each render.
 *
 *   3. `actions[]` are inline here (not references to CAPA or
 *      ImprovementProject) because a management-review action is
 *      often a leadership directive whose work will *then* spawn
 *      a CAPA/project; we keep a `linkedCapaId` field so the
 *      downstream artifact can backlink. The service will emit
 *      `quality.review.action.assigned` so a downstream worker can
 *      auto-create the CAPA if desired.
 *
 *   4. Attendance is first-class (not free-form attendees string)
 *      so quorum checks per CBAHI/ISO can run deterministically.
 *      `role` is the attendee's role *at meeting time* — snapshotted
 *      so a later role-change doesn't retroactively break quorum.
 *
 *   5. `approvals[]` carries a detached signature trail. CBAHI wants
 *      evidence that senior leadership signed the minutes; we record
 *      user + role + ISO timestamp + optional signature hash.
 *
 *   6. Soft-delete via `deleted_at` so a cancelled / corrected review
 *      stays in the audit trail rather than being hard-deleted.
 *
 *   7. `branchId` is required when the review is branch-scoped,
 *      nullable when it's an organization-wide review (HQ / board).
 */

const mongoose = require('mongoose');
const {
  REVIEW_STATUSES,
  REVIEW_TYPES,
  DECISION_TYPES,
  ACTION_PRIORITIES,
} = require('../../config/management-review.registry');

// ── sub-schemas ────────────────────────────────────────────────────

const attendeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nameSnapshot: { type: String, required: true },
    role: { type: String, required: true }, // snapshot of role at meeting time
    present: { type: Boolean, default: true },
    delegatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const inputItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // must exist in registry REVIEW_INPUTS
    summary: { type: String, required: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: null }, // numeric snapshot
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const outputItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // must exist in registry REVIEW_OUTPUTS
    description: { type: String, required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const decisionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: DECISION_TYPES, required: true },
    title: { type: String, required: true },
    rationale: { type: String, required: true },
    effectiveFrom: { type: Date, default: Date.now },
    decidedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const actionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    priority: { type: String, enum: ACTION_PRIORITIES, default: 'medium' },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    linkedCapaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CorrectivePreventiveAction',
      default: null,
    },
    linkedProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImprovementProject',
      default: null,
    },
    completedAt: { type: Date, default: null },
    completionNotes: { type: String, default: null },
  },
  { _id: true, timestamps: true }
);

const approvalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    signedAt: { type: Date, required: true, default: Date.now },
    signatureHash: { type: String, default: null }, // optional digital-sig reference
    notes: { type: String, default: null },
  },
  { _id: false }
);

// ── main schema ────────────────────────────────────────────────────

const managementReviewSchema = new mongoose.Schema(
  {
    reviewNumber: { type: String, unique: true, required: true }, // MR-2026-0001
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: REVIEW_TYPES, default: 'periodic' },
    cycleLabel: { type: String, default: null }, // e.g. "H1-2026"
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

    scheduledFor: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: 'scheduled',
      index: true,
    },

    agenda: { type: [String], default: [] }, // free-form bullet list
    attendees: { type: [attendeeSchema], default: [] },

    inputs: { type: [inputItemSchema], default: [] },
    outputs: { type: [outputItemSchema], default: [] },

    decisions: { type: [decisionSchema], default: [] },
    actions: { type: [actionSchema], default: [] },

    minutes: { type: String, default: null }, // narrative minutes
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    approvals: { type: [approvalSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null },
    closureNotes: { type: String, default: null },

    // Chain to previous / next cycle for continuity audits
    previousReviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManagementReview',
      default: null,
    },
    nextReviewScheduledFor: { type: Date, default: null },

    cancelledReason: { type: String, default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── indexes ────────────────────────────────────────────────────────

managementReviewSchema.index({ branchId: 1, status: 1 });
managementReviewSchema.index({ scheduledFor: 1, status: 1 });
managementReviewSchema.index({ type: 1, cycleLabel: 1 });
managementReviewSchema.index({ deleted_at: 1 });

// ── auto-numbering ─────────────────────────────────────────────────

managementReviewSchema.pre('validate', async function () {
  if (this.reviewNumber) return;
  const year = (this.scheduledFor || new Date()).getUTCFullYear();
  const Model = mongoose.model('ManagementReview');
  const count = await Model.countDocuments({
    reviewNumber: { $regex: `^MR-${year}-` },
  });
  this.reviewNumber = `MR-${year}-${String(count + 1).padStart(4, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

managementReviewSchema.virtual('isTerminal').get(function () {
  return ['closed', 'cancelled'].includes(this.status);
});

managementReviewSchema.virtual('openActionsCount').get(function () {
  return (this.actions || []).filter(a => ['open', 'in_progress', 'overdue'].includes(a.status))
    .length;
});

managementReviewSchema.set('toJSON', { virtuals: true });
managementReviewSchema.set('toObject', { virtuals: true });

// ── export ─────────────────────────────────────────────────────────

const ManagementReview =
  mongoose.models.ManagementReview || mongoose.model('ManagementReview', managementReviewSchema);

module.exports = ManagementReview;
module.exports.REVIEW_STATUSES = REVIEW_STATUSES;
module.exports.REVIEW_TYPES = REVIEW_TYPES;
