/**
 * WhatsApp Webhook Processor — معالج Webhook لواتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Processes inbound events from Meta WhatsApp Business API:
 *   - Incoming text / media / interactive messages
 *   - Delivery status updates (sent, delivered, read, failed)
 *   - Message reaction events
 *
 * Flow:
 *   1. Signature verify (HMAC-SHA256) → parse payload
 *   2. Persist to WhatsAppConversation model
 *   3. Classify intent via AI service
 *   4. Auto-reply if eligible
 *   5. Emit internal events for staff dashboard / notifications
 *
 * @module services/whatsapp/whatsappWebhook.service
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const socketEmitter = require('../../utils/socketEmitter');
const whatsappService = require('./whatsappService');
const whatsappAI = require('./whatsappAI.service');

// ─── Lazy model loader ──────────────────────────────────────────────────────
function getConversationModel() {
  try {
    return mongoose.model('WhatsAppConversation');
  } catch {
    return require('../../models/WhatsAppConversation');
  }
}

function getFamilyMemberModel() {
  try {
    return mongoose.model('FamilyMember');
  } catch {
    return null;
  }
}

function getBeneficiaryModel() {
  try {
    return mongoose.model('Beneficiary');
  } catch {
    return null;
  }
}

function getConsentModel() {
  try {
    return require('../../models/WhatsAppConsent');
  } catch {
    return null;
  }
}

// ─── HMAC signature verification ─────────────────────────────────────────
/**
 * Verify Meta webhook X-Hub-Signature-256 header.
 *
 * Returns false (NEVER throws) for: missing/empty signature, length
 * mismatch with the computed expected value, or any encoding error.
 * `crypto.timingSafeEqual` throws on unequal-length buffers — guard
 * against that BEFORE the call so a malformed signature can't crash
 * the webhook handler.
 *
 * @param {string} rawBody - raw request body string
 * @param {string} signature - value of X-Hub-Signature-256 header
 * @returns {boolean}
 */
function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET || '';
  if (!secret) {
    // Dev/test only — never skip in production. Same class as W419
    // OTP fallback: a forgotten env var in prod would silently turn
    // signature verification into a no-op, letting any external caller
    // inject fake WhatsApp events (delivery-status / inbound-message /
    // status-update) into the system. Refuse-to-verify is the safer
    // failure mode — webhooks fail closed instead of fail open.
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        '[WhatsApp] WHATSAPP_WEBHOOK_SECRET not set in production — rejecting webhook (fail closed)'
      );
      return false;
    }
    logger.warn('[WhatsApp] WHATSAPP_WEBHOOK_SECRET not set — skipping signature check (dev only)');
    return true;
  }
  if (!signature || typeof signature !== 'string') return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ─── Extract messages from Meta payload ──────────────────────────────────
function extractMessages(body) {
  const entries = [];
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      if (!value) continue;

      // Status updates (delivery / read)
      for (const status of value?.statuses || []) {
        entries.push({ type: 'status', status, phoneNumberId: value.metadata?.phone_number_id });
      }

      // Inbound messages
      for (const msg of value?.messages || []) {
        const contact = (value?.contacts || []).find(c => c.wa_id === msg.from);
        entries.push({
          type: 'message',
          message: msg,
          contact,
          phoneNumberId: value.metadata?.phone_number_id,
        });
      }
    }
  }
  return entries;
}

