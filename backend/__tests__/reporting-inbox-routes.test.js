/**
 * reporting-inbox-routes.test.js — Phase 10 Commit 4.
 *
 * Covers the 4 portal inbox endpoints: list, view, mark-seen, download.
 * Uses a fake DeliveryModel and a fake auth middleware; no Mongo.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { buildRouter, assertCanAccess } = require('../routes/reports-inbox.routes');

// ─── Fakes ────────────────────────────────────────────────────────

function makeDelivery(overrides = {}) {
  return {
    _id: 'd1',
    recipientId: 'u1',
    recipientModel: 'User',
    reportId: 'ben.progress.weekly',
    instanceKey: 'ben.progress.weekly:2026-W17:beneficiary:b1',
    periodKey: '2026-W17',
    channel: 'email',
    status: 'SENT',
    readAt: null,
    confidentiality: 'restricted',
    artifactUri: 's3://bucket/report.pdf',
    accessLog: [],
    createdAt: new Date(),
    ...overrides,
    recordAccess(entry) {
      this.accessLog.push(entry);
      if (entry.action === 'view' && !this.readAt) {
        this.status = 'READ';
        this.readAt = entry.at || new Date();
      }
    },
    markRead() {
      this.status = 'READ';
      this.readAt = new Date();
    },
    isTerminal() {
      return ['READ', 'ESCALATED', 'CANCELLED'].includes(this.status);
    },
    save: jest.fn(async function () {
      return this;
    }),
  };
}

function makeModel(rows) {
  return {
    model: {
      // `.find().sort().limit()` is chainable, awaitable-by-then —
      // matches mongoose Query ergonomics closely enough for the route.
      find(filter) {
        let out = rows.slice();
        if (filter.recipientId) {
          out = out.filter(r => String(r.recipientId) === String(filter.recipientId));
        }
        if (filter.readAt === null) out = out.filter(r => !r.readAt);
        if (filter.channel) out = out.filter(r => r.channel === filter.channel);
        if (filter.reportId) out = out.filter(r => r.reportId === filter.reportId);
        if (filter.status && filter.status.$ne) {
          out = out.filter(r => r.status !== filter.status.$ne);
        }
        const chain = {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          then(resolve, reject) {
            return Promise.resolve(out).then(resolve, reject);
          },
        };
        return chain;
      },
      async findById(id) {
        return rows.find(r => r._id === id) || null;
      },
    },
  };
}

function authAs(user) {
  return (req, _res, next) => {
    req.user = user;
    next();
  };
}

function makeApp({ rows, user, artifactStore, urlSigner }) {
  const app = express();
  app.use(express.json());
  app.use(authAs(user));
  app.use(
    '/inbox',
    buildRouter({
      DeliveryModel: makeModel(rows),
      artifactStore,
      urlSigner,
      logger: { info: () => {}, warn: () => {} },
    })
  );
  return app;
}

// ─── assertCanAccess (unit) ──────────────────────────────────────

describe('assertCanAccess', () => {
  test('404 when delivery is null', () => {
    expect(assertCanAccess(null, { user: { id: 'u1' } })).toMatchObject({
      ok: false,
      status: 404,
    });
  });
  test('401 when no user', () => {
    expect(assertCanAccess({ recipientId: 'u1' }, {})).toMatchObject({
      ok: false,
      status: 401,
    });
  });
  test('403 when recipient mismatch', () => {
    expect(assertCanAccess({ recipientId: 'other' }, { user: { id: 'u1' } })).toMatchObject({
      ok: false,
      status: 403,
    });
  });
  test('ok for owner', () => {
    expect(assertCanAccess({ recipientId: 'u1' }, { user: { id: 'u1' } })).toMatchObject({
      ok: true,
    });
  });
  test('admin bypasses ownership', () => {
    expect(
      assertCanAccess({ recipientId: 'other' }, { user: { id: 'admin1', role: 'admin' } })
    ).toMatchObject({ ok: true });
  });
});

// ─── LIST ────────────────────────────────────────────────────────

describe('GET /inbox', () => {
  test('returns deliveries for the authenticated user only', async () => {
    const rows = [
      makeDelivery({ _id: 'a', recipientId: 'u1' }),
      makeDelivery({ _id: 'b', recipientId: 'u2' }),
      makeDelivery({ _id: 'c', recipientId: 'u1', readAt: new Date() }),
    ];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.unread).toBe(1);
  });

  test('unreadOnly flag filters', async () => {
    const rows = [
      makeDelivery({ _id: 'a', recipientId: 'u1' }),
      makeDelivery({ _id: 'b', recipientId: 'u1', readAt: new Date() }),
    ];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox').query({ unreadOnly: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('admin with ?recipientId=other sees the other user inbox', async () => {
    const rows = [makeDelivery({ recipientId: 'u2' })];
    const app = makeApp({ rows, user: { id: 'admin', role: 'admin' } });
    const res = await request(app).get('/inbox').query({ recipientId: 'u2' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('non-admin cannot override recipientId', async () => {
    const rows = [makeDelivery({ recipientId: 'u2' })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox').query({ recipientId: 'u2' });
    // Query param is ignored for non-admins; user gets their own (empty) inbox.
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  test('401 when no user', async () => {
    const rows = [];
    const app = express();
    app.use(express.json());
    app.use('/inbox', buildRouter({ DeliveryModel: makeModel(rows) }));
    const res = await request(app).get('/inbox');
    expect(res.status).toBe(401);
  });
});

// ─── VIEW ────────────────────────────────────────────────────────

describe('GET /inbox/:id', () => {
  test('returns the doc; does NOT flip read', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1' })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox/d1');
    expect(res.status).toBe(200);
    expect(rows[0].readAt).toBeNull();
    expect(rows[0].status).toBe('SENT');
  });

  test('404 for unknown id', async () => {
    const app = makeApp({ rows: [], user: { id: 'u1' } });
    const res = await request(app).get('/inbox/nope');
    expect(res.status).toBe(404);
  });

  test('403 when not your delivery', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u2' })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox/d1');
    expect(res.status).toBe(403);
  });
});

// ─── MARK SEEN ───────────────────────────────────────────────────

describe('POST /inbox/:id/seen', () => {
  test('flips read, records access log, saves', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1' })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).post('/inbox/d1/seen');
    expect(res.status).toBe(200);
    expect(rows[0].status).toBe('READ');
    expect(rows[0].accessLog.length).toBe(1);
    expect(rows[0].save).toHaveBeenCalled();
  });

  test('already-terminal returns 200 with alreadyTerminal=true', async () => {
    const rows = [
      makeDelivery({ _id: 'd1', recipientId: 'u1', status: 'READ', readAt: new Date() }),
    ];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).post('/inbox/d1/seen');
    expect(res.status).toBe(200);
    expect(res.body.alreadyTerminal).toBe(true);
  });
});

// ─── DOWNLOAD ────────────────────────────────────────────────────

describe('GET /inbox/:id/download', () => {
  test('returns a signed URL when urlSigner is wired, and records download in accessLog', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1' })];
    const urlSigner = {
      sign: jest.fn(async () => ({
        url: 'https://cdn.example/signed',
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      })),
    };
    const app = makeApp({ rows, user: { id: 'u1' }, urlSigner });
    const res = await request(app).get('/inbox/d1/download');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://cdn.example/signed');
    expect(rows[0].accessLog.some(e => e.action === 'download')).toBe(true);
  });

  test('streams bytes when only artifactStore.fetch is wired', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1' })];
    const artifactStore = {
      async fetch() {
        return {
          content: Buffer.from('%PDF-fake'),
          contentType: 'application/pdf',
          filename: 'report.pdf',
        };
      },
    };
    const app = makeApp({ rows, user: { id: 'u1' }, artifactStore });
    const res = await request(app).get('/inbox/d1/download').buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.toString()).toContain('%PDF-fake');
  });

  test('404 when delivery has no artifactUri', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1', artifactUri: null })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox/d1/download');
    expect(res.status).toBe(404);
  });

  test('501 when neither signer nor store is wired', async () => {
    const rows = [makeDelivery({ _id: 'd1', recipientId: 'u1' })];
    const app = makeApp({ rows, user: { id: 'u1' } });
    const res = await request(app).get('/inbox/d1/download');
    expect(res.status).toBe(501);
  });
});
