/**
 * insurance-tariffs-admin.routes.test.js — CRUD endpoint tests for the
 * admin tariff route. Mocks the Mongoose model so we don't need a DB
 * connection; exercises the validation + soft-delete + RBAC contract
 * via supertest against a tiny inline Express app.
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

// Auth middleware: pass-through that injects a fake user.
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { _id: 'tester', role: 'admin' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

// Mock the Mongoose model. The factory creates its own self-contained
// store + helpers (Jest hoists jest.mock above any top-level const, so
// we cannot reference outer variables here).
jest.mock('../../models/InsuranceTariff', () => {
  const { Types } = jest.requireActual('mongoose');
  const store = new Map();

  function buildDoc(props) {
    const id = String(props._id || new Types.ObjectId());
    const doc = { ...props, _id: id, isActive: props.isActive !== false };
    doc.save = async function save() {
      if (
        doc.effectiveTo &&
        doc.effectiveFrom &&
        new Date(doc.effectiveTo) < new Date(doc.effectiveFrom)
      ) {
        throw new Error('InsuranceTariff: effectiveTo must be on/after effectiveFrom');
      }
      store.set(id, doc);
      return doc;
    };
    return doc;
  }

  const buildChain = arr => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(arr),
  });

  return {
    __store: store,
    __buildDoc: buildDoc,
    __ObjectId: Types.ObjectId,
    find: jest.fn(filter => {
      let rows = Array.from(store.values());
      if (filter?.cptCode) rows = rows.filter(r => r.cptCode === filter.cptCode);
      if (filter?.provider?.$regex) {
        const re = new RegExp(filter.provider.$regex, filter.provider.$options || '');
        rows = rows.filter(r => re.test(r.provider));
      }
      if (filter && filter.isActive !== undefined) {
        rows = rows.filter(r => r.isActive === filter.isActive);
      }
      return buildChain(rows);
    }),
    countDocuments: jest.fn(async filter => {
      let rows = Array.from(store.values());
      if (filter?.cptCode) rows = rows.filter(r => r.cptCode === filter.cptCode);
      if (filter?.provider?.$regex) {
        const re = new RegExp(filter.provider.$regex, filter.provider.$options || '');
        rows = rows.filter(r => re.test(r.provider));
      }
      if (filter && filter.isActive !== undefined) {
        rows = rows.filter(r => r.isActive === filter.isActive);
      }
      return rows.length;
    }),
    findById: jest.fn(id => {
      const doc = store.get(String(id)) || null;
      const p = Promise.resolve(doc);
      p.lean = jest.fn(() => Promise.resolve(doc));
      return p;
    }),
    create: jest.fn(async props => {
      if (
        props.effectiveTo &&
        props.effectiveFrom &&
        new Date(props.effectiveTo) < new Date(props.effectiveFrom)
      ) {
        throw new Error('InsuranceTariff: effectiveTo must be on/after effectiveFrom');
      }
      const doc = buildDoc(props);
      store.set(doc._id, doc);
      return doc;
    }),
  };
});

// Pull the helpers out of the mock for use in tests.
const TariffMock = require('../../models/InsuranceTariff');
const tariffStore = TariffMock.__store;
const buildDoc = TariffMock.__buildDoc;
const ObjectId = TariffMock.__ObjectId;

const router = require('../../routes/insurance-tariffs-admin.routes');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/tariffs', router);
  return app;
}

beforeEach(() => {
  tariffStore.clear();
});

// ─────────────────────────────────────────────────────────────────────────
describe('routes/insurance-tariffs-admin', () => {
  describe('POST /', () => {
    test('creates a tariff with required fields', async () => {
      const r = await request(makeApp()).post('/tariffs').send({
        provider: 'Bupa Arabia',
        cptCode: '97110',
        unitPrice: 175,
      });
      expect(r.status).toBe(201);
      expect(r.body.ok).toBe(true);
      expect(r.body.row.provider).toBe('Bupa Arabia');
      expect(r.body.row.unitPrice).toBe(175);
      expect(tariffStore.size).toBe(1);
    });

    test('rejects missing provider', async () => {
      const r = await request(makeApp())
        .post('/tariffs')
        .send({ cptCode: '97110', unitPrice: 100 });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('missing_field:provider');
    });

    test('rejects missing cptCode', async () => {
      const r = await request(makeApp()).post('/tariffs').send({ provider: 'X', unitPrice: 100 });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('missing_field:cptCode');
    });

    test('rejects negative unit price', async () => {
      const r = await request(makeApp()).post('/tariffs').send({
        provider: 'X',
        cptCode: '97110',
        unitPrice: -1,
      });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_unit_price');
    });

    test('rejects effectiveTo before effectiveFrom', async () => {
      const r = await request(makeApp()).post('/tariffs').send({
        provider: 'X',
        cptCode: '97110',
        unitPrice: 100,
        effectiveFrom: '2026-06-01',
        effectiveTo: '2026-01-01',
      });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_date_range');
    });

    test('drops fields not in the allow-list', async () => {
      await request(makeApp()).post('/tariffs').send({
        provider: 'X',
        cptCode: '97110',
        unitPrice: 100,
        secretAdminFlag: true,
        _id: 'forced-id',
      });
      const stored = Array.from(tariffStore.values())[0];
      expect(stored.secretAdminFlag).toBeUndefined();
      expect(stored._id).not.toBe('forced-id');
    });
  });

  describe('GET /', () => {
    beforeEach(() => {
      tariffStore.set('1', {
        _id: '1',
        provider: 'Bupa',
        cptCode: '97110',
        unitPrice: 100,
        isActive: true,
      });
      tariffStore.set('2', {
        _id: '2',
        provider: 'Tawuniya',
        cptCode: '97110',
        unitPrice: 120,
        isActive: true,
      });
      tariffStore.set('3', {
        _id: '3',
        provider: 'Bupa',
        cptCode: '92507',
        unitPrice: 250,
        isActive: false,
      });
    });

    test('lists everything when no filter', async () => {
      const r = await request(makeApp()).get('/tariffs');
      expect(r.status).toBe(200);
      expect(r.body.total).toBe(3);
    });

    test('filters by cptCode', async () => {
      const r = await request(makeApp()).get('/tariffs?cptCode=97110');
      expect(r.body.total).toBe(2);
    });

    test('filters by isActive=false', async () => {
      const r = await request(makeApp()).get('/tariffs?isActive=false');
      expect(r.body.total).toBe(1);
    });

    test('filters by provider regex', async () => {
      const r = await request(makeApp()).get('/tariffs?provider=Bup');
      expect(r.body.total).toBe(2);
    });
  });

  describe('GET /:id', () => {
    test('returns 400 on invalid id', async () => {
      const r = await request(makeApp()).get('/tariffs/not-an-id');
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_id');
    });

    test('returns 404 when not found', async () => {
      const r = await request(makeApp()).get(`/tariffs/${new ObjectId().toString()}`);
      expect(r.status).toBe(404);
    });

    test('returns the row when found', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(id, {
        _id: id,
        provider: 'Bupa',
        cptCode: '97110',
        unitPrice: 100,
        isActive: true,
      });
      const r = await request(makeApp()).get(`/tariffs/${id}`);
      expect(r.status).toBe(200);
      expect(r.body.row.provider).toBe('Bupa');
    });
  });

  describe('PATCH /:id', () => {
    test('updates allowed fields and rejects ad-hoc ones', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(
        id,
        buildDoc({ _id: id, provider: 'Bupa', cptCode: '97110', unitPrice: 100 })
      );

      const r = await request(makeApp())
        .patch(`/tariffs/${id}`)
        .send({ unitPrice: 175, notes: 'updated', adminMode: true });

      expect(r.status).toBe(200);
      expect(r.body.row.unitPrice).toBe(175);
      expect(r.body.row.notes).toBe('updated');
      expect(r.body.row.adminMode).toBeUndefined();
    });

    test('rejects empty body', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(
        id,
        buildDoc({ _id: id, provider: 'Bupa', cptCode: '97110', unitPrice: 100 })
      );
      const r = await request(makeApp()).patch(`/tariffs/${id}`).send({});
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('no_fields');
    });

    test('rejects negative unit price update', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(
        id,
        buildDoc({ _id: id, provider: 'Bupa', cptCode: '97110', unitPrice: 100 })
      );
      const r = await request(makeApp()).patch(`/tariffs/${id}`).send({ unitPrice: -5 });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_unit_price');
    });
  });

  describe('DELETE /:id (soft-disable)', () => {
    test('flips isActive to false but keeps the row', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(
        id,
        buildDoc({ _id: id, provider: 'Bupa', cptCode: '97110', unitPrice: 100, isActive: true })
      );

      const r = await request(makeApp()).delete(`/tariffs/${id}`);
      expect(r.status).toBe(200);
      expect(r.body.row.isActive).toBe(false);
      expect(tariffStore.has(id)).toBe(true); // soft delete
    });

    test('returns 404 when row missing', async () => {
      const r = await request(makeApp()).delete(`/tariffs/${new ObjectId().toString()}`);
      expect(r.status).toBe(404);
    });
  });

  describe('POST /:id/restore', () => {
    test('flips isActive back to true', async () => {
      const id = new ObjectId().toString();
      tariffStore.set(
        id,
        buildDoc({ _id: id, provider: 'Bupa', cptCode: '97110', unitPrice: 100, isActive: false })
      );

      const r = await request(makeApp()).post(`/tariffs/${id}/restore`);
      expect(r.status).toBe(200);
      expect(r.body.row.isActive).toBe(true);
    });
  });
});
