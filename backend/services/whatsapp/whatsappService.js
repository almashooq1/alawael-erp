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
const { normalizePhone, maskPhone } = require('./phone');

// ─── Config ─────────────────────────────────────────────────────────────────
function cfg() {
  return {
    token: process.env.WHATSAPP_API_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    // App Secret — for HMAC verification of incoming webhook POST bodies.
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
    // Verify Token — a separate value Meta sends back in GET /webhook
    // during one-time webhook URL verification. Falls back to webhookSecret
    // for backwards-compat with deployments that conflated the two.
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_SECRET || '',
    businessId: process.env.WHATSAPP_BUSINESS_ID || '',
    enabled: process.env.WHATSAPP_ENABLED === 'true' || !!process.env.WHATSAPP_API_TOKEN,
  };
}

// ─── HTTP helper (no extra deps — uses built-in https) ──────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const accessToken = token || cfg().token;
    // When the Meta app has "Require app secret" enabled (default for new apps),
    // EVERY server-side Graph call must carry appsecret_proof = HMAC-SHA256 of the
    // access token keyed by the app secret — otherwise Meta rejects with
    // "API calls from the server require an appsecret_proof argument" (code 100),
    // so every send/template/media call fails. Append it when an app secret is
    // configured (WHATSAPP_WEBHOOK_SECRET). Harmless when the toggle is off, and
    // Meta recommends it regardless. W1425 — found live during activation.
    let apiPath = `/v21.0${path}`;
    const appSecret = cfg().webhookSecret;
    if (appSecret && accessToken) {
      const proof = require('crypto')
        .createHmac('sha256', appSecret)
        .update(accessToken)
        .digest('hex');
      apiPath += (apiPath.includes('?') ? '&' : '?') + 'appsecret_proof=' + proof;
    }
    const options = {
      hostname: 'graph.facebook.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

// Phone normalization lives in `./phone.js` for testability + GCC + intl
// support. Re-exported below as `whatsappService.normalizePhone` to keep
// the public API stable.

// ═══════════════════════════════════════════════════════════════════════════
// Consent gate (Meta policy + PDPL Art.13)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Throw an HTTP-4xx-shaped error if the phone is NOT cleared to receive
 * a message of the given mode. Routes should call this before fanning out
 * a marketing / notification send. For inbound 1:1 replies use
 * `assertCanReply`.
 *
 * Modes:
 *   - 'any'   — requires explicit opt-in OR an open 24h service window.
 *                Use for templates / scheduled notifications.
 *   - 'reply' — requires only the 24h service window. Use for free-form
 *                responses to a message the user just sent.
 *
 * Returns the reason string ('opted_in' / 'in_service_window') on
 * success. Throws a 403-shaped error with `code: 'CONSENT_REQUIRED'` on
 * failure so route handlers can `res.status(err.statusCode).json(...)`.
 */
async function assertCanMessage(phone, mode = 'any') {
  let WhatsAppConsent;
  try {
    WhatsAppConsent = require('../../models/WhatsAppConsent');
  } catch {
    return 'consent_model_unavailable'; // dev/test bootstrap order — open-fail
  }
  const normalized = normalizePhone(phone);
  if (mode === 'reply') {
    const ok = await WhatsAppConsent.canReply(normalized);
    if (ok) return 'in_service_window';
    throw Object.assign(new Error('Outside 24-hour customer-service window'), {
      statusCode: 403,
      code: 'CONSENT_REQUIRED',
      details: { phone: maskPhone(normalized), mode: 'reply' },
    });
  }
  const { allowed, reason } = await WhatsAppConsent.canMessage(normalized);
  if (allowed) return reason;
  throw Object.assign(new Error(`Cannot message ${maskPhone(normalized)}: ${reason}`), {
    statusCode: 403,
    code: 'CONSENT_REQUIRED',
    details: { phone: maskPhone(normalized), reason, mode: 'any' },
  });
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
    logger.info(`[WhatsApp:stub] sendText → ${maskPhone(to)}: ${text.slice(0, 80)}`);
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
  // Pre-flight validation against the locally-synced templates table (W272).
  // Fails fast on TEMPLATE_NOT_APPROVED / TEMPLATE_PARAM_COUNT_MISMATCH /
  // TEMPLATE_PARAM_TOO_LONG, so the caller gets a precise reason instead of
  // a Meta 400. Lazy-loaded to avoid a circular require with templateSync
  // → whatsappService chain.
  try {
    const templateSync = require('./templateSync.service');
    if (templateSync && typeof templateSync.validateSendParams === 'function') {
      const v = await templateSync.validateSendParams(templateName, language, components);
      if (!v.ok) {
        const err = Object.assign(new Error(`Template validation failed: ${v.reason}`), {
          statusCode: 400,
          code: v.reason,
          details: v.details,
        });
        throw err;
      }
      if (v.warning) {
        logger.warn(`[WhatsApp] ${v.warning}`);
      }
    }
  } catch (err) {
    // Re-throw validation errors so the caller (route + withSendGuards)
    // surfaces them. Defensive: if the validation module itself throws
    // (e.g. circular require, model unavailable), swallow + log + proceed
    // so a sync glitch doesn't block sends.
    if (err && err.code && typeof err.code === 'string' && err.code.startsWith('TEMPLATE_')) {
      throw err;
    }
    logger.debug(`[WhatsApp] validateSendParams unavailable: ${err?.message}`);
  }

  if (!cfg().enabled) {
    logger.info(`[WhatsApp:stub] sendTemplate → ${maskPhone(to)}: ${templateName}`);
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
    logger.info(`[WhatsApp:stub] sendDocument → ${maskPhone(to)}: ${url}`);
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
    logger.info(`[WhatsApp:stub] sendImage → ${maskPhone(to)}: ${url}`);
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
    logger.info(`[WhatsApp:stub] sendInteractiveButtons → ${maskPhone(to)}`);
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
    logger.info(`[WhatsApp:stub] sendInteractiveList → ${maskPhone(to)}`);
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
  // Meta sends the verification params as DOTTED query keys
  // (hub.mode / hub.verify_token / hub.challenge). Two things break the naive
  // `req.query['hub.mode']` read: (1) the global request-sanitizer
  // (middleware/requestValidation.sanitizeInput) rebuilds req.query, and (2) the
  // qs parser can nest dotted keys (`hub.mode` -> req.query.hub.mode). Together
  // they made `req.query['hub.mode']` come back undefined, so EVERY Meta
  // verification handshake 403'd (W1424 — found on prod via the live webhook).
  // Parse straight from the raw URL (immune to both), with req.query fallbacks.
  const raw = new URLSearchParams((req.originalUrl || req.url || '').split('?')[1] || '');
  const q = req.query || {};
  const mode = raw.get('hub.mode') ?? q['hub.mode'] ?? q.hub?.mode;
  const token = raw.get('hub.verify_token') ?? q['hub.verify_token'] ?? q.hub?.verify_token;
  const challenge = raw.get('hub.challenge') ?? q['hub.challenge'] ?? q.hub?.challenge;

  // Meta sends hub.verify_token equal to the value we configured in the
  // dashboard. WHATSAPP_VERIFY_TOKEN is the canonical name; we fall back to
  // WHATSAPP_WEBHOOK_SECRET so legacy deployments that set one variable
  // don't break.
  const expected = cfg().verifyToken;
  if (mode === 'subscribe' && expected && token === expected) {
    logger.info('[WhatsApp] Webhook verified ✓');
    // Meta's challenge is alphanumeric — strip anything else so the echo can
    // never contain HTML (CodeQL js/reflected-xss), and serve as text/plain.
    const safeChallenge = String(challenge || '').replace(/[^0-9A-Za-z._-]/g, '');
    return res.status(200).type('text/plain').send(safeChallenge);
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
// Media Download — fetch inbound photos / documents / audio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve a Meta media ID to a temporary download URL (valid ~5 minutes).
 * Inbound messages give us only `mediaId`; this endpoint converts it.
 *
 * This is the UNCACHED path — every call hits Meta. For most consumers
 * use `getCachedMediaUrl` instead; it absorbs bursts and refreshes on
 * expiry. Kept separate so callers that NEED a fresh resolve (e.g. a
 * retry after a 404) can still bypass the cache.
 *
 * @param {string} mediaId
 * @returns {Promise<{ url:string, mime_type?:string, sha256?:string, file_size?:number, id:string }>}
 */
async function getMediaUrl(mediaId) {
  if (!cfg().enabled) {
    return { stub: true, url: `stub://media/${mediaId}`, id: mediaId };
  }
  if (!mediaId) throw new Error('mediaId required');
  return request('GET', `/${mediaId}`);
}

// ─── In-process media URL cache (W272) ─────────────────────────────────────
// Meta media URLs expire in ~5 minutes. We don't persist them — the cost of
// a refetch (one GET) is small and the surface area of a stored expired URL
// is unbounded. The cache exists only to absorb bursts: e.g. a webhook
// arrives with media, the conversation log writes once, then a re-render
// of the admin dashboard reads twice within the same minute.
//
// TTL = 60s (well under Meta's 5min hard expiry). Cap at 1000 entries so a
// runaway loop can't OOM the process; LRU eviction by oldest insertedAt.
//
// NOT process-shared. In a multi-instance deploy, each replica caches
// independently. That's fine — the worst case is N redundant Meta calls
// for a brief window, well under the rate cap.
const _mediaCache = new Map(); // mediaId → { url, fetchedAt, expiresAt, meta }
const _MEDIA_CACHE_TTL_MS = 60 * 1000;
const _MEDIA_CACHE_MAX = 1000;

function _trimMediaCache() {
  if (_mediaCache.size <= _MEDIA_CACHE_MAX) return;
  // Drop the oldest 10% in one pass (cheaper than per-insert eviction).
  const target = Math.floor(_MEDIA_CACHE_MAX * 0.9);
  const keys = Array.from(_mediaCache.keys());
  while (_mediaCache.size > target && keys.length) {
    const k = keys.shift();
    if (k) _mediaCache.delete(k);
  }
}

/**
 * Cached resolve of a Meta media ID. Returns the same shape as
 * `getMediaUrl` plus a `cached` boolean for observability.
 *
 * Use this from webhook handlers / conversation views / AI summarization —
 * anywhere the URL is needed but a fresh round-trip per render is wasteful.
 * On cache miss OR expiry, calls `getMediaUrl` and caches the result.
 *
 * `{ forceRefresh: true }` bypasses the cache for callers that just got
 * a 404 from a stale URL.
 *
 * @param {string} mediaId
 * @param {Object} [opts]
 * @param {boolean} [opts.forceRefresh=false]
 * @returns {Promise<{ url:string, mime_type?:string, sha256?:string, file_size?:number, id:string, cached:boolean }>}
 */
async function getCachedMediaUrl(mediaId, { forceRefresh = false } = {}) {
  if (!mediaId) throw new Error('mediaId required');
  const now = Date.now();
  if (!forceRefresh) {
    const hit = _mediaCache.get(mediaId);
    if (hit && hit.expiresAt > now) {
      return { ...hit.meta, cached: true };
    }
  }
  const meta = await getMediaUrl(mediaId);
  _mediaCache.set(mediaId, {
    url: meta.url,
    fetchedAt: now,
    expiresAt: now + _MEDIA_CACHE_TTL_MS,
    meta,
  });
  _trimMediaCache();
  return { ...meta, cached: false };
}

function clearMediaCache() {
  _mediaCache.clear();
}

function getMediaCacheStats() {
  return { size: _mediaCache.size, maxSize: _MEDIA_CACHE_MAX, ttlMs: _MEDIA_CACHE_TTL_MS };
}

/**
 * Download media bytes by media-id. Two-step: first resolve URL, then
 * GET the URL with the bearer token (Meta requires auth on media URLs).
 * @param {string} mediaId
 * @returns {Promise<Buffer>}
 */
async function downloadMedia(mediaId) {
  if (!cfg().enabled) {
    // Return a minimal PNG placeholder buffer so callers don't crash in stub mode.
    return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  // Use the cached resolver to absorb bursts (W272). On a 5xx/404 the
  // caller can refetch with { forceRefresh: true } via getCachedMediaUrl.
  const meta = await getCachedMediaUrl(mediaId);
  if (!meta?.url) throw new Error('Media URL missing in Meta response');
  return downloadBinary(meta.url);
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${cfg().token}` },
    };
    https
      .request(opts, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // Follow one redirect (Meta sometimes 302s to S3).
          return downloadBinary(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`Media download HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject)
      .end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience helpers — used by auth/otp-service.js and other callers that
// don't want to construct a template object by hand. Kept thin: each is a
// single sendTemplate() call. These are the canonical replacements for the
// legacy `communication/whatsapp-service.js` exports.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a 4-6 digit OTP via the pre-approved `otp_verification` template.
 *
 * @param {string} to - phone number (any GCC format; normalized internally)
 * @param {string|number} otp - the OTP value to embed in template body
 * @param {number} [expiryMinutes=5] - shown in the template body
 * @returns {Promise<{success:boolean, messageId?:string, stub?:boolean}>}
 */
async function sendOtp(to, otp, expiryMinutes = 5) {
  return sendTemplate(to, 'otp_verification', 'ar', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(otp) },
        { type: 'text', text: String(expiryMinutes) },
      ],
    },
  ]);
}

/**
 * Send a notification via the `notification` template. Title + body fields
 * must match the template registered in Meta Business Manager.
 */
async function sendNotification(to, title, body, ctx = {}) {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(title).slice(0, 60) },
        { type: 'text', text: String(body).slice(0, 1024) },
      ],
    },
  ];

  let result;
  try {
    result = await sendTemplate(to, 'notification', 'ar', components);
  } catch (err) {
    result = { success: false, error: err.message };
  }

  // W1424g — the automation/subscriber sends (post-session summary,
  // complaint-resolved, waitlist, appointment reminders) all route through
  // sendNotification, NOT through the routes' withSendGuards — so a terminal Meta
  // failure (after the in-call retries) had NO DLQ enqueue and the notification
  // was lost with no replay. Enqueue on failure so the DLQ sweeper replays it.
  // Payload shape matches dlq.service dispatchByType('template').
  if (!result || result.success === false) {
    try {
      const dlq = require('./dlq.service');
      await dlq.enqueue(
        'template',
        { to, templateName: 'notification', language: 'ar', components },
        new Error(result?.error || 'sendNotification failed'),
        ctx
      );
    } catch (_) {
      /* DLQ enqueue is best-effort — never let it mask the send result */
    }
  }

  return result;
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
  getMediaUrl,
  getCachedMediaUrl,
  clearMediaCache,
  getMediaCacheStats,
  downloadMedia,
  assertCanMessage,
  normalizePhone,
  maskPhone,
  // Convenience wrappers — see block above.
  sendOtp,
  sendNotification,
  isEnabled: () => cfg().enabled,
};

module.exports = whatsappService;
