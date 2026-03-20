/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Scheduler Service (خدمة الجدولة)
 *  Port 3260 · Centralized Cron & Task Scheduling
 *  Provides: cron job management, one-time tasks, recurring tasks,
 *  distributed locking, execution history, internal HTTP triggers
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const axios = require('axios');
const winston = require('winston');

const app = express();
app.use(express.json());

const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
const redisOpts = { host: process.env.REDIS_HOST || 'redis', port: 6379, maxRetriesPerRequest: null };
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/7');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'));

/* ── Schemas ─────────────────────────────────────────────────── */
const ScheduledJob = mongoose.model(
  'ScheduledJob',
  new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    schedule: { type: String, required: true }, // cron expression or 'once'
    type: { type: String, enum: ['cron', 'once', 'interval'], default: 'cron' },
    action: {
      type: { type: String, enum: ['http', 'queue', 'internal'], required: true },
      url: String, // for http actions
      method: { type: String, default: 'POST' },
      headers: Object,
      body: Object,
      queue: String, // for queue actions
      queueData: Object,
      handler: String, // for internal actions
    },
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: 'Asia/Riyadh' },
    lastRunAt: Date,
    lastStatus: { type: String, enum: ['success', 'failed', 'running', 'skipped'] },
    lastError: String,
    runCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    timeout: { type: Number, default: 60000 },
    tags: [String],
    organizationId: String,
    createdAt: { type: Date, default: Date.now },
    nextRunAt: Date,
  }),
);

const JobExecution = mongoose.model(
  'JobExecution',
  new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledJob', index: true },
    jobName: String,
    status: { type: String, enum: ['success', 'failed', 'running', 'timeout'], index: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    durationMs: Number,
    result: mongoose.Schema.Types.Mixed,
    error: String,
    attempt: { type: Number, default: 1 },
  }),
);

/* ── BullMQ for deferred/one-time tasks ──────────────────────── */
const schedulerQueue = new Queue('scheduler-tasks', { connection: redisOpts });

const worker = new Worker(
  'scheduler-tasks',
  async job => {
    const { jobId } = job.data;
    await executeJob(jobId);
  },
  { connection: redisOpts, concurrency: 5 },
);

worker.on('failed', (job, err) => {
  log.error('Scheduled task worker error', { jobId: job?.data?.jobId, error: err.message });
});

/* ── Internal Handlers (built-in tasks) ──────────────────────── */
const INTERNAL_HANDLERS = {
  'cleanup-expired-sessions': async () => {
    const col = mongoose.connection.collection('sessions');
    const result = await col.deleteMany({ expiresAt: { $lt: new Date() } });
    return { deleted: result.deletedCount };
  },
  'cleanup-old-logs': async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const col = mongoose.connection.collection('webhookdeliverylogs');
    const r1 = await col.deleteMany({ createdAt: { $lt: cutoff } });
    const col2 = mongoose.connection.collection('jobexecutions');
    const r2 = await col2.deleteMany({ startedAt: { $lt: cutoff } });
    return { deliveryLogs: r1.deletedCount, executions: r2.deletedCount };
  },
  'generate-daily-report': async () => {
    try {
      await axios.post(
        'http://report-worker:3220/api/reports',
        {
          type: 'pdf',
          template: 'daily-summary',
          dataSource: { collection: 'transactions', pipeline: [{ $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } }] },
        },
        { timeout: 30000 },
      );
      return { triggered: true };
    } catch (e) {
      return { error: e.message };
    }
  },
  'sync-search-indices': async () => {
    const indices = ['employees', 'children', 'documents', 'inventory'];
    const results = {};
    for (const idx of indices) {
      try {
        const r = await axios.post(`http://search-service:3240/api/search/reindex/${idx}`, {}, { timeout: 120000 });
        results[idx] = r.data;
      } catch (e) {
        results[idx] = { error: e.message };
      }
    }
    return results;
  },
  'backup-database': async () => {
    try {
      await axios.post('http://backup-service:3090/api/backup/trigger', { type: 'full' }, { timeout: 300000 });
      return { triggered: true };
    } catch (e) {
      return { error: e.message };
    }
  },
  'attendance-reminder': async () => {
    try {
      await axios.post(
        'http://communication-hub:3210/api/messages/batch',
        {
          channel: 'push',
          template: 'attendance-reminder-ar',
          recipientQuery: { role: 'teacher', status: 'active' },
        },
        { timeout: 15000 },
      );
      return { sent: true };
    } catch (e) {
      return { error: e.message };
    }
  },
};

