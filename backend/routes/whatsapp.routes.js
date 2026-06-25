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
 *     GET  /api/whatsapp/event-bindings    — core event → template map (W727)
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
const {
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');

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
const whatsappBeneficiaryContext = require('../services/whatsapp/whatsappBeneficiaryContext.service');
const whatsappCampaign = require('../services/whatsapp/whatsappCampaign.service');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const socketEmitter = require('../utils/socketEmitter');
const { stripUpdateMeta } = require('../utils/sanitize');
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
    const branchScope = effectiveBranchScope(req); // W1407: branch isolation (was never-set organizationId)
    if (branchScope) filter.branchId = branchScope;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ urgencyRank: -1, lastMessageAt: -1 })
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
    const data = await Conversation.findPendingReview(effectiveBranchScope(req));
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /conversations/:id */
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const conv = await Conversation.findOne(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req))
    )
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

/**
 * GET /conversations/:id/context — rehab-context sidebar (W1491)
 *
 * Returns the linked beneficiary's identity + disability, active care plan,
 * active goals, upcoming sessions (+ therapists), and outstanding invoices so
 * staff get full clinical context WITHOUT leaving the Inbox. Branch-isolated
 * via byIdScopedFilter (a foreign-branch conversation id → clean 404); the
 * aggregation itself is best-effort (Promise.allSettled) so one slow/missing
 * source never blanks the panel.
 */
router.get(
  '/conversations/:id/context',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const conv = await Conversation.findOne(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req))
    )
      .select('_id beneficiaryId branchId phone senderName')
      .lean();

    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // Unlinked conversation (no beneficiary on file yet) → empty-but-shaped
    // payload so the UI renders a "link a beneficiary" state, not an error.
    if (!conv.beneficiaryId) {
      return res.json({
        success: true,
        data: { linked: false, ...whatsappBeneficiaryContext.emptyContext() },
      });
    }

    const context = await whatsappBeneficiaryContext.buildContext({
      beneficiaryId: conv.beneficiaryId,
    });
    res.json({ success: true, data: { linked: true, ...context } });
  })
);

/** POST /conversations/:id/resolve */
router.post(
  '/conversations/:id/resolve',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const staffId = req.user?._id || req.user?.id;
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      {
        status: 'resolved',
        requiresHumanReview: false,
        resolvedAt: new Date(),
        resolvedBy: staffId,
        resolutionNote: req.body.note,
      },
      { returnDocument: 'after' }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });

    socketEmitter.emitWhatsAppConversationUpdate({
      branchId: data.branchId?.toString?.() || data.branchId,
      organizationId: data.organizationId?.toString?.() || data.organizationId,
      conversationId: data._id?.toString?.() || data._id,
      changes: {
        status: data.status,
        requiresHumanReview: data.requiresHumanReview,
        resolvedAt: data.resolvedAt,
        resolvedBy: data.resolvedBy,
        unreadCount: data.unreadCount || 0,
      },
    });

    res.json({ success: true, data });
  })
);

/** POST /conversations/:id/assign */
router.post(
  '/conversations/:id/assign',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    validate(['staffId'], req.body);
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      { assignedTo: req.body.staffId, status: 'pending_review' },
      { returnDocument: 'after' }
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
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      { unreadCount: 0 },
      {
        returnDocument: 'after',
        projection: { _id: 1, branchId: 1, organizationId: 1, unreadCount: 1 },
      }
    ).lean();

    if (data) {
      socketEmitter.emitWhatsAppConversationUpdate({
        branchId: data.branchId?.toString?.() || data.branchId,
        organizationId: data.organizationId?.toString?.() || data.organizationId,
        conversationId: data._id?.toString?.() || data._id,
        changes: { unreadCount: 0 },
      });
    }

    res.json({ success: true });
  })
);

/**
 * POST /conversations/:id/notes — add a private staff note (W1493).
 * Internal only; never sent to WhatsApp. Branch-isolated; explicit field
 * extraction (no mass-assignment).
 */
