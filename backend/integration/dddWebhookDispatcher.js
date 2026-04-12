/**
 * DDD Webhook Dispatcher — موزّع الإشعارات الخارجية للدومينات العلاجية
 *
 * Bridges DDD domain events to external systems via webhooks.
 * Uses the existing WebhookService for delivery with HMAC signing.
 *
 * Features:
 *  - DDD domain event → Webhook mapping
 *  - Configurable per-webhook domain filters
 *  - Payload transformation (standard envelope)
 *  - Retry with exponential backoff (via existing WebhookService)
 *  - Delivery log tracking
 *  - HMAC-SHA256 signature for security
 *
 * @module integration/dddWebhookDispatcher
 */

'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ── Lazy service loader ─────────────────────────────────────────────────

function getWebhookService() {
  try {
    return require('../services/webhookService');
const safeError = require('../utils/safeError');
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DDD Webhook Registration Model
// ═══════════════════════════════════════════════════════════════════════════════

const dddWebhookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    description: { type: String, maxlength: 500 },

    // DDD-specific filters
    domains: [{ type: String }], // Empty = all domains
    events: [{ type: String }], // 'created', 'updated', 'deleted', or specific like 'phase-changed'
    models: [{ type: String }], // Filter by specific models

    // Configuration
    isActive: { type: Boolean, default: true, index: true },
    headers: { type: Map, of: String },
    retryCount: { type: Number, default: 3, min: 0, max: 10 },
    timeoutMs: { type: Number, default: 10000, min: 1000, max: 30000 },

    // Tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastTriggered: Date,
    totalDeliveries: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'ddd_webhooks' }
);

dddWebhookSchema.index({ isActive: 1, domains: 1 });

