'use strict';

/**
 * UniversalCode — single catalog of every scannable code in the system.
 *
 * Format: `RH-<TYPE>-<6CHARS>` where:
 *   - `RH`     organisation prefix (Al-Awael)
 *   - `<TYPE>` 3-letter entity code (BNF, EMP, INV, AST, DOC, SES, APT, VEH, ITM)
 *   - `<6CHARS>` Crockford-base32 short ID derived from the mongo `_id`
 *
 * The same code can be rendered as a QR (default, denser) OR a Code-128
 * linear barcode for legacy/handheld scanners. The model stores only the
 * STRING; rendering is on-demand via `services/universalCode/render.js`.
 *
 * Why a catalog (vs. computing on the fly):
 *   1. Scan-count + last-scanned-at audit trail.
 *   2. Soft-revocation: a stale badge can be marked `revoked` without
 *      losing the link to the entity.
 *   3. Fast resolve: one `findOne({ code })` lookup, vs. brute-force
 *      across N collections.
 */

const mongoose = require('mongoose');

const ENTITY_TYPES = {
  BNF: { label: 'Beneficiary', collection: 'beneficiaries' },
  EMP: { label: 'Employee', collection: 'employees' },
  INV: { label: 'Invoice', collection: 'invoices' },
  AST: { label: 'FixedAsset', collection: 'fixedassets' },
  DOC: { label: 'Document', collection: 'documents' },
  SES: { label: 'Session', collection: 'therapysessions' },
  APT: { label: 'Appointment', collection: 'appointments' },
  VEH: { label: 'Vehicle', collection: 'vehicles' },
  ITM: { label: 'InventoryItem', collection: 'inventoryitems' },
};

const universalCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    entityType: {
      type: String,
      required: true,
      enum: Object.keys(ENTITY_TYPES),
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityLabel: { type: String, default: null }, // cached display name for fast scan responses
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    scanCount: { type: Number, default: 0 },
    lastScannedAt: { type: Date, default: null },
    lastScannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'universal_codes' }
);

universalCodeSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

universalCodeSchema.statics.ENTITY_TYPES = ENTITY_TYPES;

const UniversalCode =
  mongoose.models.UniversalCode || mongoose.model('UniversalCode', universalCodeSchema);

module.exports = UniversalCode;
module.exports.ENTITY_TYPES = ENTITY_TYPES;
