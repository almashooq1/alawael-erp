/**
 * Webhook Routes — WhatsApp (secondary mount, W1424h)
 * مسارات Webhook الخاصة بـ WhatsApp
 * ══════════════════════════════════════════════════════════════════════════
 * This is the SECONDARY inbound webhook, mounted at /api/v1/webhooks. The LIVE
 * Meta webhook is /api/(v1/)whatsapp/webhook (routes/whatsapp.routes.js).
 *
 * SECURITY (W1424h): this file previously delegated to
 * integrations/whatsapp/webhookHandler, whose GET verify returned 200 on a BAD
 * token (and compared against WHATSAPP_WEBHOOK_SECRET, not WHATSAPP_VERIFY_TOKEN),
 * and whose POST was fail-OPEN on the HMAC signature (processed forged inbound
 * events when the secret was unset). Both are now delegated to the canonical,
 * fail-closed handlers — whatsappService.verifyWebhook (the W1424 raw-URL verifier:
 * 403 on mismatch, correct token, XSS-safe challenge) and
 * whatsappWebhook.processWebhook (verifies the HMAC before processing, writes to
 * WhatsAppConversation, runs the bot FSM). The two webhook URLs are now
 * behaviourally identical and neither can be forged.
 */

'use strict';

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp/whatsappService');
const whatsappWebhook = require('../services/whatsapp/whatsappWebhook.service');
const logger = require('../utils/logger');

/**
 * GET /webhooks/whatsapp — Meta verification handshake (canonical, fail-closed).
 */
router.get('/whatsapp', (req, res) => whatsappService.verifyWebhook(req, res));

async function processInbound(req, res) {
  const raw = req.rawBody || req.body;
  const rawStr = Buffer.isBuffer(raw)
    ? raw.toString('utf8')
    : typeof raw === 'string'
      ? raw
      : JSON.stringify(raw || {});
  const signature = req.headers['x-hub-signature-256'];

  // Fail-closed: verify the HMAC signature BEFORE processing. The canonical
  // verifier rejects when the secret is unset (production) — never fail-open.
  if (!whatsappWebhook.verifySignature(rawStr, signature)) {
    logger.warn?.(`[webhook] rejected: invalid signature from ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  // Ack fast (Meta wants < 5s) then process. handleIncomingMessage is idempotent
  // on providerMessageId (W1424f) so a redelivery is safe.
  res.sendStatus(200);

  let parsed = {};
  try {
    parsed =
      typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawStr);
  } catch (_) {
    parsed = {};
  }
  whatsappWebhook
    .processWebhook(parsed, rawStr, signature)
    .catch(err => logger.error?.(`[webhook] processing error: ${err.message}`));
}

/**
 * POST /webhooks/whatsapp — inbound events (canonical processor, fail-closed).
 */
router.post('/whatsapp', express.raw({ type: 'application/json' }), (req, res) => {
  req.rawBody = req.body;
  return processInbound(req, res);
});

/**
 * POST /webhooks/whatsapp/status — status-only webhook (same canonical path).
 */
router.post('/whatsapp/status', express.raw({ type: 'application/json' }), (req, res) => {
  req.rawBody = req.body;
  return processInbound(req, res);
});

module.exports = router;