/* ── Execute a single job ────────────────────────────────────── */
async function executeJob(jobId) {
  const job = await ScheduledJob.findById(jobId);
  if (!job || !job.enabled) return;

  // Distributed lock
  const lockKey = `scheduler:lock:${job.name}`;
  const locked = await redis.set(lockKey, '1', 'EX', Math.ceil(job.timeout / 1000) + 10, 'NX');
  if (!locked) {
    log.info('Job already running (locked)', { name: job.name });
    return;
  }

  const execution = await JobExecution.create({ jobId: job._id, jobName: job.name, status: 'running' });
  const start = Date.now();

  try {
    job.lastStatus = 'running';
    await job.save();

    let result;

    if (job.action.type === 'http') {
      const response = await axios({
        method: job.action.method || 'POST',
        url: job.action.url,
        headers: job.action.headers || {},
        data: job.action.body || {},
        timeout: job.timeout,
      });
      result = { status: response.status, data: response.data };
    } else if (job.action.type === 'queue') {
      const targetQueue = new Queue(job.action.queue, { connection: redisOpts });
      await targetQueue.add(job.name, job.action.queueData || {});
      result = { queued: true, queue: job.action.queue };
    } else if (job.action.type === 'internal') {
      const handler = INTERNAL_HANDLERS[job.action.handler];
      if (!handler) throw new Error(`Unknown internal handler: ${job.action.handler}`);
      result = await handler();
    }

    const duration = Date.now() - start;
    execution.status = 'success';
    execution.completedAt = new Date();
    execution.durationMs = duration;
    execution.result = result;
    await execution.save();

    job.lastRunAt = new Date();
    job.lastStatus = 'success';
    job.lastError = null;
    job.runCount += 1;
    await job.save();

    log.info('Job completed', { name: job.name, durationMs: duration });
  } catch (err) {
    const duration = Date.now() - start;
    execution.status = 'failed';
    execution.completedAt = new Date();
    execution.durationMs = duration;
    execution.error = err.message;
    await execution.save();

    job.lastRunAt = new Date();
    job.lastStatus = 'failed';
    job.lastError = err.message;
    job.failCount += 1;
    await job.save();

    log.error('Job failed', { name: job.name, error: err.message, durationMs: duration });
  } finally {
    await redis.del(lockKey);
  }
}

/* ── Cron Scheduler ──────────────────────────────────────────── */
const activeCrons = new Map();

async function syncCrons() {
  const jobs = await ScheduledJob.find({ enabled: true, type: 'cron' });

  // Stop removed/disabled crons
  for (const [name, task] of activeCrons) {
    if (!jobs.find(j => j.name === name)) {
      task.stop();
      activeCrons.delete(name);
      log.info('Cron stopped', { name });
    }
  }

  // Start new/updated crons
  for (const job of jobs) {
    if (activeCrons.has(job.name)) continue;
    if (!cron.validate(job.schedule)) {
      log.warn('Invalid cron expression', { name: job.name, schedule: job.schedule });
      continue;
    }
    const task = cron.schedule(job.schedule, () => executeJob(job._id), {
      timezone: job.timezone || 'Asia/Riyadh',
    });
    activeCrons.set(job.name, task);
    log.info('Cron started', { name: job.name, schedule: job.schedule });
  }
}

