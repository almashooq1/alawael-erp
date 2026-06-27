'use strict';

/**
 * BeneficiaryLifecycleBulkJob — Phase D.
 *
 * Persistent queue of bulk lifecycle operations (request / approve / execute).
 * Created synchronously by the bulk HTTP endpoints and processed asynchronously
 * by the beneficiaryLifecycleBulkProcessor.
 */

const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const bulkJobSchema = new mongoose.Schema(
  {
    operation: {
      type: String,
      enum: ['bulk-request', 'bulk-approve', 'bulk-execute'],
      required: true,
      index: true,
    },
    requestedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    branchScope: { type: mongoose.Schema.Types.Mixed, default: null },
    actorSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    items: { type: [mongoose.Schema.Types.Mixed], required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    progress: { type: progressSchema, default: () => ({}) },
    results: { type: [mongoose.Schema.Types.Mixed], default: [] },
    jobErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

bulkJobSchema.index({ status: 1, createdAt: 1 });

module.exports =
  mongoose.models.BeneficiaryLifecycleBulkJob ||
  mongoose.model('BeneficiaryLifecycleBulkJob', bulkJobSchema);
