/**
 * reporting-webhooks-routes.test.js — Phase 10 Commit 4.
 *
 * Drive the 5 webhook endpoints end-to-end via supertest. Verifiers
 * and handler are injected so we never touch real providers.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { buildRouter } = require('../routes/reports-webhooks.routes');

function makeApp({ handler, verifiers }) {
  const app = express();
  app.use(express.json());
  app.use(
    '/webhooks',
    buildRouter({ handler, verifiers, logger: { info: () => {}, warn: () => {} } })
  );
  return app;
}

function makeHandler() {
  return {
    calls: [],
    async handleEvents(provider, events) {
      this.calls.push({ provider, events });
      const arr = Array.isArray(events) ? events : [events];
      return { accepted: arr.length, applied: arr.length, skipped: 0, errors: [] };
    },
  };
}

describe('buildRouter — constructor guards', () => {
  test('throws when handler missing', () => {
    expect(() => buildRouter({})).toThrow(/handler.handleEvents required/);
  });
});

describe('POST /webhooks/sendgrid', () => {
  test('accepts array payload and returns 200', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const body = [
      { sg_message_id: 'pm-1', event: 'delivered', email: 'x@y.sa' },
      { sg_message_id: 'pm-1', event: 'open', email: 'x@y.sa' },
    ];
    const res = await request(app).post('/webhooks/sendgrid').send(body);
    expect(res.status).toBe(200);
    expect(handler.calls[0].provider).toBe('sendgrid');
    expect(handler.calls[0].events.length).toBe(2);
  });

  test('rejects with 401 when signature verifier returns false', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler, verifiers: { sendgrid: () => false } });
    const res = await request(app)
      .post('/webhooks/sendgrid')
      .send([{ event: 'delivered' }]);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('bad_signature');
    expect(handler.calls.length).toBe(0);
  });

  test('accepts when verifier is absent (test default)', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const res = await request(app)
      .post('/webhooks/sendgrid')
      .send([{ event: 'delivered' }]);
    expect(res.status).toBe(200);
  });
});

describe('POST /webhooks/mailgun', () => {
  test('accepts a single event-data payload', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const body = {
      'event-data': {
        event: 'opened',
        message: { headers: { 'message-id': 'mg-1' } },
        recipient: 'x@y.sa',
      },
    };
    const res = await request(app).post('/webhooks/mailgun').send(body);
    expect(res.status).toBe(200);
    expect(handler.calls[0].provider).toBe('mailgun');
  });
});

describe('POST /webhooks/twilio', () => {
  test('accepts form-ish body and returns empty 200', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const res = await request(app)
      .post('/webhooks/twilio')
      .send({ MessageSid: 'SM1', MessageStatus: 'delivered', To: '+966500000001' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe('WhatsApp', () => {
  test('GET challenge returns hub.challenge when verify token matches', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler, verifiers: { whatsappVerifyToken: 'secret42' } });
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({ 'hub.verify_token': 'secret42', 'hub.challenge': 'echo-me' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('echo-me');
  });

  test('GET challenge returns 403 on mismatch', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler, verifiers: { whatsappVerifyToken: 'secret42' } });
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({ 'hub.verify_token': 'WRONG', 'hub.challenge': 'echo-me' });
    expect(res.status).toBe(403);
  });

  test('POST accepts entry-statuses payload', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: 'wa-1', status: 'read', recipient_id: '9665' }],
              },
            },
          ],
        },
      ],
    };
    const res = await request(app).post('/webhooks/whatsapp').send(body);
    expect(res.status).toBe(200);
    expect(handler.calls[0].provider).toBe('whatsapp');
  });
});

describe('POST /webhooks/portal', () => {
  test('enriches events with req.ip and req.user.id before dispatching to handler', async () => {
    const handler = makeHandler();
    const app = express();
    app.use(express.json());
    // Fake auth middleware: attach a user.
    app.use((req, _res, next) => {
      req.user = { id: 'u1' };
      next();
    });
    app.use('/webhooks', buildRouter({ handler }));
    const res = await request(app)
      .post('/webhooks/portal')
      .set('User-Agent', 'jest-test')
      .send([{ deliveryId: 'd1', action: 'viewed' }]);
    expect(res.status).toBe(200);
    const ev = handler.calls[0].events[0];
    expect(ev.actor).toBe('u1');
    expect(ev.userAgent).toBe('jest-test');
  });

  test('accepts a single object (not an array)', async () => {
    const handler = makeHandler();
    const app = makeApp({ handler });
    const res = await request(app)
      .post('/webhooks/portal')
      .send({ deliveryId: 'd1', action: 'downloaded', actor: 'u1' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, accepted: 1, applied: 1 });
  });
});
