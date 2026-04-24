'use strict';

/**
 * HomeVisit.model.js — Phase 17 Commit 3 (4.0.85).
 *
 * One document per home visit. Optionally linked to a SocialCase
 * (pre-case scouting is supported). Captures:
 *
 *   • scheduling + actual timestamps
 *   • worker + accompanying staff
 *   • GPS trace (single arrival point; a future commit can add
 *     route polyline)
 *   • photos
 *   • per-domain structured observations + concern levels
 *   • action items with priority + status
 *   • visit summary + outcome
 *   • follow-up SLA backlink
 *
 * Auto-numbered `HV-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const {
  VISIT_TYPES,
  VISIT_STATUSES,
  OBSERVATION_DOMAIN_CODES,
  OBSERVATION_CONCERN_LEVELS,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
  CANCELLATION_REASONS,
} = require('../../config/care/homeVisit.registry');

// ── sub-schemas ─────────────────────────────────────────────────────

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const coordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: null }, // meters
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: null },
    capturedAt: { type: Date, default: Date.now },
    coordinates: { type: coordinatesSchema, default: null },
  },
  { _id: true }
);

const observationSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: OBSERVATION_DOMAIN_CODES, required: true },
    concernLevel: {
      type: String,
      enum: OBSERVATION_CONCERN_LEVELS,
      default: 'none',
    },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const actionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    priority: { type: String, enum: ACTION_ITEM_PRIORITIES, default: 'medium' },
    assignedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ACTION_ITEM_STATUSES, default: 'pending' },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    outcome: { type: String, default: null },
  },
  { _id: true }
);

const accompanyingStaffSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nameSnapshot: { type: String, required: true },
    role: { type: String, default: null }, // e.g., 'psychologist', 'nurse', 'driver'
  },
  { _id: false }
);

// ── main schema ────────────────────────────────────────────────────

const homeVisitSchema = new mongoose.Schema(
  {
    visitNumber: { type: String, required: true, unique: true, uppercase: true },

    // ── linkage ────────────────────────────────────────────────
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialCase',
      default: null,
      index: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // ── classification ─────────────────────────────────────────
    visitType: { type: String, enum: VISIT_TYPES, required: true, index: true },

    // ── scheduling ─────────────────────────────────────────────
    scheduledFor: { type: Date, required: true, index: true },
    scheduledDurationMinutes: { type: Number, default: 60, min: 15 },
    purpose: { type: String, default: null }, // short one-liner
    preVisitNotes: { type: String, default: null }, // briefing for worker

    // ── state ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: VISIT_STATUSES,
      default: 'scheduled',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── actual timestamps ──────────────────────────────────────
    enRouteAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: {
      type: String,
      enum: [...CANCELLATION_REASONS, null],
      default: null,
    },
    cancellationNotes: { type: String, default: null },
    noAnswerNotes: { type: String, default: null },

    // ── reschedule (if applicable) ─────────────────────────────
    rescheduledTo: { type: Date, default: null }, // target date for the replacement visit
    rescheduledToVisitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HomeVisit',
      default: null,
    },
    rescheduledFromVisitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HomeVisit',
      default: null,
    },

    // ── team ────────────────────────────────────────────────────
    assignedWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedWorkerNameSnapshot: { type: String, default: null },
    accompanyingStaff: { type: [accompanyingStaffSchema], default: [] },

    // ── location ────────────────────────────────────────────────
    address: { type: String, default: null },
    arrivalCoordinates: { type: coordinatesSchema, default: null },
    departureCoordinates: { type: coordinatesSchema, default: null },

    // ── visit content ──────────────────────────────────────────
    observations: { type: [observationSchema], default: [] },
    visitSummary: { type: String, default: null }, // required on complete
    overallConcernLevel: {
      type: String,
      enum: OBSERVATION_CONCERN_LEVELS,
      default: 'none',
      index: true,
    },

    photos: { type: [photoSchema], default: [] },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // ── action items (follow-up tasks) ─────────────────────────
    actionItems: { type: [actionItemSchema], default: [] },

    // ── SLA ──────────────────────────────────────────────────────
    followupSlaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLA',
      default: null,
      index: true,
    },

    // ── misc ────────────────────────────────────────────────────
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_home_visits' }
);

// ── indexes ────────────────────────────────────────────────────────

homeVisitSchema.index({ assignedWorkerId: 1, status: 1, scheduledFor: 1 });
homeVisitSchema.index({ caseId: 1, scheduledFor: -1 });
homeVisitSchema.index({ branchId: 1, scheduledFor: -1 });
homeVisitSchema.index({ status: 1, scheduledFor: 1 });

// ── auto-numbering HV-YYYY-NNNNN ───────────────────────────────────

homeVisitSchema.pre('validate', async function () {
  if (this.visitNumber) return;
  const year = (this.scheduledFor || new Date()).getUTCFullYear();
  const Model = mongoose.model('HomeVisit');
  const count = await Model.countDocuments({
    visitNumber: { $regex: `^HV-${year}-` },
  });
  this.visitNumber = `HV-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ───────────────────────────────────────────────────────

homeVisitSchema.virtual('isTerminal').get(function () {
  return ['completed', 'cancelled', 'no_answer', 'rescheduled'].includes(this.status);
});

homeVisitSchema.virtual('openActionItemsCount').get(function () {
  return (this.actionItems || []).filter(i => ['pending', 'in_progress'].includes(i.status)).length;
});

homeVisitSchema.virtual('durationMinutes').get(function () {
  if (!this.arrivedAt || !this.completedAt) return null;
  return Math.round((this.completedAt.getTime() - this.arrivedAt.getTime()) / 60000);
});

homeVisitSchema.virtual('hasCriticalConcern').get(function () {
  return (
    this.overallConcernLevel === 'critical' ||
    this.overallConcernLevel === 'high' ||
    (this.observations || []).some(o => o.concernLevel === 'critical' || o.concernLevel === 'high')
  );
});

homeVisitSchema.set('toJSON', { virtuals: true });
homeVisitSchema.set('toObject', { virtuals: true });

const HomeVisit = mongoose.models.HomeVisit || mongoose.model('HomeVisit', homeVisitSchema);

module.exports = HomeVisit;
