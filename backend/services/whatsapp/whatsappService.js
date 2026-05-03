/**
 * WhatsApp Business API Service — خدمة واتساب للأعمال
 * ═══════════════════════════════════════════════════════════════════════════
 * Meta Cloud API (v21.0) integration for the rehabilitation platform.
 *
 * Capabilities:
 *   - Text messages (templated + free-form)
 *   - Document / image / audio messages
 *   - Interactive messages (buttons, list pickers)
 *   - Webhook verification + inbound message processing
 *   - Delivery & read-receipt tracking
 *   - Rate-limit aware with exponential back-off
 *
 * @module services/whatsapp/whatsappService
 * @version 2.0.0
 */

'use strict';

const https = require('https');
const logger = require('../../utils/logger');

// ─── Config ─────────────────────────────────────────────────────────────────
const BASE_URL = 'https://graph.facebook.com/v21.0';

function cfg() {
  return {
    token: process.env.WHATSAPP_API_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
    businessId: process.env.WHATSAPP_BUSINESS_ID || '',
    enabled: process.env.WHATSAPP_ENABLED === 'true' || !!process.env.WHATSAPP_API_TOKEN,
  };
}

// ─── HTTP helper (no extra deps — uses built-in https) ──────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v21.0${path}`,
      method,
      headers: {
        Authorization: `Bearer ${token || cfg().token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(
              Object.assign(new Error(parsed?.error?.message || `HTTP ${res.statusCode}`), {
                statusCode: res.statusCode,
                meta: parsed,
              })
            );
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`WhatsApp API parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Back-off retry ──────────────────────────────────────────────────────────
async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.statusCode === 429 || err.statusCode >= 500) {
        const delay = baseDelayMs * 2 ** i;
        logger.warn(`[WhatsApp] Retry ${i + 1}/${retries} after ${delay}ms — ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err; // non-retriable
      }
    }
  }
  throw lastErr;
}

// ─── Sanitize phone number (E.164) ───────────────────────────────────────────
function normalizePhone(phone) {
  if (!phone) throw new Error('Phone number required');
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7) throw new Error(`Invalid phone: ${phone}`);
  // Saudi numbers: 05xx → 9665xx
  if (digits.startsWith('05') && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Sending Methods
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a plain text message.
 * @param {string} to - recipient phone (E.164 or local)
 * @param {string} text - message body (max 4096 chars)
 * @param {Object} [meta] - extra metadata stored in FamilyCommunication log
 */
async function sendText(to, text, meta = {}) {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendText → ${to}: ${text.slice(0, 80)}`);
    return { success: true, stub: true, messageId: `stub-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  if (!text || !text.trim()) throw new Error('Message text cannot be empty');
  const truncated = text.slice(0, 4096);

  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: truncated, preview_url: !!meta.previewUrl },
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Send a pre-approved template message.
 * @param {string} to
 * @param {string} templateName - template name in Meta account
 * @param {string} [language='ar'] - template language code
 * @param {Array}  [components] - header/body/button component parameters
 */
async function sendTemplate(to, templateName, language = 'ar', components = []) {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendTemplate → ${to}: ${templateName}`);
    return { success: true, stub: true, messageId: `stub-tmpl-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length ? { components } : {}),
      },
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Send a document (PDF, DOCX, etc.).
 * @param {string} to
 * @param {string} url - publicly accessible URL
 * @param {string} [caption] - document caption
 * @param {Object} [opts]   - filename, reportId, instanceKey
 */
async function sendDocument(to, url, caption = '', opts = {}) {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendDocument → ${to}: ${url}`);
    return { success: true, stub: true, messageId: `stub-doc-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'document',
      document: {
        link: url,
        caption: caption.slice(0, 1024),
        filename: opts.filename || 'document.pdf',
      },
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Send an image.
 * @param {string} to
 * @param {string} url - image URL
 * @param {string} [caption]
 */
async function sendImage(to, url, caption = '') {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendImage → ${to}: ${url}`);
    return { success: true, stub: true, messageId: `stub-img-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'image',
      image: { link: url, caption: caption.slice(0, 1024) },
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Send an interactive message with quick-reply buttons (max 3).
 * @param {string} to
 * @param {string} bodyText
 * @param {Array<{id:string, title:string}>} buttons
 * @param {string} [headerText]
 * @param {string} [footerText]
 */
async function sendInteractiveButtons(to, bodyText, buttons, headerText = '', footerText = '') {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendInteractiveButtons → ${to}`);
    return { success: true, stub: true, messageId: `stub-btn-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  const btns = buttons.slice(0, 3).map(b => ({
    type: 'reply',
    reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) },
  }));

  const interactive = {
    type: 'button',
    body: { text: bodyText.slice(0, 1024) },
    action: { buttons: btns },
  };
  if (headerText) interactive.header = { type: 'text', text: headerText.slice(0, 60) };
  if (footerText) interactive.footer = { text: footerText.slice(0, 60) };

  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive,
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Send an interactive list message (max 10 items).
 * @param {string} to
 * @param {string} bodyText
 * @param {string} buttonLabel - list trigger label
 * @param {Array<{id:string, title:string, description?:string}>} items
 * @param {string} [sectionTitle]
 */
async function sendInteractiveList(to, bodyText, buttonLabel, items, sectionTitle = 'الخيارات') {
  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendInteractiveList → ${to}`);
    return { success: true, stub: true, messageId: `stub-list-${Date.now()}` };
  }

  const phone = normalizePhone(to);
  const rows = items.slice(0, 10).map(item => ({
    id: String(item.id).slice(0, 200),
    title: String(item.title).slice(0, 24),
    description: item.description ? String(item.description).slice(0, 72) : undefined,
  }));

  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText.slice(0, 1024) },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [{ title: sectionTitle, rows }],
        },
      },
    })
  ).then(res => ({
    success: true,
    messageId: res?.messages?.[0]?.id,
    to: phone,
    ...res,
  }));
}

/**
 * Mark a received message as read (shows blue ticks).
 * @param {string} messageId - WhatsApp message ID from webhook
 */
async function markAsRead(messageId) {
  if (!cfg().enabled) return { success: true, stub: true };
  return withRetry(() =>
    request('POST', `/${cfg().phoneId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    })
  ).then(() => ({ success: true, messageId }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Webhook Verification (GET)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle Meta webhook verification challenge.
 * Call this from GET /api/whatsapp/webhook
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === cfg().webhookSecret) {
    logger.info('[WhatsApp] Webhook verified ✓');
    return res.status(200).send(challenge);
  }
  logger.warn('[WhatsApp] Webhook verification failed — token mismatch');
  return res.sendStatus(403);
}

// ═══════════════════════════════════════════════════════════════════════════
// Business Profile & Phone Info
// ═══════════════════════════════════════════════════════════════════════════

async function getPhoneInfo() {
  if (!cfg().enabled) return { stub: true };
  return request(
    'GET',
    `/${cfg().phoneId}?fields=display_phone_number,verified_name,quality_rating`
  );
}

async function getTemplates() {
  if (!cfg().enabled) return { stub: true, data: [] };
  if (!cfg().businessId) throw new Error('WHATSAPP_BUSINESS_ID not set');
  return request(
    'GET',
    `/${cfg().businessId}/message_templates?fields=name,status,language,components&limit=100`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

const whatsappService = {
  sendText,
  sendTemplate,
  sendDocument,
  sendImage,
  sendInteractiveButtons,
  sendInteractiveList,
  markAsRead,
  verifyWebhook,
  getPhoneInfo,
  getTemplates,
  normalizePhone,
  isEnabled: () => cfg().enabled,
};

module.exports = whatsappService;
