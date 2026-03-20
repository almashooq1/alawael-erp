/* eslint-disable no-unused-vars */
/**
 * Email Webhooks Handler
 * معالج Webhooks للبريد الإلكتروني
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Webhook Event Schema
const WebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  eventType: { type: String, required: true },
  emailId: { type: String, index: true },
  recipient: { type: String },
  timestamp: { type: Date, default: Date.now },
  raw: mongoose.Schema.Types.Mixed,
  processed: { type: Boolean, default: false },
  processedAt: { type: Date },
});

const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema);

class EmailWebhooksHandler {
  constructor(config = {}) {
    this.providers = {
      sendgrid: {
        signatureHeader: 'X-Twilio-Email-Event-Webhook-Signature',
        timestampHeader: 'X-Twilio-Email-Event-Webhook-Timestamp',
        verify: this.verifySendgridSignature.bind(this),
      },
      mailgun: {
        signatureHeader: 'signature',
        timestampField: 'timestamp',
        tokenField: 'token',
        verify: this.verifyMailgunSignature.bind(this),
      },
      azure: {
        verify: this.verifyAzureSignature.bind(this),
      },
    };

    this.sendgridPublicKey = config.sendgridPublicKey || process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    this.mailgunApiKey = config.mailgunApiKey || process.env.MAILGUN_API_KEY;
    this.azureSecret = config.azureSecret || process.env.AZURE_WEBHOOK_SECRET;
  }

  /**
   * Process Sendgrid webhook events
   */
  async processSendgridWebhook(events) {
    const results = [];

    for (const event of events) {
      const eventId = `sg_${event.sg_event_id || Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      try {
        const processedEvent = {
          eventId,
          provider: 'sendgrid',
          eventType: event.event,
          emailId: event.sg_message_id,
          recipient: event.email,
          raw: event,
          processed: true,
          processedAt: new Date(),
        };

        await WebhookEvent.findOneAndUpdate({ eventId }, processedEvent, {
          upsert: true,
          new: true,
        });

        // Update email log status
        await this.updateEmailStatus(event);

        results.push({ eventId, status: 'processed' });
      } catch (error) {
        logger.error(`Webhook event processing failed [${eventId}]:`, error.message);
        results.push({ eventId, status: 'error', error: 'فشل معالجة الحدث' });
      }
    }

    return results;
  }

  /**
   * Process Mailgun webhook events
   */
  async processMailgunWebhook(eventData) {
    const eventId = `mg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    try {
      const eventType = this.mapMailgunEventType(eventData['event-data']?.event);

      const processedEvent = {
        eventId,
        provider: 'mailgun',
        eventType,
        emailId: eventData['event-data']?.message?.headers?.['message-id'],
        recipient: eventData['event-data']?.recipient,
        raw: eventData,
        processed: true,
        processedAt: new Date(),
      };

      await WebhookEvent.create(processedEvent);

      // Update email log
      await this.updateEmailStatus({
        sg_message_id: processedEvent.emailId,
        event: eventType,
        email: processedEvent.recipient,
        reason: eventData['event-data']?.reason,
        description: eventData['event-data']?.['delivery-status']?.description,
      });

      return { eventId, status: 'processed' };
    } catch (error) {
      logger.error(`Mailgun webhook processing failed [${eventId}]:`, error.message);
      return { eventId, status: 'error', error: 'فشل معالجة الحدث' };
    }
  }

  /**
   * Process Azure Communication Services events
   */
  async processAzureWebhook(eventGridEvent) {
    const eventId = `az_${eventGridEvent.id || Date.now()}`;

    try {
      const eventType = this.mapAzureEventType(eventGridEvent.eventType);

      const processedEvent = {
        eventId,
        provider: 'azure',
        eventType,
        emailId: eventGridEvent.data?.messageId,
        recipient: eventGridEvent.data?.recipient,
        raw: eventGridEvent,
        processed: true,
        processedAt: new Date(),
      };

      await WebhookEvent.create(processedEvent);

      return { eventId, status: 'processed' };
    } catch (error) {
      logger.error(`Azure webhook processing failed [${eventId}]:`, error.message);
      return { eventId, status: 'error', error: 'فشل معالجة الحدث' };
    }
  }

  /**
   * Verify Sendgrid signature
   */
  verifySendgridSignature(payload, signature, timestamp) {
    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(timestamp + payload);
      return verify.verify(this.sendgridPublicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Verify Mailgun signature
   */
  verifyMailgunSignature(timestamp, token, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.mailgunApiKey)
      .update(timestamp + token)
      .digest('hex');
    return signature === expectedSignature;
  }

  /**
   * Verify Azure Event Grid signature
   */
  verifyAzureSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.azureSecret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  /**
   * Update email status based on webhook event
   */
  async updateEmailStatus(event) {
    const EmailLog = mongoose.model('EmailLog');

    const statusMap = {
      delivered: 'delivered',
      processed: 'sent',
      open: 'opened',
      click: 'clicked',
      bounce: 'bounced',
      dropped: 'failed',
      spamreport: 'spam',
      unsubscribe: 'unsubscribed',
      deferred: 'deferred',
    };

    const status = statusMap[event.event] || event.event;

    if (event.sg_message_id) {
      await EmailLog.findOneAndUpdate(
        { emailId: event.sg_message_id },
        {
          status,
          ...(event.event === 'bounce' && {
            'tracking.bounceReason': event.reason,
            'tracking.bounceType': event.type,
          }),
          ...(event.event === 'open' && {
            $inc: { 'tracking.openCount': 1 },
            $set: { 'tracking.firstOpenedAt': event.timestamp },
          }),
          ...(event.event === 'click' && {
            $inc: { 'tracking.clickCount': 1 },
            $push: { 'tracking.clickedLinks': event.url },
          }),
        }
      );
    }
  }

  /**
   * Map Mailgun event types
   */
  mapMailgunEventType(event) {
    const map = {
      delivered: 'delivered',
      opened: 'opened',
      clicked: 'clicked',
      failed: 'bounced',
      complained: 'spam',
      unsubscribed: 'unsubscribed',
    };
    return map[event] || event;
  }

  /**
   * Map Azure event types
   */
  mapAzureEventType(eventType) {
    const map = {
      'Microsoft.Communication.EmailDeliveryReportReceived': 'delivered',
      'Microsoft.Communication.EmailEngagementTrackingReportReceived': 'engaged',
    };
    return map[eventType] || eventType;
  }

  /**
   * Get webhook events
   */
  async getEvents(filters = {}) {
    const { provider, eventType, emailId, startDate, endDate, page = 1, limit = 50 } = filters;

    const query = {};
    if (provider) query.provider = provider;
    if (eventType) query.eventType = eventType;
    if (emailId) query.emailId = emailId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      WebhookEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      WebhookEvent.countDocuments(query),
    ]);

    return {
      data: events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = {
  EmailWebhooksHandler,
  WebhookEvent,
};
