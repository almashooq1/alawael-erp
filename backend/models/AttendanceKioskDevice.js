'use strict';

/**
 * AttendanceKioskDevice — Wave 124.
 *
 * Registered kiosk hardware (tablet at branch reception, dedicated
 * terminal, etc.). Each device has:
 *   - a permanent deviceId (alphanumeric handle the kiosk app sends)
 *   - a secret used to HMAC the QR token for THIS branch (rotated
 *     by Security via a perm-gated route — out of scope here)
 *   - a list of allowed event kinds (check-in/check-out usually both)
 *   - active hours so a kiosk in a clinic-only-open-9to5 branch
 *     refuses submissions at 3am
 *
 * Wave-18 invariants:
 *   • deviceId required + unique per (branchId, deviceId)
 *   • secretHash required (the cleartext secret is never stored)
 *   • allowedKinds ⊆ {check-in, check-out}
 *
 * The kiosk app authenticates each submission with both the device
 * credential AND the rotating QR token a user scanned. That way a
 * compromised device alone can't fabricate events on behalf of users.
 */

const mongoose = require('mongoose');

const ALLOWED_KINDS = ['check-in', 'check-out'];

const ActiveHoursSchema = new mongoose.Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    startMin: { type: Number, min: 0, max: 24 * 60, required: true },
    endMin: { type: Number, min: 0, max: 24 * 60, required: true },
  },
  { _id: false }
);

const AttendanceKioskDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, required: true, maxlength: 200 },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    // sha256 of the cleartext secret. Cleartext is shown to operator
    // once at issue time, then never again — rotating issues a new
    // cleartext. Hashing prevents read-from-db spoofing.
    secretHash: { type: String, required: true, maxlength: 128 },

    allowedKinds: {
      type: [{ type: String, enum: ALLOWED_KINDS }],
      default: () => ['check-in', 'check-out'],
    },

    // Restrict to roles that can use this kiosk (else null = any).
    allowedRoles: { type: [{ type: String, maxlength: 60 }], default: () => [] },

    activeHours: { type: [ActiveHoursSchema], default: () => [] },

    active: { type: Boolean, default: true, index: true },
    pinRequired: { type: Boolean, default: true },
    photoRequired: { type: Boolean, default: false },

    lastSeenAt: { type: Date, default: null },
    lastIp: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true, collection: 'attendance_kiosk_devices' }
);

AttendanceKioskDeviceSchema.index({ branchId: 1, deviceId: 1 }, { unique: true });

AttendanceKioskDeviceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceKioskDeviceSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.deviceId) {
    this.invalidate('deviceId', 'required');
    ok = false;
  }
  if (!this.secretHash) {
    this.invalidate('secretHash', 'required');
    ok = false;
  }
  if (!this.branchId) {
    this.invalidate('branchId', 'required');
    ok = false;
  }
  const kinds = Array.isArray(this.allowedKinds) ? this.allowedKinds : [];
  for (const k of kinds) {
    if (!ALLOWED_KINDS.includes(k)) {
      this.invalidate('allowedKinds', `${k} not in ${ALLOWED_KINDS.join(',')}`);
      ok = false;
    }
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceKioskDevice ||
  mongoose.model('AttendanceKioskDevice', AttendanceKioskDeviceSchema);

module.exports.AttendanceKioskDeviceSchema = AttendanceKioskDeviceSchema;
module.exports.ALLOWED_KINDS = ALLOWED_KINDS;
