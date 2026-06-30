/**
 * Meta WhatsApp Cloud API provider (W1424b).
 *
 * Sends via graph.facebook.com/{version}/{phoneNumberId}/messages using a
 * Meta system-user / permanent access token. Reads the creds already staged
 * on prod: WHATSAPP_API_TOKEN (EAA… token) + WHATSAPP_PHONE_ID. This closes the
 * activation gap: the Meta creds + webhook were configured, but PROVIDER_MAP
 * only had UltraMsg + Twilio (third-party gateways) — there was NO Meta sender.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

'use strict';

const BaseWhatsAppProvider = require('./baseProvider');
const metaTransport = require('../../../services/whatsapp/metaTransport');

class MetaCloudProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'meta';
    // Lazy env reads (CCTV/Hikvision lesson) — but provider is constructed per
    // getProviders() call, so reading here is fine.
    this.token = config.token || process.env.WHATSAPP_API_TOKEN || process.env.WA_TOKEN;
    this.phoneId = config.phoneId || process.env.WHATSAPP_PHONE_ID || process.env.WA_PHONE_NUMBER_ID;
    this.apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.baseUrl = config.baseUrl || `https://graph.facebook.com/${this.apiVersion}`;
    // appsecret_proof — required when the Meta app has "Require App Secret Proof
    // for Server API calls" enabled. = HMAC-SHA256(access_token, app_secret).
    // The app secret is the same value used to verify webhook signatures.
    this.appSecret = config.appSecret || metaTransport.resolveAppSecret();
    this.enabled = !!(this.token && this.phoneId);
  }

  _withProof(url) {
    // Shared signer (W1424i) — identical appsecret_proof to Path A (whatsappService).
    return metaTransport.withProof(url, this.token, this.appSecret);
  }

  validateConfig() {
    if (!this.token) return { valid: false, error: 'WHATSAPP_API_TOKEN is required' };
    if (!this.phoneId) return { valid: false, error: 'WHATSAPP_PHONE_ID is required' };
    return { valid: true };
  }

  async _request(payload) {
    const url = this._withProof(`${this.baseUrl}/${this.phoneId}/messages`);
    let response;
    let data;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
      });
      data = await response.json().catch(() => ({}));
    } catch (err) {
      return { success: false, error: err?.message || 'network_error' };
    }
    if (!response.ok || data.error) {
      return {
        success: false,
        error: (data.error && (data.error.message || data.error.type)) || `HTTP ${response.status}`,
        raw: data,
      };
    }
    return {
      success: Array.isArray(data.messages) && data.messages.length > 0,
      messageId: data.messages?.[0]?.id || null,
      error: null,
      raw: data,
    };
  }

  async sendText(to, message, _options = {}) {
    return this._request({
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: { preview_url: false, body: String(message ?? '') },
    });
  }

  async sendTemplate(to, templateName, params = {}, language = 'ar') {
    const parameters = Object.values(params).map((value) => ({ type: 'text', text: String(value) }));
    return this._request({
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
      },
    });
  }

  async sendMedia(to, mediaUrl, caption = '', type = 'image') {
    const mediaType = ['image', 'video', 'document', 'audio'].includes(type) ? type : 'image';
    const mediaObj = { link: mediaUrl };
    if (caption && mediaType !== 'audio') mediaObj.caption = caption;
    return this._request({
      to: this.formatPhoneNumber(to),
      type: mediaType,
      [mediaType]: mediaObj,
    });
  }

  async sendInteractiveButtons(to, body, buttons) {
    return this._request({
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: (buttons || []).slice(0, 3).map((btn, i) => ({
            type: 'reply',
            reply: { id: btn.id || `btn_${i}`, title: String(btn.title).substring(0, 20) },
          })),
        },
      },
    });
  }

  async sendListMessage(to, body, buttonText, sections) {
    return this._request({
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: String(buttonText).substring(0, 20),
          sections: (sections || []).map((section, sIdx) => ({
            title: (section.title || `Section ${sIdx + 1}`).substring(0, 24),
            rows: (section.rows || []).map((row, rIdx) => ({
              id: row.id || `row_${sIdx}_${rIdx}`,
              title: String(row.title).substring(0, 24),
              ...(row.description ? { description: String(row.description).substring(0, 72) } : {}),
            })),
          })),
        },
      },
    });
  }

  verifyWebhookSignature(signature, body, secret) {
    if (!signature || !secret) return false;
    const crypto = require('crypto');
    // Meta sends `X-Hub-Signature-256: sha256=<hex>`
    const sigHex = String(signature).replace(/^sha256=/, '');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof body === 'string' ? body : JSON.stringify(body))
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  parseWebhook(payload) {
    const events = [];
    for (const entry of payload?.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const msg of value.messages || []) {
          events.push({
            type: 'message_received',
            data: {
              messageId: msg.id,
              from: msg.from,
              to: value.metadata?.phone_number_id || value.metadata?.display_phone_number,
              body:
                msg.text?.body ||
                msg.button?.text ||
                msg.interactive?.button_reply?.title ||
                msg.interactive?.list_reply?.title ||
                '',
              type: msg.type || 'text',
              timestamp: msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now(),
              interactiveReplyId:
                msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null,
            },
          });
        }
        for (const st of value.statuses || []) {
          events.push({
            type: 'status_update',
            data: {
              messageId: st.id,
              status: st.status,
              recipient: st.recipient_id,
              timestamp: st.timestamp ? Number(st.timestamp) * 1000 : Date.now(),
            },
          });
        }
      }
    }
    return events;
  }

  async healthCheck() {
    const start = Date.now();
    try {
      // GET the phone number's metadata — verifies the token + phone-id are
      // valid WITHOUT sending a message.
      const url = this._withProof(
        `${this.baseUrl}/${this.phoneId}?fields=verified_name,quality_rating,display_phone_number`
      );
      const res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
      const data = await res.json().catch(() => ({}));
      return {
        healthy: res.ok && !data.error,
        latency: Date.now() - start,
        error: data.error?.message || (res.ok ? null : `HTTP ${res.status}`),
        verifiedName: data.verified_name,
        displayPhone: data.display_phone_number,
      };
    } catch (err) {
      return { healthy: false, latency: Date.now() - start, error: err?.message || String(err) };
    }
  }
}

module.exports = MetaCloudProvider;
