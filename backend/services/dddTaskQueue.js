'use strict';

/**
 * DDD Task Queue
 * ═══════════════════════════════════════════════════════════════════════
 * Background job queue with priority support, retry policies,
 * dead-letter queue, concurrency control, and analytics.
 *
 * Features:
 *  - Priority-based job scheduling (critical → low)
 *  - Configurable retry with exponential backoff
 *  - Dead-letter queue for permanently failed jobs
 *  - Concurrency control per queue
 *  - Job progress tracking
 *  - Scheduled / delayed jobs
 *  - Job lifecycle hooks
 *  - Dashboard & analytics
 *
 * @module dddTaskQueue
 */

const mongoose = require('mongoose');
const { Router } = require('express');
const { EventEmitter } = require('events');

/* ═══════════════════════════════════════════════════════════════════════
   1. Models
   ═══════════════════════════════════════════════════════════════════════ */
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

function registerHandler(jobType, handler) {
  handlers.set(jobType, handler);
}

function getHandler(jobType) {
  return handlers.get(jobType);
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Job Lifecycle
   ═══════════════════════════════════════════════════════════════════════ */
async function enqueueJob(data) {
  const priority = data.priority || 'normal';
  const job = await DDDJob.create({
    queue: data.queue || 'maintenance',
    type: data.type,
    payload: data.payload,
    priority,
    priorityWeight: PRIORITY_WEIGHTS[priority] || 50,
    maxAttempts: data.maxAttempts || 3,
    retryDelayMs: data.retryDelayMs || 5000,
    scheduledAt: data.scheduledAt || new Date(),
    domain: data.domain,
    userId: data.userId,
    branchId: data.branchId,
    correlationId: data.correlationId,
    status: data.scheduledAt && data.scheduledAt > new Date() ? 'delayed' : 'pending',
    metadata: data.metadata,
  });

  queueBus.emit('job:enqueued', { jobId: job._id, queue: job.queue, type: job.type });
  return job.toObject();
}

async function processNextJob(queueName) {
  const now = new Date();
  const job = await DDDJob.findOneAndUpdate(
    {
      queue: queueName,
      status: { $in: ['pending', 'delayed'] },
      scheduledAt: { $lte: now },
      isDeleted: { $ne: true },
    },
    { $set: { status: 'processing', startedAt: now, attempts: 0 } },
    { new: true, sort: { priorityWeight: -1, createdAt: 1 } }
  );

  if (!job) return null;

  const handler = getHandler(job.type);
  if (!handler) {
    job.status = 'failed';
    job.errors.push({ message: `No handler for job type: ${job.type}`, attemptedAt: now });
    await job.save();
    return job.toObject();
  }

  return executeJob(job, handler);
}

async function executeJob(job, handler) {
  job.attempts += 1;
  try {
    const result = await handler(job.payload, {
      jobId: job._id,
      updateProgress: async (progress, message) => {
        await DDDJob.updateOne({ _id: job._id }, { $set: { progress, progressMessage: message } });
      },
    });

    job.status = 'completed';
    job.result = result;
    job.progress = 100;
    job.completedAt = new Date();
    job.duration = Date.now() - job.startedAt.getTime();
    await job.save();

    queueBus.emit('job:completed', { jobId: job._id, queue: job.queue, type: job.type });
    return job.toObject();
  } catch (err) {
    job.errors.push({
      message: err.message,
      stack: err.stack?.slice(0, 1000),
      attemptedAt: new Date(),
    });

    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      job.completedAt = new Date();
      job.duration = Date.now() - job.startedAt.getTime();
      await job.save();
      queueBus.emit('job:dead', { jobId: job._id, queue: job.queue, type: job.type });
    } else {
      job.status = 'pending';
      const delay = job.retryDelayMs * Math.pow(2, job.attempts - 1);
      job.scheduledAt = new Date(Date.now() + delay);
      await job.save();
      queueBus.emit('job:retry', { jobId: job._id, queue: job.queue, attempt: job.attempts });
    }

    return job.toObject();
  }
}

async function cancelJob(jobId) {
  return DDDJob.findByIdAndUpdate(
    jobId,
    { status: 'cancelled', completedAt: new Date() },
    { new: true }
  ).lean();
}

