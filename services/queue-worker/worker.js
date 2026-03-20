/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Queue Worker Service
 * خدمة معالجة المهام الخلفية
 *
 * Queues: email, reports, pdf, excel, image, cleanup, sync
 * Features: Retry, Dead Letter, Concurrency, Priority, Scheduling
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const { Worker, Queue, QueueScheduler } = require('bullmq');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const winston = require('winston');
const nodemailer = require('nodemailer');

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'queue-worker' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// ─── Redis Connection ────────────────────────────────────────────────────────
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ─── Queue Definitions ──────────────────────────────────────────────────────
const QUEUES = {
  email: new Queue('email', { connection: redisConnection }),
  reports: new Queue('reports', { connection: redisConnection }),
  pdf: new Queue('pdf-generation', { connection: redisConnection }),
  excel: new Queue('excel-export', { connection: redisConnection }),
  image: new Queue('image-processing', { connection: redisConnection }),
  cleanup: new Queue('data-cleanup', { connection: redisConnection }),
  sync: new Queue('data-sync', { connection: redisConnection }),
  notification: new Queue('notification', { connection: redisConnection }),
};

// ─── Job Stats Tracking ─────────────────────────────────────────────────────
const stats = {
  processed: 0,
  failed: 0,
  active: 0,
  startTime: new Date(),
  byQueue: {},
};

// ─── Email Transport ─────────────────────────────────────────────────────────
const emailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

// ─── Job Processors ─────────────────────────────────────────────────────────

// Email processor
async function processEmailJob(job) {
  const { to, subject, html, text, attachments } = job.data;
  logger.info(`Processing email job ${job.id} → ${to}`);
  const result = await emailTransport.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@alawael.sa',
    to,
    subject,
    html,
    text,
    attachments,
  });
  return { messageId: result.messageId, accepted: result.accepted };
}

// Report generation processor
async function processReportJob(job) {
  const { reportType, filters, format, userId } = job.data;
  logger.info(`Generating ${reportType} report (${format}) for user ${userId}`);

  // Simulate report generation
  await new Promise(r => setTimeout(r, 2000));

  return {
    reportType,
    format,
    generatedAt: new Date().toISOString(),
    status: 'completed',
  };
}

// PDF generation processor
async function processPdfJob(job) {
  const { template, data, filename } = job.data;
  logger.info(`Generating PDF: ${filename}`);

  const PDFDocument = require('pdfkit');
  // PDF generation logic would go here
  await new Promise(r => setTimeout(r, 1000));

  return { filename, size: 0, generatedAt: new Date().toISOString() };
}

// Excel export processor
async function processExcelJob(job) {
  const { sheetName, columns, data, filename } = job.data;
  logger.info(`Generating Excel: ${filename}`);

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || 'Data');

  if (columns) worksheet.columns = columns;
  if (data) data.forEach(row => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return { filename, size: buffer.length, rows: data?.length || 0 };
}

// Image processing
async function processImageJob(job) {
  const { inputPath, operations, outputPath } = job.data;
  logger.info(`Processing image: ${inputPath}`);

  // Sharp image processing would go here
  await new Promise(r => setTimeout(r, 500));
  return { outputPath, status: 'processed' };
}

// Data cleanup processor
async function processCleanupJob(job) {
  const { collection, olderThan, dryRun } = job.data;
  logger.info(`Cleanup: ${collection} older than ${olderThan}`);

  if (!dryRun && mongoose.connection.readyState === 1) {
    const result = await mongoose.connection.db.collection(collection).deleteMany({ createdAt: { $lt: new Date(olderThan) } });
    return { deleted: result.deletedCount };
  }
  return { deleted: 0, dryRun: true };
}

// Data sync processor
async function processSyncJob(job) {
  const { source, target, syncType } = job.data;
  logger.info(`Syncing ${syncType}: ${source} → ${target}`);
  await new Promise(r => setTimeout(r, 1500));
  return { syncType, status: 'completed', timestamp: new Date().toISOString() };
}

// Notification processor
async function processNotificationJob(job) {
  const { channel, recipient, body, subject } = job.data;
  logger.info(`Processing notification: ${channel} → ${recipient?.userId || recipient?.email}`);
  return { channel, status: 'sent' };
}

