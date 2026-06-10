'use strict';

/**
 * finance-cheques-branch-isolation-behavioral-wave1172.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of finance-cheques: a branch-A manager is denied (403)
 * a branch-B cheque (view + lifecycle), allowed (200) their own AND null-branch
 * (org-level) cheques, an HQ (super_admin) sees any, and the list returns own-branch +
 * null-branch only. chequeService is mocked (the gate fires before it); Cheque is a
 * real MMS model; cheques are raw-inserted with explicit branchId (the relatedInvoice
 * derivation is covered by the static guard).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-cheques-branch-isolation-behavioral-wave1172.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = global.__chUser || null;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../services/finance/chequeService', () => ({
  createCheque: jest.fn(async () => ({ ok: true })),
  depositCheque: jest.fn(async () => ({ ok: true })),
  clearCheque: jest.fn(async () => ({ ok: true })),
  bounceCheque: jest.fn(async () => ({ ok: true })),
  cancelCheque: jest.fn(async () => ({ ok: true })),
  holdCheque: jest.fn(async () => ({ ok: true })),
  releaseHold: jest.fn(async () => ({ ok: true })),
  getChequeAgingReport: jest.fn(async () => ({})),
  expireStaleCheques: jest.fn(async () => ({})),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
let Cheque;
let chA;
let chB;
let chNull;
let app;

const asManagerA = () => {
  global.__chUser = { id: 'u1', role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__chUser = { id: 'u2', role: 'super_admin' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1172-cheques' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Cheque = require('../models/Cheque');
  const ins = branchId =>
    Cheque.collection
      .insertOne({ status: 'pending', type: 'incoming', ...(branchId ? { branchId } : {}) })
      .then(r => r.insertedId);
  chA = await ins(BRANCH_A);
  chB = await ins(BRANCH_B);
  chNull = await ins(null);

  const router = require('../routes/finance-cheques.routes');
  app = express();
  app.use(express.json());
  app.use('/api/cheques', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — finance-cheques :id routes isolate by branch', () => {
  it('denies a branch-A manager viewing a branch-B cheque (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/cheques/${chB}`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager viewing their OWN-branch cheque (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/cheques/${chA}`);
    expect(res.status).toBe(200);
  });

  it('allows a null-branch (org-level) cheque through (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/cheques/${chNull}`);
    expect(res.status).toBe(200);
  });

  it('allows an HQ (super_admin) role to view any branch cheque (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get(`/api/cheques/${chB}`);
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager depositing a branch-B cheque (403)', async () => {
    asManagerA();
    const res = await request(app).post(`/api/cheques/${chB}/deposit`).send({});
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager depositing their OWN cheque (200)', async () => {
    asManagerA();
    const res = await request(app).post(`/api/cheques/${chA}/deposit`).send({});
    expect(res.status).toBe(200);
  });
});

describe('W269 — the cheque list returns own-branch + null-branch only', () => {
  it('a branch-A manager does not see branch-B cheques in the list', async () => {
    asManagerA();
    const res = await request(app).get('/api/cheques');
    expect(res.status).toBe(200);
    const branches = res.body.data.items.map(c => String(c.branchId));
    expect(branches).not.toContain(String(BRANCH_B));
  });
});
