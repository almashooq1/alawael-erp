'use strict';

/**
 * nitaqat-contract-branch-isolation-behavioral-wave1159.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of routes/nitaqat.routes.js' /contracts/:id surface:
 * a branch-A manager is denied (403) a branch-B employment contract by id and
 * allowed (200) their own, while an HQ (super_admin) role sees any. Heavy
 * government services are mocked; the REAL contractService + NitaqatEmploymentContract
 * are exercised so the branchId gate is the thing under test. Contracts are
 * raw-inserted with an explicit branchId (plugin derivation is covered elsewhere).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/nitaqat-contract-branch-isolation-behavioral-wave1159.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = global.__nqUser || null;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../services/nitaqat.service', () => ({}));
jest.mock('../services/wps-enhanced.service', () => ({}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
let EmploymentContract;
let contractA;
let contractB;
let app;

const asManagerA = () => {
  global.__nqUser = { id: new mongoose.Types.ObjectId(), role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__nqUser = { id: new mongoose.Types.ObjectId(), role: 'super_admin' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1159-nitaqat' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  // Employee stand-in needed by contractService.getContract's populate('employee').
  mongoose.model('Employee', new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId }));
  EmploymentContract = require('../models/nitaqat.models').EmploymentContract;

  const org = new mongoose.Types.ObjectId();
  const emp = new mongoose.Types.ObjectId();
  const ins = branchId =>
    EmploymentContract.collection
      .insertOne({ organization: org, employee: emp, branchId, status: 'draft' })
      .then(r => r.insertedId);
  contractA = await ins(BRANCH_A);
  contractB = await ins(BRANCH_B);

  const router = require('../routes/nitaqat.routes');
  app = express();
  app.use(express.json());
  app.use('/api/nitaqat', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — nitaqat employment-contract id routes isolate by branch', () => {
  it('denies a branch-A manager reading a branch-B contract (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/nitaqat/contracts/${contractB}`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager reading their OWN-branch contract (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/nitaqat/contracts/${contractA}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('allows an HQ (super_admin) role to read any branch contract (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get(`/api/nitaqat/contracts/${contractB}`);
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager changing a branch-B contract status (403)', async () => {
    asManagerA();
    const res = await request(app)
      .put(`/api/nitaqat/contracts/${contractB}/status`)
      .send({ status: 'active' });
    expect(res.status).toBe(403);
  });
});
