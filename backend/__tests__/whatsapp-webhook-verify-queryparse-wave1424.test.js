/**
 * W1424 — WhatsApp webhook verification reads Meta's dotted hub.* params robustly.
 *
 * THE BUG (found on prod via the live webhook): Meta verifies a webhook URL with a
 * GET carrying DOTTED query keys — `?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`.
 * verifyWebhook read `req.query['hub.mode']`, but the global request-sanitizer
 * (middleware/requestValidation.sanitizeInput rebuilds req.query) + the qs parser
 * (which can nest dotted keys under `req.query.hub`) left `req.query['hub.mode']`
 * undefined — so EVERY verification handshake 403'd, silently blocking activation.
 *
 * THE FIX: parse hub.* straight from the raw URL (immune to req.query mutation),
 * with req.query (flat + nested) fallbacks. These tests lock all three shapes.
 */
'use strict';

const svc = require('../services/whatsapp/whatsappService');

function mockRes() {
  const res = { statusCode: null, body: undefined, _type: null };
  res.status = c => {
    res.statusCode = c;
    return res;
  };
  res.type = t => {
    res._type = t;
    return res;
  };
  res.send = b => {
    res.body = b;
    return res;
  };
  res.sendStatus = c => {
    res.statusCode = c;
    res.body = undefined;
    return res;
  };
  return res;
}

describe('W1424 — verifyWebhook dotted-param robustness', () => {
  const TOKEN = 'verify-token-abc123';
  const prevVerify = process.env.WHATSAPP_VERIFY_TOKEN;
  const prevSecret = process.env.WHATSAPP_WEBHOOK_SECRET;

  beforeAll(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = TOKEN;
    delete process.env.WHATSAPP_WEBHOOK_SECRET; // isolate the verifyToken source
  });
  afterAll(() => {
    if (prevVerify === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = prevVerify;
    if (prevSecret !== undefined) process.env.WHATSAPP_WEBHOOK_SECRET = prevSecret;
  });

  test('THE PROD BUG: req.query empty, params only in the raw URL → echoes challenge', () => {
    const req = {
      query: {},
      originalUrl: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=CHAL123`,
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('CHAL123');
  });

  test('qs nested req.query.hub.* shape → echoes challenge', () => {
    const req = {
      query: { hub: { mode: 'subscribe', verify_token: TOKEN, challenge: 'NEST9' } },
      originalUrl: '/api/whatsapp/webhook',
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('NEST9');
  });

  test('flat dotted req.query keys → echoes challenge (no regression)', () => {
    const req = {
      query: { 'hub.mode': 'subscribe', 'hub.verify_token': TOKEN, 'hub.challenge': 'FLAT7' },
      originalUrl: '/api/whatsapp/webhook',
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('FLAT7');
  });

  test('wrong token → 403', () => {
    const req = {
      query: {},
      originalUrl: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=x`,
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('missing mode → 403', () => {
    const req = {
      query: {},
      originalUrl: `/api/whatsapp/webhook?hub.verify_token=${TOKEN}&hub.challenge=x`,
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('challenge echo is sanitized (no HTML/XSS)', () => {
    const evil = encodeURIComponent('<script>alert(1)</script>');
    const req = {
      query: {},
      originalUrl: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=${evil}`,
    };
    const res = mockRes();
    svc.verifyWebhook(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toMatch(/[<>]/);
  });
});
