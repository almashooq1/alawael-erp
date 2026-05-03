/**
 * zatca-credentials-admin.routes.test.js — CRUD + redaction + onboarding
 * proxy. Exercises the contract that sensitive fields NEVER leave the
 * server in a response, and the onboarding/production endpoints
 * delegate to zatca-phase2.service while picking up any state mutations
 * the service writes back.
 */

'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { _id: 'tester', role: 'admin' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

// Mongoose model mock — self-contained store inside the factory.
jest.mock('../../models/zatca/ZatcaCredential', () => {
  const { Types } = jest.requireActual('mongoose');
  const store = new Map();

  function buildDoc(props) {
    const id = String(props._id || new Types.ObjectId());
    const doc = { ...props, _id: id, isActive: props.isActive !== false };
    doc.toObject = function ({ virtuals } = {}) {
      const out = { ...this };
      if (virtuals) {
        out.isConfigured = !!(this.binarySecurityToken && this.secret);
      }
      delete out.toObject;
      delete out.save;
      return out;
    };
    doc.save = async function save() {
      store.set(id, doc);
      return doc;
    };
    return doc;
  }

  return {
    __store: store,
    __buildDoc: buildDoc,
    __ObjectId: Types.ObjectId,
    find: jest.fn(filter => {
      let rows = Array.from(store.values());
      if (filter?.branchId) rows = rows.filter(r => String(r.branchId) === String(filter.branchId));
      if (filter && filter.isActive !== undefined) {
        rows = rows.filter(r => r.isActive === filter.isActive);
      }
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return chain;
    }),
    countDocuments: jest.fn(async filter => {
      let rows = Array.from(store.values());
      if (filter?.branchId) rows = rows.filter(r => String(r.branchId) === String(filter.branchId));
      if (filter && filter.isActive !== undefined) {
        rows = rows.filter(r => r.isActive === filter.isActive);
      }
      return rows.length;
    }),
    findOne: jest.fn(async filter => {
      const rows = Array.from(store.values());
      return (
        rows.find(r => {
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          return true;
        }) || null
      );
    }),
    findById: jest.fn(async id => store.get(String(id)) || null),
    create: jest.fn(async props => {
      const doc = buildDoc(props);
      store.set(doc._id, doc);
      return doc;
    }),
  };
});

// Mock the ZATCA Phase 2 service so onboarding tests don't try to talk
// to a real (or mocked-axios) ZATCA server.
const mockPerformOnboarding = jest.fn().mockResolvedValue({ ok: true });
const mockObtainProductionCsid = jest.fn().mockResolvedValue({ ok: true });
jest.mock('../../services/zatca-phase2.service', () => ({
  performOnboarding: (...args) => mockPerformOnboarding(...args),
  obtainProductionCsid: (...args) => mockObtainProductionCsid(...args),
}));

const Model = require('../../models/zatca/ZatcaCredential');
const { __store: store, __buildDoc: buildDoc, __ObjectId: ObjectId } = Model;
const router = require('../../routes/zatca-credentials-admin.routes');
const { SENSITIVE_FIELDS } = router;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/creds', router);
  return app;
}

beforeEach(() => {
  store.clear();
  mockPerformOnboarding.mockClear();
  mockObtainProductionCsid.mockClear();
});

