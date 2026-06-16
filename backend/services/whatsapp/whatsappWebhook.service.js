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

  await Conversation.updateOne(
    { 'messages.providerMessageId': messageId },
    {
      $set: {
        'messages.$.deliveryStatus': state,
        'messages.$.statusUpdatedAt': new Date(parseInt(timestamp || Date.now() / 1000) * 1000),
      },
    }
  ).catch(err => logger.warn(`[WhatsApp] Status update DB error: ${err.message}`));

  logger.debug(`[WhatsApp] Message ${messageId} → ${to}: ${state}`);
}

// ─── Handle inbound message ───────────────────────────────────────────────
async function handleIncomingMessage(msg, contact, _phoneNumberId) {
  const fromPhone = msg?.from;
  if (!fromPhone) return;

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
      const priorState =
        conv.botFlow && conv.botFlow.unit !== undefined
          ? conv.botFlow
          : { unit: null, step: 0, collected: {}, phase: null };
      const plan = botFlow.handleTurn(priorState, content.text, {
        guardianName: ctxName,
        beneficiaryName,
      });

      if (plan && plan.handled) {
        // W1372 Wave 2: for read-only lookup side effects (attendance / session
        // report / billing), attempt a GUARDIAN-VERIFIED live answer — env-gated
        // SEPARATELY via ENABLE_WHATSAPP_BOT_LIVE_DATA (default OFF). On success
        // the real data REPLACES the generic "we'll get back to you" closing and
        // escalation is suppressed. On any failure (not authorized / ambiguous /
        // no data / model missing) we keep the closing and escalate to staff.
        let replyToSend = plan.reply;
        let suppressEscalation = false;
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
                logger.info(
                  `[WhatsApp BotData] lookup not delivered (${ans?.reason}) → escalating`
                );
              }
            }
          } catch (err) {
            logger.warn(`[WhatsApp BotData] answerLookup error, escalating: ${err.message}`);
          }
        }

        const sent = await whatsappService.sendText(fromPhone, replyToSend).catch(err => {
          logger.warn(`[WhatsApp BotMenu] send failed: ${err.message}`);
          return null;
        });

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
              type: 'text',
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

        // A completed flow whose side effect was NOT served live → flag staff.
        if (plan.sideEffect && !suppressEscalation) {
          await escalateForBot(Conversation, conv, fromPhone, senderName, plan.sideEffect);
        }

        logger.info(
          `[WhatsApp BotMenu] handled inbound from ${fromPhone} | ` +
            `nextUnit=${plan.nextFlowState?.unit || 'idle'} | ` +
            `sideEffect=${plan.sideEffect?.kind || 'none'} | liveData=${suppressEscalation}`
        );
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
  }

  logger.info(
    `[WhatsApp] Inbound from ${fromPhone} | intent=${classified.intent} | urgency=${classified.urgencyLevel}`
  );
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
});

async function escalateForBot(Conversation, conv, fromPhone, senderName, sideEffect) {
  const reason = BOT_SIDE_EFFECT_REASON[sideEffect.kind] || `بوت الواتساب: ${sideEffect.kind}`;
  try {
    await Conversation.updateOne(
      { _id: conv._id },
      {
        $set: {
          requiresHumanReview: true,
          status: 'pending_review',
          escalationReason: reason,
          escalatedAt: new Date(),
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
        title: `🤖 بوت واتساب — ${reason} (${senderName})`,
        body: JSON.stringify(sideEffect.collected || {}).slice(0, 500),
        type: 'alert',
        priority: sideEffect.kind === 'create_complaint' ? 'high' : 'medium',
        category: 'whatsapp_bot_request',
        channels: ['inApp'],
        metadata: {
          phone: fromPhone,
          conversationId: conv?._id,
          sideEffectKind: sideEffect.kind,
          collected: sideEffect.collected || {},
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
