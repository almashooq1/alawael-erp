'use strict';

/**
 * UploadedFile — Wave 207b.
 *
 * Tracks files uploaded to the platform. Phase 1 uses local disk
 * (backend/uploads/<purpose>/<yyyy-mm-dd>/<uuid>.<ext>). Phase 2
 * can swap to S3 by changing only the storage layer in
 * services/fileStorageService.js — the model is storage-agnostic
 * (`storagePath` is opaque).
 *
 * Consumers (Portfolio, Disability Cards, Field Trip docs, etc.)
 * reference uploaded files by `_id` or by the returned `accessUrl`.
 * The `purpose` field scopes the file to a module for cleanup +
 * cross-link queries.
 */

const mongoose = require('mongoose');

const PURPOSES = [
  'portfolio',
  'disability_card_scan',
  'trip_doc',
  'pickup_auth_doc',
  'iep_signed_pdf',
  'rs_evidence',
  'meal_menu',
  'other',
];

const STATUSES = ['active', 'soft_deleted'];

const UploadedFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, maxlength: 200 }, // stored name
    originalName: { type: String, required: true, maxlength: 300 }, // client-side
    mimeType: { type: String, required: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true, min: 0 },

    purpose: { type: String, enum: PURPOSES, required: true, index: true },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    refModel: { type: String, default: '', maxlength: 50 }, // e.g. 'BeneficiaryPortfolioItem'
    refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // back-reference

    storagePath: { type: String, required: true, maxlength: 500 }, // local OR s3://...
    storageProvider: { type: String, default: 'local', enum: ['local', 's3'] },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByName: { type: String, default: '', maxlength: 100 },

    status: { type: String, enum: STATUSES, default: 'active', index: true },
    deletedAt: { type: Date, default: null },

    // Optional rich metadata (alt text, EXIF, etc.)
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: 'uploaded_files' }
);

UploadedFileSchema.index({ purpose: 1, createdAt: -1 });
UploadedFileSchema.index({ beneficiaryId: 1, purpose: 1, createdAt: -1 });
UploadedFileSchema.index({ refModel: 1, refId: 1 });

UploadedFileSchema.virtual('accessUrl').get(function () {
  return `/api/v1/files/${this._id}/download`;
});

UploadedFileSchema.set('toJSON', { virtuals: true });
UploadedFileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.UploadedFile || mongoose.model('UploadedFile', UploadedFileSchema);

module.exports.PURPOSES = PURPOSES;
module.exports.STATUSES = STATUSES;
