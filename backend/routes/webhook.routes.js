/**
 * Webhook Routes — WhatsApp
 * مسارات Webhook الخاصة بـ WhatsApp
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getWebhookHandler } = require('../integrations/whatsapp/webhookHandler');
const logger = require('../utils/logger');

/**
 * POST /webhooks/whatsapp
 * Main WhatsApp webhook endpoint
 */
router.post('/whatsapp', express.raw({ type: 'application/json' }), async (req, res) => {
  // Store raw body for signature verification
  req.rawBody = req.body;

  // Parse JSON if body is buffer
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (err) {
      logger.warn?.('[webhook] Invalid JSON body:', err?.message);
      return res.status(400).json({ error: 'invalid_json' });
    }
  }

  const handler = getWebhookHandler();
  return handler.handle(req, res);
});

/**
 * POST /webhooks/whatsapp/status
 * Status-only webhook (for providers that separate status from messages)
 */
router.post('/whatsapp/status', express.json(), async (req, res) => {
  const handler = getWebhookHandler();
  return handler.handle(req, res);
});

/**
 * GET /webhooks/whatsapp
 * Verification endpoint for Meta/Twilio webhook verification
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_SECRET) {
    logger.info?.('[webhook] Meta webhook verified');
    return res.status(200).send(challenge);
  }

  // For other providers, just return OK
  return res.status(200).json({ status: 'ok', service: 'whatsapp-webhook' });
});

module.exports = router;
