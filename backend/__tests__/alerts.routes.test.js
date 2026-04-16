/**
 * Alerts REST routes — integration tests with stubbed model + engine.
 */

const express = require('express');
const request = require('supertest');
const { buildRouter } = require('../alerts/alerts.routes');

function makeAlertStub(seed = []) {
  const store = new Map(seed.map(d => [String(d._id), wrap(d)]));
  let next = seed.length + 1;
  function wrap(doc) {
    doc.save = async () => {
      store.set(String(doc._id), doc);
      return doc;
    };
    doc.markModified = () => {};
    return doc;
  }
  const model = {
    find(q = {}) {
      const items = Array.from(store.values()).filter(d => match(d, q));
      return { sort: () => ({ limit: () => items }) };
    },
    findById: async id => store.get(String(id)) || null,
    create: async d => {
      const doc = wrap({ _id: `id-${next++}`, ...d });
      store.set(String(doc._id), doc);
      return doc;
    },
  };
  return { AlertModel: { model }, store };
}

function match(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    if (v === null) return doc[k] == null;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(doc[k]);
    }
    return doc[k] === v;
  });
}

function makeEngine(rules = []) {
  const map = new Map(rules.map(r => [r.id, r]));
  return {
    rules: map,
    runAll: async () => ({ raised: [{ ruleId: 'demo', key: 'k' }], resolved: [], activeCount: 1 }),
  };
}

function makeApp({
  AlertModel,
  engine,
  user = { id: 'u-1', roles: ['manager'], defaultBranchId: 'br-1' },
}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/alerts', buildRouter({ AlertModel, engine }));
  return app;
}

describe('GET /api/alerts/active', () => {
  test('returns only active + applies filters', async () => {
    const { AlertModel } = makeAlertStub([
      {
        _id: 'a1',
        severity: 'high',
        category: 'financial',
        branchId: 'br-1',
        resolvedAt: null,
        firstSeenAt: new Date(),
      },
      {
        _id: 'a2',
        severity: 'warning',
        category: 'hr',
        branchId: 'br-1',
        resolvedAt: new Date(),
        firstSeenAt: new Date(),
      },
      {
        _id: 'a3',
        severity: 'critical',
        category: 'quality',
        branchId: 'br-2',
        resolvedAt: null,
        firstSeenAt: new Date(),
      },
    ]);
    const app = makeApp({ AlertModel });
    let res = await request(app).get('/api/alerts/active');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.alerts.every(a => a.resolvedAt == null)).toBe(true);

    res = await request(app).get('/api/alerts/active?branchId=br-1');
    expect(res.body.count).toBe(1);
    expect(res.body.alerts[0]._id).toBe('a1');

    res = await request(app).get('/api/alerts/active?severity=critical');
    expect(res.body.count).toBe(1);
    expect(res.body.alerts[0]._id).toBe('a3');
  });
});

describe('POST /api/alerts/:id/acknowledge', () => {
  test('records acknowledgement on active alert', async () => {
    const { AlertModel, store } = makeAlertStub([
      { _id: 'a1', severity: 'high', category: 'financial', resolvedAt: null },
    ]);
    const app = makeApp({ AlertModel });
    const res = await request(app)
      .post('/api/alerts/a1/acknowledge')
      .send({ note: 'looking at it' });
    expect(res.status).toBe(200);
    expect(store.get('a1').metadata.acknowledgements.length).toBe(1);
    expect(store.get('a1').metadata.acknowledgements[0].note).toBe('looking at it');
    expect(store.get('a1').metadata.acknowledgements[0].acknowledgedBy).toBe('u-1');
  });

  test('409 when already resolved', async () => {
    const { AlertModel } = makeAlertStub([{ _id: 'a1', severity: 'high', resolvedAt: new Date() }]);
    const app = makeApp({ AlertModel });
    const res = await request(app).post('/api/alerts/a1/acknowledge').send({});
    expect(res.status).toBe(409);
  });

  test('404 when missing', async () => {
    const { AlertModel } = makeAlertStub([]);
    const res = await request(makeApp({ AlertModel })).post('/api/alerts/xyz/acknowledge').send({});
    expect(res.status).toBe(404);
  });
});

describe('POST /api/alerts/:id/snooze', () => {
  test('sets snoozedUntil in metadata', async () => {
    const { AlertModel, store } = makeAlertStub([
      { _id: 'a1', severity: 'high', resolvedAt: null },
    ]);
    const app = makeApp({ AlertModel });
    const res = await request(app).post('/api/alerts/a1/snooze').send({ minutes: 120 });
    expect(res.status).toBe(200);
    expect(store.get('a1').metadata.snoozedUntil).toBeInstanceOf(Date);
    expect(store.get('a1').metadata.snoozedBy).toBe('u-1');
  });

  test('clamps out-of-range minutes', async () => {
    const { AlertModel, store } = makeAlertStub([
      { _id: 'a1', severity: 'high', resolvedAt: null },
    ]);
    const app = makeApp({ AlertModel });
    await request(app).post('/api/alerts/a1/snooze').send({ minutes: 99999 });
    const doc = store.get('a1');
    const deltaMs = doc.metadata.snoozedUntil.getTime() - Date.now();
    expect(deltaMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
  });
});

describe('GET /api/alerts/rules/list', () => {
  test('lists rule metadata when engine is mounted', async () => {
    const { AlertModel } = makeAlertStub([]);
    const engine = makeEngine([
      { id: 'r1', severity: 'warning', category: 'hr', description: 'd1' },
      { id: 'r2', severity: 'critical', category: 'quality', description: 'd2' },
    ]);
    const res = await request(makeApp({ AlertModel, engine })).get('/api/alerts/rules/list');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.rules[0]).toMatchObject({ id: 'r1', severity: 'warning' });
  });
});

describe('POST /api/alerts/run-now', () => {
  test('invokes engine and returns its result', async () => {
    const { AlertModel } = makeAlertStub([]);
    const engine = makeEngine([{ id: 'x', evaluate: async () => [] }]);
    const res = await request(makeApp({ AlertModel, engine })).post('/api/alerts/run-now');
    expect(res.status).toBe(200);
    expect(res.body.raised.length).toBe(1);
  });

  test('501 when engine missing', async () => {
    const { AlertModel } = makeAlertStub([]);
    const res = await request(makeApp({ AlertModel })).post('/api/alerts/run-now');
    expect(res.status).toBe(501);
  });
});
