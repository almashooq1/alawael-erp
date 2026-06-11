'use strict';

/**
 * MeasureBaselineSlot — Wave 227
 *
 * Tracks the baseline-administration intent for a single (beneficiary,
 * episode, measure) tuple. Distinct from the cadence-driven W214
 * reassessment task in two ways:
 *
 *   1. Baseline is a one-shot — it either lands once or gets waived.
 *      A reassessment task is recurring and closes via a new admin.
 *
 *   2. Baseline supports a WAIVED state with a documented reason —
 *      refused consent, medically untestable, sensory/motor barriers,
 *      cultural objection. The waiver is auditable evidence that the
 *      lack of baseline data was a deliberate clinical decision, not
 *      a process failure.
 *
 * State machine (W227):
 *
 *      ┌─────────────── BASELINE_REQUIRED ────────────┐
 *      │                       │                       │
 *      │                       ▼                       │
 *      │              BASELINE_SCHEDULED               │
 *      │                       │                       │
 *      │                       ▼                       │
 *      │              BASELINE_IN_PROGRESS             │
 *      │                       │                       │
 *      │                       ▼                       │
 *      │              BASELINE_COMPLETED               │
 *      │                       │                       │
 *      │                       ▼                       │
 *      │              BASELINE_LOCKED   (terminal)     │
 *      │                                               │
 *      └─→ WAIVED   (terminal, w/ approver + reason)   │
 *      └─→ CANCELLED (terminal, w/ reason, e.g. episode closed)
 *
 * Invariants (pre-validate):
 *   - COMPLETED requires baselineApplicationId (links to MeasureApplication.isBaseline=true)
 *   - LOCKED requires both baselineApplicationId AND lockedAt+lockedBy
 *   - WAIVED requires waiverType + waiverReason + waiverApprovedBy
 *   - CANCELLED requires cancellationReason
 *   - state transitions respect the diagram (validated by service, not model — model just enforces required fields per state)
 *
 * Idempotency: partial unique index on
 *   (beneficiaryId, episodeId, measureId, state ∈ {REQUIRED, SCHEDULED, IN_PROGRESS})
 * so at most one OPEN slot exists per pair. Terminal slots
 * (COMPLETED|LOCKED|WAIVED|CANCELLED) don't count.
 *
 * @module domains/goals/models/MeasureBaselineSlot
 */

const mongoose = require('mongoose');

const BASELINE_STATES = Object.freeze({
  BASELINE_REQUIRED: 'BASELINE_REQUIRED',
  BASELINE_SCHEDULED: 'BASELINE_SCHEDULED',
  BASELINE_IN_PROGRESS: 'BASELINE_IN_PROGRESS',
  BASELINE_COMPLETED: 'BASELINE_COMPLETED',
  BASELINE_LOCKED: 'BASELINE_LOCKED',
  WAIVED: 'WAIVED',
  CANCELLED: 'CANCELLED',
});

const WAIVER_TYPES = Object.freeze({
  REFUSED_CONSENT: 'REFUSED_CONSENT',
  MEDICALLY_UNTESTABLE: 'MEDICALLY_UNTESTABLE',
  SENSORY_MOTOR_BARRIER: 'SENSORY_MOTOR_BARRIER',
  CULTURAL_OBJECTION: 'CULTURAL_OBJECTION',
  TEMPORARY_UNAVAILABLE: 'TEMPORARY_UNAVAILABLE', // expected to expire
  OTHER: 'OTHER',
});

const OPEN_STATES = [
  BASELINE_STATES.BASELINE_REQUIRED,
  BASELINE_STATES.BASELINE_SCHEDULED,
  BASELINE_STATES.BASELINE_IN_PROGRESS,
];

const TERMINAL_STATES = [
  BASELINE_STATES.BASELINE_COMPLETED,
  BASELINE_STATES.BASELINE_LOCKED,
  BASELINE_STATES.WAIVED,
  BASELINE_STATES.CANCELLED,
];

const measureBaselineSlotSchema = new mongoose.Schema(
  {
    // ── Subject ───────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },
    measureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Measure',
      required: true,
      index: true,
    },
    measureCode: { type: String, required: true },
    discipline: { type: String }, // e.g. 'physical_therapist'

    // ── State ─────────────────────────────────────────────────────
    state: {
      type: String,
      enum: Object.values(BASELINE_STATES),
      default: BASELINE_STATES.BASELINE_REQUIRED,
      required: true,
      index: true,
    },

    // ── Scheduling ────────────────────────────────────────────────
    scheduledDueDate: Date,
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ── Completion ────────────────────────────────────────────────
    baselineApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasureApplication',
    },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Lock ──────────────────────────────────────────────────────
    lockedAt: Date,
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Waiver ────────────────────────────────────────────────────
    waiverType: {
      type: String,
      enum: Object.values(WAIVER_TYPES),
    },
    waiverReason: String,
    waiverApprovedAt: Date,
    waiverApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    waiverExpiresAt: Date, // optional — for TEMPORARY_UNAVAILABLE waivers

    // ── Cancellation ──────────────────────────────────────────────
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,

    // ── Phase audit (append-only) ─────────────────────────────────
    stateHistory: [
      {
        state: { type: String, required: true },
        enteredAt: { type: Date, required: true },
        transitionedBy: { type: String, default: 'system' }, // userId string or 'system'
        notes: String,
        _id: false,
      },
    ],

    // ── Multi-tenant ──────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'measure_baseline_slots',
  }
);

