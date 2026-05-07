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
const mongoose = require('mongoose');

const whatsappService = require('../services/whatsapp/whatsappService');
const whatsappAI = require('../services/whatsapp/whatsappAI.service');
const whatsappWebhook = require('../services/whatsapp/whatsappWebhook.service');
const whatsappTemplates = require('../services/whatsapp/whatsappTemplates.service');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
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

/** POST /webhook — Inbound events from Meta */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    // Acknowledge immediately (Meta requires < 5s)
    res.sendStatus(200);

    const rawBody = req.body?.toString?.() || JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'];
    let parsed;
    try {
      parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      parsed = {};
    }

    const result = await whatsappWebhook.processWebhook(parsed, rawBody, signature);
    logger.info(`[WhatsApp Webhook] Processed: ${JSON.stringify(result)}`);
  })
);

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
    const { to, text, beneficiaryId, familyMemberId, staffNote: _staffNote } = req.body;
    const staffId = req.user?._id || req.user?.id;

    const result = await whatsappService.sendText(to, text);

    // Log to conversation
    if (result.success) {
      const Conversation = getConversationModel();
      await Conversation.findOneAndUpdate(
        { phone: whatsappService.normalizePhone(to) },
        {
          $setOnInsert: {
            phone: whatsappService.normalizePhone(to),
            beneficiaryId,
            familyMemberId,
            createdAt: new Date(),
          },
          $push: {
            messages: {
              direction: 'outgoing',
              type: 'text',
              text,
              providerMessageId: result.messageId,
              timestamp: new Date(),
              staffId,
              deliveryStatus: 'sent',
            },
          },
          $set: { lastMessageAt: new Date() },
        },
        { upsert: true }
      ).catch(err => logger.warn(`[WhatsApp] Log error: ${err.message}`));
    }

    res.json({ success: result.success, data: result });
  })
);

/** POST /send/template */
router.post(
  '/send/template',
  asyncHandler(async (req, res) => {
    validate(['to', 'templateName'], req.body);
    const { to, templateName, language, components } = req.body;
    const result = await whatsappService.sendTemplate(to, templateName, language, components);
    res.json({ success: result.success, data: result });
  })
);

/** POST /send/document */
router.post(
  '/send/document',
  asyncHandler(async (req, res) => {
    validate(['to', 'url'], req.body);
    const { to, url, caption, filename } = req.body;
    const result = await whatsappService.sendDocument(to, url, caption, { filename });
    res.json({ success: result.success, data: result });
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

    let result;
    if (type === 'buttons') {
      if (!buttons?.length)
        throw Object.assign(new Error('buttons array required'), { statusCode: 400 });
      result = await whatsappService.sendInteractiveButtons(
        to,
        bodyText,
        buttons,
        headerText,
        footerText
      );
    } else if (type === 'list') {
      if (!items?.length)
        throw Object.assign(new Error('items array required'), { statusCode: 400 });
      result = await whatsappService.sendInteractiveList(
        to,
        bodyText,
        buttonLabel || 'اختر',
        items,
        sectionTitle
      );
    } else {
      throw Object.assign(new Error('type must be buttons or list'), { statusCode: 400 });
    }

    res.json({ success: result.success, data: result });
  })
);

/** POST /bulk — bulk send (session reminders batch) */
router.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    validate(['messages'], req.body);
    const { messages, templateKey } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, message: 'messages array required' });
    }

    const results = [];
    for (const msg of messages.slice(0, 100)) {
      // cap at 100 per call
      try {
        let result;
        if (templateKey) {
          result = await whatsappTemplates.sendTemplate(templateKey, msg.phone, msg.args || []);
        } else {
          result = await whatsappService.sendText(msg.phone, msg.text);
        }
        results.push({ phone: msg.phone, ...result });
        // Rate limit: 80 msgs/sec allowed by Meta, add small buffer
        await new Promise(r => setTimeout(r, 15));
      } catch (err) {
        results.push({ phone: msg.phone, success: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    res.json({
      success: true,
      data: { total: results.length, succeeded, failed: results.length - succeeded, results },
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

/** GET /templates/meta — from Meta Business Manager */
router.get(
  '/templates/meta',
  asyncHandler(async (_req, res) => {
    const data = await whatsappService.getTemplates();
    res.json({ success: true, data });
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

module.exports = router;
