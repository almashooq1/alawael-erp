/**
 * WhatsApp Routes — مسارات API لواتساب
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Endpoints:
 *
 *   Webhook (Meta):
 *     GET  /api/whatsapp/webhook           — verification challenge
 *     POST /api/whatsapp/webhook           — inbound events
 *
 *   Conversations:
 *     GET  /api/whatsapp/conversations     — list conversations
 *     GET  /api/whatsapp/conversations/:id — single conversation
 *     POST /api/whatsapp/conversations/:id/resolve — mark resolved
 *     POST /api/whatsapp/conversations/:id/assign  — assign to staff
 *
 *   Messaging:
 *     POST /api/whatsapp/send/text         — send text
 *     POST /api/whatsapp/send/template     — send template
 *     POST /api/whatsapp/send/document     — send document
 *     POST /api/whatsapp/send/interactive  — send interactive buttons/list
 *     POST /api/whatsapp/bulk              — bulk send (session reminders, etc.)
 *
 *   AI:
 *     POST /api/whatsapp/ai/classify       — classify message intent
 *     POST /api/whatsapp/ai/suggest-replies — smart reply suggestions
 *     POST /api/whatsapp/ai/summarize      — summarize conversation
 *     GET  /api/whatsapp/ai/insights/:conversationId — engagement insights
 *
 *   Templates:
 *     GET  /api/whatsapp/templates         — list available templates
 *     POST /api/whatsapp/templates/session-reminder  — send session reminder
 *     POST /api/whatsapp/templates/progress-report   — send progress report
 *     POST /api/whatsapp/templates/homework          — send homework
 *
 *   Status:
 *     GET  /api/whatsapp/status            — service health
 *     GET  /api/whatsapp/analytics         — conversation analytics
 *
 * @module routes/whatsapp.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId
const mongoose = require('mongoose');

const whatsappService = require('../services/whatsapp/whatsappService');
const whatsappAI = require('../services/whatsapp/whatsappAI.service');
const whatsappWebhook = require('../services/whatsapp/whatsappWebhook.service');
const whatsappTemplates = require('../services/whatsapp/whatsappTemplates.service');
const whatsappRateLimit = require('../services/whatsapp/rateLimit.service');
const whatsappIdempotency = require('../services/whatsapp/idempotency.service');
const whatsappDlq = require('../services/whatsapp/dlq.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Gate every outbound send through three guards:
 *   1. Rate limit per phone (Meta's per-recipient cap + our policy).
 *   2. Idempotency by `Idempotency-Key` header (24h window).
 *   3. DLQ enqueue on terminal failure so a transient Meta outage doesn't
 *      lose the message — the worker will replay.
 *
 * The producer is the actual send call (sendText, sendTemplate, ...).
 * On rate-limit denial returns a 429-shaped object that the route surfaces.
 *
 * @param {object} req - Express request (for headers + user lineage)
 * @param {string} sendType - 'text' | 'template' | 'document' | ...
 * @param {string} phone - normalized recipient phone
 * @param {object} payload - what to persist to DLQ on terminal failure
 * @param {function} producer - async () => Meta send result
 * @returns {Promise<{status:number, body:object, replayed?:boolean}>}
 */
