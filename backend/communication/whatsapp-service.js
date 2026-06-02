/**
 * WhatsApp Service — Compatibility Adapter (W725)
 * ------------------------------------------------
 * This module USED to contain a full, second WhatsApp implementation
 * (~1,250 lines: Meta Cloud API + Twilio + local-gateway HTTP clients,
 * Mongoose log/conversation schemas, a class-based service, and webhook
 * handling). That duplicated the canonical, hardened service that now lives
 * in `backend/services/whatsapp/` (HMAC webhook verification, PDPL Art.13
 * consent gating, exponential-backoff retry, phone normalization,
 * idempotency, DLQ, AI auto-reply, template sync).
 *
 * To eliminate the duplication while keeping every legacy consumer working,
 * this file is now a THIN ADAPTER that delegates to the canonical service.
 * It preserves the exact public surface the old module exported:
 *   WhatsAppService, whatsappService, whatsappConfig, WhatsAppTemplates,
 *   InteractiveBuilders, sendWhatsAppOTP, sendWhatsAppNotification,
 *   sendWhatsAppText, sendWhatsAppImage, sendWhatsAppDocument.
 *
 * New code should import directly from `../services/whatsapp` instead.
 */

const {
  whatsappService: canonical,
  whatsappWebhook: webhookService,
} = require('../services/whatsapp');
const logger = require('../utils/logger');

/**
 * Legacy configuration shim. Only `provider` is read by external consumers
 * (communication/index.js diagnostics). The canonical service reads its own
 * env vars (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_ID / WHATSAPP_WEBHOOK_SECRET).
 */
const whatsappConfig = {
  provider: process.env.WHATSAPP_PROVIDER || 'cloud_api', // cloud_api | twilio | local
  defaults: {
    countryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '966',
    businessName: process.env.BUSINESS_NAME || 'الأوائل',
  },
  templates: {
    namespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE,
    languageCode: 'ar',
  },
};

/**
 * Normalize legacy 3-arg `sendTemplate(to, name, components)` and template
 * descriptor objects into the canonical 4-arg
 * `sendTemplate(to, name, language, components)`.
 */
function sendTemplateCompat(to, a, b, c) {
  let name;
  let language = 'ar';
  let components = [];

  if (a && typeof a === 'object') {
    // Template descriptor: { name, language: { code } | 'ar', components }
    name = a.name;
    language = (a.language && a.language.code) || a.language || 'ar';
    components = a.components || [];
  } else {
    name = a;
    if (Array.isArray(b)) {
      // Legacy 3-arg form: components passed as the 3rd argument.
      components = b;
    } else if (typeof b === 'string') {
      // Canonical 4-arg form: language then components.
      language = b;
      components = Array.isArray(c) ? c : [];
    } else if (b && typeof b === 'object') {
      components = b.components || [];
      language = b.language || 'ar';
    }
  }

  return canonical.sendTemplate(to, name, language, components);
}

/**
 * Adapter object exposing the legacy instance API, backed by the canonical
 * functional service.
 */
const whatsappService = {
  // Legacy lifecycle hook — canonical service is env-driven / stateless.
  async initialize() {
    return { success: true };
  },

  sendText: (to, text, options = {}) => canonical.sendText(to, text, options),
  sendTemplate: sendTemplateCompat,
  sendImage: (to, url, caption = '') => canonical.sendImage(to, url, caption),
  // Legacy signature was (to, url, filename, caption).
  sendDocument: (to, url, filename, caption = '') =>
    canonical.sendDocument(to, url, caption || '', { filename }),

  // Direct passthroughs to canonical capabilities.
  sendOtp: canonical.sendOtp,
  sendNotification: canonical.sendNotification,
  sendInteractiveButtons: canonical.sendInteractiveButtons,
  sendInteractiveList: canonical.sendInteractiveList,
  markAsRead: canonical.markAsRead,
  verifyWebhook: canonical.verifyWebhook,
  getTemplates: canonical.getTemplates,
  getPhoneInfo: canonical.getPhoneInfo,
  normalizePhone: canonical.normalizePhone,
  maskPhone: canonical.maskPhone,

  // Legacy inbound webhook entry point — delegate to canonical webhook
  // service. Legacy arg order was (payload, signature, rawBody); canonical is
  // processWebhook(body, rawBody, signature).
  async processWebhook(payload, signature, rawBody) {
    if (webhookService && typeof webhookService.processWebhook === 'function') {
      return webhookService.processWebhook(payload, rawBody, signature);
    }
    logger.warn('[whatsapp-compat] processWebhook called but no webhook handler is wired');
    return { success: false, reason: 'webhook_handler_unavailable' };
  },
};

/**
 * Legacy class shim. The old code instantiated a class; the singleton is now
 * the adapter above. Kept for `instanceof` / import compatibility.
 */
class WhatsAppService {
  constructor() {
    this.provider = whatsappConfig.provider;
    Object.assign(this, whatsappService);
  }
}

/**
 * Pure-data template builders (Arabic). Retained for backward compatibility;
 * these are metadata factories with no transport logic. New code should use
 * `services/whatsapp/whatsappTemplates.service.js`.
 */
const WhatsAppTemplates = {
  OTP_VERIFICATION: (otp, expiry = 5) => ({
    name: 'otp_verification',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: String(otp) },
          { type: 'text', text: String(expiry) },
        ],
      },
    ],
  }),

  NOTIFICATION: (title, message) => ({
    name: 'notification',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: title },
          { type: 'text', text: message },
        ],
      },
    ],
  }),

  DOCUMENT_READY: (documentName, documentType) => ({
    name: 'document_ready',
    language: { code: 'ar' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: documentName },
          { type: 'text', text: documentType },
        ],
      },
    ],
  }),
};

/**
 * Pure-data interactive-message builders. Retained for compatibility.
 */
const InteractiveBuilders = {
  quickReply: (bodyText, buttons) => ({
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((btn, index) => ({
        type: 'reply',
        reply: { id: btn.id || `btn_${index}`, title: btn.title },
      })),
    },
  }),

  list: (bodyText, buttonText, sections) => ({
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText,
      sections: sections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
        })),
      })),
    },
  }),

  callToAction: (bodyText, buttonText, url) => ({
    type: 'cta_url',
    body: { text: bodyText },
    action: { name: 'cta_url', parameters: { display_text: buttonText, url } },
  }),

  locationRequest: bodyText => ({
    type: 'location_request_message',
    body: { text: bodyText },
    action: { name: 'send_location' },
  }),
};

/**
 * Helper functions — now delegate straight to the canonical service.
 */
const sendWhatsAppOTP = (phoneNumber, otp, expiry = 5) =>
  canonical.sendOtp(phoneNumber, otp, expiry);

const sendWhatsAppNotification = (phoneNumber, title, message) =>
  canonical.sendNotification(phoneNumber, title, message);

const sendWhatsAppText = (phoneNumber, text, options = {}) =>
  canonical.sendText(phoneNumber, text, options);

const sendWhatsAppImage = (phoneNumber, imageUrl, caption = '') =>
  canonical.sendImage(phoneNumber, imageUrl, caption);

const sendWhatsAppDocument = (phoneNumber, documentUrl, filename, caption = '') =>
  canonical.sendDocument(phoneNumber, documentUrl, caption || '', { filename });

module.exports = {
  WhatsAppService,
  whatsappService,
  whatsappConfig,
  WhatsAppTemplates,
  InteractiveBuilders,
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppImage,
  sendWhatsAppDocument,
};
