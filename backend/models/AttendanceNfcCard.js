'use strict';

/**
 * AttendanceNfcCard — Wave 125.
 *
 * Physical NFC/RFID card issued to an employee. The card's UID (the
 * hardware UID burnt into the chip) is the read-only key the reader
 * sends to the server.
 *
 * Lifecycle states:
 *   active     — usable
 *   suspended  — temporarily blocked (HR/security)
 *   lost       — reported lost, must NOT accept taps
 *   replaced   — superseded by a newer card (chain via supersededByCardId)
 *   deactivated — final terminal state (employee left)
 *
 * Wave-18 invariants:
 *   • cardUid required + unique (no two records share a UID across time
 *     — we keep all historical bindings; the UID is constant for the
 *     life of the chip)
 *   • employeeId required (a card is always tied to one employee at
 *     a time; reassignment = new record after deactivating old)
 *   • Only ONE active binding per cardUid at any time (enforced via
 *     a partial unique index on { cardUid, status:'active' })
 */

const mongoose = require('mongoose');

const CARD_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  LOST: 'lost',
  REPLACED: 'replaced',
  DEACTIVATED: 'deactivated',
});
const CARD_STATUSES = Object.values(CARD_STATUS);

const AttendanceNfcCardSchema = new mongoose.Schema(
  {
    cardUid: { type: String, required: true, maxlength: 64, index: true },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    issuedAt: { type: Date, required: true, default: Date.now },
    issuedByActorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    status: {
      type: String,
      enum: CARD_STATUSES,
      default: CARD_STATUS.ACTIVE,
      index: true,
    },
    statusChangedAt: { type: Date, default: null },
    statusReason: { type: String, default: null, maxlength: 300 },

    // For audit chain — when a card is replaced, the new record
    // points back to the old one.
    supersededByCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceNfcCard',
      default: null,
    },

    // Branch this card was issued at (operational tracking; not auth).
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

    // Optional human label (e.g. "blue lanyard #042").
    label: { type: String, default: null, maxlength: 100 },
  },
  { timestamps: true, collection: 'attendance_nfc_cards' }
);

// Only one ACTIVE binding per UID at a time.
AttendanceNfcCardSchema.index(
  { cardUid: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

AttendanceNfcCardSchema.index({ employeeId: 1, status: 1 });

AttendanceNfcCardSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceNfcCardSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.cardUid) {
    this.invalidate('cardUid', 'required');
    ok = false;
  }
  if (!this.employeeId) {
    this.invalidate('employeeId', 'required');
    ok = false;
  }
  if (this.status && !CARD_STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${CARD_STATUSES.join(',')}`);
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceNfcCard || mongoose.model('AttendanceNfcCard', AttendanceNfcCardSchema);

module.exports.AttendanceNfcCardSchema = AttendanceNfcCardSchema;
module.exports.CARD_STATUS = CARD_STATUS;
module.exports.CARD_STATUSES = CARD_STATUSES;