async function withSendGuards(req, sendType, phone, payload, producer) {
  // 1. Rate limit
  const rl = await whatsappRateLimit.checkAndRecord(phone);
  if (!rl.allowed) {
    return {
      status: 429,
      body: {
        success: false,
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded (${rl.reason})`,
        details: { reason: rl.reason, retryAfterSeconds: rl.retryAfterSeconds, caps: rl.caps },
      },
    };
  }

  // 2. Idempotency
  const idemKey = req.get('Idempotency-Key') || req.get('X-Idempotency-Key') || null;
  const ctx = {
    phone,
    initiatedBy: req.user?._id || req.user?.userId || req.user?.id || null,
    organizationId: req.user?.organizationId || null,
    beneficiaryId: req.body?.beneficiaryId || null,
    idempotencyKey: idemKey,
    sendType,
  };

  try {
    const { result, replayed } = await whatsappIdempotency.withKey(idemKey, producer);
    return { status: 200, body: { success: !!result?.success, data: result }, replayed };
  } catch (err) {
    // 3. Terminal failure → DLQ. Don't surface 500 to caller; we now own the
    // delivery. 202 communicates "accepted for retry; status will change".
    await whatsappDlq.enqueue(sendType, payload, err, ctx).catch(() => {});
    logger.warn(`[WhatsApp] send failed (${sendType}) → DLQ enqueued: ${err.message}`);
    return {
      status: 202,
      body: {
        success: false,
        queued: true,
        code: 'SEND_QUEUED_FOR_RETRY',
        message: `Meta API failure — queued for retry (${err.message})`,
      },
    };
  }
}

function getConversationModel() {
  try {
    return mongoose.model('WhatsAppConversation');
  } catch {
    return require('../models/WhatsAppConversation');
  }
}

function validate(fields, body) {
  const missing = fields.filter(f => !body[f]);
  if (missing.length)
    throw Object.assign(new Error(`Missing: ${missing.join(', ')}`), { statusCode: 400 });
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK (no auth — Meta calls this directly)
// ═══════════════════════════════════════════════════════════════════════════

/** GET /webhook — Meta verification challenge */
router.get('/webhook', (req, res) => whatsappService.verifyWebhook(req, res));

/** POST /webhook — Inbound events from Meta
 *
 * Raw body for HMAC is captured by the global `express.json({verify})` hook
 * in startup/middleware.js (stashed on req.rawBody as a Buffer).
 *
 * Order matters: signature must be VERIFIED before we 200 — otherwise we'd
 * acknowledge forged webhooks and process attacker-controlled payloads. Meta
 * tolerates the few-millisecond delay; the 5s budget is for processing, not
 * for the HTTP ack.
 */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {});
    const signature = req.headers['x-hub-signature-256'];

    if (!whatsappWebhook.verifySignature(rawBody, signature)) {
      logger.warn(`[WhatsApp Webhook] Rejected: invalid signature from ${req.ip}`);
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // Signature OK — acknowledge fast (Meta wants < 5s) then process async.
    res.sendStatus(200);

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    try {
      const result = await whatsappWebhook.processWebhook(parsed, rawBody, signature);
      logger.info(`[WhatsApp Webhook] Processed: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error(`[WhatsApp Webhook] Processing error: ${err.message}`);
    }
  })
);

// ───────────────────────────────────────────────────────────────────────────
// All routes BELOW require authentication. Webhook endpoints above are
// intentionally public — Meta calls them directly with an HMAC signature.
// ───────────────────────────────────────────────────────────────────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /conversations */
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const {
      status,
      urgency,
      requiresReview,
      beneficiaryId,
      assignedTo,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (urgency) filter.urgencyLevel = urgency;
    if (requiresReview === 'true') filter.requiresHumanReview = true;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (req.user?.organizationId) filter.organizationId = req.user.organizationId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ urgencyLevel: 1, lastMessageAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-messages') // exclude messages array for list view
        .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
        .populate('familyMemberId', 'firstName lastName relationship contactInfo.phone')
        .populate('assignedTo', 'name email')
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) });
  })
);

/** GET /conversations/pending-review */
router.get(
  '/conversations/pending-review',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const data = await Conversation.findPendingReview(req.user?.organizationId);
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /conversations/:id */
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const conv = await Conversation.findById(req.params.id)
      .populate('beneficiaryId', 'personalInfo fileNumber')
      .populate('familyMemberId', 'firstName lastName relationship contactInfo')
      .populate('assignedTo', 'name email')
      .lean();

    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // Generate insights on the fly if requested
    if (req.query.withInsights === 'true') {
      const incomingMsgs = (conv.messages || []).filter(m => m.direction === 'incoming');
      const insight = whatsappAI.analyzeEngagementPatterns(
        incomingMsgs.map(m => ({
          direction: m.direction,
          intent: m.intent,
          sentiment: m.sentiment,
          wasRepliedTo: (conv.messages || []).some(
            r => r.direction === 'outgoing' && r.timestamp > m.timestamp
          ),
        }))
      );
      conv.liveInsight = insight;
    }

    res.json({ success: true, data: conv });
  })
);