router.post(
  '/conversations/:id/notes',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    validate(['text'], req.body);
    const note = {
      text: String(req.body.text).slice(0, 4000),
      authorId: req.user?._id || req.user?.id || null,
      authorName: req.user?.name || req.user?.email || null,
      createdAt: new Date(),
    };
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      { $push: { internalNotes: note } },
      { returnDocument: 'after', projection: { internalNotes: 1 } }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    const notes = data.internalNotes || [];
    res
      .status(201)
      .json({ success: true, data: { note: notes[notes.length - 1], total: notes.length } });
  })
);

/**
 * POST /conversations/:id/transfer — hand the conversation to another staff
 * member with an audited reason (W1493). Strengthens /assign with a transfer
 * trail. Branch-isolated; explicit field extraction (no mass-assignment).
 */
router.post(
  '/conversations/:id/transfer',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    validate(['staffId'], req.body);
    const toUserId = String(req.body.staffId);
    if (!mongoose.isValidObjectId(toUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid staffId' });
    }
    const reason = req.body.reason ? String(req.body.reason).slice(0, 1000) : undefined;

    // Read the current assignee first so the audit entry records who it left.
    const current = await Conversation.findOne(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req))
    )
      .select('_id assignedTo branchId organizationId')
      .lean();
    if (!current) return res.status(404).json({ success: false, message: 'Not found' });

    const entry = {
      fromUserId: current.assignedTo || req.user?._id || req.user?.id || null,
      toUserId,
      reason,
      at: new Date(),
    };
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      { $set: { assignedTo: toUserId, status: 'pending_review' }, $push: { transferLog: entry } },
      { returnDocument: 'after' }
    )
      .populate('assignedTo', 'name email')
      .lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });

    socketEmitter.emitWhatsAppConversationUpdate({
      branchId: data.branchId?.toString?.() || data.branchId,
      organizationId: data.organizationId?.toString?.() || data.organizationId,
      conversationId: data._id?.toString?.() || data._id,
      changes: { assignedTo: toUserId, status: data.status },
    });

    res.json({ success: true, data });
  })
);

/**
 * POST /conversations/:id/link — cross-reference this thread to a Complaint
 * ticket and/or ClinicalSession (W1493). Pass null/'' to clear a link.
 * Branch-isolated.
 */
