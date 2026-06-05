'use strict';

/** meetings-routes-branch-isolation-wave914.test.js — W914 */

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
const USER_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let meetingB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w914-meetings' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Meeting = require('../models/Meeting');
  app = express();
  app.use(express.json());
  app.use('/api/v1/meetings', require('../routes/meetings.routes'));

  await Meeting.collection.insertOne({
    meetingId: 'MTG-A-914',
    title: 'اجتماع أ',
    date: new Date(),
    startTime: '09:00',
    organizer: USER_A,
    branchId: BRANCH_A,
    status: 'scheduled',
  });
  const ins = await Meeting.collection.insertOne({
    meetingId: 'MTG-B-914',
    title: 'اجتماع ب',
    date: new Date(),
    startTime: '10:00',
    organizer: USER_A,
    branchId: BRANCH_B,
    status: 'scheduled',
  });
  meetingB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W914 — meetings isolation', () => {
  it('lists only in-scope meetings', async () => {
    const res = await request(app).get('/api/v1/meetings');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch meeting GET /:id', async () => {
    const res = await request(app).get(`/api/v1/meetings/${meetingB}`);
    expect(res.status).toBe(404);
  });
});
