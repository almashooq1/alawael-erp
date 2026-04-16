/**
 * Integration tests for /api/approvals, /api/break-glass, /api/delegations,
 * /api/sod routes — using in-memory stub models.
 */

const express = require('express');
const request = require('supertest');

function stubModel(seed = []) {
  const store = new Map(seed.map(d => [String(d._id), wrap(d)]));
  let seq = seed.length + 1;
  function wrap(doc) {
    doc.save = async () => {
      store.set(String(doc._id), doc);
      return doc;
    };
    return doc;
  }
  return {
    model: {
      find(q = {}) {
        const arr = Array.from(store.values()).filter(d => matches(d, q));
        return {
          sort() {
            return this;
          },
          limit() {
            return arr;
          },
          then(fn) {
            return fn(arr);
          },
        };
      },
      findById: async id => store.get(String(id)) || null,
      findActiveFor: async (userId, now = new Date()) => {
        return Array.from(store.values()).filter(
          d =>
            String(d.toUserId) === String(userId) &&
            d.status === 'active' &&
            new Date(d.effectiveFrom) <= now &&
            new Date(d.effectiveTo) > now
        );
      },
      create: async data => {
        const _id = data._id || `id-${seq++}`;
        const doc = wrap({ _id, createdAt: new Date(), ...data });
        store.set(String(_id), doc);
        return doc;
      },
      countDocuments: async (q = {}) =>
        Array.from(store.values()).filter(d => matches(d, q)).length,
    },
    store,
  };
}

function matches(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    if (k === '$or') return v.some(clause => matches(doc, clause));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$gte' in v || '$lte' in v || '$gt' in v || '$lt' in v) {
        const val =
          doc[k] instanceof Date
            ? doc[k].getTime()
            : doc[k] && doc[k].getTime
              ? doc[k].getTime()
              : doc[k];
        const to = x => (x instanceof Date ? x.getTime() : x);
        if (v.$gte != null && val < to(v.$gte)) return false;
        if (v.$lte != null && val > to(v.$lte)) return false;
        if (v.$gt != null && val <= to(v.$gt)) return false;
        if (v.$lt != null && val >= to(v.$lt)) return false;
        return true;
      }
      if ('$in' in v) return v.$in.includes(doc[k]);
      if ('$nin' in v) return !v.$nin.includes(doc[k]);
    }
    if (v === null) return doc[k] == null;
    return doc[k] === v;
  });
}

