/*  ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Webhook Worker (خدمة الويب هوك)
 *  Port 3250 · Async Webhook Delivery with BullMQ
 *  Provides: webhook registration, secure delivery (HMAC-SHA256),
 *  exponential backoff retry, dead-letter queue, delivery logs
 *  ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const app = express();
app.use(express.json({ limit: '1mb' }));

const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/* ── Connections ─────────────────────────────────────────────── */
// Parse Redis URL to extract password for BullMQ connection
const _redisUrl = process.env.REDIS_URL
  ? (() => {
      try {
        return new URL(process.env.REDIS_URL);
      } catch (e) {
        return null;
      }
    })()
  : null;
const redisOpts = {
  host: _redisUrl?.hostname || process.env.REDIS_HOST || 'redis',
  port: parseInt(_redisUrl?.port || '6379'),
  password: _redisUrl?.password || undefined,
  maxRetriesPerRequest: null,
};
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/6');

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael', {
    maxPoolSize: 5,
  })
  .then(() => log.info('MongoDB connected'));

/* ── Schemas ─────────────────────────────────────────────────── */
const WebhookEndpoint = mongoose.model(
  'WebhookEndpoint',
  new mongoose.Schema({
    organizationId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    secret: { type: String, required: true },
    events: [{ type: String }], // e.g. ['employee.created', 'payment.completed']
    active: { type: Boolean, default: true },
    description: String,
    headers: { type: Map, of: String }, // custom headers
    failureCount: { type: Number, default: 0 },
    lastDeliveryAt: Date,
    lastStatus: Number,
    createdAt: { type: Date, default: Date.now },
  }),
);

const DeliveryLog = mongoose.model(
  'WebhookDeliveryLog',
  new mongoose.Schema({
    webhookId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookEndpoint', index: true },
    deliveryId: { type: String, unique: true, index: true },
    event: { type: String, index: true },
    url: String,
    requestHeaders: Object,
    requestBody: Object,
    responseStatus: Number,
    responseBody: String,
    responseTimeMs: Number,
    attempt: Number,
    success: Boolean,
    error: String,
    createdAt: { type: Date, default: Date.now, index: true },
  }),
);

/* ── BullMQ Queue & Worker ───────────────────────────────────── */
const webhookQueue = new Queue('webhook-delivery', { connection: redisOpts });

const MAX_ATTEMPTS = parseInt(process.env.WEBHOOK_MAX_RETRIES || '5');
const TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000');

const worker = new Worker(
  'webhook-delivery',
  async job => {
    const { webhookId, deliveryId, url, secret, headers, event, payload, attempt } = job.data;
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const start = Date.now();

    const reqHeaders = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhookId,
      'X-Delivery-Id': deliveryId,
      'X-Event': event,
      'X-Signature-256': `sha256=${signature}`,
      'X-Attempt': String(attempt),
      'User-Agent': 'AlAwaelERP-Webhook/1.0',
      ...(headers || {}),
    };

    try {
      const response = await axios.post(url, payload, {
        headers: reqHeaders,
        timeout: TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 300,
      });

      const elapsed = Date.now() - start;

      await DeliveryLog.create({
        webhookId,
        deliveryId,
        event,
        url,
        requestHeaders: reqHeaders,
        requestBody: payload,
        responseStatus: response.status,
        responseBody: typeof response.data === 'string' ? response.data.slice(0, 2000) : JSON.stringify(response.data).slice(0, 2000),
        responseTimeMs: elapsed,
        attempt,
        success: true,
      });

      await WebhookEndpoint.findByIdAndUpdate(webhookId, {
        lastDeliveryAt: new Date(),
        lastStatus: response.status,
        failureCount: 0,
      });

      log.info('Webhook delivered', { deliveryId, url, status: response.status, ms: elapsed });
    } catch (err) {
      const elapsed = Date.now() - start;
      const status = err.response?.status || 0;

      await DeliveryLog.create({
        webhookId,
        deliveryId,
        event,
        url,
        requestHeaders: reqHeaders,
        requestBody: payload,
        responseStatus: status,
        responseBody: err.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : null,
        responseTimeMs: elapsed,
        attempt,
        success: false,
        error: err.message,
      });

      await WebhookEndpoint.findByIdAndUpdate(webhookId, {
        $inc: { failureCount: 1 },
        lastDeliveryAt: new Date(),
        lastStatus: status,
      });

      // Auto-disable after too many consecutive failures
      const endpoint = await WebhookEndpoint.findById(webhookId);
      if (endpoint && endpoint.failureCount >= MAX_ATTEMPTS * 2) {
        endpoint.active = false;
        await endpoint.save();
        log.warn('Webhook endpoint auto-disabled', { webhookId, url });
      }

      throw err; // triggers BullMQ retry
    }
  },
  {
    connection: redisOpts,
    concurrency: 10,
    limiter: { max: 50, duration: 1000 }, // 50 deliveries/sec
  },
);

worker.on('failed', (job, err) => {
  log.warn('Webhook delivery failed', {
    deliveryId: job?.data?.deliveryId,
    attempt: job?.attemptsMade,
    error: err.message,
  });
});

