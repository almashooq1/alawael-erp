'use strict';
/**
 * ElectronicDirective — التوجيهات الإلكترونية والموافقات الرقمية
 * ════════════════════════════════════════════════════════════════════════════
 * Advance-care directives / informed-consent documents that move through an
 * e-signature lifecycle: draft → awaiting_signature → active → revoked.
 *
 * WHY THIS EXISTS
 * ---------------
 * `electronic-directives.routes.js` was written against the canonical
 * `Document` model, but that model rejects the directive status vocabulary
 * (`draft`/`awaiting_signature`/`active`/`revoked`) and the `directive`
 * category — so creates threw and stats matched 0 docs. This is the
 * fit-for-purpose model; `Document` is left untouched. A `category` default of
 * `'directive'` is kept so the route's `{ category: 'directive' }` filters
 * still match without route changes.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const signatureSchema = new Schema(
  {
    signerType: { type: String, enum: ['beneficiary', 'guardian', 'witness', 'staff'] },
    signedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signedAt: { type: Date, default: Date.now },
    signatureData: { type: String },
  },
  { _id: false }
);

const auditEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    reason: { type: String },
    signerType: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const electronicDirectiveSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    category: { type: String, default: 'directive', index: true },
    directiveType: { type: String, trim: true, index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', index: true },

    title: { type: String, required: true, trim: true },
    content: { type: String },
    requiredSigners: { type: [Schema.Types.Mixed], default: [] },

    status: {
      type: String,
      enum: ['draft', 'awaiting_signature', 'active', 'revoked'],
      default: 'draft',
      index: true,
    },
    signatureStatus: {
      type: String,
      enum: ['pending_creation', 'sent', 'signed'],
      default: 'pending_creation',
    },

    // Send-for-signing
    sentForSigningAt: { type: Date },
    sentForSigningBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notifyVia: { type: String, enum: ['email', 'sms', 'whatsapp', 'in_app'], default: 'email' },

    signatures: { type: [signatureSchema], default: [] },

    // Revocation
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revocationReason: { type: String, trim: true },

    // Soft delete + actors
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    auditTrail: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

electronicDirectiveSchema.index({ branchId: 1, category: 1, status: 1, createdAt: -1 });
electronicDirectiveSchema.index({ branchId: 1, beneficiaryId: 1 });

module.exports =
  mongoose.models.ElectronicDirective ||
  mongoose.model('ElectronicDirective', electronicDirectiveSchema);
