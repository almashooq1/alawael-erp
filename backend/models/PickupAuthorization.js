'use strict';

/**
 * PickupAuthorization — Wave 196b.
 *
 * "تصاريح استلام المستفيد" — formal authorization for someone other than
 * the primary guardian to pick up a beneficiary from a day-rehab center.
 *
 * Workflow:
 *   1. Parent (or admin on parent's behalf) creates a request specifying
 *      who is authorized, for what date range, with their national ID.
 *   2. Parent signs the request (status='signed'). Phase 1: simple
 *      attestation. Phase 2: Nafath e-signature via the existing
 *      services/nafathSigningService.js — nafathRequestId field is the
 *      hook point.
 *   3. At pickup, staff verifies the authorized person's national ID
 *      matches the record, records usedAt + usedBy.
 *
 * Wave-18 invariants:
 *   • validFrom < validUntil
 *   • status='signed' → signedByParentAt required
 *   • status='used' → usedAt + usedBy + signedByParentAt all required
 *   • Same authorization cannot be used twice (used → status='used' is terminal)
 */

const mongoose = require('mongoose');

const STATUSES = ['requested', 'signed', 'used', 'expired', 'revoked'];

const PickupAuthorizationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    // Authorized pickup person (NOT the primary guardian)
    pickupPersonName: { type: String, required: true, maxlength: 100 },
    pickupPersonRelationship: { type: String, required: true, maxlength: 50 },
    pickupPersonNationalId: { type: String, required: true, maxlength: 20, index: true },
    pickupPersonPhone: { type: String, default: '', maxlength: 20 },

    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },

    // Signature (Phase 1: parent self-attests; Phase 2: Nafath)
    signedByParentAt: { type: Date, default: null },
    signedByParentName: { type: String, default: '', maxlength: 100 },
    nafathRequestId: { type: String, default: null, index: true }, // Phase 2 hook

    // Use record
    usedAt: { type: Date, default: null },
    usedByName: { type: String, default: '', maxlength: 100 },
    usedByRole: { type: String, default: '', maxlength: 50 },
    nationalIdVerified: { type: Boolean, default: false },

    status: { type: String, enum: STATUSES, default: 'requested', index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '', maxlength: 300 },

    notes: { type: String, default: '', maxlength: 500 },
    createdByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'pickup_authorizations' }
);

PickupAuthorizationSchema.index({ beneficiaryId: 1, status: 1, validUntil: -1 });
PickupAuthorizationSchema.index({ status: 1, validUntil: 1 });

PickupAuthorizationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

PickupAuthorizationSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.validFrom && this.validUntil && this.validFrom >= this.validUntil) {
    this.invalidate('validUntil', 'must be after validFrom');
    ok = false;
  }
  if (this.status === 'signed' && !this.signedByParentAt) {
    this.invalidate('signedByParentAt', 'required when status=signed');
    ok = false;
  }
  if (this.status === 'used') {
    if (!this.signedByParentAt) {
      this.invalidate('signedByParentAt', 'authorization must be signed before use');
      ok = false;
    }
    if (!this.usedAt) {
      this.invalidate('usedAt', 'required when status=used');
      ok = false;
    }
    if (!this.usedByName) {
      this.invalidate('usedByName', 'staff who handed over required');
      ok = false;
    }
  }
  return ok;
});

// W1092 — unified-core linkage: emit when a pickup authorization is created
// for the beneficiary (a non-guardian gains the right to collect them).
PickupAuthorizationSchema.pre('save', function flagPickupAuthorizationRequested() {
  this.$__pickupAuthorizationRequested = this.isNew;
});

PickupAuthorizationSchema.post('save', function emitPickupAuthorizationRequested(doc) {
  if (!doc.$__pickupAuthorizationRequested) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('pickup-authorization', 'pickup_authorization.requested', {
      authorizationId: String(doc._id),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      pickupPersonName: doc.pickupPersonName,
      pickupPersonRelationship: doc.pickupPersonRelationship,
      validFrom: doc.validFrom,
      validUntil: doc.validUntil,
    });
  } catch (_e) {
    /* bus optional — never block the write */
  }
});

module.exports =
  mongoose.models.PickupAuthorization ||
  mongoose.model('PickupAuthorization', PickupAuthorizationSchema);

module.exports.STATUSES = STATUSES;
