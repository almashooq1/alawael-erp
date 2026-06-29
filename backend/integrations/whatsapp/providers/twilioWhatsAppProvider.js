/**
 * Twilio WhatsApp Provider
 * مزود Twilio لـ WhatsApp Business API
 *
 * Twilio is already a dependency in the project and offers
 * a robust WhatsApp API with global reach.
 *
 * Docs: https://www.twilio.com/docs/whatsapp/quickstart/node
 */

'use strict';

const BaseWhatsAppProvider = require('./baseProvider');

class TwilioWhatsAppProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'twilio';
    this.accountSid =
      config.accountSid || process.env.TWILIO_WHATSAPP_SID || process.env.TWILIO_ACCOUNT_SID;
    this.authToken =
      config.authToken || process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.fromNumber || process.env.TWILIO_WHATSAPP_FROM;
    this.baseUrl = 'https://api.twilio.com/2010-04-01';
    this.enabled = !!(this.accountSid && this.authToken && this.fromNumber);

    // Lazy-load Twilio SDK to avoid startup dependency
    this._twilioClient = null;
  }

  _getClient() {
    if (!this._twilioClient) {
      const twilio = require('twilio');
      this._twilioClient = twilio(this.accountSid, this.authToken);
    }
    return this._twilioClient;
  }

  validateConfig() {
    if (!this.accountSid) {
      return { valid: false, error: 'TWILIO_WHATSAPP_SID or TWILIO_ACCOUNT_SID is required' };
    }
    if (!this.authToken) {
      return { valid: false, error: 'TWILIO_WHATSAPP_AUTH_TOKEN or TWILIO_AUTH_TOKEN is required' };
    }
    if (!this.fromNumber) {
      return {
        valid: false,
        error: 'TWILIO_WHATSAPP_FROM is required (e.g., whatsapp:+14155238886)',
      };
    }
    return { valid: true };
  }

  async _sendViaRest(to, body, mediaUrl = null) {
    try {
      const client = this._getClient();
      const createParams = {
        from: this.fromNumber,
        to: `whatsapp:${this.formatPhoneNumber(to)}`,
        body: body,
      };

      if (mediaUrl) {
        createParams.mediaUrl = mediaUrl;
      }

      const message = await client.messages.create(createParams);

      return {
        success: true,
        messageId: message.sid,
        error: null,
        raw: message,
      };
    } catch (_err) {
      return {
        success: false,
        messageId: null,
        error: _err?.message || _err?.code || String(_err),
        raw: _err,
      };
    }
  }

  async sendText(to, message, _options = {}) {
    return this._sendViaRest(to, message);
  }

  async sendTemplate(to, templateName, params = {}, language = 'ar') {
    // Twilio uses Content API for templates (separate from basic messages)
    // For now, fall back to sending a formatted text message with template content
    const body = this._renderTemplateBody(templateName, params, language);
    return this._sendViaRest(to, body);
  }

  async sendMedia(to, mediaUrl, caption = '', _type = 'image') {
    return this._sendViaRest(to, caption, [mediaUrl]);
  }

  async sendInteractiveButtons(to, body, buttons) {
    // Twilio doesn't support interactive buttons directly in the basic API
    // Send as formatted text with numbered options
    const formattedBody = this._formatButtonsAsText(body, buttons);
    return this._sendViaRest(to, formattedBody);
  }

  async sendListMessage(to, body, buttonText, sections) {
    // Twilio doesn't support list messages directly
    // Send as formatted text with numbered options
    const formattedBody = this._formatListAsText(body, sections);
    return this._sendViaRest(to, formattedBody);
  }

  _renderTemplateBody(templateName, params, _language) {
    // Simple template rendering fallback
    let body = templateName;
    Object.entries(params).forEach(([key, value]) => {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    return body;
  }

  _formatButtonsAsText(body, buttons) {
    const options = buttons.map((btn, index) => `${index + 1}. ${btn.title}`).join('\n');
    return `${body}\n\n${options}\n\nأرسل رقم الخيار.`;
  }

  _formatListAsText(body, sections) {
    let text = `${body}\n\n`;
    let counter = 1;
    sections.forEach(section => {
      if (section.title) {
        text += `*${section.title}*\n`;
      }
      section.rows.forEach(row => {
        text += `${counter}. ${row.title}`;
        if (row.description) {
          text += ` - ${row.description}`;
        }
        text += '\n';
        counter++;
      });
      text += '\n';
    });
    text += 'أرسل رقم الخيار.';
    return text;
  }

  verifyWebhookSignature(signature, body, secret) {
    if (!signature || !secret) return false;
    const twilio = require('twilio');
    const validate = twilio.validateRequest(secret, signature, secret, body);
    return validate;
  }

  parseWebhook(payload) {
    const events = [];
    if (!payload) return events;

    // Twilio sends form-encoded data typically, but we receive JSON
    const data = payload;

    if (data.MessageSid || data.SmsMessageSid) {
      const from = data.From || data.from;
      const to = data.To || data.to;

      if (from && from.startsWith('whatsapp:')) {
        events.push({
          type: 'message_received',
          data: {
            messageId: data.MessageSid || data.SmsMessageSid,
            from: from.replace('whatsapp:', ''),
            to: to ? to.replace('whatsapp:', '') : '',
            body: data.Body || data.body || '',
            type: data.NumMedia > 0 ? 'media' : 'text',
            timestamp: Date.now(),
            mediaUrl: data.MediaUrl0 || null,
            numMedia: data.NumMedia || 0,
          },
        });
      }
    }

    // Status callback
    if (data.MessageStatus || data.SmsStatus) {
      events.push({
        type: 'status_update',
        data: {
          messageId: data.MessageSid || data.SmsMessageSid,
          status: this._mapTwilioStatus(data.MessageStatus || data.SmsStatus),
          recipient: data.To || data.to,
          timestamp: Date.now(),
        },
      });
    }

    return events;
  }

  _mapTwilioStatus(status) {
    const statusMap = {
      queued: 'queued',
      sending: 'sent',
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      undelivered: 'failed',
      receiving: 'received',
      received: 'received',
      accepted: 'sent',
      scheduled: 'queued',
      canceled: 'cancelled',
    };
    return statusMap[status] || status;
  }

  async getMessageStatus(messageId) {
    try {
      const client = this._getClient();
      const message = await client.messages(messageId).fetch();
      return {
        status: this._mapTwilioStatus(message.status),
        deliveredAt: message.dateSent ? new Date(message.dateSent) : null,
        readAt: null, // Twilio basic doesn't provide read receipts
      };
    } catch (_err) {
      return {
        status: 'unknown',
        deliveredAt: null,
        readAt: null,
      };
    }
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const client = this._getClient();
      await client.api.accounts(this.accountSid).fetch();
      return {
        healthy: true,
        latency: Date.now() - start,
        error: null,
      };
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: err?.message || String(err),
      };
    }
  }
}

module.exports = TwilioWhatsAppProvider;