router.post(
  '/conversations/:id/link',
  asyncHandler(async (req, res) => {
    const Conversation = getConversationModel();
    const set = {};
    if ('ticketId' in req.body) {
      const t = req.body.ticketId;
      if (t === null || t === '') set.linkedTicketId = null;
      else if (mongoose.isValidObjectId(t)) set.linkedTicketId = t;
      else return res.status(400).json({ success: false, message: 'Invalid ticketId' });
    }
    if ('sessionId' in req.body) {
      const s = req.body.sessionId;
      if (s === null || s === '') set.linkedSessionId = null;
      else if (mongoose.isValidObjectId(s)) set.linkedSessionId = s;
      else return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }
    if (Object.keys(set).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide ticketId or sessionId' });
    }
    const data = await Conversation.findOneAndUpdate(
      Conversation.byIdScopedFilter(req.params.id, effectiveBranchScope(req)),
      { $set: set },
      { returnDocument: 'after', projection: { linkedTicketId: 1, linkedSessionId: 1 } }
    ).lean();
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS (W1495) — persisted, trackable broadcasts over a saved contact
// group. The send reuses the consent-filter + rate-limit + template primitives;
// these routes are a thin branch-scoped layer over whatsappCampaign.service.
// ═══════════════════════════════════════════════════════════════════════════

/** GET /campaigns — list (branch-scoped, optional ?status) */
router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const data = await whatsappCampaign.listCampaigns(effectiveBranchScope(req), {
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /campaigns — create (draft, or scheduled if scheduledAt given) */
router.post(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const data = await whatsappCampaign.createCampaign(req.body || {}, {
      branchId: effectiveBranchScope(req),
      actorId: req.user?._id || req.user?.id || null,
    });
    res.status(201).json({ success: true, data });
  })
);

/** GET /campaigns/:id */
router.get(
  '/campaigns/:id',
  asyncHandler(async (req, res) => {
    const data = await whatsappCampaign.getCampaign(req.params.id, effectiveBranchScope(req));
    if (!data) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data });
  })
);

/** POST /campaigns/:id/run — launch now (consent-filtered send) */
router.post(
  '/campaigns/:id/run',
  asyncHandler(async (req, res) => {
    const data = await whatsappCampaign.runCampaign(req.params.id, effectiveBranchScope(req));
    res.json({ success: true, data });
  })
);

/** POST /campaigns/:id/cancel */
router.post(
  '/campaigns/:id/cancel',
  asyncHandler(async (req, res) => {
    const data = await whatsappCampaign.cancelCampaign(req.params.id, effectiveBranchScope(req));
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════════════════

/** POST /send/text */
router.post(
  '/send/text',
  asyncHandler(async (req, res) => {
    validate(['to', 'text'], stripUpdateMeta(req.body));
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
    const conv = await Conversation.findOne(
      Conversation.byIdScopedFilter(req.params.conversationId, effectiveBranchScope(req))
    )
      .select('messages')
      .lean();
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

/** GET /event-bindings — W727: core event → template binding map (admin UI) */
router.get(
  '/event-bindings',
  asyncHandler(async (_req, res) => {
    const whatsappEventBindings = require('../services/whatsapp/whatsappEventBindings.service');
    const data = await whatsappEventBindings.listBindingsWithStatus();
    res.json({ success: true, data });
  })
);

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
    const branchScope = effectiveBranchScope(req); // W1407: branch isolation

    const filters = Conversation.queueCountFilters(branchScope);
    const [analytics, pendingReview, critical] = await Promise.all([
      Conversation.getAnalytics(branchScope, startDate, endDate),
      Conversation.countDocuments(filters.pendingReview),
      Conversation.countDocuments(filters.critical),
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

/**
 * GET /bot/unmatched-intents — W1417 keyword-tuning feedback.
 * Top free-text phrases the menu bot could NOT route to any unit, by frequency.
 * Admin-gated: this is cross-tenant AGGREGATE tuning telemetry (not per-branch
 * PII), 30-day TTL'd, normalized — used to extend UNIT_KEYWORDS post-launch.
 */
router.get(
  '/bot/unmatched-intents',
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const insights = require('../services/whatsapp/whatsappBotInsights.service');
    const data = await insights.topUnmatched(req.query.limit);
    res.json({ success: true, data, total: data.length });
  })
);

/**
 * GET /bot/usage — W1419 bot usage funnel. Per-unit entered / completed counts +
 * completion rate, most-used first. Admin-gated aggregate (non-PID) telemetry —
 * shows which units users engage and where flows are abandoned.
 */
router.get(
  '/bot/usage',
  authorize('admin', 'super_admin', 'manager'),
  asyncHandler(async (req, res) => {
    const insights = require('../services/whatsapp/whatsappBotInsights.service');
    const data = await insights.usageSummary();
    res.json({ success: true, data, total: data.length });
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
// CONTACT GROUPS — org-scoped recipient segmentation (W746)
// ═══════════════════════════════════════════════════════════════════════════

function getContactGroupModel() {
  return mongoose.models.WhatsAppContactGroup || require('../models/WhatsAppContactGroup');
}

/** GET /contact-groups — list groups for the caller's org. */
router.get(
  '/contact-groups',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const { search, tag, page = 1, limit = 50 } = req.query;
    const filter = Group.listScopedFilter(branchScope, { search, tag });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      Group.find(filter)
        .sort({ updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Group.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items.map(g => ({ ...g, memberCount: (g.members || []).length })),
      pagination: { page: pageNum, limit: limitNum, total },
    });
  })
);

/** POST /contact-groups — create a new group. */
router.post(
  '/contact-groups',
  asyncHandler(async (req, res) => {
    validate(['name'], req.body);
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const actorId = req.user?.userId || req.user?.id || null;
    const members = Group.dedupeMembers(req.body.members).map(m => ({
      ...m,
      addedBy: actorId,
    }));
    const doc = await Group.create({
      branchId: branchScope, // W1412: tenant scope from the creating user's branch
      name: String(req.body.name).trim(),
      description: req.body.description || null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      color: req.body.color || null,
      members,
      createdBy: actorId,
    });
    res.status(201).json({ success: true, data: doc });
  })
);

/**
 * GET /contact-groups/stats — org-scoped roll-up (W749).
 *
 * Read-only summary across all of the caller's active groups: total groups,
 * total members, per-tag member distribution, and the largest group. Declared
 * BEFORE /contact-groups/:id so the literal "stats" segment is not captured as
 * an :id param.
 */
router.get(
  '/contact-groups/stats',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const filter = Group.listScopedFilter(branchScope, {});
    const groups = await Group.find(filter).select('name tags members').lean();
    res.json({ success: true, data: Group.summarizeGroups(groups) });
  })
);

/** GET /contact-groups/:id — single group (org-scoped). */
router.get(
  '/contact-groups/:id',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: { ...doc, memberCount: (doc.members || []).length } });
  })
);

/** PATCH /contact-groups/:id — update name/description/tags/color. */
router.patch(
  '/contact-groups/:id',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const update = {};
    if (req.body.name != null) update.name = String(req.body.name).trim();
    if (req.body.description !== undefined) update.description = req.body.description || null;
    if (Array.isArray(req.body.tags)) update.tags = req.body.tags;
    if (req.body.color !== undefined) update.color = req.body.color || null;
    const doc = await Group.findOneAndUpdate(
      Group.groupScopedFilter(req.params.id, branchScope),
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: doc });
  })
);

