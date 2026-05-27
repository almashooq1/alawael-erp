'use strict';

/**
 * AttendanceImportBatch — Wave 126.
 *
 * One row per import attempt. Records HMAC-signed payload hash for
 * idempotency (re-uploading the same file is a no-op), plus per-row
 * accept/reject counts and a sample of rejection reasons.
 *
 * Wave-18 invariants:
 *   • sourceId + payloadHash unique together → reposts of the same
 *     file by the same source short-circuit to the existing batch
 *   • status ∈ {accepted, partially-accepted, rejected, processing}
 *
 * TTL: 365 days (compliance — long enough for annual external audits).
 */

const mongoose = require('mongoose');

const TTL_SECONDS = 365 * 24 * 60 * 60;

const STATUS = ['accepted', 'partially-accepted', 'rejected', 'processing'];

const RowRejectionSchema = new mongoose.Schema(
  {
    rowIndex: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 200 },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const AttendanceImportBatchSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, maxlength: 100, index: true },

    // sha256 of the canonical-form serialised rows. Used for
    // idempotent re-uploads — the same batch hash + sourceId never
    // results in duplicates.
    payloadHash: { type: String, required: true, maxlength: 128 },

    submittedAt: { type: Date, required: true, default: Date.now },
    submitterIp: { type: String, default: null, maxlength: 60 },

    totalRows: { type: Number, required: true, min: 0 },
    acceptedRows: { type: Number, default: 0, min: 0 },
    rejectedRows: { type: Number, default: 0, min: 0 },
    duplicateRows: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: STATUS, default: 'processing', index: true },

    // Bounded list of rejection samples (first 50) for operator triage.
    rejectionSamples: {
      type: [RowRejectionSchema],
      default: () => [],
    },

    // Stamps the AttendanceSourceEvent batchRefId so any persisted
    // event can be traced back to the import.
    eventBatchRefId: { type: String, default: null, maxlength: 80 },
  },
  { timestamps: true, collection: 'attendance_import_batches' }
);

AttendanceImportBatchSchema.index({ sourceId: 1, payloadHash: 1 }, { unique: true });
AttendanceImportBatchSchema.index({ submittedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

AttendanceImportBatchSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AttendanceImportBatchSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.sourceId) {
    this.invalidate('sourceId', 'required');
    ok = false;
  }
  if (!this.payloadHash) {
    this.invalidate('payloadHash', 'required');
    ok = false;
  }
  if (!STATUS.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUS.join(',')}`);
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.AttendanceImportBatch ||
  mongoose.model('AttendanceImportBatch', AttendanceImportBatchSchema);

module.exports.AttendanceImportBatchSchema = AttendanceImportBatchSchema;
module.exports.STATUS = STATUS;
module.exports.TTL_SECONDS = TTL_SECONDS;
