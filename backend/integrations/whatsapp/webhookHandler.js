/**
 * WhatsApp Webhook Handler
 * معالج Webhook الوارد من WhatsApp
 *
 * Handles incoming messages, status updates, and interactive responses
 * from WhatsApp providers (UltraMsg, Twilio, etc.).
 */

'use strict';

const { getProviders } = require('./providers');
const { WEBHOOK_EVENTS, EMERGENCY_KEYWORDS, CONVERSATION_TTL_SECONDS, MESSAGE_DIRECTION, MESSAGE_STATUS } = require('./constants');
const WhatsAppMessage = require('../../models/WhatsAppMessage');
const logger = require('../../utils/logger');

class WhatsAppWebhookHandler {
  constructor() {
    const { primary } = getProviders();
    this.provider = primary;
    this.secret = process.env.WHATSAPP_WEBHOOK_SECRET || '';
  }

  /**
   * Main entry point for webhook requests
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async handle(req, res) {
    try {
      // Verify webhook signature if secret is configured
      if (this.secret && !this._verifySignature(req)) {
        logger.warn?.('[whatsapp-webhook] Invalid signature');
        return res.status(401).json({ error: 'unauthorized' });
      }

      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'empty_payload' });
      }

      // Parse events from the provider-specific payload
      const provider = this.provider;
      if (!provider) {
        logger.warn?.('[whatsapp-webhook] No provider configured');
        return res.status(503).json({ error: 'provider_not_configured' });
      }

      const events = provider.parseWebhook(payload);
      const results = [];

      for (const event of events) {
        const result = await this._processEvent(event);
        results.push(result);
      }

      // Return 200 quickly to avoid provider retries
      return res.status(200).json({ processed: results.length, results });
    } catch (err) {
      logger.error?.('[whatsapp-webhook] Error:', err?.message || err);
      return res.status(500).json({ error: 'internal_error' });
    }
  }

  /**
   * Process a single parsed event
   */
  async _processEvent(event) {
    switch (event.type) {
      case WEBHOOK_EVENTS.MESSAGE_RECEIVED:
        return this._handleIncomingMessage(event.data);
      case WEBHOOK_EVENTS.STATUS_UPDATE:
        return this._handleStatusUpdate(event.data);
      default:
        return { type: event.type, status: 'unhandled' };
    }
  }

  /**
   * Handle an incoming message from a user
   */
  async _handleIncomingMessage(data) {
    const {
      messageId,
      from,
      to,
      body,
      type,
      timestamp,
      mediaUrl,
      caption,
      selectedButtonId,
      selectedListRowId,
    } = data;

    // Save to database
    const messageDoc = await WhatsAppMessage.create({
      provider: this.provider?.getName() || 'unknown',
      providerMessageId: messageId,
      phoneNumber: from,
      fromPhone: from,
      toPhone: to,
      direction: MESSAGE_DIRECTION.INBOUND,
      type: type || 'text',
      body: body || caption || '',
      mediaUrl: mediaUrl || null,
      mediaCaption: caption || null,
      selectedButtonId: selectedButtonId || null,
      selectedListRowId: selectedListRowId || null,
      status: MESSAGE_STATUS.DELIVERED,
      rawPayload: data,
    });

    // Check for emergency keywords
    const isEmergency = this._checkEmergencyKeywords(body);
    if (isEmergency) {
      await this._handleEmergency(messageDoc, body, from);
      return { type: 'emergency', messageId: messageDoc._id, handled: true };
    }

    // Store conversation context in Redis for chatbot
    await this._storeConversationContext(from, messageDoc);

    // Trigger chatbot processing (handled by another service)
    this._emitChatbotEvent(messageDoc);

    return { type: 'message_received', messageId: messageDoc._id, handled: true };
  }

