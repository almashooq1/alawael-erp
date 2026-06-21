'use strict';

/**
 * beneficiary-lifecycle-bulk-approve-execute-wave0.test.js — Wave 0 (Phase 4).
 *
 * HTTP-layer tests for bulk approve / execute lifecycle endpoints.
 */

const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

function makeService(overrides = {}) {
  return {
    requestTransition: jest.fn(async () => ({ ok: true, transitionRecord: { _id: 'txn-1' } })),
    approveTransition: jest.fn(async ({ transitionRecordId }) => ({
      ok: true,
      transitionRecord: { _id: transitionRecordId, status: 'approved' },
      statusChanged: true,
    })),
    executeTransition: jest.fn(async ({ transitionRecordId }) => ({
      ok: true,
      transitionRecord: { _id: transitionRecordId, status: 'executed' },
    })),
    ...overrides,
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
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const bjm = bulkJobModel || makeBulkJobModel();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) req.user = { id: userId, role };
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({ service: svc, governance: gov, bulkJobModel: bjm })
  );
  return { app, svc, gov, bulkJobModel: bjm };
}

describe('POST /transitions/bulk-approve', () => {
  test('queues a bulk approve job and returns 202', async () => {
    const { app, svc, bulkJobModel } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-approve')
      .send({
        items: [
          { transitionRecordId: 't1', approverRole: 'branch_manager' },
          { transitionRecordId: 't2', approverRole: 'branch_manager' },
        ],
      });
    expect(r.status).toBe(202);
    expect(r.body.success).toBe(true);
    expect(r.body.status).toBe('queued');
    expect(r.body.total).toBe(2);
    expect(r.body.bulkJobId).toBeTruthy();
    expect(bulkJobModel.create).toHaveBeenCalledTimes(1);
    expect(svc.approveTransition).not.toHaveBeenCalled();
  });

  test('rejects more than 100 items', async () => {
    const { app } = makeApp();
    const items = Array.from({ length: 101 }, (_, i) => ({ transitionRecordId: `t${i}` }));
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-approve')
      .send({ items });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('BULK_ITEMS_LIMIT_EXCEEDED');
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ governance: makeGovernance({ allowedPermissions: [] }) });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-approve')
      .send({ items: [{ transitionRecordId: 't1' }] });
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PERMISSION_DENIED');
  });
});

describe('POST /transitions/bulk-execute', () => {
  test('queues a bulk execute job and returns 202', async () => {
    const { app, svc, bulkJobModel } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/bulk-execute')
      .send({
        items: [{ transitionRecordId: 't1' }, { transitionRecordId: 't2' }],
      });
    expect(r.status).toBe(202);
    expect(r.body.success).toBe(true);
    expect(r.body.status).toBe('queued');
    expect(r.body.total).toBe(2);
    expect(r.body.bulkJobId).toBeTruthy();
    expect(bulkJobModel.create).toHaveBeenCalledTimes(1);
    expect(svc.executeTransition).not.toHaveBeenCalled();
  });
});