// ─── Normalize message content ─────────────────────────────────────────────
function normalizeMessageContent(msg) {
  switch (msg.type) {
    case 'text':
      return { text: msg.text?.body || '', mediaUrl: null, mediaType: null };
    case 'image':
      return {
        text: msg.image?.caption || '',
        mediaUrl: null,
        mediaType: 'image',
        mediaId: msg.image?.id,
      };
    case 'document':
      return {
        text: msg.document?.caption || '',
        mediaUrl: null,
        mediaType: 'document',
        mediaId: msg.document?.id,
        filename: msg.document?.filename,
      };
    case 'audio':
      return { text: '', mediaUrl: null, mediaType: 'audio', mediaId: msg.audio?.id };
    case 'video':
      return {
        text: msg.video?.caption || '',
        mediaUrl: null,
        mediaType: 'video',
        mediaId: msg.video?.id,
      };
    case 'interactive':
      if (msg.interactive?.type === 'button_reply') {
        return {
          text: msg.interactive.button_reply?.title || '',
          replyId: msg.interactive.button_reply?.id,
        };
      }
      if (msg.interactive?.type === 'list_reply') {
        return {
          text: msg.interactive.list_reply?.title || '',
          replyId: msg.interactive.list_reply?.id,
        };
      }
      return { text: '' };
    case 'location':
      return {
        text: `[موقع: ${msg.location?.name || ''}]`,
        mediaType: 'location',
        location: msg.location,
      };
    default:
      return { text: `[رسالة من نوع: ${msg.type}]` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Processor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a Meta webhook POST payload.
 * @param {Object} body - parsed JSON body
 * @param {string} rawBody - raw body string for signature check
 * @param {string} signature - X-Hub-Signature-256 header value
 * @returns {Promise<{processed:number, errors:number}>}
 */
async function processWebhook(body, rawBody, signature) {
  // Signature check
  if (!verifySignature(rawBody, signature)) {
    throw Object.assign(new Error('Invalid webhook signature'), { statusCode: 401 });
  }

  const events = extractMessages(body);
  let processed = 0;
  let errors = 0;

  for (const event of events) {
    try {
      if (event.type === 'status') {
        await handleStatusUpdate(event.status, event.phoneNumberId);
      } else if (event.type === 'message') {
        await handleIncomingMessage(event.message, event.contact, event.phoneNumberId);
      }
      processed++;
    } catch (err) {
      errors++;
      logger.error(`[WhatsApp Webhook] Event processing error: ${err.message}`);
    }
  }

  return { processed, errors, total: events.length };
}

// ─── Handle delivery status update ──────────────────────────────────────
async function handleStatusUpdate(status, _phoneNumberId) {
  const { id: messageId, status: state, recipient_id: to, timestamp } = status || {};
  if (!messageId) return;

  const Conversation = getConversationModel();
  if (!Conversation) return;

  const conv = await Conversation.findOneAndUpdate(
    { 'messages.providerMessageId': messageId },
    {
      $set: {
        'messages.$.deliveryStatus': state,
        'messages.$.statusUpdatedAt': new Date(parseInt(timestamp || Date.now() / 1000) * 1000),
      },
    },
    { projection: { _id: 1, branchId: 1, organizationId: 1, phone: 1 } }
  ).catch(err => {
    logger.warn(`[WhatsApp] Status update DB error: ${err.message}`);
    return null;
  });

  if (conv) {
    socketEmitter.emitWhatsAppStatusUpdate({
      branchId: conv.branchId?.toString?.() || conv.branchId,
      organizationId: conv.organizationId?.toString?.() || conv.organizationId,
      conversationId: conv._id?.toString?.() || conv._id,
      providerMessageId: messageId,
      status: state,
    });
  }

  logger.debug(`[WhatsApp] Message ${messageId} → ${to}: ${state}`);
}

// ─── Handle inbound message ───────────────────────────────────────────────
async function handleIncomingMessage(msg, contact, _phoneNumberId) {
  const fromPhone = msg?.from;
  if (!fromPhone) return;

  // Idempotency (W1424f) — Meta re-delivers the webhook on any 5xx/timeout/drop
  // during the ACK window. Without this guard a redelivered inbound is
  // re-classified, re-pushed, unreadCount re-incremented, and the auto-reply / bot
  // FSM re-fires → duplicate reply + duplicate DB row (+ duplicate emergency
  // alert for a crisis message). Skip if this providerMessageId is already
  // persisted. `messages.providerMessageId` is indexed (WhatsAppConversation.js).
  // (Residual: a tiny race if two redeliveries arrive concurrently before the
  // first $push commits — the FSM optimistic-lock hardening covers that class.)
  if (msg.id) {
    const ConversationDedup = getConversationModel();
    if (ConversationDedup) {
      const seen = await ConversationDedup.exists({
        'messages.providerMessageId': msg.id,
      }).catch(() => null);
      if (seen) {
        logger.debug(`[WhatsApp] duplicate inbound ${msg.id} — skipping (Meta redelivery)`);
        return;
      }
    }
  }

  const content = normalizeMessageContent(msg);
  const senderName = contact?.profile?.name || fromPhone;
  const timestamp = new Date(parseInt(msg.timestamp || Date.now() / 1000) * 1000);

  // Resolve family member by phone
  let familyMember = null;
  let beneficiaryId = null;
  const FamilyMember = getFamilyMemberModel();
  if (FamilyMember) {
    const normalized = whatsappService.normalizePhone(fromPhone);
    familyMember = await FamilyMember.findOne({
      $or: [{ 'contactInfo.phone': fromPhone }, { 'contactInfo.phone': normalized }],
      isDeleted: false,
    }).lean();
    beneficiaryId = familyMember?.beneficiaryId || null;
  }

  // W1407: derive the conversation's branchId from the matched beneficiary so it
  // is tenant-scoped. Unmatched inbound (no beneficiary) leaves branchId null —
  // such conversations are visible only to cross-branch roles (fail-closed for
  // branch-restricted users), never leaked across branches.
  let branchId = null;
  if (beneficiaryId) {
    const Beneficiary = getBeneficiaryModel();
    if (Beneficiary) {
      try {
        const ben = await Beneficiary.findById(beneficiaryId).select('branchId').lean();
        branchId = ben?.branchId || null;
      } catch (err) {
        logger.warn(`[WhatsApp] branch derivation failed: ${err.message}`);
      }
    }
  }

  // Record consent — first-time inbound = implicit opt-in, every inbound
  // extends the 24-hour customer-service window. Never throws.
  const Consent = getConsentModel();
  if (Consent) {
    await Consent.recordInbound(whatsappService.normalizePhone(fromPhone), {
      familyMemberId: familyMember?._id,
      beneficiaryId,
    }).catch(err => logger.warn(`[WhatsApp] consent record failed: ${err.message}`));
  }

  // AI classification
  let classified = {
    intent: 'general_question',
    confidence: 0.3,
    urgencyLevel: 'low',
    sentiment: 'neutral',
  };
  if (content.text) {
    classified = await whatsappAI.classifyIntent(content.text, {
      beneficiaryName: familyMember?.beneficiaryName,
    });
  }

  // Persist conversation
  const Conversation = getConversationModel();
  let conv = null;
  if (Conversation) {
    conv = await Conversation.findOneAndUpdate(
      { phone: fromPhone, ...(beneficiaryId ? { beneficiaryId } : {}) },
      {
        $setOnInsert: {
          phone: fromPhone,
          senderName,
          beneficiaryId,
          branchId, // W1407: tenant scope derived from the matched beneficiary
          familyMemberId: familyMember?._id || null,
          createdAt: new Date(),
        },
        $push: {
          messages: {
            direction: 'incoming',
            type: msg.type,
            text: content.text,
            mediaType: content.mediaType || null,
            mediaId: content.mediaId || null,
            filename: content.filename || null,
            providerMessageId: msg.id,
            timestamp,
            intent: classified.intent,
            sentiment: classified.sentiment,
            deliveryStatus: 'received',
          },
        },
        $set: {
          lastMessageAt: timestamp,
          lastIntent: classified.intent,
          lastSentiment: classified.sentiment,
          requiresHumanReview: classified.requiresHumanReview,
          urgencyLevel: classified.urgencyLevel,
        },
        $inc: { unreadCount: 1 },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Mark as read with WhatsApp API
    await whatsappService.markAsRead(msg.id).catch(() => {});

    // Real-time update to staff dashboard
    if (conv) {
      const lastMessage = conv.messages?.[conv.messages.length - 1];
      socketEmitter.emitWhatsAppMessage({
        branchId: conv.branchId?.toString?.() || conv.branchId,
        organizationId: conv.organizationId?.toString?.() || conv.organizationId,
        conversationId: conv._id?.toString?.() || conv._id,
        message: lastMessage
          ? {
              _id: lastMessage._id?.toString?.() || lastMessage._id,
              direction: lastMessage.direction,
              type: lastMessage.type,
              text: lastMessage.text,
              mediaType: lastMessage.mediaType,
              mediaId: lastMessage.mediaId,
              filename: lastMessage.filename,
              intent: lastMessage.intent,
              sentiment: lastMessage.sentiment,
              confidence: lastMessage.confidence,
              deliveryStatus: lastMessage.deliveryStatus,
              timestamp: lastMessage.timestamp,
            }
          : null,
        conversation: {
          _id: conv._id?.toString?.() || conv._id,
          phone: conv.phone,
          senderName: conv.senderName,
          lastMessageAt: conv.lastMessageAt,
          lastIntent: conv.lastIntent,
          lastSentiment: conv.lastSentiment,
          unreadCount: conv.unreadCount,
          requiresHumanReview: conv.requiresHumanReview,
          urgencyLevel: conv.urgencyLevel,
        },
      });
    }
  }

  // ─── W1536: reminder confirmation/cancellation replies (env-gated, OFF) ──
  // If the family replies to an appointment reminder with نعم/إلغاء, update the
  // linked appointment (CONFIRMED / CANCELLED) + acknowledge. All logic lives in
  // whatsappReminderReplyHandler; this is a single defensive call so the hot
  // webhook path is unchanged. Any error falls through (never breaks intake).
  if (process.env.ENABLE_WHATSAPP_REMINDER_REPLIES === 'true' && content.text) {
    try {
      const { handleReminderReply } = require('./whatsappReminderReplyHandler');
      await handleReminderReply(
        { phone: fromPhone, text: content.text, beneficiaryId },
        { logger }
      );
    } catch (replyErr) {
      logger.warn?.('[whatsapp-reminder-reply] skipped', { error: replyErr.message });
    }
  }

  // ─── Auto-reply decision ────────────────────────────────────────────────
  // The decision engine (services/whatsapp/autoReply.service.js) is pure —
  // it returns one of: template / text / escalate / none, and we dispatch
  // accordingly. The old whatsappAI.getAutoReply only covered 2 of 9
  // intents and skipped escalation. The new engine handles all 9.
  const autoReply = require('./autoReply.service');
  const ctxName = familyMember
    ? `${familyMember.firstName || ''} ${familyMember.lastName || ''}`.trim() || senderName
    : senderName;
  const beneficiaryName = familyMember?.beneficiaryName || ctxName;

  // ─── W1372: stateful menu-bot (env-gated, default OFF) ───────────────────
  // When ENABLE_WHATSAPP_BOT_MENU=true, a deterministic FSM drives the inbound
  // turn (welcome menu + multi-step flows: registration / appointment request /
  // complaint / human callback / read-only lookups). It runs BEFORE the
  // stateless autoReply classifier and, when it handles the turn, short-circuits
  // it. Inert unless the flag is set, so existing behavior is unchanged by
  // default. Any engine error falls through to the stateless path (fail-safe).
  if (process.env.ENABLE_WHATSAPP_BOT_MENU === 'true' && content.text && Conversation && conv) {
    try {
      const botFlow = require('../../intelligence/whatsapp-bot-flow.service');
      const botReg = require('../../intelligence/whatsapp-bot-flow.registry');
      const interactiveEnabled = process.env.ENABLE_WHATSAPP_BOT_INTERACTIVE === 'true';
      // W1383: carry the sticky language preference from the persisted flow state.
      const botCtx = {
        guardianName: ctxName,
        beneficiaryName,
        lang: (conv.botFlow && conv.botFlow.lang) || undefined,
      };
      const rawPrior =
        conv.botFlow && conv.botFlow.unit !== undefined
          ? conv.botFlow
          : { unit: null, step: 0, collected: {}, phase: null };
      // W1382: drop an abandoned (stale) flow back to idle so a fresh message
      // restarts at the menu instead of resuming a dead multi-step flow.
      const priorState = botFlow.isFlowStale(rawPrior, Date.now())
        ? { unit: null, step: 0, collected: {}, phase: null }
        : rawPrior;

      // W1381: native interactive-menu navigation. A tapped row arrives as an
      // interactive reply whose id we namespaced (`BOTNAV:cat:*` / `:unit:*`). A
      // category tap shows that category's sub-list; a unit tap enters that
      // unit's flow. Only consulted when interactive mode is on; otherwise null
      // and we fall through to plain text handling.
      const nav = interactiveEnabled ? botReg.parseNav(content.replyId) : null;
      if (nav && nav.kind === 'cat') {
        const sub = botReg.buildCategoryList(nav.id);
        if (sub) {
          await whatsappService
            .sendInteractiveList(
              fromPhone,
              sub.bodyText,
              sub.buttonLabel,
              sub.items,
              sub.sectionTitle
            )
            .catch(err => logger.warn(`[WhatsApp BotMenu] category send failed: ${err.message}`));
          await Conversation.updateOne(
            { _id: conv._id },
            {
              $set: {
                botFlow: {
                  unit: null,
                  step: 0,
                  collected: {},
                  phase: null,
                  lang: botCtx.lang || 'ar',
                  updatedAt: new Date(),
                },
                lastMessageAt: new Date(),
                unreadCount: 0,
              },
            }
          ).catch(() => {});
          return; // sub-list sent; await the unit tap
        }
      }

      const plan =
        nav && nav.kind === 'unit'
          ? botFlow.enterUnit(nav.id, botCtx)
          : botFlow.handleTurn(priorState, content.text, botCtx);

      if (plan && plan.handled) {
        await dispatchBotPlan({
          plan,
          priorState,
          conv,
          fromPhone,
          senderName,
          Conversation,
          interactiveEnabled,
          botCtx,
        });
        // W1424k — the bot auto-escalated after N unmatched / confirm-reprompt
        // turns. Flag the conversation for staff (mirrors the classified
        // escalation block below) so a stuck guardian gets a human follow-up.
        if (plan.escalate && conv && conv._id) {
          await Conversation.findOneAndUpdate(
            { _id: conv._id },
            {
              $set: {
                requiresHumanReview: true,
                status: 'escalated',
                escalationReason: 'bot_unmatched_limit',
                escalatedAt: new Date(),
              },
            }
          ).catch(err => logger.warn(`[WhatsApp] bot escalation flag failed: ${err.message}`));
        }
        return; // bot owns this turn; skip the stateless auto-reply path
      }
    } catch (err) {
      logger.warn(`[WhatsApp BotMenu] engine error, falling through: ${err.message}`);
    }
  }

  // After recording inbound, the 24h service window is open by definition.
  const decision = autoReply.decide(classified, {
    canReplyFreeForm: true,
    hasConsent: true,
    beneficiaryName,
    guardianName: ctxName,
  });

  logger.info(
    `[WhatsApp AutoReply] decision=${decision.action} ` +
      `intent=${classified.intent} urgency=${classified.urgencyLevel} ` +
      `reason=${decision.reason}`
  );

  let autoReplySent = null;
  try {
    if (decision.action === autoReply.ACTION.TEXT) {
      const text = await autoReply.resolveTextReply(decision, {
        beneficiaryName,
        guardianName: ctxName,
      });
      if (text) {
        autoReplySent = await whatsappService.sendText(fromPhone, text);
        if (autoReplySent?.success && Conversation && conv) {
          await Conversation.updateOne(
            { _id: conv._id },
            {
              $push: {
                messages: {
                  direction: 'outgoing',
                  type: 'text',
                  text,
                  providerMessageId: autoReplySent.messageId,
                  timestamp: new Date(),
                  isAutoReply: true,
                  autoReplyDecision: decision,
                  deliveryStatus: 'sent',
                },
              },
              $set: { lastMessageAt: new Date(), unreadCount: 0 },
            }
          );
        }
      }
    } else if (decision.action === autoReply.ACTION.TEMPLATE && decision.templateName) {
      // W738: gate auto-reply templates through the same approval check the
      // event dispatcher uses (W731). Meta silently drops an unapproved
      // template, so the inbound user would get nothing. Better to skip the
      // auto-reply and force escalation so a human follows up. Fail OPEN: a
      // null status (no cached row / DB error) means "don't block".
      let templateStatus = null;
      try {
        templateStatus = await require('./templateSync.service').getTemplateStatus(
          decision.templateName
        );
      } catch (_e) {
        templateStatus = null;
      }

      if (templateStatus && templateStatus !== 'APPROVED') {
        logger.warn(
          `[WhatsApp AutoReply] template "${decision.templateName}" not deliverable ` +
            `(status=${templateStatus}); skipping auto-reply, forcing escalation.`
        );
        // Convert this turn into an escalation so the block below alerts staff.
        decision.action = autoReply.ACTION.ESCALATE;
        decision.severity = decision.severity || 'high';
        decision.reason = `${decision.reason};template_not_approved:${templateStatus}`;
      } else {
        const params = autoReply.buildTemplateParams(decision, {
          beneficiaryName,
          guardianName: ctxName,
        });
        autoReplySent = await whatsappService.sendTemplate(
          fromPhone,
          decision.templateName,
          'ar',
          params || []
        );
        if (autoReplySent?.success && Conversation && conv) {
          await Conversation.updateOne(
            { _id: conv._id },
            {
              $push: {
                messages: {
                  direction: 'outgoing',
                  type: 'template',
                  text: `[template: ${decision.templateName}]`,
                  providerMessageId: autoReplySent.messageId,
                  timestamp: new Date(),
                  isAutoReply: true,
                  autoReplyDecision: decision,
                  deliveryStatus: 'sent',
                },
              },
              $set: { lastMessageAt: new Date(), unreadCount: 0 },
            }
          );
        }
      }
    }
    // ACTION.ESCALATE and ACTION.NONE fall through to escalation block below.
  } catch (err) {
    logger.warn(`[WhatsApp AutoReply] dispatch failed: ${err.message}`);
  }

  // Emit internal event for critical messages OR explicit escalate action.
  // Both paths converge to the same notification primitive so the staff
  // dashboard only has one "what to look at" signal.
  const shouldEscalate =
    decision.action === autoReply.ACTION.ESCALATE ||
    classified.urgencyLevel === 'critical' ||
    classified.requiresHumanReview;

  if (shouldEscalate) {
    // W739: flag the conversation itself so it surfaces in the staff
    // "pending review" queue (Conversation.findPendingReview filters on
    // requiresHumanReview). Without this, an explicit ESCALATE decision
    // (emergency/complaint) or a W738 template-not-deliverable escalation
    // would only fire a notification but leave the conversation un-flagged
    // when classified.requiresHumanReview was false. Never throws.
    if (Conversation && conv) {
      const escalationReason =
        decision.reason ||
        (classified.urgencyLevel === 'critical'
          ? `critical_urgency:${classified.intent}`
          : `requires_human_review:${classified.intent}`);
      await Conversation.updateOne(
        { _id: conv._id },
        {
          $set: {
            requiresHumanReview: true,
            status: 'escalated',
            escalationReason,
            escalatedAt: new Date(),
          },
        }
      ).catch(err =>
        logger.warn(`[WhatsApp Webhook] escalation flag update failed: ${err.message}`)
      );
    }

    try {
      const notifService = require('../notifications/notification-enhanced.service');
      if (notifService?.send) {
        const priority =
          decision.severity === 'critical' || classified.urgencyLevel === 'critical'
            ? 'urgent'
            : decision.severity === 'high'
              ? 'high'
              : 'medium';
        await notifService.send({
          title: `⚠️ رسالة واتساب — ${classified.intent} (${senderName})`,
          body: content.text?.slice(0, 300) || 'رسالة وسائط',
          type: 'alert',
          priority,
          category: 'whatsapp_alert',
          channels: ['inApp'],
          metadata: {
            phone: fromPhone,
            intent: classified.intent,
            conversationId: conv?._id,
            decision,
            notify: decision.notify || null,
          },
        });
      }
    } catch (err) {
      logger.warn(`[WhatsApp Webhook] Notification emit error: ${err.message}`);
    }

    // Real-time escalation to staff dashboard
    if (conv) {
      socketEmitter.emitWhatsAppEscalation({
        branchId: conv.branchId?.toString?.() || conv.branchId,
        organizationId: conv.organizationId?.toString?.() || conv.organizationId,
        conversationId: conv._id?.toString?.() || conv._id,
        reason:
          decision.reason ||
          (classified.urgencyLevel === 'critical'
            ? `critical_urgency:${classified.intent}`
            : `requires_human_review:${classified.intent}`),
        conversation: {
          _id: conv._id?.toString?.() || conv._id,
          phone: conv.phone,
          senderName: conv.senderName,
          lastMessageAt: conv.lastMessageAt,
          lastIntent: conv.lastIntent,
          lastSentiment: conv.lastSentiment,
          unreadCount: conv.unreadCount,
          requiresHumanReview: true,
          status: 'escalated',
          urgencyLevel: conv.urgencyLevel,
        },
        metadata: {
          intent: classified.intent,
          urgencyLevel: classified.urgencyLevel,
          sentiment: classified.sentiment,
          messageText: content.text?.slice(0, 300),
        },
      });
    }
  }

  logger.info(
    `[WhatsApp] Inbound from ${fromPhone} | intent=${classified.intent} | urgency=${classified.urgencyLevel}`
  );
}

// ─── W1381: dispatch a bot-flow plan (send + persist + escalate) ────────────
// Centralizes the side-effecting half of the FSM so BOTH the text path and the
// interactive unit-tap path reuse identical logic. Handles: (1) the W1372 Wave-2
// guardian-verified live-data lookups, (2) rendering the main menu as a native
// interactive list when interactive mode is on (text reply otherwise), (3) state
// persistence, and (4) escalation of any non-served side effect. Never throws.
async function dispatchBotPlan({
  plan,
  priorState,
  conv,
  fromPhone,
  senderName,
  Conversation,
  interactiveEnabled,
  botCtx,
}) {
  const botReg = require('../../intelligence/whatsapp-bot-flow.registry');
  let replyToSend = plan.reply;
  let suppressEscalation = false;

  // (1) live-data for read-only lookup side effects (env-gated, default OFF)
  if (process.env.ENABLE_WHATSAPP_BOT_LIVE_DATA === 'true' && plan.sideEffect) {
    try {
      const botData = require('./whatsappBotData.service');
      if (botData.isLookupKind(plan.sideEffect.kind)) {
        const ans = await botData.answerLookup(
          plan.sideEffect.kind,
          fromPhone,
          plan.sideEffect.collected
        );
        if (ans && ans.ok && ans.text) {
          replyToSend = ans.text;
          suppressEscalation = true;
        } else {
          logger.info(`[WhatsApp BotData] lookup not delivered (${ans?.reason}) → escalating`);
        }
      }
    } catch (err) {
      logger.warn(`[WhatsApp BotData] answerLookup error, escalating: ${err.message}`);
    }
  }

  // (2) send — interactive category list for the main menu, else plain text
  let sent;
  let outType = 'text';
  if (plan.menu && interactiveEnabled) {
    const list = botReg.buildMainMenuList(botCtx || {});
    outType = 'interactive';
    sent = await whatsappService
      .sendInteractiveList(
        fromPhone,
        list.bodyText,
        list.buttonLabel,
        list.items,
        list.sectionTitle
      )
      .catch(err => {
        logger.warn(`[WhatsApp BotMenu] list send failed: ${err.message}`);
        return null;
      });
  } else {
    sent = await whatsappService.sendText(fromPhone, replyToSend).catch(err => {
      logger.warn(`[WhatsApp BotMenu] send failed: ${err.message}`);
      return null;
    });
  }

  // (3) persist flow state + the outgoing message
  const update = {
    $set: {
      botFlow: { ...plan.nextFlowState, updatedAt: new Date() },
      lastMessageAt: new Date(),
      unreadCount: 0,
    },
  };
  if (sent && sent.success) {
    update.$push = {
      messages: {
        direction: 'outgoing',
        type: outType,
        text: replyToSend,
        providerMessageId: sent.messageId,
        timestamp: new Date(),
        isAutoReply: true,
        deliveryStatus: 'sent',
      },
    };
  }
  await Conversation.updateOne({ _id: conv._id }, update).catch(err =>
    logger.warn(`[WhatsApp BotMenu] state persist failed: ${err.message}`)
  );

  // (4) W1384: turn the side effect into a real DB record (env-gated), then
  // escalate. A created record id is attached to the staff notification so it's
  // click-through trackable; record creation failing falls back to plain
  // escalation (the record service returns ok:false, never throws).
  if (plan.sideEffect && !suppressEscalation) {
    let recordId = null;
    if (process.env.ENABLE_WHATSAPP_BOT_RECORDS === 'true') {
      try {
        const botRecords = require('./whatsappBotRecords.service');
        if (botRecords.mapsToRecord(plan.sideEffect.kind)) {
          const r = await botRecords.createRecordFor(plan.sideEffect, {
            phone: fromPhone,
            senderName,
          });
          if (r && r.ok) {
            recordId = r.recordId;
            logger.info(
              `[WhatsApp BotRecords] created ${r.model} ${r.recordId} for ${plan.sideEffect.kind}`
            );
          } else {
            logger.info(
              `[WhatsApp BotRecords] no record (${r && r.reason}) for ${plan.sideEffect.kind}`
            );
          }
        }
      } catch (err) {
        logger.warn(`[WhatsApp BotRecords] error: ${err.message}`);
      }
    }
    await escalateForBot(Conversation, conv, fromPhone, senderName, plan.sideEffect, recordId);
  }

  // (5) W1408: link the event to the beneficiary's unified-core CareTimeline
  // (only fires for beneficiary-attributable kinds with a resolvable guardian;
  // a direct addEvent call — see whatsappBotTimeline.service. Never throws).
  if (plan.sideEffect) {
    try {
      const botTimeline = require('./whatsappBotTimeline.service');
      const t = await botTimeline.recordBotTimelineEvent(plan.sideEffect, fromPhone, senderName);
      if (t && t.ok) {
        logger.info(
          `[WhatsApp BotTimeline] linked ${plan.sideEffect.kind} → CareTimeline ${t.eventId}`
        );
      }
    } catch (err) {
      logger.warn(`[WhatsApp BotTimeline] error: ${err.message}`);
    }
  }

  logger.info(
    `[WhatsApp BotMenu] handled inbound from ${fromPhone} | ` +
      `nextUnit=${plan.nextFlowState?.unit || 'idle'} | sideEffect=${plan.sideEffect?.kind || 'none'} | ` +
      `liveData=${suppressEscalation} | interactive=${!!(plan.menu && interactiveEnabled)}`
  );

  // W1382: lightweight usage analytics — a parseable line ops can aggregate to
  // see which units are most used / which flows complete. No PII beyond the
  // event + unit (phone is already in the handled log above).
  try {
    const botFlow = require('../../intelligence/whatsapp-bot-flow.service');
    const ev = botFlow.deriveBotEvent(plan, priorState);
    logger.info(`[WhatsApp BotAnalytics] event=${ev.event} unit=${ev.unit || '-'}`);
    // W1419: persist the per-unit usage funnel (entered/completed) for admin
    // review — best-effort, env-gated; enter/complete are the only counted events.
    if (ev.unit && process.env.ENABLE_WHATSAPP_BOT_INSIGHTS === 'true') {
      require('./whatsappBotInsights.service')
        .recordUnitEvent(ev.unit, ev.event)
        .catch(err => logger.warn(`[WhatsApp BotInsights] usage failed: ${err.message}`));
    }
  } catch (_e) {
    /* analytics is best-effort */
  }

  // W1417: capture an unmatched free-text intent for keyword tuning (best-effort,
  // env-gated). The pure FSM flagged it via plan.unmatched; recording it lets an
  // admin see what users ask that the bot misses and extend UNIT_KEYWORDS.
  if (plan.unmatched && process.env.ENABLE_WHATSAPP_BOT_INSIGHTS === 'true') {
    require('./whatsappBotInsights.service')
      .recordUnmatched(plan.unmatchedText)
      .catch(err => logger.warn(`[WhatsApp BotInsights] record failed: ${err.message}`));
  }
}

// ─── W1372: escalate a completed bot-flow side effect to staff ──────────────
// The menu-bot FSM is pure and performs no I/O; when a flow finishes with a
// `sideEffect` (registration / appointment / complaint / callback / a v1
// read-only lookup), the dispatcher flags the conversation for the staff
// pending-review queue and fires an in-app notification carrying the structured
// `collected` payload. A future wave can branch on `sideEffect.kind` to create
// a dedicated record (ComplaintEnhanced, PublicBookingRequest, …) instead of —
// or in addition to — escalating. Never throws.
const BOT_SIDE_EFFECT_REASON = Object.freeze({
  create_registration: 'طلب تسجيل جديد عبر بوت الواتساب',
  create_appointment_request: 'طلب موعد عبر بوت الواتساب',
  lookup_attendance: 'استعلام حضور/انصراف عبر بوت الواتساب',
  lookup_session_report: 'طلب تقرير جلسة عبر بوت الواتساب',
  lookup_billing: 'استعلام فواتير عبر بوت الواتساب',
  create_complaint: 'شكوى جديدة عبر بوت الواتساب',
  callback_request: 'طلب تواصل بشري عبر بوت الواتساب',
  // W1380 — new service units
  submit_satisfaction: 'تقييم رضا جديد عبر بوت الواتساب',
  emergency_escalation: '🚨 بلاغ عاجل عبر بوت الواتساب',
});

// W1380 — per-kind notification priority. Emergency is urgent (on-call); a
// satisfaction survey is low-priority feedback; complaint is high; the rest
// medium. Kept as a small map so adding a kind is a one-line change.
const BOT_SIDE_EFFECT_PRIORITY = Object.freeze({
  emergency_escalation: 'urgent',
  create_complaint: 'high',
  submit_satisfaction: 'low',
});

async function escalateForBot(
  Conversation,
  conv,
  fromPhone,
  senderName,
  sideEffect,
  recordId = null
) {
  const reason = BOT_SIDE_EFFECT_REASON[sideEffect.kind] || `بوت الواتساب: ${sideEffect.kind}`;
  const priority = BOT_SIDE_EFFECT_PRIORITY[sideEffect.kind] || 'medium';
  // W1418: a human-readable Arabic handoff card for staff (labelled fields)
  // instead of a raw JSON dump. Falls back to JSON if the formatter is missing.
  let summary;
  try {
    summary = require('../../intelligence/whatsapp-bot-flow.registry').formatEscalationSummary(
      sideEffect,
      { senderName, phone: fromPhone, reason }
    );
  } catch (_e) {
    summary = JSON.stringify(sideEffect.collected || {}).slice(0, 500);
  }
  // Emergencies jump straight to the 'escalated' state + critical urgency so
  // they surface at the top of the staff queue; everything else is pending_review.
  const isEmergency = sideEffect.kind === 'emergency_escalation';
  try {
    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          requiresHumanReview: true,
          status: isEmergency ? 'escalated' : 'pending_review',
          escalationReason: reason,
          escalatedAt: new Date(),
          ...(isEmergency ? { urgencyLevel: 'critical' } : {}),
        },
      }
    );
  } catch (err) {
    logger.warn(`[WhatsApp BotMenu] escalate flag failed: ${err.message}`);
  }
  try {
    const notifService = require('../notifications/notification-enhanced.service');
    if (notifService?.send) {
      await notifService.send({
        title: `🤖 بوت واتساب — ${reason}${recordId ? ' 📄' : ''} (${senderName})`,
        body: summary.slice(0, 800),
        type: 'alert',
        priority,
        category: 'whatsapp_bot_request',
        channels: ['inApp'],
        metadata: {
          phone: fromPhone,
          conversationId: conv?._id,
          sideEffectKind: sideEffect.kind,
          collected: sideEffect.collected || {},
          ...(recordId ? { recordId } : {}),
        },
      });
    }
  } catch (err) {
    logger.warn(`[WhatsApp BotMenu] notify failed: ${err.message}`);
  }
}

module.exports = {
  processWebhook,
  verifySignature,
  handleIncomingMessage,
  handleStatusUpdate,
};