/** DELETE /contact-groups/:id — soft delete. */
router.delete(
  '/contact-groups/:id',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOneAndUpdate(
      Group.groupScopedFilter(req.params.id, branchScope),
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  })
);

/** POST /contact-groups/:id/members — add (deduped) members. */
router.post(
  '/contact-groups/:id/members',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const actorId = req.user?.userId || req.user?.id || null;
    const incoming = Array.isArray(req.body.members)
      ? req.body.members
      : req.body.phone
        ? [{ phone: req.body.phone, displayName: req.body.displayName }]
        : [];
    const additions = Group.dedupeMembers(incoming);
    if (!additions.length) {
      return res.status(400).json({ success: false, message: 'No valid members supplied' });
    }
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    // Merge existing + incoming, dedupe by phone (last-wins).
    doc.members = Group.dedupeMembers([
      ...(doc.members || []),
      ...additions.map(m => ({ ...m, addedBy: actorId })),
    ]);
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/** DELETE /contact-groups/:id/members/:phone — remove one member. */
router.delete(
  '/contact-groups/:id/members/:phone',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const target = Group.normalizePhone(req.params.phone);
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    const before = (doc.members || []).length;
    doc.members = (doc.members || []).filter(m => Group.normalizePhone(m.phone) !== target);
    if (doc.members.length === before) {
      return res.status(404).json({ success: false, message: 'Member not in group' });
    }
    await doc.save();
    res.json({ success: true, data: doc });
  })
);

/**
 * GET /contact-groups/:id/broadcast-preview — eligibility preview (W747).
 *
 * Read-only. Runs each member's phone through WhatsAppConsent.canMessage and
 * partitions into eligible vs blocked, so staff can see who a broadcast would
 * actually reach (and why the rest are excluded) BEFORE any message is sent.
 * No send is performed here.
 */
router.get(
  '/contact-groups/:id/broadcast-preview',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const Consent = getConsentModel();
    const members = doc.members || [];
    const verdicts = await Promise.all(
      members.map(async m => {
        const phone = Group.normalizePhone(m.phone);
        try {
          const v = await Consent.canMessage(phone);
          return [phone, v || { allowed: false, reason: 'unknown' }];
        } catch {
          return [phone, { allowed: false, reason: 'consent_check_failed' }];
        }
      })
    );
    const eligibilityByPhone = Object.fromEntries(verdicts);
    const { eligible, blocked, total } = Group.partitionByEligibility(members, eligibilityByPhone);

    res.json({
      success: true,
      data: {
        groupId: String(doc._id),
        name: doc.name,
        total,
        eligibleCount: eligible.length,
        blockedCount: blocked.length,
        eligible,
        blocked,
      },
    });
  })
);

/**
 * GET /contact-groups/:id/members.csv — export members as CSV (W750).
 *
 * Read-only. Streams the group's members (phone, displayName, addedAt) as a
 * downloadable CSV. Cells are escaped and formula-injection-neutralised by the
 * model helper, so the file is safe to open in spreadsheet software.
 */
