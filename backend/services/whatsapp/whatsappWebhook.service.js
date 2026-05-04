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

// ─── HMAC signature verification ─────────────────────────────────────────
/**
 * Verify Meta webhook X-Hub-Signature-256 header.
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
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
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

  // Auto-reply
  const autoReply = await whatsappAI.getAutoReply(classified, {
    beneficiaryName: familyMember
      ? `${familyMember.firstName} ${familyMember.lastName}`
      : undefined,
  });

  if (autoReply) {
    const sent = await whatsappService.sendText(fromPhone, autoReply);
    if (sent?.success && Conversation && conv) {
      await Conversation.updateOne(
        { _id: conv._id },
        {
          $push: {
            messages: {
              direction: 'outgoing',
              type: 'text',
              text: autoReply,
              providerMessageId: sent.messageId,
              timestamp: new Date(),
              isAutoReply: true,
              deliveryStatus: 'sent',
            },
          },
          $set: { lastMessageAt: new Date(), unreadCount: 0 },
        }
      );
    }
  }

  // Emit internal event for critical messages
  if (classified.urgencyLevel === 'critical' || classified.requiresHumanReview) {
    try {
      const notifService = require('../notifications/notification-enhanced.service');
      if (notifService?.send) {
        await notifService.send({
          title: `⚠️ رسالة واتساب عاجلة من ${senderName}`,
          body: content.text?.slice(0, 300) || 'رسالة وسائط',
          type: 'alert',
          priority: classified.urgencyLevel === 'critical' ? 'urgent' : 'high',
          category: 'whatsapp_alert',
          channels: ['inApp'],
          metadata: { phone: fromPhone, intent: classified.intent, conversationId: conv?._id },
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
