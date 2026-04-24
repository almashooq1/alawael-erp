/**
 * webhook-hmac-middleware.test.js — verifier for incoming webhooks.
 *
 * Scenarios:
 *   • valid hex signature passes and sets req.webhookVerified
 *   • missing signature header → 401
 *   • mismatched signature → 401
 *   • supports base64 encoding
 *   • supports signature prefix (e.g. 'sha256=')
 *   • timestamp tolerance: accepts fresh, rejects stale
 *   • raw body unavailable → 400 with a clear error (mis-wired app)
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

const verifyWebhookHmac = require('../middleware/webhookHmac.middleware');

function buildApp(mwConfig) {
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.post('/hook', verifyWebhookHmac(mwConfig), (req, res) => {
    res.json({ ok: true, verified: !!req.webhookVerified });
  });
  return app;
}

function sign(secret, body, encoding = 'hex') {
  return crypto.createHmac('sha256', secret).update(body).digest(encoding);
}

describe('webhook HMAC middleware', () => {
  const secret = 'super-secret-k8s';

  it('accepts a valid hex signature and sets req.webhookVerified', async () => {
    const app = buildApp({ secret });
    const body = JSON.stringify({ event: 'invoice.paid', id: 'inv_1' });
    const sig = sign(secret, body);
    const res = await request(app)
      .post('/hook')
      .set('X-Signature', sig)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
    expect(res.body).toEqual({ ok: true, verified: true });
  });

  it('rejects missing signature', async () => {
    const app = buildApp({ secret });
    const res = await request(app).post('/hook').send({ hi: 1 }).expect(401);
    expect(res.body.error).toBe('MISSING_SIGNATURE');
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const app = buildApp({ secret });
    const body = JSON.stringify({ x: 1 });
    const bad = sign('wrong-secret', body);
    await request(app)
      .post('/hook')
      .set('X-Signature', bad)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(401);
  });

  it('supports base64 signatures', async () => {
    const app = buildApp({ secret, encoding: 'base64' });
    const body = JSON.stringify({ x: 1 });
    const sig = sign(secret, body, 'base64');
    await request(app)
      .post('/hook')
      .set('X-Signature', sig)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
  });

  it("strips a 'sha256=' prefix before comparing", async () => {
    const app = buildApp({ secret, prefix: 'sha256=' });
    const body = JSON.stringify({ x: 1 });
    const sig = 'sha256=' + sign(secret, body);
    await request(app)
      .post('/hook')
      .set('X-Signature', sig)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
  });

  it('accepts a fresh timestamp inside tolerance', async () => {
    const app = buildApp({ secret, timestampHeader: 'X-Timestamp', toleranceSec: 60 });
    const body = JSON.stringify({ x: 1 });
    const sig = sign(secret, body);
    const ts = String(Math.floor(Date.now() / 1000));
    await request(app)
      .post('/hook')
      .set('X-Signature', sig)
      .set('X-Timestamp', ts)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);
  });

  it('rejects a stale timestamp outside tolerance', async () => {
    const app = buildApp({ secret, timestampHeader: 'X-Timestamp', toleranceSec: 60 });
    const body = JSON.stringify({ x: 1 });
    const sig = sign(secret, body);
    const staleTs = String(Math.floor(Date.now() / 1000) - 600);
    const res = await request(app)
      .post('/hook')
      .set('X-Signature', sig)
      .set('X-Timestamp', staleTs)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(401);
    expect(res.body.error).toBe('TIMESTAMP_OUT_OF_TOLERANCE');
  });

  it('returns 400 when raw body plumbing is missing', async () => {
    const app = express();
    app.use(express.json()); // NO verify hook
    app.post('/hook', verifyWebhookHmac({ secret }), (_req, res) => res.json({ ok: true }));
    const res = await request(app)
      .post('/hook')
      .set('X-Signature', 'abc')
      .send({ x: 1 })
      .expect(400);
    expect(res.body.error).toBe('RAW_BODY_UNAVAILABLE');
  });

  it('throws at construction without a secret', () => {
    expect(() => verifyWebhookHmac({})).toThrow(/secret is required/);
  });
});
