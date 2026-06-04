'use strict';

/** emr-routes-branch-isolation-wave901.test.js — W901 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const nurseA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'nurse',
  branchId: String(BRANCH_A),
};

let mongod;
let recordB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/emr', require('../routes/emr.routes'));
  return app;
}

function beneficiaryId(doc) {
  const b = doc?.beneficiary;
  return String(b?._id ?? b ?? '');
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w901-emr' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  const { MedicalRecord } = require('../models/emr.model');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await MedicalRecord.collection.insertOne({
    beneficiary: BENE_A,
    mrn: 'MRN-A-901',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const ins = await MedicalRecord.collection.insertOne({
    beneficiary: BENE_B,
    mrn: 'MRN-B-901',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  recordB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = nurseA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W901 — EMR records isolation', () => {
  it('lists only in-scope medical records', async () => {
    const res = await request(buildApp()).get('/api/emr/records');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(beneficiaryId(res.body.data[0])).toBe(String(BENE_A));
  });

  it('returns 404 for foreign-branch record by id', async () => {
    const res = await request(buildApp()).get(`/api/emr/records/${recordB}`);
    expect(res.status).toBe(404);
  });
});