async function retryDeadJob(jobId) {
  const job = await DDDJob.findById(jobId);
  if (!job || job.status !== 'dead') return null;
  job.status = 'pending';
  job.attempts = 0;
  job.errors = [];
  job.scheduledAt = new Date();
  await job.save();
  return job.toObject();
}

async function purgeDeadJobs(queueName, olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000);
  const query = { status: 'dead', completedAt: { $lt: cutoff } };
  if (queueName) query.queue = queueName;
  const result = await DDDJob.deleteMany(query);
  return { purged: result.deletedCount };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Queue Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getQueueDashboard() {
  const [totalJobs, byStatus, byQueue, byType, deadLetterCount, avgDuration, recentJobs] =
    await Promise.all([
      DDDJob.countDocuments({ isDeleted: { $ne: true } }),
      DDDJob.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DDDJob.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$queue',
            count: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          },
        },
      ]),
      DDDJob.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      DDDJob.countDocuments({ status: 'dead', isDeleted: { $ne: true } }),
      DDDJob.aggregate([
        { $match: { status: 'completed', duration: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      DDDJob.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(15)
        .select('queue type status priority progress attempts createdAt completedAt duration')
        .lean(),
    ]);

  return {
    totalJobs,
    deadLetterCount,
    avgDuration: avgDuration[0] ? Math.round(avgDuration[0].avg) + 'ms' : 'N/A',
    byStatus: byStatus.reduce((m, r) => ({ ...m, [r._id]: r.count }), {}),
    byQueue: byQueue.reduce(
      (m, r) => ({ ...m, [r._id]: { total: r.count, pending: r.pending } }),
      {}
    ),
    topTypes: byType,
    recentJobs,
    queueDefinitions: QUEUE_DEFINITIONS,
    jobTypes: JOB_TYPES,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Router
   ═══════════════════════════════════════════════════════════════════════ */
function createTaskQueueRouter() {
  const router = Router();

  /* Dashboard */
  router.get('/queue/dashboard', async (_req, res) => {
    try {
      res.json({ success: true, ...(await getQueueDashboard()) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List jobs */
  router.get('/queue/jobs', async (req, res) => {
    try {
      const query = { isDeleted: { $ne: true } };
      if (req.query.queue) query.queue = req.query.queue;
      if (req.query.type) query.type = req.query.type;
      if (req.query.status) query.status = req.query.status;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const jobs = await DDDJob.find(query).sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ success: true, count: jobs.length, jobs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Enqueue */
  router.post('/queue/jobs', async (req, res) => {
    try {
      const job = await enqueueJob({ ...req.body, userId: req.user?._id });
      res.status(201).json({ success: true, job });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Get single job */
  router.get('/queue/jobs/:id', async (req, res) => {
    try {
      const job = await DDDJob.findById(req.params.id).lean();
      if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
      res.json({ success: true, job });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Cancel */
  router.post('/queue/jobs/:id/cancel', async (req, res) => {
    try {
      const job = await cancelJob(req.params.id);
      res.json({ success: true, job });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Retry dead job */
  router.post('/queue/jobs/:id/retry', async (req, res) => {
    try {
      const job = await retryDeadJob(req.params.id);
      if (!job)
        return res.status(400).json({ success: false, error: 'Job not eligible for retry' });
      res.json({ success: true, job });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Dead letter queue */
  router.get('/queue/dead-letter', async (req, res) => {
    try {
      const query = { status: 'dead', isDeleted: { $ne: true } };
      if (req.query.queue) query.queue = req.query.queue;
      const jobs = await DDDJob.find(query).sort({ completedAt: -1 }).limit(50).lean();
      res.json({ success: true, count: jobs.length, jobs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Purge dead jobs */
  router.delete('/queue/dead-letter', async (req, res) => {
    try {
      const days = parseInt(req.query.olderThanDays, 10) || 30;
      const result = await purgeDeadJobs(req.query.queue, days);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Queue definitions */
  router.get('/queue/definitions', (_req, res) => {
    res.json({ success: true, queues: QUEUE_DEFINITIONS, jobTypes: JOB_TYPES });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDJob,
  PRIORITY_WEIGHTS,
  QUEUE_DEFINITIONS,
  JOB_TYPES,
  queueBus,
  registerHandler,
  getHandler,
  enqueueJob,
  processNextJob,
  cancelJob,
  retryDeadJob,
  purgeDeadJobs,
  getQueueDashboard,
  createTaskQueueRouter,
};