/* ── Health ───────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const waiting = await webhookQueue.getWaitingCount();
    const active = await webhookQueue.getActiveCount();
    res.json({ status: 'ok', queue: { waiting, active } });
  } catch (e) {
    res.json({ status: 'ok', queue: { error: e.message } });
  }
});

/* ── Register Webhook Endpoint ───────────────────────────────── */
app.post('/api/webhooks', async (req, res) => {
  try {
    const { organizationId, url, events, description, headers } = req.body;
    if (!organizationId || !url || !events?.length) {
      return res.status(400).json({ error: 'organizationId, url, events[] required' });
    }
    const secret = crypto.randomBytes(32).toString('hex');
    const endpoint = await WebhookEndpoint.create({
      organizationId,
      url,
      secret,
      events,
      description,
      headers,
    });
    res.status(201).json({ id: endpoint._id, secret, message: 'Store the secret securely — it cannot be retrieved again' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── List Webhooks ───────────────────────────────────────────── */
app.get('/api/webhooks', async (req, res) => {
  const { org, event, active } = req.query;
  const filter = {};
  if (org) filter.organizationId = org;
  if (event) filter.events = event;
  if (active !== undefined) filter.active = active === 'true';
  const endpoints = await WebhookEndpoint.find(filter).select('-secret').sort('-createdAt');
  res.json(endpoints);
});

/* ── Update Webhook ──────────────────────────────────────────── */
app.patch('/api/webhooks/:id', async (req, res) => {
  const updates = {};
  if (req.body.url) updates.url = req.body.url;
  if (req.body.events) updates.events = req.body.events;
  if (req.body.active !== undefined) updates.active = req.body.active;
  if (req.body.description) updates.description = req.body.description;
  const endpoint = await WebhookEndpoint.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-secret');
  if (!endpoint) return res.status(404).json({ error: 'Not found' });
  res.json(endpoint);
});

/* ── Delete Webhook ──────────────────────────────────────────── */
app.delete('/api/webhooks/:id', async (req, res) => {
  await WebhookEndpoint.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

/* ── Dispatch Event (internal — called by other services) ────── */
app.post('/api/webhooks/dispatch', async (req, res) => {
  try {
    const { event, payload, organizationId } = req.body;
    if (!event || !payload) return res.status(400).json({ error: 'event and payload required' });

    const filter = { active: true, events: event };
    if (organizationId) filter.organizationId = organizationId;
    const endpoints = await WebhookEndpoint.find(filter);

    const jobs = [];
    for (const ep of endpoints) {
      const deliveryId = uuidv4();
      jobs.push(
        webhookQueue.add(
          'deliver',
          {
            webhookId: ep._id.toString(),
            deliveryId,
            url: ep.url,
            secret: ep.secret,
            headers: ep.headers ? Object.fromEntries(ep.headers) : {},
            event,
            payload: { ...payload, event, deliveredAt: new Date().toISOString() },
            attempt: 1,
          },
          {
            attempts: MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          },
        ),
      );
    }
    await Promise.all(jobs);

    log.info('Event dispatched', { event, endpointCount: endpoints.length });
    res.json({ dispatched: endpoints.length, event });
  } catch (e) {
    log.error('Dispatch error', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

/* ── Delivery Logs ───────────────────────────────────────────── */
app.get('/api/webhooks/:id/deliveries', async (req, res) => {
  const { from = 0, size = 50, success } = req.query;
  const filter = { webhookId: req.params.id };
  if (success !== undefined) filter.success = success === 'true';
  const logs = await DeliveryLog.find(filter)
    .sort('-createdAt')
    .skip(parseInt(from))
    .limit(Math.min(parseInt(size), 200));
  const total = await DeliveryLog.countDocuments(filter);
  res.json({ total, logs });
});

/* ── Retry Failed Delivery ───────────────────────────────────── */
app.post('/api/webhooks/retry/:deliveryId', async (req, res) => {
  const logEntry = await DeliveryLog.findOne({ deliveryId: req.params.deliveryId, success: false });
  if (!logEntry) return res.status(404).json({ error: 'Failed delivery not found' });

  const endpoint = await WebhookEndpoint.findById(logEntry.webhookId);
  if (!endpoint) return res.status(404).json({ error: 'Endpoint not found' });

  const newDeliveryId = uuidv4();
  await webhookQueue.add(
    'deliver',
    {
      webhookId: endpoint._id.toString(),
      deliveryId: newDeliveryId,
      url: endpoint.url,
      secret: endpoint.secret,
      headers: endpoint.headers ? Object.fromEntries(endpoint.headers) : {},
      event: logEntry.event,
      payload: logEntry.requestBody,
      attempt: 1,
    },
    {
      attempts: MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  res.json({ retryDeliveryId: newDeliveryId });
});

/* ── Stats ────────────────────────────────────────────────────── */
app.get('/api/webhooks/stats/summary', async (_req, res) => {
  const [total, active, deliveries, failures] = await Promise.all([
    WebhookEndpoint.countDocuments(),
    WebhookEndpoint.countDocuments({ active: true }),
    DeliveryLog.countDocuments({ success: true }),
    DeliveryLog.countDocuments({ success: false }),
  ]);
  const avgResponseTime = await DeliveryLog.aggregate([
    { $match: { success: true } },
    { $group: { _id: null, avg: { $avg: '$responseTimeMs' } } },
  ]);
  res.json({
    endpoints: { total, active },
    deliveries: { successful: deliveries, failed: failures },
    avgResponseTimeMs: avgResponseTime[0]?.avg || 0,
  });
});

/* ── Start ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3250;
app.listen(PORT, () => log.info(`Webhook Worker running on port ${PORT}`));
