'use strict';

/**
 * Phase A — WhatsApp activation & security regression tests.
 *
 * Covers:
 *   1. Webhook POST rejects forged signatures (401) and accepts valid ones (200).
 *   2. Webhook GET verifies hub.verify_token against WHATSAPP_VERIFY_TOKEN
 *      (with backward-compat fallback to WHATSAPP_WEBHOOK_SECRET).
 *   3. Non-webhook endpoints behind the WhatsApp router require authentication
 *      (return 401 when no JWT is presented).
 *   4. communication.registry mounts the WhatsApp router under /api/whatsapp
 *      and /api/v1/whatsapp without throwing.
 *   5. The new convenience helpers (sendOtp, sendNotification) on the
 *      canonical service produce well-shaped template calls in stub mode.
 *
 * Stub mode is sufficient — these tests exercise the integration boundary,
 * not the Meta Cloud API itself.
 */

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

// ─── 1. + 2. + 3. — Router activation + signature + auth ─────────────────
describe('Phase A — WhatsApp router activation + webhook security', () => {
  const SECRET = 'phase-a-app-secret';
  const VERIFY_TOKEN = 'phase-a-verify-token';
  let app;

  beforeAll(() => {
    process.env.WHATSAPP_WEBHOOK_SECRET = SECRET;
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
    // Force stub mode — no outbound Meta calls.
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_ENABLED;

    // Replicate the relevant slice of startup/middleware.js: a global
    // express.json with a `verify` hook that stashes the raw body on
    // req.rawBody for webhook paths.
    app = express();
    const webhookRawBody = (req, _res, buf) => {
      if ((req.originalUrl || req.url || '').includes('/whatsapp/webhook')) {
        req.rawBody = buf;
      }
    };
    app.use(express.json({ limit: '1mb', verify: webhookRawBody }));

    // Mount only the WhatsApp router under /api/whatsapp (no auth wrapper —
    // the router gates its own non-webhook routes via router.use(authenticate)).
    const whatsappRoutes = require('../routes/whatsapp.routes');
    app.use('/api/whatsapp', whatsappRoutes);
  });

  afterAll(() => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
  });

  function signBody(rawBodyStr) {
    return 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBodyStr).digest('hex');
  }

  test('POST /webhook rejects request with no signature (401)', async () => {
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .send({ object: 'whatsapp_business_account', entry: [] });
    expect(res.status).toBe(401);
    expect(res.body?.success).toBe(false);
  });

  test('POST /webhook rejects request with wrong signature (401)', async () => {
    const body = { object: 'whatsapp_business_account', entry: [] };
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .send(body);
    expect(res.status).toBe(401);
  });

  test('POST /webhook accepts request with valid signature (200)', async () => {
    const bodyObj = { object: 'whatsapp_business_account', entry: [] };
    const bodyStr = JSON.stringify(bodyObj);
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signBody(bodyStr))
      .send(bodyObj);
    expect(res.status).toBe(200);
  });

  test('GET /webhook accepts hub.verify_token equal to WHATSAPP_VERIFY_TOKEN', async () => {
    const res = await request(app).get('/api/whatsapp/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN,
      'hub.challenge': 'challenge-abc-123',
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe('challenge-abc-123');
  });

  test('GET /webhook rejects mismatched verify token (403)', async () => {
    const res = await request(app).get('/api/whatsapp/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': 'challenge-abc-123',
    });
    expect(res.status).toBe(403);
  });

  test('GET /conversations requires authentication (401 with no token)', async () => {
    const res = await request(app).get('/api/whatsapp/conversations');
    // 401 from authenticate middleware — exact code may vary by impl;
    // 401 OR 403 are both acceptable "not authorized" signals.
    expect([401, 403]).toContain(res.status);
  });

  test('POST /send/text requires authentication (401/403 with no token)', async () => {
    const res = await request(app)
      .post('/api/whatsapp/send/text')
      .send({ to: '+966500000000', text: 'hi' });
    expect([401, 403]).toContain(res.status);
  });

  test('GET /templates requires authentication (401/403 with no token)', async () => {
    const res = await request(app).get('/api/whatsapp/templates');
    expect([401, 403]).toContain(res.status);
  });
});

// ─── 4. — communication.registry mounts the router without throwing ──────
describe('Phase A — communication.registry mounts WhatsApp routes', () => {
  test('registerCommunicationRoutes loads + mounts whatsapp + whatsapp-enhanced', () => {
    const registerCommunicationRoutes = require('../routes/registries/communication.registry');
    const app = express();
    const calls = [];
    const helpers = {
      safeRequire: p => {
        try {
          return require(p);
        } catch {
          return null;
        }
      },
      dualMount: (_app, name, _router) => calls.push({ kind: 'dualMount', name }),
      dualMountAuth: (_app, name, _router, _auth) => calls.push({ kind: 'dualMountAuth', name }),
      safeMount: () => {},
      logger: { info: () => {}, warn: () => {} },
      authenticate: (_req, _res, next) => next(),
    };
    expect(() => registerCommunicationRoutes(app, helpers)).not.toThrow();

    const mountedNames = calls.map(c => c.name);
    expect(mountedNames).toContain('whatsapp');
    expect(mountedNames).toContain('whatsapp-enhanced');
  });
});

// ─── 5. — Canonical helpers shape ─────────────────────────────────────────
describe('Phase A — canonical sendOtp + sendNotification (stub mode)', () => {
  beforeAll(() => {
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_ENABLED;
  });

  test('sendOtp returns stub success shape', async () => {
    const svc = require('../services/whatsapp/whatsappService');
    const result = await svc.sendOtp('+966500000000', '123456', 5);
    expect(result.success).toBe(true);
    expect(result.stub).toBe(true);
    expect(typeof result.messageId).toBe('string');
    expect(result.messageId.startsWith('stub-')).toBe(true);
  });

  test('sendNotification accepts long title/body without crashing', async () => {
    const svc = require('../services/whatsapp/whatsappService');
    const longBody = 'x'.repeat(2000);
    const result = await svc.sendNotification('+966500000000', 'Title', longBody);
    expect(result.success).toBe(true);
  });

  test('index.js re-exports backwards-compat names', () => {
    const idx = require('../services/whatsapp');
    expect(typeof idx.sendWhatsAppOTP).toBe('function');
    expect(typeof idx.sendWhatsAppNotification).toBe('function');
    expect(typeof idx.sendWhatsAppText).toBe('function');
    expect(typeof idx.sendWhatsAppDocument).toBe('function');
    expect(idx.sendWhatsAppOTP).toBe(idx.whatsappService.sendOtp);
  });
});
