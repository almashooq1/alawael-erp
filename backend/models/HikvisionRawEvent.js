'use strict';

/**
 * HikvisionRawEvent — Wave 96 Phase 1.
 *
 * Immutable append-only log of every event delivered by a Hikvision
 * device, captured BEFORE any parsing. Phase 3 (recognition) reads
 * pending rows, normalises them into `hikvision_processed_event`, and
 * marks parseStatus accordingly. This split lets us:
 *   • ack the webhook in <500ms (avoid device retries)
 *   • replay parsing if a downstream bug is fixed
 *   • keep raw forensic evidence for 365 days
 *
 * Idempotency:
 *   Unique compound index on (deviceId, externalEventId). Hikvision
 *   devices replay their buffer when reconnecting after a network
 *   blip; without idempotency we'd double-count attendance.
 *
 * Indexes:
 *   • (deviceId, externalEventId)  — unique, idempotency key
 *   • (deviceId, receivedAt DESC)  — per-device chronological reads
 *   • (parseStatus, receivedAt)    — parser worker queue
 *   • (eventKind, receivedAt DESC) — analytics
 *   • (capturedAt)                 — TTL-safe time queries
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionRawEventSchema = new mongoose.Schema(
  {
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
    // Device-assigned event id (used for idempotency). Some devices
    // call this `eventId`, `eventSeq`, or `serialNo`.
    externalEventId: { type: String, required: true, maxlength: 128 },

    eventKind: {
      type: String,
      enum: reg.RAW_EVENT_KINDS,
      default: reg.RAW_EVENT_KIND.UNKNOWN,
      index: true,
    },

    // Wall-clock time from the device. May differ from receivedAt
    // by `timeOffsetMs` recorded against the parent device.
    capturedAt: { type: Date, default: null, index: true },
    receivedAt: { type: Date, required: true, default: Date.now },

    sourceIp: { type: String, default: null, maxlength: 45 },
    requestId: { type: String, default: null, maxlength: 100 },
    signatureVerified: { type: Boolean, default: false },

    // The original ISAPI payload. Mixed because device firmwares vary.
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    parseStatus: {
      type: String,
      enum: reg.PARSE_STATUSES,
      default: reg.PARSE_STATUS.PENDING,
      index: true,
    },
    parseAttempts: { type: Number, default: 0, min: 0 },
    parseError: { type: String, default: null, maxlength: 2000 },
    parsedAt: { type: Date, default: null },

    // Filled by the parser worker (Phase 3) — kept here for replay-able
    // forward references. Phase 1 leaves null.
    processedEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HikvisionProcessedEvent',
      default: null,
    },
  },
  { timestamps: true, collection: 'hikvision_raw_events' }
);

// Idempotency key — same (device, externalEventId) cannot land twice.
HikvisionRawEventSchema.index({ deviceId: 1, externalEventId: 1 }, { unique: true });
HikvisionRawEventSchema.index({ deviceId: 1, receivedAt: -1 });
HikvisionRawEventSchema.index({ parseStatus: 1, receivedAt: 1 });
HikvisionRawEventSchema.index({ eventKind: 1, receivedAt: -1 });

// Append-only contract — block updates that would mutate immutable
// fields after creation. Parsers MAY update parseStatus, parseError,
// parsedAt, parseAttempts, and processedEventId — that's the contract.
const IMMUTABLE_FIELDS = [
  'deviceId',
  'channelId',
  'externalEventId',
  'eventKind',
  'capturedAt',
  'receivedAt',
  'sourceIp',
  'requestId',
  'signatureVerified',
  'rawPayload',
];

HikvisionRawEventSchema.pre('save', function (next) {
  if (this.isNew) return next();
  for (const f of IMMUTABLE_FIELDS) {
    if (this.isModified(f)) {
      const err = new Error(`HikvisionRawEvent: field "${f}" is immutable after creation`);
      err.name = 'ImmutableFieldError';
      return next(err);
    }
  }
  return next();
});

module.exports =
  mongoose.models.HikvisionRawEvent || mongoose.model('HikvisionRawEvent', HikvisionRawEventSchema);

module.exports.HikvisionRawEventSchema = HikvisionRawEventSchema;
module.exports.IMMUTABLE_FIELDS = IMMUTABLE_FIELDS;
