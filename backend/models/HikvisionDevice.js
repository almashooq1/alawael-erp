'use strict';

/**
 * HikvisionDevice — Wave 96 Phase 1.
 *
 * Canonical record for every Hikvision device (terminal / camera / NVR)
 * known to the platform. Phase 1 covers the registry layer; events
 * (Phase 1), face library (Phase 2), and attendance integration
 * (Phase 4) join via deviceId.
 *
 * Cross-field invariants use the Wave-18 virtual-path validator
 * pattern (synchronous `path.validate` on `__invariants`).
 *
 * Indexes:
 *   • (deviceCode)     — unique
 *   • (branchId, kind) — branch dashboards
 *   • (status)         — health monitor sweep
 *   • (retiredAt)      — sparse, for soft-delete filter
 *
 * Branch scope: a device belongs to exactly one branch. Camera channels
 * (HikvisionCameraChannel) may carry their own zoneId override but the
 * branch is fixed by the parent device.
 *
 * Credentials: only `credentialsRef` (a pointer to the secrets store)
 * is stored here — never the raw password. Rotation is operator-driven
 * and writes a new ref + AuditLog entry.
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionDeviceSchema = new mongoose.Schema(
  {
    deviceCode: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
      index: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: reg.DEVICE_KINDS,
      required: true,
    },
    model: { type: String, default: null, maxlength: 100 },
    firmwareVersion: { type: String, default: null, maxlength: 50 },
    serialNumber: { type: String, default: null, maxlength: 100 },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    zoneId: { type: String, default: null, maxlength: 64 },

    ip: { type: String, required: true, maxlength: 45 }, // IPv4 (Phase 1) or IPv6
    port: { type: Number, default: 80, min: 1, max: 65535 },
    protocol: {
      type: String,
      enum: ['isapi', 'sdk'],
      default: 'isapi',
    },
    authMode: {
      type: String,
      enum: ['digest', 'basic', 'token'],
      default: 'digest',
    },
    credentialsRef: { type: String, default: null, maxlength: 200 },

    capabilities: {
      type: [{ type: String, enum: reg.CAPABILITIES }],
      default: () => [],
    },

    enrollmentRole: {
      type: String,
      enum: reg.ENROLLMENT_ROLES,
      default: reg.ENROLLMENT_ROLE.PRIMARY,
    },

    status: {
      type: String,
      enum: reg.DEVICE_STATUSES,
      default: reg.DEVICE_STATUS.PROVISIONING,
      index: true,
    },

    lastHeartbeatAt: { type: Date, default: null },
    timeOffsetMs: { type: Number, default: 0 },

    notes: { type: String, default: null, maxlength: 1000 },

    retiredAt: { type: Date, default: null, index: true, sparse: true },
    retiredReason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true, collection: 'hikvision_devices' }
);

HikvisionDeviceSchema.index({ branchId: 1, kind: 1 });
HikvisionDeviceSchema.index({ status: 1, lastHeartbeatAt: -1 });

// ─── Cross-field invariants (Wave-18 virtual-path pattern) ───────
HikvisionDeviceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionDeviceSchema.path('__invariants').validate(function () {
  let ok = true;

  // Terminals must declare at least one identifying capability (face,
  // fingerprint, or card) — otherwise they can't verify anyone.
  if (this.kind === reg.DEVICE_KIND.TERMINAL) {
    const ids = new Set([reg.CAPABILITY.FACE, reg.CAPABILITY.FINGERPRINT, reg.CAPABILITY.CARD]);
    const has = Array.isArray(this.capabilities) && this.capabilities.some(c => ids.has(c));
    if (!has) {
      this.invalidate(
        'capabilities',
        'terminal devices require at least one of [face, fingerprint, card]'
      );
      ok = false;
    }
  }

  // Cameras must declare face capability if they're enrolled as
  // primary or secondary (i.e. participating in attendance).
  if (
    this.kind === reg.DEVICE_KIND.CAMERA &&
    this.enrollmentRole !== reg.ENROLLMENT_ROLE.SURVEILLANCE_ONLY
  ) {
    if (!Array.isArray(this.capabilities) || !this.capabilities.includes(reg.CAPABILITY.FACE)) {
      this.invalidate(
        'capabilities',
        'attendance-participating cameras require the "face" capability'
      );
      ok = false;
    }
  }

  // NVRs are surveillance-only by definition.
  if (
    this.kind === reg.DEVICE_KIND.NVR &&
    this.enrollmentRole !== reg.ENROLLMENT_ROLE.SURVEILLANCE_ONLY
  ) {
    this.invalidate('enrollmentRole', 'NVR devices must be enrolled as "surveillance-only"');
    ok = false;
  }

  // IPv4 sanity (cheap guard; Phase 1 scope). Skip if it looks like
  // IPv6 (contains ':').
  if (this.ip && !this.ip.includes(':') && !reg.isValidIPv4(this.ip)) {
    this.invalidate('ip', 'ip must be a valid IPv4 address');
    ok = false;
  }

  // Retired devices keep a reason — silent retirement breaks audit.
  if (this.retiredAt && !this.retiredReason) {
    this.invalidate('retiredReason', 'retiredAt set without retiredReason');
    ok = false;
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionDevice || mongoose.model('HikvisionDevice', HikvisionDeviceSchema);

module.exports.HikvisionDeviceSchema = HikvisionDeviceSchema;
