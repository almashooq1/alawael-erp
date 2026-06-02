'use strict';

/**
 * purchasing-routes-auth-wave794.test.js — W794 real authorize() 401/403 negatives.
 * Complements W791/W792 flow tests that mock authorize away.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/branchScope.middleware', () => ({
  branchFilter: () => ({}),
}));

let mongod;
let app;
let actorId;

function mountApp(role) {
  const a = express();
  a.use(express.json());
  if (role !== undefined) {
    a.use((req, _res, next) => {
      req.user = { id: actorId, _id: actorId, role };
      next();
    });
  }
  a.use('/api/v1/purchasing', require('../routes/purchasing.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message, code: err.code });
  });
  return a;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w794-purchasing-auth' } });
  await mongoose.connect(mongod.getUri());
  require('../models/inventory/PurchaseOrder');
  require('../models/inventory/PurchaseReceipt');
  require('../models/inventory/InventoryItem');
  require('../models/operations/PurchaseRequest.model');

  actorId = new mongoose.Types.ObjectId();
  app = mountApp('staff');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W794 — purchasing routes authorize() negatives', () => {
  it('returns 401 when req.user is absent on protected POST /vendors', async () => {
    const noUserApp = mountApp(undefined);
    const res = await request(noUserApp)
      .post('/api/v1/purchasing/vendors')
      .send({ name: 'Vendor X' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('returns 403 for staff on procurement-only POST /vendors', async () => {
    const res = await request(app).post('/api/v1/purchasing/vendors').send({ name: 'Vendor X' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/insufficient permissions/i);
  });

  it('returns 403 for staff on POST /orders', async () => {
    const res = await request(app)
      .post('/api/v1/purchasing/orders')
      .send({ supplierName: 'Acme', items: [] });
    expect(res.status).toBe(403);
  });

  it('returns 403 for staff on POST /requests/:id/convert-to-po', async () => {
    const prId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/v1/purchasing/requests/${prId}/convert-to-po`)
      .send({ supplierName: 'Acme' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for therapist on PATCH /orders/:id/receive', async () => {
    const therapistApp = mountApp('therapist');
    const poId = new mongoose.Types.ObjectId();
    const res = await request(therapistApp).patch(`/api/v1/purchasing/orders/${poId}/receive`);
    expect(res.status).toBe(403);
  });

  it('allows staff to create a purchase request (positive control)', async () => {
    const res = await request(app)
      .post('/api/v1/purchasing/requests')
      .send({ title: 'Office supplies', items: [{ description: 'Paper', quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
  });

  it('allows department_head to hit approve endpoint (auth pass; 404 without doc)', async () => {
    const headApp = mountApp('department_head');
    const prId = new mongoose.Types.ObjectId();
    const res = await request(headApp).patch(`/api/v1/purchasing/requests/${prId}/approve`);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
