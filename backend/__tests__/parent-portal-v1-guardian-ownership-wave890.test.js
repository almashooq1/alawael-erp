'use strict';

/** parent-portal-v1-guardian-ownership-wave890.test.js — W890 */

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
  generateToken: () => 'token',
}));

let mongod;
let Guardian;
let Beneficiary;

const USER_ID = new mongoose.Types.ObjectId();
const GUARDIAN_ID = new mongoose.Types.ObjectId();
const BENE_LINKED = new mongoose.Types.ObjectId();
const BENE_STALE = new mongoose.Types.ObjectId();

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/portal', require('../routes/parent-portal-v1.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w890-parent-portal' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Guardian = require('../models/Guardian');
  Beneficiary = require('../models/Beneficiary');

  await Guardian.collection.insertOne({
    _id: GUARDIAN_ID,
    userId: USER_ID,
    firstName_ar: 'ولي',
    firstName_en: 'Wali',
    lastName_ar: 'الأمر',
    lastName_en: 'Alamr',
    name_ar: 'ولي الأمر',
    phone: '96650000001',
    email: 'guardian890@example.com',
    idNumber: '1090000001',
    relationship: 'father',
    beneficiaries: [BENE_LINKED, BENE_STALE], // stale link is intentionally present
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await Beneficiary.collection.insertOne({
    _id: BENE_LINKED,
    firstName_ar: 'طفل',
    lastName_ar: 'أ',
    firstName_en: 'Child',
    lastName_en: 'A',
    status: 'active',
    gender: 'male',
    guardians: [{ guardian: GUARDIAN_ID, relationship: 'father', isPrimary: true }],
    primaryGuardian: GUARDIAN_ID,
  });

  await Beneficiary.collection.insertOne({
    _id: BENE_STALE,
    firstName_ar: 'طفل',
    lastName_ar: 'ب',
    firstName_en: 'Child',
    lastName_en: 'B',
    status: 'active',
    gender: 'male',
    guardians: [],
    primaryGuardian: null,
  });
});

beforeEach(() => {
  mockAuthState.user = { id: String(USER_ID), role: 'guardian' };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W890 — parent-portal ownership hardening', () => {
  it('allows access when beneficiary has reciprocal guardian link', async () => {
    const res = await request(buildApp()).get(
      `/api/v1/portal/beneficiaries/${BENE_LINKED}/summary`
    );
    expect(res.status).toBe(200);
    expect(String(res.body.id)).toBe(String(BENE_LINKED));
  });

  it('returns 404 for stale guardian.beneficiaries-only relation', async () => {
    const res = await request(buildApp()).get(`/api/v1/portal/beneficiaries/${BENE_STALE}/summary`);
    expect(res.status).toBe(404);
  });
});