// ─── Worker Setup ────────────────────────────────────────────────────────────
const PROCESSORS = {
  email: processEmailJob,
  reports: processReportJob,
  'pdf-generation': processPdfJob,
  'excel-export': processExcelJob,
  'image-processing': processImageJob,
  'data-cleanup': processCleanupJob,
  'data-sync': processSyncJob,
  notification: processNotificationJob,
};

const workers = [];

function createWorker(queueName, processor, concurrency = 3) {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency,
    limiter: { max: 10, duration: 1000 },
    settings: {
      backoffStrategies: {
        exponential: attemptsMade => Math.pow(2, attemptsMade) * 1000,
      },
    },
  });

  worker.on('completed', job => {
    stats.processed++;
    stats.byQueue[queueName] = (stats.byQueue[queueName] || 0) + 1;
    logger.info(`✅ Job ${job.id} (${queueName}) completed`);
  });

  worker.on('failed', (job, err) => {
    stats.failed++;
    logger.error(`❌ Job ${job?.id} (${queueName}) failed: ${err.message}`);
  });

  worker.on('error', err => {
    logger.error(`Worker ${queueName} error: ${err.message}`);
  });

  workers.push(worker);
  logger.info(`Worker started: ${queueName} (concurrency: ${concurrency})`);
  return worker;
}

// ─── Health & API Server ────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3080;

app.use(express.json());

app.get('/health', async (req, res) => {
  const queueStats = {};
  for (const [name, queue] of Object.entries(QUEUES)) {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      queueStats[name] = { waiting, active, completed, failed };
    } catch (e) {
      queueStats[name] = { error: e.message };
    }
  }

  res.json({
    status: 'ok',
    service: 'queue-worker',
    version: '1.0.0',
    uptime: process.uptime(),
    stats: {
      ...stats,
      uptimeSeconds: Math.floor((Date.now() - stats.startTime) / 1000),
    },
    queues: queueStats,
  });
});

// Add job to queue
app.post('/api/jobs/:queue', async (req, res) => {
  try {
    const queueName = req.params.queue;
    const queue = QUEUES[queueName];
    if (!queue) {
      return res.status(404).json({ error: `Queue '${queueName}' not found` });
    }

    const { data, options = {} } = req.body;
    const job = await queue.add(queueName, data, {
      attempts: options.attempts || 3,
      backoff: { type: 'exponential', delay: 1000 },
      priority: options.priority || 0,
      delay: options.delay || 0,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      ...options,
    });

    res.status(201).json({ success: true, jobId: job.id, queue: queueName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/api/jobs/:queue/:jobId', async (req, res) => {
  try {
    const queue = QUEUES[req.params.queue];
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const job = await queue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const state = await job.getState();
    res.json({
      id: job.id,
      queue: req.params.queue,
      state,
      data: job.data,
      result: job.returnvalue,
      attempts: job.attemptsMade,
      createdAt: new Date(job.timestamp),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List queues
app.get('/api/queues', async (req, res) => {
  const result = {};
  for (const [name, queue] of Object.entries(QUEUES)) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    result[name] = { waiting, active, completed, failed, delayed };
  }
  res.json({ queues: result });
});

// ─── Scheduled Jobs ─────────────────────────────────────────────────────────
async function scheduleRecurringJobs() {
  // Daily cleanup at 2 AM
  await QUEUES.cleanup.add(
    'daily-cleanup',
    {
      collection: 'logs',
      olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { repeat: { pattern: '0 2 * * *' } },
  );

  // Weekly report every Monday at 6 AM
  await QUEUES.reports.add('weekly-summary', { reportType: 'weekly-summary', format: 'pdf' }, { repeat: { pattern: '0 6 * * 1' } });

  logger.info('Recurring jobs scheduled');
}

// ─── Startup ─────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Connect MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    // Start workers
    createWorker('email', processEmailJob, 5);
    createWorker('reports', processReportJob, 2);
    createWorker('pdf-generation', processPdfJob, 3);
    createWorker('excel-export', processExcelJob, 3);
    createWorker('image-processing', processImageJob, 4);
    createWorker('data-cleanup', processCleanupJob, 1);
    createWorker('data-sync', processSyncJob, 2);
    createWorker('notification', processNotificationJob, 5);

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    // Start health API
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`⚙️  Queue Worker running on port ${PORT}`);
      logger.info(`   Queues: ${Object.keys(QUEUES).join(', ')}`);
    });
  } catch (error) {
    logger.error('Startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down workers...');
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
});

start();

module.exports = { QUEUES, app };
