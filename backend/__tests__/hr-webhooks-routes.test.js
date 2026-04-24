'use strict';

/**
 * hr-webhooks-routes.test.js — Phase 11 Commit 36 (4.0.53).
 *
 * Route-layer tests for the HR webhook admin CRUD surface.
 * Real Mongoose + mongodb-memory-server; supertest against an
 * in-process express app with a pretend-authenticated user.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrWebhooksRouter } = require('../routes/hr/hr-webhooks.routes');
const { ROLES } = require('../config/rbac.config');

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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-webhook-routes' });
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

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(createHrWebhooksRouter({ subscriptionModel: HrWebhookSubscription }));
  return app;
}

const managerUser = { id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER };
const officerUser = { id: new mongoose.Types.ObjectId(), role: ROLES.HR_OFFICER };
const viewerUser = { id: new mongoose.Types.ObjectId(), role: ROLES.VIEWER };

// ─── construction ──────────────────────────────────────────────

describe('createHrWebhooksRouter — construction', () => {
  it('throws without subscriptionModel', () => {
    expect(() => createHrWebhooksRouter({})).toThrow(/subscriptionModel/);
  });
});

// ─── auth ──────────────────────────────────────────────────────

describe('auth gating', () => {
  it('401 when no user', async () => {
    const app = buildApp(null);
    const r = await request(app).get('/webhooks/subscriptions');
    expect(r.status).toBe(401);
  });

  it('403 for sub-manager tier (officer)', async () => {
    const app = buildApp(officerUser);
    const r = await request(app).get('/webhooks/subscriptions');
    expect(r.status).toBe(403);
  });

  it('403 for viewer', async () => {
    const app = buildApp(viewerUser);
    const r = await request(app).get('/webhooks/subscriptions');
    expect(r.status).toBe(403);
  });

  it('200 for manager-tier role', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions');
    expect(r.status).toBe(200);
  });
});

// ─── POST create ───────────────────────────────────────────────

describe('POST /webhooks/subscriptions', () => {
  it('rejects missing name', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .post('/webhooks/subscriptions')
      .send({ target_url: 'https://ex.test/h' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/name/);
  });

  it('rejects non-URL target_url', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .post('/webhooks/subscriptions')
      .send({ name: 'x', target_url: 'not-a-url' });
    expect(r.status).toBe(400);
  });

  it('rejects short caller-supplied hmac_secret', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).post('/webhooks/subscriptions').send({
      name: 'x',
      target_url: 'https://ex.test/h',
      hmac_secret: 'tooshort',
    });
    expect(r.status).toBe(400);
  });

  it('auto-generates hmac_secret when omitted and returns it once', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .post('/webhooks/subscriptions')
      .send({ name: 'ops-siem', target_url: 'https://siem.test/h' });
    expect(r.status).toBe(201);
    expect(r.body.hmac_secret).toMatch(/^[a-f0-9]{64}$/);
    expect(r.body.subscription).toBeDefined();
    expect(r.body.subscription.hmac_secret).toBeUndefined();
    expect(r.body.subscription.name).toBe('ops-siem');
    expect(r.body.subscription.is_active).toBe(true);
  });

  it('accepts caller-supplied secret', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .post('/webhooks/subscriptions')
      .send({
        name: 'x',
        target_url: 'https://ex.test/h',
        hmac_secret: 'this-is-a-long-enough-secret-value',
        event_types: ['hr.anomaly.flagged'],
      });
    expect(r.status).toBe(201);
    expect(r.body.hmac_secret).toBe('this-is-a-long-enough-secret-value');
    expect(r.body.subscription.event_types).toEqual(['hr.anomaly.flagged']);
  });

  it('persists created_by from req.user', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .post('/webhooks/subscriptions')
      .send({ name: 'x', target_url: 'https://ex.test/h' });
    expect(r.status).toBe(201);
    const doc = await HrWebhookSubscription.findById(r.body.subscription._id).lean();
    expect(String(doc.created_by)).toBe(String(managerUser.id));
  });
});

// ─── GET list + detail ─────────────────────────────────────────

describe('GET /webhooks/subscriptions', () => {
  beforeEach(async () => {
    await HrWebhookSubscription.create([
      {
        name: 'a',
        target_url: 'https://a.test/h',
        hmac_secret: 'a-secret-long-enough-to-pass',
        is_active: true,
      },
      {
        name: 'b',
        target_url: 'https://b.test/h',
        hmac_secret: 'b-secret-long-enough-to-pass',
        is_active: false,
      },
      {
        name: 'c',
        target_url: 'https://c.test/h',
        hmac_secret: 'c-secret-long-enough-to-pass',
        is_active: true,
        deleted_at: new Date(),
      },
    ]);
  });

  it('lists only non-deleted by default', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(2);
    expect(r.body.items.map(i => i.name).sort()).toEqual(['a', 'b']);
  });

  it('never leaks hmac_secret in list', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions');
    r.body.items.forEach(i => {
      expect(i.hmac_secret).toBeUndefined();
    });
  });

  it('filters by is_active=true', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions?is_active=true');
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].name).toBe('a');
  });

  it('filters by is_active=false', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions?is_active=false');
    expect(r.body.total).toBe(1);
    expect(r.body.items[0].name).toBe('b');
  });
});

describe('GET /webhooks/subscriptions/:id', () => {
  it('400 on bad id', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions/not-an-id');
    expect(r.status).toBe(400);
  });

  it('404 when missing', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions/' + new mongoose.Types.ObjectId());
    expect(r.status).toBe(404);
  });

  it('200 + masked secret when found', async () => {
    const sub = await HrWebhookSubscription.create({
      name: 'x',
      target_url: 'https://x.test/h',
      hmac_secret: 'long-enough-secret-xyz',
    });
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions/' + sub._id);
    expect(r.status).toBe(200);
    expect(r.body.subscription.name).toBe('x');
    expect(r.body.subscription.hmac_secret).toBeUndefined();
  });

  it('404 on soft-deleted', async () => {
    const sub = await HrWebhookSubscription.create({
      name: 'x',
      target_url: 'https://x.test/h',
      hmac_secret: 'long-enough-secret-xyz',
      deleted_at: new Date(),
    });
    const app = buildApp(managerUser);
    const r = await request(app).get('/webhooks/subscriptions/' + sub._id);
    expect(r.status).toBe(404);
  });
});

// ─── PATCH ─────────────────────────────────────────────────────

describe('PATCH /webhooks/subscriptions/:id', () => {
  let sub;
  beforeEach(async () => {
    sub = await HrWebhookSubscription.create({
      name: 'orig',
      target_url: 'https://orig.test/h',
      hmac_secret: 'long-enough-secret-xyz',
      event_types: [],
      is_active: true,
    });
  });

  it('updates name', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + sub._id)
      .send({ name: 'renamed' });
    expect(r.status).toBe(200);
    expect(r.body.subscription.name).toBe('renamed');
  });

  it('updates event_types + is_active', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + sub._id)
      .send({ event_types: ['hr.anomaly.flagged'], is_active: false });
    expect(r.status).toBe(200);
    expect(r.body.subscription.event_types).toEqual(['hr.anomaly.flagged']);
    expect(r.body.subscription.is_active).toBe(false);
  });

  it('rejects invalid target_url', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + sub._id)
      .send({ target_url: 'ftp://bad' });
    expect(r.status).toBe(400);
  });

  it('rejects hmac_secret in PATCH body', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + sub._id)
      .send({ hmac_secret: 'should-not-be-allowed-here' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/rotate-secret/);
  });

  it('400 when no updatable fields', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + sub._id)
      .send({});
    expect(r.status).toBe(400);
  });

  it('404 on unknown id', async () => {
    const app = buildApp(managerUser);
    const r = await request(app)
      .patch('/webhooks/subscriptions/' + new mongoose.Types.ObjectId())
      .send({ name: 'x' });
    expect(r.status).toBe(404);
  });
});

// ─── DELETE ────────────────────────────────────────────────────

describe('DELETE /webhooks/subscriptions/:id', () => {
  it('soft-deletes + deactivates', async () => {
    const sub = await HrWebhookSubscription.create({
      name: 'x',
      target_url: 'https://x.test/h',
      hmac_secret: 'long-enough-secret-xyz',
      is_active: true,
    });
    const app = buildApp(managerUser);
    const r = await request(app).delete('/webhooks/subscriptions/' + sub._id);
    expect(r.status).toBe(200);
    expect(r.body.deleted).toBe(true);

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.deleted_at).toBeTruthy();
    expect(after.is_active).toBe(false);
  });

  it('404 on unknown id', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).delete('/webhooks/subscriptions/' + new mongoose.Types.ObjectId());
    expect(r.status).toBe(404);
  });

  it('404 on already-deleted subscription', async () => {
    const sub = await HrWebhookSubscription.create({
      name: 'x',
      target_url: 'https://x.test/h',
      hmac_secret: 'long-enough-secret-xyz',
      deleted_at: new Date(),
    });
    const app = buildApp(managerUser);
    const r = await request(app).delete('/webhooks/subscriptions/' + sub._id);
    expect(r.status).toBe(404);
  });
});

// ─── rotate-secret ─────────────────────────────────────────────

describe('POST /webhooks/subscriptions/:id/rotate-secret', () => {
  it('returns new secret + overwrites in DB', async () => {
    const sub = await HrWebhookSubscription.create({
      name: 'x',
      target_url: 'https://x.test/h',
      hmac_secret: 'original-secret-long-enough',
    });
    const app = buildApp(managerUser);
    const r = await request(app).post('/webhooks/subscriptions/' + sub._id + '/rotate-secret');
    expect(r.status).toBe(200);
    expect(r.body.hmac_secret).toMatch(/^[a-f0-9]{64}$/);
    expect(r.body.subscription.hmac_secret).toBeUndefined();

    const after = await HrWebhookSubscription.findById(sub._id).lean();
    expect(after.hmac_secret).toBe(r.body.hmac_secret);
    expect(after.hmac_secret).not.toBe('original-secret-long-enough');
  });

  it('404 on unknown id', async () => {
    const app = buildApp(managerUser);
    const r = await request(app).post(
      '/webhooks/subscriptions/' + new mongoose.Types.ObjectId() + '/rotate-secret'
    );
    expect(r.status).toBe(404);
  });
});
