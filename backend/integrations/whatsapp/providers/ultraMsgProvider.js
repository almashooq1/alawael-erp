/**
 * UltraMsg WhatsApp Provider
 * مزود UltraMsg لـ WhatsApp Business API
 *
 * UltraMsg is a Saudi-friendly provider with simple REST API
 * and competitive pricing for the MENA region.
 *
 * Docs: https://docs.ultramsg.com/
 */

'use strict';

const BaseWhatsAppProvider = require('./baseProvider');

class UltraMsgProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ultramsg';
    this.instanceId = config.instanceId || process.env.ULTRAMSG_INSTANCE_ID;
    this.token = config.token || process.env.ULTRAMSG_TOKEN;
    this.baseUrl = config.baseUrl || 'https://api.ultramsg.com';
    this.enabled = !!(this.instanceId && this.token);
  }

  validateConfig() {
    if (!this.instanceId) {
      return { valid: false, error: 'ULTRAMSG_INSTANCE_ID is required' };
    }
    if (!this.token) {
      return { valid: false, error: 'ULTRAMSG_TOKEN is required' };
    }
    return { valid: true };
  }

  async _request(endpoint, body) {
    const url = `${this.baseUrl}/${this.instanceId}/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: data.sent !== false && data.error === undefined,
      messageId: data.id || data.messageId || null,
      error: data.error || null,
      raw: data,
    };
  }

  async sendText(to, message, options = {}) {
    const formattedTo = this.formatPhoneNumber(to);
    const result = await this._request('messages/chat', {
      to: formattedTo,
      body: message,
      priority: options.priority || 1,
    });
    return result;
  }

  async sendTemplate(to, templateName, params = {}, language = 'ar') {
    const formattedTo = this.formatPhoneNumber(to);

    // Build template body parameters
    const bodyParams = Object.entries(params).map(([_key, value]) => ({
      type: 'text',
      text: String(value),
    }));

    const result = await this._request('messages/template', {
      to: formattedTo,
      template: templateName,
      language: { code: language },
      components: [
        {
          type: 'body',
          parameters: bodyParams,
        },
      ],
    });
    return result;
  }

  async sendMedia(to, mediaUrl, caption = '', type = 'image') {
    const formattedTo = this.formatPhoneNumber(to);
    const endpointMap = {
      image: 'messages/image',
      video: 'messages/video',
      document: 'messages/document',
      audio: 'messages/audio',
    };
    const endpoint = endpointMap[type] || 'messages/image';

    const result = await this._request(endpoint, {
      to: formattedTo,
      caption: caption,
      image: type === 'image' ? mediaUrl : undefined,
      video: type === 'video' ? mediaUrl : undefined,
      document: type === 'document' ? mediaUrl : undefined,
      audio: type === 'audio' ? mediaUrl : undefined,
    });
    return result;
  }

  async sendInteractiveButtons(to, body, buttons) {
    const formattedTo = this.formatPhoneNumber(to);
    const actionButtons = buttons.map((btn, index) => ({
      type: 'reply',
      reply: {
        id: btn.id || `btn_${index}`,
        title: btn.title.substring(0, 20), // WhatsApp limit: 20 chars
      },
    }));

    const result = await this._request('messages/interactive', {
      to: formattedTo,
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: actionButtons,
        },
      },
    });
    return result;
  }

  async sendListMessage(to, body, buttonText, sections) {
    const formattedTo = this.formatPhoneNumber(to);
    const formattedSections = sections.map((section, sIndex) => ({
      title: section.title || `Section ${sIndex + 1}`,
      rows: section.rows.map((row, rIndex) => ({
        id: row.id || `row_${sIndex}_${rIndex}`,
        title: row.title.substring(0, 24), // WhatsApp limit: 24 chars
        description: row.description?.substring(0, 72), // WhatsApp limit: 72 chars
      })),
    }));

    const result = await this._request('messages/interactive', {
      to: formattedTo,
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText.substring(0, 20),
          sections: formattedSections,
        },
      },
    });
    return result;
  }

  verifyWebhookSignature(signature, body, secret) {
    if (!signature || !secret) return false;
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  parseWebhook(payload) {
    const events = [];
    if (!payload) return events;

    // UltraMsg sends events in various formats
    const data = payload.data || payload;

    if (data.type === 'message_received' || data.event === 'message') {
      events.push({
        type: 'message_received',
        data: {
          messageId: data.id || data.messageId,
          from: data.from || data.sender,
          to: data.to || data.recipient,
          body: data.body || data.message || data.text,
          type: data.type || 'text',
          timestamp: data.timestamp || data.time || Date.now(),
          mediaUrl: data.mediaUrl || data.media_url,
          caption: data.caption,
        },
      });
    }

    if (data.type === 'status' || data.event === 'status') {
      events.push({
        type: 'status_update',
        data: {
          messageId: data.id || data.messageId,
          status: data.status, // sent, delivered, read, failed
          recipient: data.to || data.recipient,
          timestamp: data.timestamp || Date.now(),
        },
      });
    }

    return events;
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const result = await this._request('instance/status', {});
      return {
        healthy: result.success && !result.error,
        latency: Date.now() - start,
        error: result.error || null,
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

module.exports = UltraMsgProvider;