router.get(
  '/contact-groups/:id/members.csv',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    const safeName = String(doc.name || 'group').replace(/[^a-zA-Z0-9_-]+/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contact-group-${safeName}.csv"`);
    res.send(Group.membersToCsv(doc));
  })
);

/**
 * GET /contact-groups/:id/members/search?q=… — search members within a group.
 *
 * Read-only. Filters the group's members case-insensitively by phone digits or
 * displayName via the model helper. A blank query returns all members. Keeps
 * large groups navigable without shipping every row to the client.
 */
router.get(
  '/contact-groups/:id/members/search',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope))
      .select('name members')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });
    const matches = Group.searchMembers(doc.members || [], req.query.q);
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        query: String(req.query.q == null ? '' : req.query.q),
        total: (doc.members || []).length,
        count: matches.length,
        members: matches,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/members/import-csv — bulk-add members from CSV (W751).
 *
 * Round-trips with the W750 export: accepts a CSV body (header with a `phone`
 * column, optional `displayName`), parses + de-dupes via the model helper, then
 * merges into the group (last-wins by phone). Returns how many rows parsed and
 * how many were newly added. Body: { csv: "<csv text>" }.
 *
 * Pass `?dryRun=true` (or body `{ dryRun: true }`) to PREVIEW the diff against
 * existing members (new vs already-present) WITHOUT persisting anything (W752).
 */
router.post(
  '/contact-groups/:id/members/import-csv',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const actorId = req.user?.userId || req.user?.id || null;
    const dryRun = req.query.dryRun === 'true' || (req.body && req.body.dryRun === true);
    const parsed = Group.parseCsvMembers(req.body && req.body.csv);
    if (!parsed.length) {
      return res.status(400).json({ success: false, message: 'No valid members found in CSV' });
    }
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const diff = Group.diffMembers(doc.members || [], parsed);
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          id: String(doc._id),
          dryRun: true,
          parsed: parsed.length,
          wouldAdd: diff.addCount,
          duplicates: diff.duplicateCount,
          toAdd: diff.toAdd,
        },
      });
    }

    const before = (doc.members || []).length;
    doc.members = Group.dedupeMembers([
      ...(doc.members || []),
      ...parsed.map(m => ({ ...m, addedBy: actorId })),
    ]);
    await doc.save();
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        parsed: parsed.length,
        added: doc.members.length - before,
        total: doc.members.length,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/merge — fold another group's members into this one (W754).
 *
 * Body: { sourceId: "<group id>", dryRun?: boolean }. Both groups must belong to
 * the caller's org. Members are de-duped by phone (target wins on conflict). The
 * source group is left untouched. Pass `dryRun` to preview the impact without
 * persisting.
 */
router.post(
  '/contact-groups/:id/merge',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const actorId = req.user?.userId || req.user?.id || null;
    const sourceId = req.body && req.body.sourceId;
    const dryRun = req.query.dryRun === 'true' || (req.body && req.body.dryRun === true);
    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }
    if (String(sourceId) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Cannot merge a group into itself' });
    }
    const [target, source] = await Promise.all([
      Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)),
      Group.findOne(Group.groupScopedFilter(sourceId, branchScope)).lean(),
    ]);
    if (!target) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source group not found' });
    }

    const result = Group.mergeMembers(target.members || [], source.members || []);
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          id: String(target._id),
          sourceId: String(source._id),
          dryRun: true,
          wouldAdd: result.addCount,
          duplicates: result.duplicateCount,
          total: result.merged.length,
        },
      });
    }

    target.members = result.merged.map(m => (m.addedBy ? m : { ...m, addedBy: actorId }));
    await target.save();
    res.json({
      success: true,
      data: {
        id: String(target._id),
        sourceId: String(source._id),
        added: result.addCount,
        duplicates: result.duplicateCount,
        total: target.members.length,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/members/bulk-remove — drop members by phone (W755).
 *
 * Body: { phones: ["966…", …], dryRun?: boolean }. Phones are normalized before
 * matching, so any format is accepted. Reports how many were removed and how
 * many requested phones were not present. Pass `dryRun` to preview without
 * persisting.
 */
router.post(
  '/contact-groups/:id/members/bulk-remove',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const phones = req.body && req.body.phones;
    const dryRun = req.query.dryRun === 'true' || (req.body && req.body.dryRun === true);
    if (!Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ success: false, message: 'phones must be a non-empty array' });
    }
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const result = Group.removeMembers(doc.members || [], phones);
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          id: String(doc._id),
          dryRun: true,
          wouldRemove: result.removedCount,
          notFound: result.notFoundCount,
          total: result.remaining.length,
        },
      });
    }

    doc.members = result.remaining;
    await doc.save();
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        removed: result.removedCount,
        notFound: result.notFoundCount,
        total: doc.members.length,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/members/bulk-add — add members by phone list (W756).
 *
 * Body: { phones: ["966…" | { phone, displayName }, …], dryRun?: boolean }.
 * Phones are normalized; entries already present are skipped, invalid entries
 * (no digits) are counted. Pass `dryRun` to preview without persisting.
 */