/* ── Seed Default Jobs ───────────────────────────────────────── */
async function seedDefaults() {
  const defaults = [
    {
      name: 'cleanup-expired-sessions',
      description: 'حذف الجلسات المنتهية',
      schedule: '0 3 * * *',
      type: 'cron',
      action: { type: 'internal', handler: 'cleanup-expired-sessions' },
      tags: ['maintenance'],
    },
    {
      name: 'cleanup-old-logs',
      description: 'حذف السجلات القديمة (90 يوم)',
      schedule: '0 4 * * 0',
      type: 'cron',
      action: { type: 'internal', handler: 'cleanup-old-logs' },
      tags: ['maintenance'],
    },
    {
      name: 'daily-report',
      description: 'التقرير اليومي',
      schedule: '0 6 * * *',
      type: 'cron',
      action: { type: 'internal', handler: 'generate-daily-report' },
      tags: ['reports'],
    },
    {
      name: 'sync-search-indices',
      description: 'مزامنة فهارس البحث',
      schedule: '0 2 * * *',
      type: 'cron',
      action: { type: 'internal', handler: 'sync-search-indices' },
      tags: ['search'],
      timeout: 300000,
    },
    {
      name: 'nightly-backup',
      description: 'النسخ الاحتياطي الليلي',
      schedule: '0 1 * * *',
      type: 'cron',
      action: { type: 'internal', handler: 'backup-database' },
      tags: ['backup'],
      timeout: 600000,
    },
    {
      name: 'attendance-reminder',
      description: 'تذكير الحضور الصباحي',
      schedule: '30 6 * * 0-4',
      type: 'cron',
      action: { type: 'internal', handler: 'attendance-reminder' },
      tags: ['notifications'],
      timezone: 'Asia/Riyadh',
    },
  ];

  for (const def of defaults) {
    await ScheduledJob.findOneAndUpdate({ name: def.name }, { $setOnInsert: def }, { upsert: true });
  }
  log.info('Default jobs seeded');
}

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeCrons: activeCrons.size });
});

/* ── CRUD: Jobs ──────────────────────────────────────────────── */
app.get('/api/scheduler/jobs', async (req, res) => {
  const { enabled, tag, type } = req.query;
  const filter = {};
  if (enabled !== undefined) filter.enabled = enabled === 'true';
  if (tag) filter.tags = tag;
  if (type) filter.type = type;
  const jobs = await ScheduledJob.find(filter).sort('name');
  res.json(jobs);
});

app.get('/api/scheduler/jobs/:id', async (req, res) => {
  const job = await ScheduledJob.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

app.post('/api/scheduler/jobs', async (req, res) => {
  try {
    const job = await ScheduledJob.create(req.body);
    await syncCrons();
    res.status(201).json(job);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/scheduler/jobs/:id', async (req, res) => {
  const job = await ScheduledJob.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!job) return res.status(404).json({ error: 'Not found' });
  await syncCrons();
  res.json(job);
});

app.delete('/api/scheduler/jobs/:id', async (req, res) => {
  await ScheduledJob.findByIdAndDelete(req.params.id);
  await syncCrons();
  res.json({ deleted: true });
});

/* ── Manual Trigger ──────────────────────────────────────────── */
app.post('/api/scheduler/jobs/:id/run', async (req, res) => {
  const job = await ScheduledJob.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  executeJob(job._id); // fire and forget
  res.json({ triggered: true, name: job.name });
});

/* ── Execution History ───────────────────────────────────────── */
app.get('/api/scheduler/executions', async (req, res) => {
  const { jobId, status, from = 0, size = 50 } = req.query;
  const filter = {};
  if (jobId) filter.jobId = jobId;
  if (status) filter.status = status;
  const execs = await JobExecution.find(filter)
    .sort('-startedAt')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 200));
  const total = await JobExecution.countDocuments(filter);
  res.json({ total, executions: execs });
});

/* ── Stats ────────────────────────────────────────────────────── */
app.get('/api/scheduler/stats', async (_req, res) => {
  const [total, enabled, executions, failures] = await Promise.all([
    ScheduledJob.countDocuments(),
    ScheduledJob.countDocuments({ enabled: true }),
    JobExecution.countDocuments({ status: 'success' }),
    JobExecution.countDocuments({ status: 'failed' }),
  ]);
  res.json({ jobs: { total, enabled, activeCrons: activeCrons.size }, executions: { successful: executions, failed: failures } });
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3260;
app.listen(PORT, async () => {
  log.info(`Scheduler Service running on port ${PORT}`);
  await seedDefaults();
  await syncCrons();
  // Re-sync crons every 5 minutes to pick up changes
  setInterval(syncCrons, 5 * 60 * 1000);
});
