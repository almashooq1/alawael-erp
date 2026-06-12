/**
 * reports-webhooks.routes.js — provider webhook ingress for the
 * reporting platform.
 *
 * Phase 10 Commit 4.
 *
 * Mount pattern:
 *
 *   app.use(
 *     '/api/v1/reports/webhooks',
 *     // IMPORTANT: webhooks need RAW bodies for signature verification.
 *     // Mount BEFORE express.json() in app.js, and attach raw-body
 *     // parsers here per-provider via buildRouter({ verifiers }).
 *     buildRouter({ handler, verifiers, logger }),
 *   );
 *
 * This file wires 5 endpoints — sendgrid, mailgun, twilio, whatsapp,
 * portal. The first 4 are external (signature-verified); the last is
 * internal (authenticated session required — enforced upstream).
 *
 * Design decisions:
 *   1. Signature verification is injected (`verifiers[provider]`); if
 *      none is supplied, the route accepts any payload (safe for
 *      tests; production MUST wire real verifiers).
 *   2. Handler returns a summary, but we never echo it verbatim —
 *      webhooks just need `2xx` to stop retrying. We log internally.
 *   3. WhatsApp GET is an opt-in verification challenge (Meta requires
 *      it on subscription setup); it echoes `hub.challenge`.
 */

'use strict';