describe('routes/zatca-credentials-admin', () => {
  describe('redaction', () => {
    test('GET / never returns sensitive fields verbatim', async () => {
      const id = new ObjectId().toString();
      const branchId = new ObjectId().toString();
      const seeded = {
        _id: id,
        branchId,
        branchCode: 'BR-1',
        privateKey: 'secret-pk',
        publicKey: 'secret-pub',
        certificate: 'secret-cert',
        csr: 'secret-csr',
        complianceCsid: 'secret-comp',
        productionCsid: 'secret-prod',
        binarySecurityToken: 'secret-bst',
        secret: 'secret-secret',
        apiSecretHash: 'secret-hash',
        complianceRequestId: 'secret-creq',
        productionRequestId: 'secret-preq',
      };
      store.set(id, buildDoc(seeded));

      const r = await request(makeApp()).get('/creds');
      expect(r.status).toBe(200);
      const row = r.body.rows[0];
      for (const f of SENSITIVE_FIELDS) {
        expect(row[f]).toBe('[REDACTED]');
      }
      expect(row.isConfigured).toBe(true);
    });

    test('GET /:id same redaction applies', async () => {
      const id = new ObjectId().toString();
      store.set(
        id,
        buildDoc({
          _id: id,
          branchId: new ObjectId().toString(),
          branchCode: 'X',
          privateKey: 'pk',
          secret: null, // unset → stays null, not [REDACTED]
        })
      );
      const r = await request(makeApp()).get(`/creds/${id}`);
      expect(r.body.row.privateKey).toBe('[REDACTED]');
      expect(r.body.row.secret).toBeNull();
      expect(r.body.row.isConfigured).toBe(false);
    });
  });

  describe('POST /', () => {
    test('creates with org fields, drops sensitive ones from body', async () => {
      const branchId = new ObjectId().toString();
      const r = await request(makeApp()).post('/creds').send({
        branchId,
        branchCode: 'BR-X',
        organizationName: 'Al-Awael',
        vatNumber: '300000000000003',
        // Attacker payload — must be silently dropped:
        privateKey: 'pwned',
        secret: 'pwned',
        binarySecurityToken: 'pwned',
      });
      expect(r.status).toBe(201);
      expect(r.body.row.organizationName).toBe('Al-Awael');
      const stored = store.get(r.body.row._id);
      expect(stored.privateKey).toBeUndefined();
      expect(stored.secret).toBeUndefined();
      expect(stored.binarySecurityToken).toBeUndefined();
    });

    test('rejects missing branchId', async () => {
      const r = await request(makeApp()).post('/creds').send({ branchCode: 'X' });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('missing_field:branchId');
    });

    test('rejects invalid branchId', async () => {
      const r = await request(makeApp())
        .post('/creds')
        .send({ branchId: 'not-an-id', branchCode: 'X' });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_branch_id');
    });

    test('rejects creating two creds for the same branch', async () => {
      const branchId = new ObjectId().toString();
      await request(makeApp()).post('/creds').send({ branchId, branchCode: 'X' });
      const r = await request(makeApp()).post('/creds').send({ branchId, branchCode: 'X' });
      expect(r.status).toBe(409);
      expect(r.body.error).toBe('branch_already_has_credential');
    });
  });

  describe('PATCH /:id', () => {
    test('updates allow-listed fields', async () => {
      const id = new ObjectId().toString();
      store.set(id, buildDoc({ _id: id, branchId: new ObjectId().toString(), branchCode: 'X' }));
      const r = await request(makeApp())
        .patch(`/creds/${id}`)
        .send({ organizationName: 'New', notes: 'hello' });
      expect(r.status).toBe(200);
      expect(r.body.row.organizationName).toBe('New');
      expect(r.body.row.notes).toBe('hello');
    });

    test('explicitly rejects requests that try to set sensitive fields', async () => {
      const id = new ObjectId().toString();
      store.set(id, buildDoc({ _id: id, branchId: new ObjectId().toString(), branchCode: 'X' }));
      const r = await request(makeApp())
        .patch(`/creds/${id}`)
        .send({ privateKey: 'pwned', organizationName: 'New' });
      expect(r.status).toBe(403);
      expect(r.body.error).toMatch(/sensitive_field_blocked/);
      // Stored doc should NOT have any of those changes.
      const stored = store.get(id);
      expect(stored.privateKey).toBeUndefined();
      expect(stored.organizationName).toBeUndefined();
    });
  });

  describe('DELETE + restore', () => {
    test('soft-disables and re-enables', async () => {
      const id = new ObjectId().toString();
      store.set(
        id,
        buildDoc({
          _id: id,
          branchId: new ObjectId().toString(),
          branchCode: 'X',
          isActive: true,
        })
      );

      const del = await request(makeApp()).delete(`/creds/${id}`);
      expect(del.status).toBe(200);
      expect(del.body.row.isActive).toBe(false);
      expect(store.has(id)).toBe(true);

      const res = await request(makeApp()).post(`/creds/${id}/restore`);
      expect(res.status).toBe(200);
      expect(res.body.row.isActive).toBe(true);
    });
  });

  describe('onboard / production proxies', () => {
    test('onboard requires otp', async () => {
      const id = new ObjectId().toString();
      store.set(id, buildDoc({ _id: id, branchId: new ObjectId().toString(), branchCode: 'X' }));
      const r = await request(makeApp()).post(`/creds/${id}/onboard`).send({});
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('missing_field:otp');
      expect(mockPerformOnboarding).not.toHaveBeenCalled();
    });

    test('onboard delegates to zatca-phase2.service.performOnboarding', async () => {
      const id = new ObjectId().toString();
      const branchId = new ObjectId().toString();
      store.set(id, buildDoc({ _id: id, branchId, branchCode: 'X' }));

      const r = await request(makeApp()).post(`/creds/${id}/onboard`).send({ otp: '123456' });
      expect(r.status).toBe(200);
      expect(mockPerformOnboarding).toHaveBeenCalledTimes(1);
      expect(mockPerformOnboarding.mock.calls[0][0]).toEqual({
        branchId,
        otp: '123456',
      });
      // Response is redacted on the way out.
      expect(r.body.row.isConfigured).toBe(false);
    });

    test('production endpoint delegates to obtainProductionCsid', async () => {
      const id = new ObjectId().toString();
      const branchId = new ObjectId().toString();
      store.set(id, buildDoc({ _id: id, branchId, branchCode: 'X' }));

      const r = await request(makeApp()).post(`/creds/${id}/production`).send({});
      expect(r.status).toBe(200);
      expect(mockObtainProductionCsid).toHaveBeenCalledWith({ branchId });
    });
  });
});