  /**
   * Handle message status updates (sent, delivered, read, failed)
   */
  async _handleStatusUpdate(data) {
    const { messageId, status, recipient, timestamp } = data;

    const statusMap = {
      sent: MESSAGE_STATUS.SENT,
      delivered: MESSAGE_STATUS.DELIVERED,
      read: MESSAGE_STATUS.READ,
      failed: MESSAGE_STATUS.FAILED,
      rejected: MESSAGE_STATUS.FAILED,
    };

    const mappedStatus = statusMap[status] || status;

    const updated = await WhatsAppMessage.updateStatus(messageId, mappedStatus, {
      errorMessage: status === 'failed' ? 'Provider reported failure' : undefined,
    });

    return {
      type: 'status_update',
      messageId,
      status: mappedStatus,
      updated: !!updated,
    };
  }

  /**
   * Handle emergency keyword detection
   */
  async _handleEmergency(messageDoc, body, from) {
    logger.warn?.('[whatsapp-webhook] EMERGENCY detected:', { from, body: body?.substring(0, 100) });

    // Update message with emergency flag
    await WhatsAppMessage.findByIdAndUpdate(messageDoc._id, {
      $set: { 'metadata.isEmergency': true, 'metadata.emergencyDetectedAt': new Date() },
    });

    // Emit emergency event for the notification system
    // This will be picked up by the alert service to notify medical staff
    const { getWhatsAppGateway } = require('./whatsappGateway');
    const gateway = getWhatsAppGateway();

    // Send acknowledgment to the sender
    await gateway.sendText(from, 'تم رفع تنبيه الطوارئ. سيتواصل معك فريقنا الطبي خلال دقائق. 🚨');

    // Emit event for the broader system
    // (Assuming an event bus exists; if not, this is a no-op)
    try {
      const eventBus = require('../../services/eventBus');
      if (eventBus && eventBus.emit) {
        eventBus.emit('emergency.whatsapp_alert', {
          phoneNumber: from,
          message: body,
          messageId: messageDoc._id,
          timestamp: new Date(),
        });
      }
    } catch {
      // Event bus not available
    }
  }

  /**
   * Check if message contains emergency keywords
   */
  _checkEmergencyKeywords(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return EMERGENCY_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Store conversation context in Redis for chatbot continuity
   */
  async _storeConversationContext(phoneNumber, messageDoc) {
    try {
      const redis = require('../../config/redis');
      if (!redis) return;

      const sessionKey = `whatsapp:conversation:${phoneNumber}`;
      const sessionData = await redis.get(sessionKey);
      let context = sessionData ? JSON.parse(sessionData) : { messages: [], state: 'idle' };

      context.messages.push({
        id: messageDoc._id.toString(),
        body: messageDoc.body,
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      });

      // Keep only last 10 messages
      if (context.messages.length > 10) {
        context.messages = context.messages.slice(-10);
      }

      await redis.setex(sessionKey, CONVERSATION_TTL_SECONDS, JSON.stringify(context));
    } catch (err) {
      logger.warn?.('[whatsapp-webhook] Failed to store conversation context:', err?.message);
    }
  }

  /**
   * Emit event for chatbot processing
   */
  _emitChatbotEvent(messageDoc) {
    // Defer to avoid blocking the webhook response
    setImmediate(() => {
      try {
        // This will be integrated with the chatbot service in Stage 3
        const eventBus = require('../../services/eventBus');
        if (eventBus && eventBus.emit) {
          eventBus.emit('whatsapp.inbound_message', {
            messageId: messageDoc._id,
            phoneNumber: messageDoc.phoneNumber,
            body: messageDoc.body,
            type: messageDoc.type,
            timestamp: new Date(),
          });
        }
      } catch {
        // Chatbot service not yet wired
      }
    });
  }

  /**
   * Verify webhook signature from provider
   */
  _verifySignature(req) {
    if (!this.provider || !this.provider.verifyWebhookSignature) {
      return true; // No verification if provider doesn't support it
    }

    const signature = req.headers['x-ultramsg-signature'] || req.headers['x-twilio-signature'] || '';
    const body = req.rawBody || JSON.stringify(req.body);

    return this.provider.verifyWebhookSignature(signature, body, this.secret);
  }
}

// Singleton
let _handlerInstance = null;

function getWebhookHandler() {
  if (!_handlerInstance) {
    _handlerInstance = new WhatsAppWebhookHandler();
  }
  return _handlerInstance;
}

module.exports = {
  WhatsAppWebhookHandler,
  getWebhookHandler,
};
