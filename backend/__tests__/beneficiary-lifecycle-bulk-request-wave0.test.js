'use strict';

/**
 * beneficiary-lifecycle-bulk-request-wave0.test.js
 *
 * Verifies the bulk-request endpoint on the lifecycle router:
 *   POST /api/v1/beneficiary-lifecycle/transitions/bulk-request
 *
 * It reuses the existing single-item service, validates input, enforces
 * permissions per transitionId, and returns a partitioned report.
 */

const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

function makeService() {
  return {
    requestTransition: jest.fn(async ({ beneficiaryId, transitionId }) => {
      if (beneficiaryId === 'b-bad') {
        return { ok: false, reason: 'INVALID_FROM_STATE' };
      }
      return {
        ok: true,
        transitionRecord: { _id: `txn-${beneficiaryId}`, beneficiaryId, transitionId },
      };
    }),
  };
}

function makeGovernance({ allowedPermissions = null } = {}) {
  return {
    hasPermission: jest.fn((role, code) => {
      if (allowedPermissions === null) return true;
      return allowedPermissions.includes(code);
    }),
  };
}

function makeBulkJobModel(overrides = {}) {
  const docs = [];
  return {
    create: jest.fn(async data => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data, ...overrides };
      docs.push(doc);
      return doc;
    }),
    findById: jest.fn(id => ({
      lean: jest.fn().mockResolvedValue(docs.find(d => String(d._id) === String(id)) || null),
    })),
    _docs: docs,
  };
}

function makeApp({
  service,
  governance,
  bulkJobModel,
  userId = 'U-1',
  role = 'branch_manager',
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) req.user = { id: userId, role };
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({
      service: service || makeService(),
      governance: governance || makeGovernance(),
      bulkJobModel: bulkJobModel || makeBulkJobModel(),
      logger: { warn: () => {}, info: () => {} },
    })
  );
  return {
    app,
    svc: service || makeService(),
    gov: governance || makeGovernance(),
    bulkJobModel: bulkJobModel || makeBulkJobModel(),
  };
}

describe('POST /api/v1/beneficiary-lifecycle/transitions/bulk-request', () => {
  test('accepts a bulk request and returns a queued job', async () => {
    const svc = makeService();
    const bulkJobModel = makeBulkJobModel();
    const { app } = makeApp({ service: svc, bulkJobModel });

    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({
        items: [
          { beneficiaryId: 'b-1', transitionId: 'suspend', reasonCode: 'family' },
          { beneficiaryId: 'b-2', transitionId: 'suspend', reasonCode: 'medical' },
        ],
      });

    expect(r.status).toBe(202);
    expect(r.body.success).toBe(true);
    expect(r.body.status).toBe('queued');
    expect(r.body.total).toBe(2);
    expect(r.body.bulkJobId).toBeTruthy();
    expect(bulkJobModel.create).toHaveBeenCalledTimes(1);
    const created = bulkJobModel.create.mock.calls[0][0];
    expect(created.operation).toBe('bulk-request');
    expect(created.items).toHaveLength(2);
    expect(svc.requestTransition).not.toHaveBeenCalled();
  });

  test('rejects empty items array', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({ items: [] });

    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('BULK_ITEMS_REQUIRED');
  });

  test('rejects more than 100 items', async () => {
    const { app } = makeApp();
    const items = Array.from({ length: 101 }, (_, i) => ({
      beneficiaryId: `b-${i}`,
      transitionId: 'suspend',
    }));
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({ items });

    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('BULK_ITEMS_LIMIT_EXCEEDED');
  });

  test('rejects an item missing beneficiaryId or transitionId', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({
        items: [{ beneficiaryId: 'b-1' }],
      });

    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('BULK_ITEM_INVALID');
  });

  test('rejects unknown transitionId in an item', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({
        items: [{ beneficiaryId: 'b-1', transitionId: 'not_a_transition' }],
      });

    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('TRANSITION_NOT_FOUND');
  });

  test('denies the whole batch when caller lacks permission for any transition', async () => {
    const gov = makeGovernance({ allowedPermissions: [] });
    const { app } = makeApp({ governance: gov });

    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({
        items: [{ beneficiaryId: 'b-1', transitionId: 'suspend', reasonCode: 'family' }],
      });

    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PERMISSION_DENIED');
  });

  test('GET /bulk-jobs/:id returns the created job', async () => {
    const bulkJobModel = makeBulkJobModel();
    const { app } = makeApp({ bulkJobModel });

    const created = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-request')
      .send({
        items: [{ beneficiaryId: 'b-1', transitionId: 'suspend', reasonCode: 'family' }],
      });

    const r = await request(app).get(
      `/api/v1/beneficiary-lifecycle/transitions/bulk-jobs/${created.body.bulkJobId}`
    );

    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data._id).toBe(created.body.bulkJobId);
    expect(r.body.data.operation).toBe('bulk-request');
  });
});
