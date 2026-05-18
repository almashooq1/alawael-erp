'use strict';

/**
 * HikvisionProcessedEvent — Wave 98 Phase 3.
 *
 * Normalised form of a `HikvisionRawEvent` after the parser worker:
 *   • channelId / zoneId / branchId resolved from the device registry
 *   • matchedEmployeeId resolved from the face library (Phase 2)
 *   • confidence + antiSpoofResult lifted out of the raw payload
 *   • the gate decision recorded (AUTO_ACCEPT / REVIEW / REJECT /
 *     SUPPRESSED) along with the reason + queue
 *
 * Phase 4 (attendance integration) reads `decision = AUTO_ACCEPT`
 * rows + `attendanceSourceEventId` and pushes them into the ledger.
 *
 * Wave-18 invariants:
 *   • REVIEW rows must have a reviewReason
 *   • REJECT rows must have a reviewReason
 *   • SUPPRESSED rows must have linkedSuppressedFromEventId
 *   • AUTO_ACCEPT rows must have an attendanceSourceEventId OR be
 *     a card/passage kind that doesn't generate one — service layer
 *     enforces the link, schema only checks the reason invariants.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionProcessedEventSchema = new mongoose.Schema(
  {
    rawEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionRawEvent',
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionDevice',
      required: true,
      index: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionCameraChannel',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    zoneId: { type: String, default: null, maxlength: 64 },

    eventKind: {
      type: String,
      enum: reg.RAW_EVENT_KINDS,
      required: true,
    },
    source: {
      type: String,
      enum: reg.ATTENDANCE_SOURCES,
      required: true,
    },

    matchedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    hikvisionPersonId: { type: String, default: null, maxlength: 128 },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionFaceTemplateLink',
      default: null,
    },

    confidence: { type: Number, default: null, min: 0, max: 100 },
    antiSpoofResult: {
      type: String,
      enum: reg.ANTI_SPOOF_RESULTS,
      default: reg.ANTI_SPOOF.UNKNOWN,
    },
    trustTier: { type: Number, enum: reg.TRUST_TIERS, default: reg.TRUST_TIER.TIER_3 },

    capturedAt: { type: Date, required: true, index: true },
    processedAt: { type: Date, required: true, default: Date.now },

    // Gate output
    decision: { type: String, enum: reg.GATE_DECISIONS, required: true, index: true },
    reviewReason: { type: String, enum: reg.REVIEW_REASONS, default: null },
    reviewQueue: { type: String, enum: reg.REVIEW_QUEUES, default: null },
    autoThreshold: { type: Number, default: null, min: 0, max: 101 },
    reviewFloor: { type: Number, default: null, min: 0, max: 100 },

    // Cross-references — populated on side-effect creation
    attendanceSourceEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSourceEvent',
      default: null,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceConfidenceReview',
      default: null,
    },
    // When this event was suppressed as a duplicate of another within
    // the suppression window, point to the kept event.
    linkedSuppressedFromEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionProcessedEvent',
      default: null,
    },

    flags: {
      type: [{ type: String, maxlength: 80 }],
      default: () => [],
    },
  },
  { timestamps: true, collection: 'hikvision_processed_events' }
);

HikvisionProcessedEventSchema.index({ branchId: 1, capturedAt: -1 });
HikvisionProcessedEventSchema.index({ matchedEmployeeId: 1, capturedAt: -1 });
HikvisionProcessedEventSchema.index({ decision: 1, capturedAt: -1 });
HikvisionProcessedEventSchema.index({ reviewQueue: 1, decision: 1, capturedAt: -1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
HikvisionProcessedEventSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionProcessedEventSchema.path('__invariants').validate(function () {
  let ok = true;

  if (
    (this.decision === reg.GATE_DECISION.REVIEW || this.decision === reg.GATE_DECISION.REJECT) &&
    !this.reviewReason
  ) {
    this.invalidate('reviewReason', `${this.decision} decisions require a reviewReason`);
    ok = false;
  }

  if (this.decision === reg.GATE_DECISION.REVIEW && !this.reviewQueue) {
    this.invalidate('reviewQueue', 'review decisions require a reviewQueue');
    ok = false;
  }

  if (this.decision === reg.GATE_DECISION.SUPPRESSED && !this.linkedSuppressedFromEventId) {
    this.invalidate(
      'linkedSuppressedFromEventId',
      'suppressed decisions require linkedSuppressedFromEventId'
    );
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionProcessedEvent ||
  mongoose.model('HikvisionProcessedEvent', HikvisionProcessedEventSchema);

module.exports.HikvisionProcessedEventSchema = HikvisionProcessedEventSchema;