router.post(
  '/contact-groups/:id/members/bulk-add',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const actorId = req.user?._id || null;
    const phones = req.body && req.body.phones;
    const dryRun = req.query.dryRun === 'true' || (req.body && req.body.dryRun === true);
    if (!Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ success: false, message: 'phones must be a non-empty array' });
    }
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const result = Group.addMembers(doc.members || [], phones);
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          id: String(doc._id),
          dryRun: true,
          wouldAdd: result.addedCount,
          duplicates: result.duplicateCount,
          invalid: result.invalidCount,
          total: result.merged.length,
        },
      });
    }

    doc.members = result.merged.map(m => (m.addedBy ? m : { ...m, addedBy: actorId }));
    await doc.save();
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        added: result.addedCount,
        duplicates: result.duplicateCount,
        invalid: result.invalidCount,
        total: doc.members.length,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/members/dedupe — collapse duplicate members (W757).
 *
 * Removes redundant rows sharing the same normalized phone (last-wins). Pass
 * `dryRun` (query or body) to preview the removal count without persisting.
 */
router.post(
  '/contact-groups/:id/members/dedupe',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const dryRun = req.query.dryRun === 'true' || (req.body && req.body.dryRun === true);
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const result = Group.dedupeReport(doc.members || []);
    if (dryRun) {
      return res.json({
        success: true,
        data: {
          id: String(doc._id),
          dryRun: true,
          wouldRemove: result.removedCount,
          total: result.deduped.length,
        },
      });
    }

    doc.members = result.deduped;
    await doc.save();
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        removed: result.removedCount,
        total: doc.members.length,
      },
    });
  })
);

/**
 * PATCH /contact-groups/:id/members/:phone — rename a single member (W758).
 *
 * Updates the member's displayName (body `{ displayName }`); a null/blank value
 * clears it. The phone path segment is normalized before matching, so any
 * format works. 404 when the group or member is not found.
 */
router.patch(
  '/contact-groups/:id/members/:phone',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const displayName = req.body ? req.body.displayName : null;
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope));
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const result = Group.renameMember(doc.members || [], req.params.phone, displayName);
    if (!result.updated) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    doc.members = result.members;
    await doc.save();
    res.json({
      success: true,
      data: { id: String(doc._id), phone: Group.normalizePhone(req.params.phone) },
    });
  })
);

/**
 * GET /contact-groups/:id/members/:phone — fetch a single member (W759).
 *
 * Returns the member matching the (normalized) phone, or 404 when the group or
 * member is not found. Read-only.
 */
router.get(
  '/contact-groups/:id/members/:phone',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const member = Group.findMember(doc.members || [], req.params.phone);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    res.json({ success: true, data: { id: String(doc._id), member } });
  })
);

/**
 * GET /contact-groups/:id/members — list a group's members as JSON (W760).
 *
 * Optional `?sort=name|phone` (defaults to phone) and `?page=&limit=`
 * pagination (W761; limit clamped to 200). Read-only.
 */
router.get(
  '/contact-groups/:id/members',
  asyncHandler(async (req, res) => {
    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const sort = req.query.sort === 'name' ? 'name' : 'phone';
    const sorted = Group.sortMembers(doc.members || [], sort);
    const paged = Group.paginateMembers(sorted, req.query.page, req.query.limit);
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        sort,
        page: paged.page,
        limit: paged.limit,
        total: paged.total,
        totalPages: paged.totalPages,
        members: paged.items,
      },
    });
  })
);