const DDDWebhook = mongoose.models.DDDWebhook || mongoose.model('DDDWebhook', dddWebhookSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Delivery Log
// ═══════════════════════════════════════════════════════════════════════════════

const deliveryLogSchema = new mongoose.Schema(
  {
    webhookId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDWebhook', index: true },
    domain: String,
    event: String,
    modelName: String,
    documentId: mongoose.Schema.Types.ObjectId,
    statusCode: Number,
    success: Boolean,
    responseTimeMs: Number,
    error: String,
    attempt: Number,
    payload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'ddd_webhook_deliveries' }
);

deliveryLogSchema.index({ createdAt: -1 });
deliveryLogSchema.index({ webhookId: 1, createdAt: -1 });

const DDDWebhookDelivery =
  mongoose.models.DDDWebhookDelivery || mongoose.model('DDDWebhookDelivery', deliveryLogSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Payload Builder & Signing
// ═══════════════════════════════════════════════════════════════════════════════

function buildPayload(domain, event, doc, meta = {}) {
  return {
    id: new mongoose.Types.ObjectId().toString(),
    timestamp: new Date().toISOString(),
    domain,
    event,
    model: meta.modelName || '',
    documentId: doc?._id?.toString() || '',
    data: doc?.toObject ? doc.toObject() : doc,
    meta: {
      userId: meta.userId,
      changes: meta.changes,
    },
  };
}

function signPayload(payload, secret) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${signature}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Core Dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dispatch a DDD domain event to all matching webhooks.
 *
 * @param {string} domain   - e.g. 'sessions'
 * @param {string} event    - 'created' | 'updated' | 'deleted'
 * @param {object} doc      - The document
 * @param {object} [meta]   - Extra metadata
 * @returns {Promise<object>}
 */
async function dispatchDDDWebhook(domain, event, doc, meta = {}) {
  const summary = { webhooksMatched: 0, delivered: 0, failed: 0 };

  // Find matching active webhooks
  const webhooks = await DDDWebhook.find({
    isActive: true,
    $or: [{ domains: { $size: 0 } }, { domains: domain }],
  }).lean();

  if (webhooks.length === 0) return summary;

  const payload = buildPayload(domain, event, doc, meta);

  for (const wh of webhooks) {
    // Check event filter
    if (wh.events && wh.events.length > 0 && !wh.events.includes(event)) continue;
    // Check model filter
    if (wh.models && wh.models.length > 0 && meta.modelName && !wh.models.includes(meta.modelName))
      continue;

    summary.webhooksMatched++;
    const start = Date.now();

    try {
      const signature = signPayload(payload, wh.secret);
      const headers = {
        'Content-Type': 'application/json',
        'X-DDD-Signature': signature,
        'X-DDD-Domain': domain,
        'X-DDD-Event': event,
        ...(wh.headers ? Object.fromEntries(wh.headers) : {}),
      };

      // Try existing WebhookService first
      const webhookService = getWebhookService();
      let statusCode = 0;
      let success = false;

      if (webhookService && webhookService.deliver) {
        const result = await webhookService.deliver(wh.url, payload, {
          headers,
          timeout: wh.timeoutMs,
          retries: wh.retryCount,
        });
        statusCode = result?.statusCode || 200;
        success = result?.success !== false;
      } else {
        // Direct HTTP delivery via fetch or http
        const http = wh.url.startsWith('https') ? require('https') : require('http');
        const urlObj = new URL(wh.url);

        await new Promise((resolve, reject) => {
          const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers,
            timeout: wh.timeoutMs,
          };

          const req = http.request(reqOptions, res => {
            statusCode = res.statusCode;
            success = statusCode >= 200 && statusCode < 300;
            res.resume();
            resolve();
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
          });

          req.write(JSON.stringify(payload));
          req.end();
        });
      }

      const elapsed = Date.now() - start;

      if (success) {
        summary.delivered++;
      } else {
        summary.failed++;
      }

      // Log delivery
      await DDDWebhookDelivery.create({
        webhookId: wh._id,
        domain,
        event,
        modelName: meta.modelName,
        documentId: doc?._id,
        statusCode,
        success,
        responseTimeMs: elapsed,
        attempt: 1,
        payload,
      }).catch(() => {});

      // Update webhook stats
      await DDDWebhook.updateOne(
        { _id: wh._id },
        {
          lastTriggered: new Date(),
          $inc: {
            totalDeliveries: success ? 1 : 0,
            totalFailures: success ? 0 : 1,
          },
        }
      ).catch(() => {});
    } catch (err) {
      summary.failed++;

      await DDDWebhookDelivery.create({
        webhookId: wh._id,
        domain,
        event,
        modelName: meta.modelName,
        documentId: doc?._id,
        success: false,
        error: err.message,
        responseTimeMs: Date.now() - start,
        attempt: 1,
      }).catch(() => {});
    }
  }

  if (summary.webhooksMatched > 0) {
    logger.info(
      `[DDD-Webhook] ${domain}.${event}: ${summary.delivered}/${summary.webhooksMatched} delivered`
    );
  }

  return summary;
}

/**
 * Wire webhook dispatching into the integration bus.
 */
function initializeDDDWebhooks(integrationBus) {
  if (!integrationBus) {
    logger.warn('[DDD-Webhook] No integration bus — skipping');
    return;
  }

  const domains = Object.keys(require('../domains/_base/ddd-search').DOMAIN_MODELS || {});

  for (const domain of domains) {
    for (const event of ['created', 'updated', 'deleted']) {
      const eventName = `ddd:${domain}:${event}`;
      integrationBus.on(eventName, payload => {
        dispatchDDDWebhook(domain, event, payload?.doc || payload, payload?.meta).catch(err =>
          logger.error(`[DDD-Webhook] Error dispatching ${eventName}: ${err.message}`)
        );
      });
    }
  }

  logger.info(`[DDD-Webhook] Initialized — listening on ${domains.length} domains`);
}

/**
 * Get webhook delivery logs.
 */
async function getWebhookDeliveryLogs(options = {}) {
  const { webhookId, domain, limit = 50, page = 1 } = options;
  const filter = {};
  if (webhookId) filter.webhookId = webhookId;
  if (domain) filter.domain = domain;

  const [logs, total] = await Promise.all([
    DDDWebhookDelivery.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DDDWebhookDelivery.countDocuments(filter),
  ]);

  return { logs, total, page, limit };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CRUD Router for managing DDD webhooks
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');

function createWebhookRouter() {
  const router = express.Router();

  // List webhooks
  router.get('/webhooks', async (_req, res) => {
    try {
      const webhooks = await DDDWebhook.find({}).sort({ createdAt: -1 }).lean();
      res.json({ success: true, webhooks });
    } catch (err) {
      safeError(res, err, 'dddWebhookDispatcher');
    }
  });

  // Create webhook
  router.post('/webhooks', async (req, res) => {
    try {
      const {
        name,
        url,
        secret,
        description,
        domains,
        events,
        models,
        headers,
        retryCount,
        timeoutMs,
      } = req.body;
      if (!name || !url) {
        return res.status(400).json({ success: false, message: 'name and url are required' });
      }

      const wh = await DDDWebhook.create({
        name,
        url,
        secret: secret || crypto.randomBytes(32).toString('hex'),
        description,
        domains: domains || [],
        events: events || [],
        models: models || [],
        headers,
        retryCount,
        timeoutMs,
        createdBy: req.user?._id,
      });

      res.status(201).json({ success: true, webhook: wh });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Delete webhook
  router.delete('/webhooks/:id', async (req, res) => {
    try {
      await DDDWebhook.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Webhook deleted' });
    } catch (err) {
      safeError(res, err, 'dddWebhookDispatcher');
    }
  });

  // Toggle webhook
  router.patch('/webhooks/:id/toggle', async (req, res) => {
    try {
      const wh = await DDDWebhook.findById(req.params.id);
      if (!wh) return res.status(404).json({ success: false, message: 'Not found' });
      wh.isActive = !wh.isActive;
      await wh.save();
      res.json({ success: true, webhook: wh });
    } catch (err) {
      safeError(res, err, 'dddWebhookDispatcher');
    }
  });

  // Delivery logs
  router.get('/webhooks/:id/deliveries', async (req, res) => {
    try {
      const data = await getWebhookDeliveryLogs({
        webhookId: req.params.id,
        limit: parseInt(req.query.limit, 10) || 50,
        page: parseInt(req.query.page, 10) || 1,
      });
      res.json({ success: true, ...data });
    } catch (err) {
      safeError(res, err, 'dddWebhookDispatcher');
    }
  });

  // Test webhook (send test payload)
  router.post('/webhooks/:id/test', async (req, res) => {
    try {
      const wh = await DDDWebhook.findById(req.params.id);
      if (!wh) return res.status(404).json({ success: false, message: 'Not found' });

      const result = await dispatchDDDWebhook(
        'test',
        'test',
        {
          _id: new mongoose.Types.ObjectId(),
          message: 'Test webhook delivery',
          timestamp: new Date(),
        },
        { modelName: 'Test' }
      );

      res.json({ success: true, result });
    } catch (err) {
      safeError(res, err, 'dddWebhookDispatcher');
    }
  });

  return router;
}

module.exports = {
  DDDWebhook,
  DDDWebhookDelivery,
  buildPayload,
  signPayload,
  dispatchDDDWebhook,
  initializeDDDWebhooks,
  getWebhookDeliveryLogs,
  createWebhookRouter,
};