// ─── Indexes ───────────────────────────────────────────────────────

// Idempotency: at most ONE open slot per (beneficiary, episode, measure).
measureBaselineSlotSchema.index(
  { beneficiaryId: 1, episodeId: 1, measureId: 1, state: 1 },
  {
    unique: true,
    partialFilterExpression: {
      state: { $in: OPEN_STATES },
    },
  }
);
measureBaselineSlotSchema.index({ beneficiaryId: 1, state: 1 });
measureBaselineSlotSchema.index({ branchId: 1, state: 1, scheduledDueDate: 1 });

// ─── Invariants (Wave-18) ──────────────────────────────────────────

measureBaselineSlotSchema.pre('validate', function () {
  const s = this.state;

  if (s === BASELINE_STATES.BASELINE_COMPLETED) {
    if (!this.baselineApplicationId) {
      throw new Error(
        `MeasureBaselineSlot: baselineApplicationId required when state=BASELINE_COMPLETED`
      );
    }
    if (!this.completedAt) {
      throw new Error(`MeasureBaselineSlot: completedAt required when state=BASELINE_COMPLETED`);
    }
  }

  if (s === BASELINE_STATES.BASELINE_LOCKED) {
    if (!this.baselineApplicationId) {
      throw new Error(
        `MeasureBaselineSlot: baselineApplicationId required when state=BASELINE_LOCKED`
      );
    }
    if (!this.lockedAt || !this.lockedBy) {
      throw new Error(`MeasureBaselineSlot: lockedAt+lockedBy required when state=BASELINE_LOCKED`);
    }
  }

  if (s === BASELINE_STATES.WAIVED) {
    if (!this.waiverType) {
      throw new Error(`MeasureBaselineSlot: waiverType required when state=WAIVED`);
    }
    if (!this.waiverReason || !this.waiverReason.trim()) {
      throw new Error(`MeasureBaselineSlot: waiverReason required when state=WAIVED`);
    }
    if (!this.waiverApprovedBy) {
      throw new Error(`MeasureBaselineSlot: waiverApprovedBy required when state=WAIVED`);
    }
    if (!this.waiverApprovedAt) {
      throw new Error(`MeasureBaselineSlot: waiverApprovedAt required when state=WAIVED`);
    }
  }

  if (s === BASELINE_STATES.CANCELLED) {
    if (!this.cancelledAt) {
      throw new Error(`MeasureBaselineSlot: cancelledAt required when state=CANCELLED`);
    }
    if (!this.cancellationReason || !this.cancellationReason.trim()) {
      throw new Error(`MeasureBaselineSlot: cancellationReason required when state=CANCELLED`);
    }
  }
});

// ─── Statics ───────────────────────────────────────────────────────

measureBaselineSlotSchema.statics.findOpenFor = function ({ beneficiaryId, episodeId, measureId }) {
  return this.findOne({
    beneficiaryId,
    episodeId,
    measureId,
    state: { $in: OPEN_STATES },
  });
};

measureBaselineSlotSchema.statics.listOpenForBeneficiary = function (beneficiaryId) {
  return this.find({
    beneficiaryId,
    state: { $in: OPEN_STATES },
    isDeleted: { $ne: true },
  })
    .sort({ scheduledDueDate: 1, createdAt: 1 })
    .lean();
};

// ── W1117 — publish measure_baseline.completed when a baseline slot is completed ─
measureBaselineSlotSchema.pre('save', function flagMeasureBaselineCompleted() {
  const becameCompleted =
    (this.isNew || this.isModified('state')) && this.state === 'BASELINE_COMPLETED';
  this.$__measureBaselineCompleted = becameCompleted;
});

measureBaselineSlotSchema.post('save', function emitMeasureBaselineCompleted(doc) {
  if (!doc.$__measureBaselineCompleted) return;
  try {
    const { integrationBus } = require('../../../integration/systemIntegrationBus');
    integrationBus.publish('measure-baseline', 'measure_baseline.completed', {
      slotId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      ...(doc.episodeId ? { episodeId: String(doc.episodeId) } : {}),
      ...(doc.measureCode ? { measureCode: doc.measureCode } : {}),
      ...(doc.measureId ? { measureId: String(doc.measureId) } : {}),
      ...(doc.baselineApplicationId
        ? { baselineApplicationId: String(doc.baselineApplicationId) }
        : {}),
      completedAt: doc.completedAt || new Date(),
    });
  } catch (_err) {
    /* never block the save on a bus failure */
  }
});

const MeasureBaselineSlot =
  mongoose.models.MeasureBaselineSlot ||
  mongoose.model('MeasureBaselineSlot', measureBaselineSlotSchema);

module.exports = {
  MeasureBaselineSlot,
  measureBaselineSlotSchema,
  BASELINE_STATES,
  WAIVER_TYPES,
  OPEN_STATES,
  TERMINAL_STATES,
};
