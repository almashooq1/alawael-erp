'use strict';
/**
 * StudentCertificate — شهادات الطلاب/المستفيدين (إصدار + تحقق)
 * ════════════════════════════════════════════════════════════════════════════
 * Issued certificates (completion / attendance / assessment / …) with a public
 * verification code and an issued → revoked lifecycle.
 *
 * WHY THIS EXISTS
 * ---------------
 * `student-certificates.routes.js` was written against the canonical
 * `Document` model, but that model rejects the `issued`/`revoked` status
 * vocabulary and the `certificate` category — so generation threw and stats
 * matched 0 docs. This is the fit-for-purpose model; `Document` is left
 * untouched. A `category` default of `'certificate'` is kept so the route's
 * `{ category: 'certificate' }` filters still match without route changes.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentCertificateSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    category: { type: String, default: 'certificate', index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', index: true },

    certificateType: { type: String, required: true, trim: true, index: true },
    title: { type: String, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },

    status: { type: String, enum: ['issued', 'revoked'], default: 'issued', index: true },

    // Public verification
    verificationCode: { type: String, unique: true, sparse: true },
    fileUrl: { type: String },

    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiryDate: { type: Date },

    // Revocation / soft delete
    revocationReason: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

studentCertificateSchema.index({ branchId: 1, category: 1, status: 1, issuedAt: -1 });
studentCertificateSchema.index({ branchId: 1, beneficiaryId: 1 });

module.exports =
  mongoose.models.StudentCertificate ||
  mongoose.model('StudentCertificate', studentCertificateSchema);
