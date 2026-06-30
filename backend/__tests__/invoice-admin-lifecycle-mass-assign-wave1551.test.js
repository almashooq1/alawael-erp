'use strict';

/**
 * invoice-admin-lifecycle-mass-assign-wave1551.test.js — W1551
 *
 * Guards the fix for lifecycle/total mass-assignment in routes/invoices-admin.routes.js.
 * PATCH /:id did findOneAndUpdate(scopedById, body) after deleting only
 * _id/createdAt/zatca, so a write-role user could PATCH {status:'PAID'} (skip the
 * /pay flow + its guard), {status:'ISSUED'} (skip the ZATCA envelope → break the
 * hash chain) or {totalAmount:1} (undercharge), bypassing every controlled
 * transition endpoint. POST / honored body.status (create an invoice already PAID).
 * Fix: PATCH strips status, totalAmount, subTotal, paidAt, paidAmount, balance,
 * paymentMethod, branchId, issuer, invoiceNumber; create forces status='DRAFT'.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const USER_ID = new mongoose.Types.ObjectId();
const managerA = {
  _id: USER_ID,
  id: String(USER_ID), // route sets issuer = req.user.id → must be a valid ObjectId
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let app;
let Invoice;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1551-inv' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Invoice = require('../models/Invoice');
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false })
    );
  }
  app = express();
  app.use(express.json());
  app.use('/api/admin/invoices', require('../routes/invoices-admin.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const seedInvoice = async (over = {}) => {
  const r = await Invoice.collection.insertOne({
    invoiceNumber: 'INV-W1551-' + Math.random().toString(36).slice(2, 9),
    beneficiary: new mongoose.Types.ObjectId(),
    branchId: BRANCH_A,
    items: [{ description: 'x', quantity: 1, unitPrice: 100, total: 100 }],
    subTotal: 100,
    taxAmount: 15,
    totalAmount: 115,
    status: 'ISSUED',
    issueDate: new Date(),
    ...over,
  });
  return r.insertedId;
};

describe('W1551 — invoice lifecycle/total mass-assignment is blocked', () => {
  it('PATCH cannot mark an invoice PAID or change its total', async () => {
    const id = await seedInvoice();
    const r = await request(app)
      .patch(`/api/admin/invoices/${id}`)
      .send({ status: 'PAID', totalAmount: 1, paidAt: new Date(), notes: 'edit ok' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('ISSUED'); // status NOT changed via PATCH
    expect(r.body.data.totalAmount).toBe(115); // total NOT tampered
    expect(r.body.data.notes).toBe('edit ok'); // non-privileged field still editable
  });

  it('PATCH cannot flip a PAID invoice back / cancel it (bypassing the guards)', async () => {
    const id = await seedInvoice({ status: 'PAID' });
    const r = await request(app)
      .patch(`/api/admin/invoices/${id}`)
      .send({ status: 'CANCELLED' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('PAID');
  });

  it('POST create forces status=DRAFT (cannot create an already-PAID invoice)', async () => {
    const r = await request(app)
      .post('/api/admin/invoices')
      .send({
        beneficiary: String(new mongoose.Types.ObjectId()),
        status: 'PAID',
        paidAt: new Date(),
        items: [{ description: 'svc', quantity: 1, unitPrice: 200 }],
      });
    expect([200, 201]).toContain(r.status);
    expect(r.body.data.status).toBe('DRAFT');
    expect(r.body.data.paidAt == null).toBe(true);
  });

  it('static: PATCH + create strip the server-owned lifecycle/total fields', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'invoices-admin.routes.js'),
      'utf8'
    );
    // create forces DRAFT (not `|| 'DRAFT'`)
    expect(src).toMatch(/body\.status = 'DRAFT';/);
    expect(src).not.toMatch(/body\.status = body\.status \|\| 'DRAFT'/);
    // PATCH strips the privileged set
    const patchStart = src.indexOf("router.patch('/:id'");
    const patch = src.slice(patchStart, patchStart + 1200);
    for (const f of ['status', 'totalAmount', 'paidAt', 'branchId']) {
      expect(patch).toContain(`'${f}'`);
    }
  });
});