const express = require('express');

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function passVerification(verifiers, provider, req) {
  const v = verifiers && verifiers[provider];
  if (!v) return { ok: true, skipped: true };
  try {
    const ok = v(req);
    return { ok: !!ok };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function buildRouter({ handler, verifiers = {}, logger = console } = {}) {
  if (!handler || typeof handler.handleEvents !== 'function') {
    throw new Error('reports-webhooks.routes: handler.handleEvents required');
  }
  const router = express.Router();

  // ─── SendGrid ────────────────────────────────────────────────
  router.post(
    '/sendgrid',
    asyncWrap(async (req, res) => {
      const v = passVerification(verifiers, 'sendgrid', req);
      if (!v.ok) {
        logger.warn && logger.warn(`webhook sendgrid signature failed: ${v.error || 'invalid'}`);
        return res.status(401).json({ error: 'bad_signature' });
      }
      const events = Array.isArray(req.body) ? req.body : [req.body];
      const summary = await handler.handleEvents('sendgrid', events);
      logger.info &&
        logger.info(
          `[webhook sendgrid] accepted=${summary.accepted} applied=${summary.applied} skipped=${summary.skipped}`
        );
      return res.status(200).json({ ok: true });
    })
  );

  // ─── Mailgun ─────────────────────────────────────────────────
  router.post(
    '/mailgun',
    asyncWrap(async (req, res) => {
      const v = passVerification(verifiers, 'mailgun', req);
      if (!v.ok) return res.status(401).json({ error: 'bad_signature' });
      const summary = await handler.handleEvents('mailgun', req.body);
      logger.info &&
        logger.info(`[webhook mailgun] accepted=${summary.accepted} applied=${summary.applied}`);
      return res.status(200).json({ ok: true });
    })
  );

  // ─── Twilio ──────────────────────────────────────────────────
  router.post(
    '/twilio',
    asyncWrap(async (req, res) => {
      const v = passVerification(verifiers, 'twilio', req);
      if (!v.ok) return res.status(401).json({ error: 'bad_signature' });
      const summary = await handler.handleEvents('twilio', req.body);
      logger.info &&
        logger.info(`[webhook twilio] accepted=${summary.accepted} applied=${summary.applied}`);
      // Twilio expects an empty 200 to stop retries.
      return res.status(200).end();
    })
  );

  // ─── WhatsApp Business Cloud ─────────────────────────────────
  // Meta requires a GET for subscription verification.
  router.get('/whatsapp', (req, res) => {
    const q = req.query || {};
    const expected = verifiers.whatsappVerifyToken;
    if (expected && q['hub.verify_token'] === expected) {
      // text/plain so the echoed challenge can never render as HTML.
      return res.status(200).type('text/plain').send(String(q['hub.challenge'] || ''));
    }
    return res.status(403).json({ error: 'verify_token_mismatch' });
  });

  router.post(
    '/whatsapp',
    asyncWrap(async (req, res) => {
      const v = passVerification(verifiers, 'whatsapp', req);
      if (!v.ok) return res.status(401).json({ error: 'bad_signature' });
      const summary = await handler.handleEvents('whatsapp', req.body);
      logger.info &&
        logger.info(`[webhook whatsapp] accepted=${summary.accepted} applied=${summary.applied}`);
      return res.status(200).json({ ok: true });
    })
  );

  // ─── Portal (internal, authenticated) ────────────────────────
  router.post(
    '/portal',
    asyncWrap(async (req, res) => {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      // Enrich with session context the client shouldn't be trusted
      // to provide.
      for (const ev of events) {
        if (req.user && req.user.id) ev.actor = ev.actor || req.user.id;
        ev.ip = ev.ip || req.ip;
        ev.userAgent = ev.userAgent || req.get('user-agent');
      }
      const summary = await handler.handleEvents('portal', events);
      return res.status(200).json({
        ok: true,
        accepted: summary.accepted,
        applied: summary.applied,
      });
    })
  );

  return router;
}

const _handlerStub = { handleEvents: async () => ({ processed: 0 }) };

// W933 — activate the REAL delivery/read-receipt handler.
//
// The default mount (via routes/registries/phases.registry.js safeMount) was
// always built with the no-op `_handlerStub` above: provider webhooks returned
// 200 but every delivered/read/failed event was silently DROPPED, so the
// ReportDelivery ledger never advanced past SENT and the W762-activated reporting
// platform had no delivery telemetry (W225 dormant-capability pattern — the real
// services/reporting/webhookHandler.WebhookHandler existed but was never wired).
//
// GATED OFF BY DEFAULT (ENABLE_REPORT_WEBHOOKS=true). When unset, behaviour is
// byte-identical to the prior stub mount — inert.
//
// SECURITY: the four external providers (sendgrid/mailgun/twilio/whatsapp) are
// FAIL-CLOSED here. With no real signature verifier wired yet (owner must supply
// provider signing secrets), each is given a `() => false` verifier so the route
// returns 401 rather than ACCEPTING unsigned events that mutate the delivery
// ledger — turning a harmless no-op into a fail-open hole is exactly what doctrine
// forbids. The INTERNAL `portal` path needs no verifier (read-receipts fired by
// the authenticated portal UI) and records straight to the ledger. Real external
// verifiers ship in a later, owner-gated step alongside raw-body signature mounts.
function _resolveDefaultHandler() {
  if (process.env.ENABLE_REPORT_WEBHOOKS !== 'true') return _handlerStub;
  try {
    const { WebhookHandler } = require('../services/reporting/webhookHandler');
    const ReportDelivery = require('../models/ReportDelivery'); // {.model} unwrapped lazily
    return new WebhookHandler({ DeliveryModel: ReportDelivery });
  } catch (_err) {
    return _handlerStub; // any load error → safe no-op, never break boot
  }
}

function _resolveDefaultVerifiers() {
  if (process.env.ENABLE_REPORT_WEBHOOKS !== 'true') return {};
  // Fail-closed externals until real signing secrets + raw-body mounts land.
  return {
    sendgrid: () => false,
    mailgun: () => false,
    twilio: () => false,
    whatsapp: () => false,
  };
}

let _reportsWebhooksRouter;
try {
  _reportsWebhooksRouter = buildRouter({
    handler: _resolveDefaultHandler(),
    verifiers: _resolveDefaultVerifiers(),
  });
} catch (_err) {
  const _fb = require('express').Router();
  _fb.all('*', (_req, res) =>
    res.status(503).json({ success: false, error: 'Reports webhooks not configured' })
  );
  _reportsWebhooksRouter = _fb;
}
module.exports = _reportsWebhooksRouter;
module.exports.buildRouter = buildRouter;
module.exports.asyncWrap = asyncWrap;
module.exports._resolveDefaultHandler = _resolveDefaultHandler;
module.exports._resolveDefaultVerifiers = _resolveDefaultVerifiers;
