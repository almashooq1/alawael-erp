'use strict';

/**
 * AttendanceNfcReader — Wave 125.
 *
 * Registered NFC/RFID reader hardware (turnstile, door reader,
 * garage gate, etc.). Reader → server submissions are authenticated
 * via sha256(deviceSecret) === secretHash, same pattern as kiosks.
 *
 * One key difference vs kiosks: an NFC reader is typically pinned
 * to a SPECIFIC zone within a branch (e.g. "main-entrance",
 * "garage-gate") so the event includes a zone label for analytics
 * and tailgate detection.
 *
 * Wave-18 invariants:
 *   • readerId required + unique
 *   • branchId required
 *   • secretHash required
 *   • zone required (so we can disambiguate readers within a branch)
 *   • allowedKinds ⊆ {check-in, check-out, passage}
 *     "passage" is a reader that records a transit event but is
 *     ambiguous about in/out (e.g. inner corridor); reconciler
 *     pairs it with the prior in/out direction.
 */

const mongoose = require('mongoose');

const ALLOWED_KINDS = ['check-in', 'check-out', 'passage'];

const AttendanceNfcReaderSchema = new mongoose.Schema(
  {
    readerId: { type: String, required: true, unique: true, maxlength: 100 },
    nameAr: { type: String, required: true, maxlength: 200 },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    zone: { type: String, required: true, maxlength: 80 },

    secretHash: { type: String, required: true, maxlength: 128 },

    allowedKinds: {
      type: [{ type: String, enum: ALLOWED_KINDS }],
      default: () => ['check-in', 'check-out'],
    },

    allowedRoles: { type: [{ type: String, maxlength: 60 }], default: () => [] },

    active: { type: Boolean, default: true, index: true },

    // Tailgate detection (Wave 100 Hikvision integration may
    // accompany this with camera-passive events). The reader-level
    // flag is just a hint that this reader has a camera nearby.
    cameraAdjacent: { type: Boolean, default: false },

    lastSeenAt: { type: Date, default: null },
    lastIp: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true, collection: 'attendance_nfc_readers' }
);

AttendanceNfcReaderSchema.index({ branchId: 1, zone: 1 });

AttendanceNfcReaderSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceNfcReaderSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.readerId) {
    this.invalidate('readerId', 'required');
    ok = false;
  }
  if (!this.branchId) {
    this.invalidate('branchId', 'required');
    ok = false;
  }
  if (!this.zone) {
    this.invalidate('zone', 'required');
    ok = false;
  }
  if (!this.secretHash) {
    this.invalidate('secretHash', 'required');
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
  mongoose.models.AttendanceNfcReader ||
  mongoose.model('AttendanceNfcReader', AttendanceNfcReaderSchema);

module.exports.AttendanceNfcReaderSchema = AttendanceNfcReaderSchema;
module.exports.ALLOWED_KINDS = ALLOWED_KINDS;