/**
 * POST /contact-groups/:id/broadcast — segment-based broadcast (W748).
 *
 * Sends a template (or service-window text) to every ELIGIBLE member of a
 * group. Eligibility is resolved automatically via WhatsAppConsent.canMessage,
 * so consent/opt-out filtering is built in (PDPL-safe) — blocked members are
 * never contacted. Each eligible recipient is fanned out through
 * `withSendGuards`, inheriting the same rate-limit / idempotency / DLQ
 * hardening as single + bulk sends.
 *
 * Body: { templateKey, args? } OR { text }. Optional { broadcastId } for
 * idempotent re-issue (per-recipient key derived from it).
 *
 * Distinct from POST /bulk: that takes an explicit phone list with no consent
 * gate; this resolves a saved segment and enforces consent automatically.
 */
router.post(
  '/contact-groups/:id/broadcast',
  asyncHandler(async (req, res) => {
    const { templateKey, args, text } = req.body;
    if (!templateKey && !text) {
      return res.status(400).json({ success: false, message: 'Missing: templateKey or text' });
    }

    const Group = getContactGroupModel();
    const branchScope = effectiveBranchScope(req); // W1412: branch isolation (was never-set organizationId)
    const doc = await Group.findOne(Group.groupScopedFilter(req.params.id, branchScope)).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Group not found' });

    const Consent = getConsentModel();
    const members = doc.members || [];
    const verdicts = await Promise.all(
      members.map(async m => {
        const phone = Group.normalizePhone(m.phone);
        try {
          const v = await Consent.canMessage(phone);
          return [phone, v || { allowed: false, reason: 'unknown' }];
        } catch {
          return [phone, { allowed: false, reason: 'consent_check_failed' }];
        }
      })
    );
    const eligibilityByPhone = Object.fromEntries(verdicts);
    const { eligible, blocked } = Group.partitionByEligibility(members, eligibilityByPhone);

    const broadcastId =
      req.body.broadcastId ||
      `bcast-${doc._id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results = [];
    const targets = eligible.slice(0, 100); // cap per call

    for (let i = 0; i < targets.length; i++) {
      const phone = Group.normalizePhone(targets[i].phone);
      const idemKey = `bcast:${broadcastId}:${phone}:${i}`;
      const localReq = {
        ...req,
        get(name) {
          if (typeof name === 'string' && name.toLowerCase() === 'idempotency-key') {
            return idemKey;
          }
          return req.get(name);
        },
        body: { ...req.body, beneficiaryId: targets[i].beneficiaryId || null },
      };

      let outcome;
      if (templateKey) {
        outcome = await withSendGuards(
          localReq,
          'template',
          phone,
          { to: phone, templateKey, args: args || [] },
          () => whatsappTemplates.sendTemplate(templateKey, phone, args || [])
        );
      } else {
        outcome = await withSendGuards(localReq, 'text', phone, { to: phone, text }, () =>
          whatsappService.sendText(phone, text)
        );
      }

      if (outcome.status === 429) {
        results.push({ phone, success: false, rateLimited: true, code: outcome.body.code });
      } else if (outcome.status === 202) {
        results.push({ phone, success: false, queued: true, code: outcome.body.code });
      } else if (outcome.body?.data?.success) {
        results.push({
          phone,
          success: true,
          messageId: outcome.body.data.messageId,
          replayed: !!outcome.replayed,
        });
      } else {
        results.push({ phone, success: false, code: outcome.body?.code || 'UNKNOWN' });
      }

      await new Promise(r => setTimeout(r, 15));
    }

    const succeeded = results.filter(r => r.success).length;
    const queued = results.filter(r => r.queued).length;
    const rateLimited = results.filter(r => r.rateLimited).length;
    res.json({
      success: true,
      data: {
        broadcastId,
        groupId: String(doc._id),
        name: doc.name,
        total: members.length,
        eligibleCount: eligible.length,
        blockedCount: blocked.length,
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
      { returnDocument: 'after' }
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
