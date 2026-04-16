/**
 * Privacy routes — integration tests with in-memory stubs.
 */

const express = require('express');
const request = require('supertest');
const { buildRouter } = require('../privacy/privacy.routes');

function makeStubModel() {
  const store = new Map();
  let nextId = 1;
  const wrap = doc => {
    doc.save = async () => {
      store.set(String(doc._id), doc);
      return doc;
    };
    return doc;
  };
  const model = {
    create: jest.fn(async data => {
      const _id = data._id || `id-${nextId++}`;
      const doc = wrap({
        _id,
        createdAt: new Date(),
        slaDeadline: new Date(Date.now() + 30 * 86400000),
        breachedSla: false,
        ...data,
      });
      store.set(String(_id), doc);
      return doc;
    }),
    findById: jest.fn(async id => store.get(String(id)) || null),
    find: jest.fn(q => {
      const arr = Array.from(store.values()).filter(d => {
        if (q.status && q.status.$nin) return !q.status.$nin.includes(d.status);
        if (q.status && d.status !== q.status) return false;
        if (q.requestType && d.requestType !== q.requestType) return false;
        return true;
      });
      return {
        sort: () => ({
          limit: () => arr,
        }),
      };
    }),
    latestFor: jest.fn(async (subjectType, subjectId, purpose) => {
      const arr = Array.from(store.values()).filter(
        d =>
          d.subjectType === subjectType &&
          String(d.subjectId) === String(subjectId) &&
          d.purpose === purpose
      );
      arr.sort((a, b) => (b.grantedAt || 0) - (a.grantedAt || 0));
      return arr[0] || null;
    }),
  };
  return model;
}

function makeApp() {
  const consentModel = makeStubModel();
  const dsrModel = makeStubModel();

  // Wrap create to apply schema-like defaults
  const origConsentCreate = consentModel.create;
  consentModel.create = data => origConsentCreate({ state: 'granted', ...data });
  const origDsrCreate = dsrModel.create;
  dsrModel.create = data => origDsrCreate({ status: 'received', ...data });

  const Consent = {
    model: consentModel,
    LEGAL_BASES: ['consent'],
    PURPOSES: ['marketing'],
  };
  const DataSubjectRequest = {
    model: dsrModel,
    REQUEST_TYPES: ['access', 'rectification', 'erasure'],
    STATUSES: ['received', 'in_progress', 'fulfilled', 'rejected', 'withdrawn'],
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'u-1', defaultBranchId: 'br-1' };
    next();
  });
  app.use('/api/privacy', buildRouter({ Consent, DataSubjectRequest }));
  return { app, consentModel, dsrModel };
}

describe('POST /api/privacy/consent', () => {
  test('creates consent record', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/privacy/consent').send({
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      purpose: 'marketing',
      legalBasis: 'consent',
      noticeVersion: '1.0',
      noticeHash: 'abc',
      channel: 'portal',
    });
    expect(res.status).toBe(201);
    expect(res.body.state).toBe('granted');
    expect(res.body.purpose).toBe('marketing');
  });

  test('rejects missing fields', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/privacy/consent').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_required_fields');
  });
});

describe('GET /api/privacy/consent/latest', () => {
  test('returns latest record', async () => {
    const { app } = makeApp();
    await request(app).post('/api/privacy/consent').send({
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      purpose: 'marketing',
      legalBasis: 'consent',
      noticeVersion: '1.0',
      noticeHash: 'abc',
      channel: 'portal',
      grantedAt: new Date(),
    });
    const res = await request(app).get(
      '/api/privacy/consent/latest?subjectType=Beneficiary&subjectId=b-1&purpose=marketing'
    );
    expect(res.status).toBe(200);
    expect(res.body.purpose).toBe('marketing');
  });

  test('404 when absent', async () => {
    const { app } = makeApp();
    const res = await request(app).get(
      '/api/privacy/consent/latest?subjectType=Beneficiary&subjectId=x&purpose=marketing'
    );
    expect(res.status).toBe(404);
  });

  test('400 on missing query', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/privacy/consent/latest');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/privacy/consent/:id/withdraw', () => {
  test('withdraws granted consent', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/privacy/consent').send({
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      purpose: 'marketing',
      legalBasis: 'consent',
      noticeVersion: '1.0',
      noticeHash: 'abc',
      channel: 'portal',
      state: 'granted',
    });
    const res = await request(app)
      .post(`/api/privacy/consent/${created.body._id}/withdraw`)
      .send({ withdrawalReason: 'no_longer_interested' });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('withdrawn');
  });

  test('409 if already withdrawn', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/privacy/consent').send({
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      purpose: 'marketing',
      legalBasis: 'consent',
      noticeVersion: '1.0',
      noticeHash: 'abc',
      channel: 'portal',
      state: 'granted',
    });
    await request(app).post(`/api/privacy/consent/${created.body._id}/withdraw`).send({});
    const res = await request(app)
      .post(`/api/privacy/consent/${created.body._id}/withdraw`)
      .send({});
    expect(res.status).toBe(409);
  });
});

describe('POST /api/privacy/dsr', () => {
  test('opens DSR with SLA deadline', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/privacy/dsr').send({
      requestType: 'access',
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      description: 'Please provide my data',
    });
    expect(res.status).toBe(201);
    expect(res.body.slaDeadline).toBeDefined();
    expect(res.body.status).toBe('received');
  });

  test('rejects invalid request type', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/privacy/dsr').send({
      requestType: 'nope',
      subjectType: 'X',
      subjectId: 's',
      description: 'd',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request_type');
  });
});

describe('PATCH /api/privacy/dsr/:id/status', () => {
  test('marks DSR fulfilled and sets resolvedAt', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/privacy/dsr').send({
      requestType: 'access',
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      description: 'd',
    });
    const res = await request(app).patch(`/api/privacy/dsr/${created.body._id}/status`).send({
      status: 'fulfilled',
      resolutionNote: 'exported',
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('fulfilled');
    expect(res.body.resolvedAt).toBeDefined();
    expect(res.body.resolutionNote).toBe('exported');
  });

  test('400 on invalid status', async () => {
    const { app } = makeApp();
    const created = await request(app).post('/api/privacy/dsr').send({
      requestType: 'access',
      subjectType: 'Beneficiary',
      subjectId: 'b-1',
      description: 'd',
    });
    const res = await request(app).patch(`/api/privacy/dsr/${created.body._id}/status`).send({
      status: 'nope',
    });
    expect(res.status).toBe(400);
  });
});
