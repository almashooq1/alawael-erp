'use strict';

/**
 * hr-webhook-dispatcher.test.js — Phase 11 Commit 35 (4.0.52).
 *
 * Integration tests for the webhook dispatcher against a real
 * HrWebhookSubscription model + injected HTTP client.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrWebhookDispatcher } = require('../services/hr/hrWebhookDispatcher');

let mongoServer;
let HrWebhookSubscription;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-webhook-test' });
  HrWebhookSubscription = require('../models/hr/HrWebhookSubscription');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await HrWebhookSubscription.deleteMany({});
});

async function seedSubscription({
  name = 'Test subscription',
  target_url = 'http://localhost/webhook',
  hmac_secret = 'test-secret',
  event_types = [],
  is_active = true,
  deleted_at = null,
} = {}) {
  return HrWebhookSubscription.create({
    name,
    target_url,
    hmac_secret,
    event_types,
    is_active,
    deleted_at,
  });
}

function fakeHttp({ ok = true, status = 200, impl } = {}) {
  return jest.fn(impl || (async () => ({ ok, status, text: async () => 'ok' })));
}

// ─── Construction ───────────────────────────────────────────────

describe('createHrWebhookDispatcher — construction', () => {
  it('throws without subscriptionModel', () => {
    expect(() => createHrWebhookDispatcher({ httpClient: jest.fn() })).toThrow(/subscriptionModel/);
  });

  it('throws without httpClient function', () => {
    expect(() => createHrWebhookDispatcher({ subscriptionModel: HrWebhookSubscription })).toThrow(
      /httpClient/
    );
  });

  it('accepts valid deps', () => {
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: jest.fn(),
    });
    expect(typeof svc.dispatch).toBe('function');
    expect(typeof svc.sign).toBe('function');
  });
});

// ─── Signing ────────────────────────────────────────────────────

describe('sign', () => {
  it('produces HMAC-SHA256 signature prefixed with sha256=', () => {
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: jest.fn(),
    });
    const body = '{"hello":"world"}';
    const secret = 'my-secret';
    const sig = svc.sign(body, secret);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    // Re-verify manually
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(sig).toBe(expected);
  });
});

// ─── dispatch ───────────────────────────────────────────────────

describe('dispatch', () => {
  it('returns 0 dispatched when no subscriptions exist', async () => {
    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', { foo: 'bar' });
    expect(res.dispatched).toBe(0);
    expect(http).not.toHaveBeenCalled();
  });

  it('POSTs to every active matching subscription', async () => {
    await seedSubscription({ target_url: 'http://a/webhook' });
    await seedSubscription({ target_url: 'http://b/webhook' });

    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', { id: 'a1' });
    expect(res.dispatched).toBe(2);
    expect(res.succeeded).toBe(2);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('event_types filter narrows dispatch', async () => {
    await seedSubscription({
      target_url: 'http://a/hook',
      event_types: ['hr.anomaly.flagged'],
    });
    await seedSubscription({
      target_url: 'http://b/hook',
      event_types: ['hr.change_request.pending'],
    });

    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', {});
    expect(res.dispatched).toBe(1);
    expect(http.mock.calls[0][0]).toBe('http://a/hook');
  });

  it('empty event_types subscribes to ALL hr.* events', async () => {
    await seedSubscription({
      target_url: 'http://all/hook',
      event_types: [],
    });
    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const r1 = await svc.dispatch('hr.anomaly.flagged', {});
    const r2 = await svc.dispatch('hr.change_request.pending', {});
    expect(r1.dispatched).toBe(1);
    expect(r2.dispatched).toBe(1);
  });

  it('excludes inactive + deleted subscriptions', async () => {
    await seedSubscription({ is_active: false });
    await seedSubscription({ deleted_at: new Date() });
    await seedSubscription({ target_url: 'http://active/hook' });

    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', {});
    expect(res.dispatched).toBe(1);
    expect(http.mock.calls[0][0]).toBe('http://active/hook');
  });

  it('signs the body with per-subscription hmac_secret', async () => {
    await seedSubscription({
      target_url: 'http://h/hook',
      hmac_secret: 'per-sub-secret',
    });
    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    await svc.dispatch('hr.anomaly.flagged', { id: 'x' });

    const callArgs = http.mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers['X-HR-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(headers['X-HR-Event-Type']).toBe('hr.anomaly.flagged');

    // Verify signature is reproducible with the same secret
    const body = callArgs[1].body;
    const expected =
      'sha256=' + crypto.createHmac('sha256', 'per-sub-secret').update(body).digest('hex');
    expect(headers['X-HR-Signature']).toBe(expected);
  });

  it('marks subscription as success on ok:true response', async () => {
    const sub = await seedSubscription();
    const http = fakeHttp({ ok: true, status: 200 });
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    await svc.dispatch('hr.anomaly.flagged', {});

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.last_status).toBe('success');
    expect(after.fire_count).toBe(1);
    expect(after.failure_count).toBe(0);
    expect(after.last_error).toBeNull();
    expect(after.last_fired_at).toBeTruthy();
  });

  it('marks subscription as failed on non-ok response', async () => {
    const sub = await seedSubscription();
    const http = fakeHttp({ ok: false, status: 500 });
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    await svc.dispatch('hr.anomaly.flagged', {});

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.last_status).toBe('failed');
    expect(after.failure_count).toBe(1);
    expect(after.last_error).toContain('500');
  });

  it('marks subscription as failed on thrown HTTP error', async () => {
    const sub = await seedSubscription();
    const http = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', {});
    expect(res.failed).toBe(1);

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.last_status).toBe('failed');
    expect(after.last_error).toContain('ECONNREFUSED');
  });

  it('timeout fires a failure', async () => {
    const sub = await seedSubscription();
    const http = jest.fn(
      () => new Promise(() => {}) // never resolves
    );
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
      timeoutMs: 50,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', {});
    expect(res.failed).toBe(1);

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.last_error).toContain('timeout');
  });

  it('never throws on dispatch — captures per-subscription failures', async () => {
    await seedSubscription({ target_url: 'http://good/hook' });
    await seedSubscription({ target_url: 'http://bad/hook' });

    let callCount = 0;
    const http = jest.fn(async url => {
      callCount += 1;
      if (url === 'http://bad/hook') throw new Error('bad');
      return { ok: true, status: 200 };
    });
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    const res = await svc.dispatch('hr.anomaly.flagged', {});
    expect(res.succeeded).toBe(1);
    expect(res.failed).toBe(1);
    expect(callCount).toBe(2);
  });

  it('throws if eventType missing', async () => {
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: fakeHttp(),
    });
    await expect(svc.dispatch()).rejects.toThrow(/eventType/);
    await expect(svc.dispatch('')).rejects.toThrow(/eventType/);
  });

  it('envelope contains event_type + fired_at + payload', async () => {
    await seedSubscription();
    const http = fakeHttp();
    const svc = createHrWebhookDispatcher({
      subscriptionModel: HrWebhookSubscription,
      httpClient: http,
    });
    await svc.dispatch('hr.anomaly.flagged', { id: 'abc' });

    const body = JSON.parse(http.mock.calls[0][1].body);
    expect(body.event_type).toBe('hr.anomaly.flagged');
    expect(body.fired_at).toBeDefined();
    expect(body.payload).toEqual({ id: 'abc' });
  });
});
