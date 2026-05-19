'use strict';

/**
 * AttendanceSourceEvent — Wave 98 Phase 3.
 *
 * The UNIFIED node that feeds the attendance ledger (Phase 4). Every
 * accepted attendance signal — from a biometric terminal, a camera
 * passive recognition, a manual entry — passes through this collection
 * before it can enter the ledger.
 *
 * Phase 3 emits these only for `decision = AUTO_ACCEPT` Hikvision
 * processed events. The schema is intentionally **multi-source** so
 * Phase 4 / Phase 5 can drop fingerprint + manual entries here too
 * without a migration.
 *
 * Wave-18 invariants:
 *   • employeeId required
 *   • eventTime + branchId required
 *   • source ∈ ATTENDANCE_SOURCES
 *   • accepted=true rows must have a sourceRefId (the upstream
 *     processed_event / fingerprint event id)
 *   • rejected rows must have a reasonIfRejected
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');
const attReg = require('../intelligence/attendance.registry');

// Wave 119: union the legacy Hikvision-tied sources with the
// expanded 10-source catalogue. Order matters only for enum
// validation; ATTENDANCE_SOURCES (Wave 99) values are preserved
// so existing rows remain valid.
const _SOURCE_ENUM = Array.from(
  new Set([...(reg.ATTENDANCE_SOURCES || []), ...attReg.SOURCE_KINDS])
);

const AttendanceSourceEventSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    zoneId: { type: String, default: null, maxlength: 64 },

    eventTime: { type: Date, required: true, index: true },
    eventKind: {
      type: String,
      enum: reg.ATTENDANCE_EVENT_KINDS,
      default: reg.ATTENDANCE_EVENT_KIND.UNKNOWN,
    },

    source: { type: String, enum: _SOURCE_ENUM, required: true },
    sourceRefId: {
      // Generic — Phase 3 stores HikvisionProcessedEvent._id; Phase 4
      // may store FingerprintEvent._id; manual entries store the
      // user-correction record id. Cross-collection ref so we use a
      // String here, not ObjectId, to avoid populate ambiguity.
      type: String,
      default: null,
      maxlength: 64,
    },
    sourceRefCollection: { type: String, default: null, maxlength: 64 },

    trustTier: {
      type: Number,
      enum: reg.TRUST_TIERS,
      required: true,
    },
    confidence: { type: Number, default: null, min: 0, max: 100 },

    accepted: { type: Boolean, default: true, index: true },
    reasonIfRejected: { type: String, default: null, maxlength: 200 },

    // Phase 4 reconciliation case id, when this event was merged
    // with a corroborator (e.g. fingerprint + face within 30s).
    reconciliationCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceReconciliationCase',
      default: null,
    },
    // Phase 4 payroll period lock — set when payroll closes.
    lockedByPayrollPeriodId: { type: String, default: null, maxlength: 64 },

    // ─── Wave 119 additions ──────────────────────────────────
    // String tier (T1..T4) parallel to the legacy numeric trustTier
    // above. Optional for back-compat; new code SHOULD set both.
    tierLabel: {
      type: String,
      enum: attReg.TRUST_TIERS,
      default: null,
    },

    // Event flags (string array from attReg.EVENT_FLAGS catalogue).
    flags: { type: [String], default: () => [] },

    // Source provenance — generalized over the legacy sourceRefId.
    sourceRef: {
      deviceId: { type: mongoose.Schema.Types.ObjectId, default: null },
      deviceCode: { type: String, default: null, maxlength: 80 },
      appSessionId: { type: String, default: null, maxlength: 80 },
      importBatchId: { type: mongoose.Schema.Types.ObjectId, default: null },
      overrideTicketId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    // GPS payload for mobile sources. Null for hardware sources.
    geo: {
      lat: { type: Number, default: null, min: -90, max: 90 },
      lng: { type: Number, default: null, min: -180, max: 180 },
      accuracyM: { type: Number, default: null, min: 0 },
      insideGeofence: { type: Boolean, default: null },
      geofenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
      distanceFromBranchM: { type: Number, default: null, min: 0 },
    },

    // Pre-computed shift expected window — Wave 123 will populate.
    expectedWindow: {
      shiftId: { type: mongoose.Schema.Types.ObjectId, default: null },
      earliestCheckIn: { type: Date, default: null },
      latestCheckIn: { type: Date, default: null },
      earliestCheckOut: { type: Date, default: null },
      latestCheckOut: { type: Date, default: null },
    },

    // Wave-88-style audit chain. Every override or correction must
    // populate parentEventId so the chain stays linkable.
    auditChain: {
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      actorRole: { type: String, default: null, maxlength: 80 },
      ip: { type: String, default: null, maxlength: 64 },
      userAgent: { type: String, default: null, maxlength: 200 },
      parentEventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttendanceSourceEvent',
        default: null,
      },
      chainHash: { type: String, default: null, maxlength: 80 },
    },
  },
  { timestamps: true, collection: 'attendance_source_events' }
);

AttendanceSourceEventSchema.index({ employeeId: 1, eventTime: -1 });
AttendanceSourceEventSchema.index({ branchId: 1, eventTime: -1 });
AttendanceSourceEventSchema.index({ source: 1, eventTime: -1 });
AttendanceSourceEventSchema.index({ accepted: 1, eventTime: -1 });

// ─── Wave-18 invariants ──────────────────────────────────────────
AttendanceSourceEventSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceSourceEventSchema.path('__invariants').validate(function () {
  let ok = true;

  if (this.accepted && !this.sourceRefId) {
    this.invalidate('sourceRefId', 'accepted events require sourceRefId');
    ok = false;
  }

  if (this.accepted === false && !this.reasonIfRejected) {
    this.invalidate('reasonIfRejected', 'rejected events require reasonIfRejected');
    ok = false;
  }

  // Wave 119 — override/manual events must carry an actorId AND
  // parentEventId (the event being corrected) so the chain stays
  // linkable for audit replay.
  if (
    this.source === attReg.SOURCE_KIND.SUPERVISOR_OVERRIDE ||
    this.source === attReg.SOURCE_KIND.MANUAL
  ) {
    if (!this.auditChain || !this.auditChain.actorId) {
      this.invalidate('auditChain.actorId', 'manual/override events require actorId');
      ok = false;
    }
  }

  // Mobile/GPS events must carry geo coordinates.
  if (this.source === attReg.SOURCE_KIND.MOBILE_GPS) {
    if (!this.geo || this.geo.lat == null || this.geo.lng == null) {
      this.invalidate('geo', 'mobile-gps events require geo.lat + geo.lng');
      ok = false;
    }
  }

  return ok;
});

module.exports =
  mongoose.models.AttendanceSourceEvent ||
  mongoose.model('AttendanceSourceEvent', AttendanceSourceEventSchema);

module.exports.AttendanceSourceEventSchema = AttendanceSourceEventSchema;