// ══════════════════════════════════════════════════════
// APPROVALS
// ══════════════════════════════════════════════════════
describe('/api/approvals', () => {
  const { buildRouter } = require('../authorization/approvals/approvals.routes');

  function makeApp(user = { id: 'u-1', roles: ['therapist'] }) {
    const { model, store } = stubModel();
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use('/api/approvals', buildRouter({ ApprovalRequestModel: { model } }));
    return { app, store };
  }

  test('GET /chains lists chain metadata', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/approvals/chains');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('POST / starts a request via chainFamily + selectChain', async () => {
    const { app, store } = makeApp({ id: 'u-1', roles: ['therapist'] });
    const res = await request(app)
      .post('/api/approvals')
      .send({
        chainFamily: 'A-07',
        resourceType: 'Invoice',
        resourceId: 'inv-1',
        resourceSnapshot: { total: 500 },
        branchId: 'br-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.chainId).toBe('A-07-small');
    expect(store.size).toBe(1);
  });

  test('POST / rejects when chain cannot resolve', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/approvals').send({
      chainFamily: 'NOPE',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('chain_not_resolved');
  });

  test('POST /:id/approve rejects wrong role', async () => {
    // Seed an approval request initiated by u-9; approver (u-1) holds the wrong role.
    const { model, store } = stubModel();
    await model.create({
      _id: 'r-wr',
      chainId: 'A-06-short',
      resourceType: 'LeaveRequest',
      resourceId: 'l-1',
      initiatorId: 'u-9',
      status: 'pending_approval',
      currentStep: 0,
      steps: [{ role: 'hr_supervisor', dueHours: 48 }],
      decisions: [],
    });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'u-1', roles: ['therapist'] };
      next();
    });
    app.use('/api/approvals', buildRouter({ ApprovalRequestModel: { model } }));
    const res = await request(app).post('/api/approvals/r-wr/approve').send({ note: 'ok' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('approval_wrong_role');
    expect(res.body.required).toBe('hr_supervisor');
    expect(store.size).toBe(1);
  });

  test('GET /inbox returns only requests where current role matches step', async () => {
    const { app, store } = makeApp({ id: 'u-2', roles: ['hr_supervisor'] });
    // Seed a leave request via a therapist-initiated start
    const therapistApp = (() => {
      const app2 = express();
      app2.use(express.json());
      app2.use((req, _res, next) => {
        req.user = { id: 'u-1', roles: ['therapist'] };
        next();
      });
      app2.use(
        '/api/approvals',
        buildRouter({
          ApprovalRequestModel: {
            model: {
              ...stubModel().model,
              create: async d => {
                const doc = { _id: 'r-1', ...d };
                doc.save = async () => doc;
                store.set('r-1', doc);
                return doc;
              },
            },
          },
        })
      );
      return app2;
    })();
    await request(therapistApp).post('/api/approvals').send({
      chainId: 'A-06-short',
      resourceType: 'LeaveRequest',
      resourceId: 'l-1',
    });
    const res = await request(app).get('/api/approvals/inbox');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════
// BREAK-GLASS
// ══════════════════════════════════════════════════════
describe('/api/break-glass', () => {
  const { buildRouter } = require('../authorization/break-glass/break-glass.routes');

  function makeApp(user = { id: 'u-1', roles: ['therapist'] }, seed = []) {
    const { model, store } = stubModel(seed);
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use('/api/break-glass', buildRouter({ SessionModel: { model } }));
    return { app, store };
  }

  test('POST /activate creates session', async () => {
    const { app, store } = makeApp();
    const res = await request(app).post('/api/break-glass/activate').send({
      scope: 'clinical_read',
      purpose: 'medical emergency urgent case access',
    });
    expect(res.status).toBe(201);
    expect(res.body.scope).toBe('clinical_read');
    expect(store.size).toBe(1);
  });

  test('POST /activate rejects short purpose', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/break-glass/activate').send({
      scope: 'clinical_read',
      purpose: 'x',
    });
    expect(res.status).toBe(400);
  });

  test('POST /:id/cosign requires L2+ role', async () => {
    const now = new Date();
    const seed = [
      {
        _id: 's-1',
        userId: 'u-1',
        coSignRequiredBy: new Date(now.getTime() + 3600 * 1000),
      },
    ];
    const { app } = makeApp({ id: 'u-2', roles: ['manager'] }, seed);
    const res = await request(app).post('/api/break-glass/s-1/cosign').send({});
    expect(res.status).toBe(403);
  });

  test('POST /:id/cosign succeeds for L2+ role', async () => {
    const now = new Date();
    const seed = [
      {
        _id: 's-1',
        userId: 'u-1',
        coSignRequiredBy: new Date(now.getTime() + 3600 * 1000),
      },
    ];
    const { app } = makeApp({ id: 'u-2', roles: ['head_office_admin'] }, seed);
    const res = await request(app).post('/api/break-glass/s-1/cosign').send({ note: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body.coSignedBy).toBe('u-2');
  });

  test('POST /:id/cosign blocks self-cosign', async () => {
    const seed = [
      { _id: 's-1', userId: 'u-1', coSignRequiredBy: new Date(Date.now() + 3600 * 1000) },
    ];
    const { app } = makeApp({ id: 'u-1', roles: ['head_office_admin'] }, seed);
    const res = await request(app).post('/api/break-glass/s-1/cosign').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('cannot_cosign_self');
  });
});

// ══════════════════════════════════════════════════════
// DELEGATIONS
// ══════════════════════════════════════════════════════
describe('/api/delegations', () => {
  const { buildRouter } = require('../authorization/delegations/delegations.routes');

  function makeApp(user) {
    const { model, store } = stubModel();
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use('/api/delegations', buildRouter({ DelegationGrantModel: { model } }));
    return { app, store };
  }

  test('POST / requires L2+ role', async () => {
    const { app } = makeApp({ id: 'u-1', roles: ['manager'] });
    const res = await request(app)
      .post('/api/delegations')
      .send({
        fromUserId: 'a',
        toUserId: 'b',
        effectiveTo: new Date(Date.now() + 86400000),
        reason: 'covering sick leave',
      });
    expect(res.status).toBe(403);
  });

  test('POST / succeeds with L2+ role', async () => {
    const { app, store } = makeApp({ id: 'u-1', roles: ['head_office_admin'] });
    const res = await request(app)
      .post('/api/delegations')
      .send({
        fromUserId: 'a',
        toUserId: 'b',
        effectiveTo: new Date(Date.now() + 86400000),
        reason: 'covering sick leave',
      });
    expect(res.status).toBe(201);
    expect(store.size).toBe(1);
  });

  test('POST /:id/revoke marks as revoked', async () => {
    const { app, store } = makeApp({ id: 'u-1', roles: ['head_office_admin'] });
    const created = await request(app)
      .post('/api/delegations')
      .send({
        fromUserId: 'a',
        toUserId: 'b',
        effectiveTo: new Date(Date.now() + 86400000),
        reason: 'covering sick leave',
      });
    const res = await request(app).post(`/api/delegations/${created.body._id}/revoke`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
  });
});

// ══════════════════════════════════════════════════════
// SOD
// ══════════════════════════════════════════════════════
describe('/api/sod', () => {
  const { buildRouter } = require('../authorization/sod/sod.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/sod', buildRouter());

  test('GET /rules returns all rules', async () => {
    const res = await request(app).get('/api/sod/rules');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(10);
  });

  test('GET /rules?action=invoice.create filters', async () => {
    const res = await request(app).get('/api/sod/rules?action=invoice.create');
    expect(res.body.rules.every(r => r.pair.includes('invoice.create'))).toBe(true);
  });

  test('POST /assess returns ok:true for no conflict', async () => {
    const res = await request(app)
      .post('/api/sod/assess')
      .send({
        action: 'invoice.approve',
        priorActions: ['invoice.read'],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /assess returns rule info for conflict', async () => {
    const res = await request(app)
      .post('/api/sod/assess')
      .send({
        action: 'invoice.approve',
        priorActions: ['invoice.create'],
      });
    expect(res.body.ok).toBe(false);
    expect(res.body.rule.id).toBe('sod-invoice-create-approve');
  });

  test('POST /assess requires action', async () => {
    const res = await request(app).post('/api/sod/assess').send({});
    expect(res.status).toBe(400);
  });
});
