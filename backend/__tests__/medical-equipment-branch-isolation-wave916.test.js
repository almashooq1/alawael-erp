'use strict';

/** medical-equipment-branch-isolation-wave916.test.js — W916 */

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
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const techA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'technician',
  branchId: String(BRANCH_A),
};

let mongod;
let equipB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w916-med-equip' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const { MedicalEquipment } = require('../models/medicalEquipment.model');
  app = express();
  app.use(express.json());
  app.use('/api/v1/medical-equipment', require('../routes/medicalEquipment.routes'));

  await MedicalEquipment.collection.insertOne({
    assetTag: 'EQ-A-916',
    name: { ar: 'معدة أ' },
    category: 'diagnostic',
    status: 'active',
    branchId: BRANCH_A,
    isDeleted: false,
  });
  const ins = await MedicalEquipment.collection.insertOne({
    assetTag: 'EQ-B-916',
    name: { ar: 'معدة ب' },
    category: 'diagnostic',
    status: 'active',
    branchId: BRANCH_B,
    isDeleted: false,
  });
  equipB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = techA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W916 — medical equipment isolation', () => {
  it('lists only in-scope equipment', async () => {
    const res = await request(app).get('/api/v1/medical-equipment/equipment');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch equipment GET /equipment/:id', async () => {
    const res = await request(app).get(`/api/v1/medical-equipment/equipment/${equipB}`);
    expect(res.status).toBe(404);
  });
});