/** POST /conversations/:id/resolve */
router.post(
  '/conversations/:id/resolve',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const staffId = req.user?._id || req.user?.id;
    const data = await Conversation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        requiresHumanReview: false,
        resolvedAt: new Date(),
        resolvedBy: staffId,
        resolutionNote: req.body.note,
      },
      { new: true }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  })
);

/** POST /conversations/:id/assign */
router.post(
  '/conversations/:id/assign',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    validate(['staffId'], req.body);
    const data = await Conversation.findByIdAndUpdate(
      req.params.id,
      { assignedTo: req.body.staffId, status: 'pending_review' },
      { new: true }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  })
);

/** POST /conversations/:id/mark-read */
router.post(
  '/conversations/:id/mark-read',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    await Conversation.findByIdAndUpdate(req.params.id, { unreadCount: 0 });
    res.json({ success: true });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

/** POST /send/text */
router.post(
  '/send/text',
  asyncHandler(async (req, res) => {
    validate(['to', 'text'], req.body);
    const {
      to,
      text,
      beneficiaryId,
      familyMemberId,
      staffNote: _staffNote,
      skipConsentCheck,
    } = req.body;
    const staffId = req.user?._id || req.user?.id;

    // Consent gate — free-form text needs the 24h service window OR opt-in.
    // `skipConsentCheck` is an admin override (e.g. staff sending a manual
    // reply they know is in-window but the consent record predates tracking).
    if (!skipConsentCheck) {
      try {
        await whatsappService.assertCanMessage(to, 'any');
      } catch (err) {
        return res.status(err.statusCode || 403).json({
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
    }

    const phone = whatsappService.normalizePhone(to);
    const outcome = await withSendGuards(req, 'text', phone, { to: phone, text }, () =>
      whatsappService.sendText(to, text)
    );

    // Log to conversation on success only.
    if (outcome.status === 200 && outcome.body?.data?.success) {
      const Conversation = getConversationModel();
      await Conversation.findOneAndUpdate(
        { phone },
        {
          $setOnInsert: {
            phone,
            beneficiaryId,
            familyMemberId,
            createdAt: new Date(),
          },
          $push: {
            messages: {
              direction: 'outgoing',
              type: 'text',
              text,
              providerMessageId: outcome.body.data.messageId,
              timestamp: new Date(),
              staffId,
              deliveryStatus: 'sent',
              isReplay: !!outcome.replayed,
            },
          },
          $set: { lastMessageAt: new Date() },
        },
        { upsert: true }
      ).catch(err => logger.warn(`[WhatsApp] Log error: ${err.message}`));
    }

    if (outcome.replayed) res.set('X-Idempotent-Replay', '1');
    return res.status(outcome.status).json(outcome.body);
  })
);

/** POST /send/template */
router.post(
  '/send/template',
  asyncHandler(async (req, res) => {
    validate(['to', 'templateName'], req.body);
    const { to, templateName, language, components, skipConsentCheck } = req.body;
    if (!skipConsentCheck) {
      try {
        await whatsappService.assertCanMessage(to, 'any');
      } catch (err) {
        return res.status(err.statusCode || 403).json({
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
    }
    const phone = whatsappService.normalizePhone(to);
    const outcome = await withSendGuards(
      req,
      'template',
      phone,
      { to: phone, templateName, language, components },
      () => whatsappService.sendTemplate(to, templateName, language, components)
    );
    if (outcome.replayed) res.set('X-Idempotent-Replay', '1');
    return res.status(outcome.status).json(outcome.body);
  })
);

/** POST /send/document */
router.post(
  '/send/document',
  asyncHandler(async (req, res) => {
    validate(['to', 'url'], req.body);
    const { to, url, caption, filename, skipConsentCheck } = req.body;
    if (!skipConsentCheck) {
      try {
        await whatsappService.assertCanMessage(to, 'any');
      } catch (err) {
        return res.status(err.statusCode || 403).json({
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
    }
    const phone = whatsappService.normalizePhone(to);
    const outcome = await withSendGuards(
      req,
      'document',
      phone,
      { to: phone, url, caption, opts: { filename } },
      () => whatsappService.sendDocument(to, url, caption, { filename })
    );
    if (outcome.replayed) res.set('X-Idempotent-Replay', '1');
    return res.status(outcome.status).json(outcome.body);
  })
);

/** POST /send/interactive */
router.post(
  '/send/interactive',
  asyncHandler(async (req, res) => {
    validate(['to', 'type', 'bodyText'], req.body);
    const {
      to,
      type,
      bodyText,
      buttons,
      items,
      buttonLabel,
      sectionTitle,
      headerText,
      footerText,
    } = req.body;

    if (type !== 'buttons' && type !== 'list') {
      throw Object.assign(new Error('type must be buttons or list'), { statusCode: 400 });
    }
    if (type === 'buttons' && !buttons?.length)
      throw Object.assign(new Error('buttons array required'), { statusCode: 400 });
    if (type === 'list' && !items?.length)
      throw Object.assign(new Error('items array required'), { statusCode: 400 });

    const phone = whatsappService.normalizePhone(to);
    const payload =
      type === 'buttons'
        ? { kind: 'buttons', to: phone, bodyText, buttons, headerText, footerText }
        : {
            kind: 'list',
            to: phone,
            bodyText,
            buttonLabel: buttonLabel || 'اختر',
            items,
            sectionTitle,
          };
    const outcome = await withSendGuards(req, 'interactive', phone, payload, () => {
      return type === 'buttons'
        ? whatsappService.sendInteractiveButtons(to, bodyText, buttons, headerText, footerText)
        : whatsappService.sendInteractiveList(
            to,
            bodyText,
            buttonLabel || 'اختر',
            items,
            sectionTitle
          );
    });
    if (outcome.replayed) res.set('X-Idempotent-Replay', '1');
    return res.status(outcome.status).json(outcome.body);
  })
);

/** POST /bulk — bulk send (session reminders batch)
 *
 * Each iteration goes through `withSendGuards` so the same production
 * hardening that protects single sends (rate limit, idempotency, DLQ) also
 * protects bulk fan-out. A cron job that accidentally re-fires the same
 * batch will hit the idempotency cache; a misconfigured loop that targets
 * one phone 200 times will trip the per-phone rate limiter; transient
 * Meta failures land in the DLQ for the worker to replay.
 *
 * Idempotency key derivation: `bulkId` from the caller (or generated) plus
 * the recipient phone + index. So a retry of the SAME batch is deduped per
 * recipient even if the order shifts.
 *
 * Response now distinguishes three terminal states per row:
 *   - { success: true,  data: {...} }                  → Meta accepted
 *   - { success: false, queued: true, code: ... }      → DLQ-enqueued
 *   - { success: false, rateLimited: true, code: ... } → 429 — skipped
 */
router.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    validate(['messages'], req.body);
    const { messages, templateKey, bulkId: callerBulkId } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, message: 'messages array required' });
    }

    const bulkId = callerBulkId || `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results = [];
    const sliced = messages.slice(0, 100); // cap at 100 per call

    for (let i = 0; i < sliced.length; i++) {
      const msg = sliced[i];
      const phone = whatsappService.normalizePhone(msg.phone);

      // Derive a per-recipient idempotency key so re-issuing the same bulkId
      // re-uses cached results from the first run.
      const idemKey = `bulk:${bulkId}:${phone}:${i}`;
      const localReq = {
        ...req,
        get(name) {
          if (typeof name === 'string' && name.toLowerCase() === 'idempotency-key') {
            return idemKey;
          }
          return req.get(name);
        },
        body: { ...req.body, beneficiaryId: msg.beneficiaryId || null },
      };

      let outcome;
      if (templateKey) {
        outcome = await withSendGuards(
          localReq,
          'template',
          phone,
          { to: phone, templateKey, args: msg.args || [] },
          () => whatsappTemplates.sendTemplate(templateKey, msg.phone, msg.args || [])
        );
      } else {
        outcome = await withSendGuards(localReq, 'text', phone, { to: phone, text: msg.text }, () =>
          whatsappService.sendText(msg.phone, msg.text)
        );
      }

      // Translate withSendGuards outcome shape into the bulk row schema.
      // withSendGuards already updates rate-limit / DLQ as side effects.
      if (outcome.status === 429) {
        results.push({
          phone: msg.phone,
          success: false,
          rateLimited: true,
          code: outcome.body.code,
        });
      } else if (outcome.status === 202) {
        results.push({
          phone: msg.phone,
          success: false,
          queued: true,
          code: outcome.body.code,
        });
      } else if (outcome.body?.data?.success) {
        results.push({
          phone: msg.phone,
          success: true,
          messageId: outcome.body.data.messageId,
          replayed: !!outcome.replayed,
        });
      } else {
        results.push({
          phone: msg.phone,
          success: false,
          code: outcome.body?.code || 'UNKNOWN',
        });
      }

      // Meta allows ~80 msg/sec; 15ms gap is plenty when the rate limiter
      // already trims any per-phone abuse.
      await new Promise(r => setTimeout(r, 15));
    }

    const succeeded = results.filter(r => r.success).length;
    const queued = results.filter(r => r.queued).length;
    const rateLimited = results.filter(r => r.rateLimited).length;
    res.json({
      success: true,
      data: {
        bulkId,
        total: results.length,
        succeeded,
        queued,
        rateLimited,
        failed: results.length - succeeded - queued - rateLimited,
        results,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// AI ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/** POST /ai/classify */
router.post(
  '/ai/classify',
  asyncHandler(async (req, res) => {
    validate(['text'], req.body);
    const result = await whatsappAI.classifyIntent(req.body.text, req.body.context || {});
    res.json({ success: true, data: result });
  })
);

/** POST /ai/suggest-replies */
router.post(
  '/ai/suggest-replies',
  asyncHandler(async (req, res) => {
    validate(['intent'], req.body);
    const replies = await whatsappAI.suggestReplies(
      req.body.intent,
      req.body.context || {},
      req.body.count || 3
    );
    res.json({ success: true, data: replies });
  })
);

/** POST /ai/summarize */
router.post(
  '/ai/summarize',
  asyncHandler(async (req, res) => {
    validate(['messages'], req.body);
    const result = await whatsappAI.summarizeConversation(
      req.body.messages,
      req.body.context || {}
    );
    res.json({ success: true, data: result });
  })
);

/** GET /ai/insights/:conversationId */
router.get(
  '/ai/insights/:conversationId',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const conv = await Conversation.findById(req.params.conversationId).select('messages').lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Not found' });

    const insights = whatsappAI.analyzeEngagementPatterns(
      (conv.messages || []).map(m => ({
        direction: m.direction,
        intent: m.intent,
        sentiment: m.sentiment,
        responseTimeMinutes: null,
        wasRepliedTo: false,
      }))
    );
    res.json({ success: true, data: insights });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/** GET /templates */
router.get('/templates', (_req, res) => {
  res.json({ success: true, data: whatsappTemplates.listTemplates() });
});

/** GET /templates/meta — from Meta Business Manager (raw passthrough) */
router.get(
  '/templates/meta',
  asyncHandler(async (_req, res) => {
    const data = await whatsappService.getTemplates();
    res.json({ success: true, data });
  })
);

/** GET /templates/synced — locally cached templates after last sync */
router.get(
  '/templates/synced',
  asyncHandler(async (req, res) => {
    const templateSync = require('../services/whatsapp/templateSync.service');
    const { status, language } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (language) filter.language = language;
    const rows = await templateSync.WhatsAppTemplate.find(filter)
      .sort({ status: 1, templateName: 1 })
      .lean();
    res.json({ success: true, data: rows, total: rows.length });
  })
);

/** POST /templates/sync — pull approved templates from Meta + upsert locally */
router.post(
  '/templates/sync',
  asyncHandler(async (_req, res) => {
    const templateSync = require('../services/whatsapp/templateSync.service');
    const result = await templateSync.sync();
    if (!result.ok) return res.status(502).json({ success: false, ...result });
    res.json({ success: true, data: result });
  })
);

/** POST /templates/session-reminder */
router.post(
  '/templates/session-reminder',
  asyncHandler(async (req, res) => {
    validate(
      ['phone', 'guardianName', 'beneficiaryName', 'sessionDate', 'sessionTime', 'therapistName'],
      req.body
    );
    const result = await whatsappTemplates.sendSessionReminder(req.body.phone, req.body);
    res.json({ success: result.success, data: result });
  })
);

/** POST /templates/progress-report */
router.post(
  '/templates/progress-report',
  asyncHandler(async (req, res) => {
    validate(
      ['phone', 'guardianName', 'beneficiaryName', 'weekLabel', 'achievedGoals', 'progressPercent'],
      req.body
    );
    const result = await whatsappTemplates.sendProgressReport(req.body.phone, req.body);
    res.json({ success: result.success, data: result });
  })
);

/** POST /templates/homework */
router.post(
  '/templates/homework',
  asyncHandler(async (req, res) => {
    validate(
      ['phone', 'guardianName', 'beneficiaryName', 'homeworkTitle', 'dueDate', 'instructions'],
      req.body
    );
    const result = await whatsappTemplates.sendHomeworkAssignment(req.body.phone, req.body);
    res.json({ success: result.success, data: result });
  })
);

/** POST /templates/appointment-confirm */
router.post(
  '/templates/appointment-confirm',
  asyncHandler(async (req, res) => {
    validate(['phone', 'guardianName', 'beneficiaryName', 'date', 'time'], req.body);
    const result = await whatsappTemplates.sendAppointmentConfirmation(req.body.phone, req.body);
    res.json({ success: result.success, data: result });
  })
);

/** POST /templates/welcome */
router.post(
  '/templates/welcome',
  asyncHandler(async (req, res) => {
    validate(['phone', 'guardianName', 'beneficiaryName'], req.body);
    const result = await whatsappTemplates.sendWelcomeMessage(req.body.phone, req.body);
    res.json({ success: result.success, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// STATUS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /status */
router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const enabled = whatsappService.isEnabled();
    let phoneInfo = null;
    if (enabled) {
      phoneInfo = await whatsappService.getPhoneInfo().catch(() => null);
    }
    res.json({
      success: true,
      data: {
        enabled,
        aiEnabled: whatsappAI.isAIEnabled(),
        phoneInfo,
      },
    });
  })
);

/** GET /analytics */
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const { startDate, endDate } = req.query;
    const orgId = req.user?.organizationId;

    const [analytics, pendingReview, critical] = await Promise.all([
      Conversation.getAnalytics(orgId, startDate, endDate),
      Conversation.countDocuments({
        requiresHumanReview: true,
        status: { $ne: 'resolved' },
        isDeleted: false,
      }),
      Conversation.countDocuments({
        urgencyLevel: 'critical',
        status: { $ne: 'resolved' },
        isDeleted: false,
      }),
    ]);

    res.json({
      success: true,
      data: {
        ...(analytics[0] || {}),
        pendingReview,
        critical,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// CONSENT — opt-in / opt-out tracking (Meta policy + PDPL Art.13)
// ═══════════════════════════════════════════════════════════════════════════

function getConsentModel() {
  return require('../models/WhatsAppConsent');
}

/** GET /consent/:phone — read consent state for a phone. */
router.get(
  '/consent/:phone',
  asyncHandler(async (req, res) => {
    const phone = whatsappService.normalizePhone(req.params.phone);
    const doc = await getConsentModel().findOne({ phone }).lean();
    if (!doc) {
      return res.json({
        success: true,
        data: { phone, optedIn: false, history: [], _exists: false },
      });
    }
    res.json({ success: true, data: doc });
  })
);

/** POST /consent/:phone/opt-in  — record opt-in. */
router.post(
  '/consent/:phone/opt-in',
  asyncHandler(async (req, res) => {
    const phone = whatsappService.normalizePhone(req.params.phone);
    const doc = await getConsentModel().setConsent(phone, true, {
      reason: req.body?.reason || 'admin_action',
      channel: req.body?.channel || 'admin_ui',
      note: req.body?.note || null,
      actorUserId: req.user?.userId || req.user?.id || null,
      ip: req.ip,
    });
    res.json({ success: true, data: doc });
  })
);

/** POST /consent/:phone/opt-out — record opt-out (right-to-be-forgotten lite). */
router.post(
  '/consent/:phone/opt-out',
  asyncHandler(async (req, res) => {
    const phone = whatsappService.normalizePhone(req.params.phone);
    const doc = await getConsentModel().setConsent(phone, false, {
      reason: req.body?.reason || 'user_request',
      channel: req.body?.channel || 'admin_ui',
      note: req.body?.note || null,
      actorUserId: req.user?.userId || req.user?.id || null,
      ip: req.ip,
    });
    res.json({ success: true, data: doc });
  })
);

/** GET /consent/:phone/can-message — pre-flight check before sending. */
router.get(
  '/consent/:phone/can-message',
  asyncHandler(async (req, res) => {
    const phone = whatsappService.normalizePhone(req.params.phone);
    const result = await getConsentModel().canMessage(phone);
    res.json({ success: true, data: { phone, ...result } });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMIT + DLQ — operational visibility & manual control
// ═══════════════════════════════════════════════════════════════════════════

/** GET /rate-limit/:phone — current counters for one phone. */
router.get(
  '/rate-limit/:phone',
  asyncHandler(async (req, res) => {
    const phone = whatsappService.normalizePhone(req.params.phone);
    const stats = await whatsappRateLimit.getStats(phone);
    const caps = whatsappRateLimit._caps();
    res.json({ success: true, data: { phone, counters: stats, caps } });
  })
);

/** GET /dlq — paginated list of failed/queued sends. */
router.get(
  '/dlq',
  asyncHandler(async (req, res) => {
    const Dlq = mongoose.models.WhatsAppDlq || require('../models/WhatsAppDlq');
    const { status, page = 1, limit = 50, phone } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (phone) filter.phone = whatsappService.normalizePhone(phone);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Dlq.find(filter)
        .sort({ nextRetryAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Dlq.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  })
);

/** POST /dlq/:id/replay — admin force-replay one DLQ item now. */
router.post(
  '/dlq/:id/replay',
  asyncHandler(async (req, res) => {
    const r = await whatsappDlq.replayOne(req.params.id, { skipConsent: false });
    if (!r.ok) return res.status(400).json({ success: false, ...r });
    res.json({ success: true, data: r });
  })
);

/** POST /dlq/:id/abandon — mark as abandoned (won't be auto-replayed). */
router.post(
  '/dlq/:id/abandon',
  asyncHandler(async (req, res) => {
    const Dlq = mongoose.models.WhatsAppDlq || require('../models/WhatsAppDlq');
    const doc = await Dlq.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'abandoned',
          lockedUntil: null,
          notes: req.body?.reason || 'admin_abandon',
        },
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  })
);

/** POST /dlq/sweep — admin trigger one sweep cycle (debug / staging). */
router.post(
  '/dlq/sweep',
  asyncHandler(async (_req, res) => {
    const r = await whatsappDlq.sweepOnce();
    res.json({ success: true, data: r });
  })
);

module.exports = router;
