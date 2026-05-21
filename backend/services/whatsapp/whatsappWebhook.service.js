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
    logger.warn('[WhatsApp] WHATSAPP_WEBHOOK_SECRET not set — skipping signature check');
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
      { upsert: true, new: true }
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

module.exports = {
  processWebhook,
  verifySignature,
  handleIncomingMessage,
  handleStatusUpdate,
};
