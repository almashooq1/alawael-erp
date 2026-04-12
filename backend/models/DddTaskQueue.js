'use strict';
/**
 * DddTaskQueue Model
 * Auto-extracted from services/dddTaskQueue.js
 */
const { EventEmitter } = require('events');
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    queue: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    payload: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed,

    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    priorityWeight: { type: Number, default: 50 },

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'dead', 'cancelled', 'delayed'],
      default: 'pending',
      index: true,
    },

    /* Retry */
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    retryDelayMs: { type: Number, default: 5000 },
    errors: [{ message: String, stack: String, attemptedAt: Date }],

    /* Scheduling */
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    duration: Number,

    /* Progress */
    progress: { type: Number, default: 0, min: 0, max: 100 },
    progressMessage: String,

    /* Context */
    domain: String,
    userId: { type: mongoose.Schema.Types.ObjectId },
    branchId: { type: mongoose.Schema.Types.ObjectId },
    correlationId: String,

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ queue: 1, status: 1, priorityWeight: -1, createdAt: 1 });
jobSchema.index({ status: 1, scheduledAt: 1 });
jobSchema.index({ type: 1, status: 1 });
jobSchema.index({ correlationId: 1 });

const DDDJob = mongoose.models.DDDJob || mongoose.model('DDDJob', jobSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Queue Configuration
   ═══════════════════════════════════════════════════════════════════════ */
const PRIORITY_WEIGHTS = { critical: 100, high: 75, normal: 50, low: 25 };

const QUEUE_DEFINITIONS = [
  { name: 'clinical', concurrency: 5, description: 'Clinical data processing' },
  { name: 'reports', concurrency: 2, description: 'Report generation' },
  { name: 'notifications', concurrency: 10, description: 'Notification dispatch' },
  { name: 'exports', concurrency: 2, description: 'Data export jobs' },
  { name: 'analytics', concurrency: 3, description: 'Analytics pipelines' },
  { name: 'migrations', concurrency: 1, description: 'Data migrations' },
  { name: 'webhooks', concurrency: 5, description: 'Webhook delivery' },
  { name: 'maintenance', concurrency: 1, description: 'System maintenance' },
  { name: 'ai', concurrency: 2, description: 'AI/ML processing' },
  { name: 'sync', concurrency: 3, description: 'Data synchronization' },
];

const JOB_TYPES = [
  'generate-report',
  'send-notification',
  'export-data',
  'run-analytics',
  'process-assessment',
  'calculate-risk',
  'sync-fhir',
  'deliver-webhook',
  'run-migration',
  'cleanup-data',
  'train-model',
  'predict-outcome',
  'bulk-update',
  'archive-records',
  'generate-invoice',
  'send-reminder',
];

/* ═══════════════════════════════════════════════════════════════════════
   3. Job Handlers Registry
   ═══════════════════════════════════════════════════════════════════════ */
const handlers = new Map();
const queueBus = new EventEmitter();
queueBus.setMaxListeners(50);

module.exports = {
  DDDJob,
};
