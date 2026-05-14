'use strict';

jest.unmock('mongoose');
jest.resetModules();

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo, app, UniversalCode;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Stub the authenticate middleware so we don't need a full auth stack.
  jest.doMock('../middleware/auth', () => ({
    authenticate: (req, _res, next) => {
      req.user = { userId: new mongoose.Types.ObjectId().toString() };
      next();
    },
  }));
  // safeError + logger pass-through (real modules are fine but they may
  // try to spin up file transports; mock to keep the test isolated).
  jest.doMock(
    '../utils/safeError',
    () => (res, err) => res.status(500).json({ success: false, message: err.message })
  );

  UniversalCode = require('../models/UniversalCode');
  const router = require('../routes/universal-codes.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/codes', router);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
afterEach(async () => {
  await UniversalCode.deleteMany({});
});

describe('UniversalCode routes', () => {
  test('POST /generate → 400 on missing fields', async () => {
    const r = await request(app).post('/api/v1/codes/generate').send({});
    expect(r.status).toBe(400);
  });

  test('POST /generate → returns code; second call returns SAME code', async () => {
    const entityId = new mongoose.Types.ObjectId().toString();
    const r1 = await request(app)
      .post('/api/v1/codes/generate')
      .send({ entityType: 'BNF', entityId, entityLabel: 'Ali' });
    expect(r1.status).toBe(200);
    expect(r1.body.data.code).toMatch(/^RH-BNF-[0-9A-Z]{6}$/);
    expect(r1.body.data.entityLabel).toBe('Ali');

    const r2 = await request(app)
      .post('/api/v1/codes/generate')
      .send({ entityType: 'BNF', entityId });
    expect(r2.status).toBe(200);
    expect(r2.body.data.code).toBe(r1.body.data.code);
  });

  test('GET /resolve/:code returns 404 if unknown', async () => {
    const r = await request(app).get('/api/v1/codes/resolve/RH-BNF-AAAAAA');
    expect(r.status).toBe(404);
  });

  test('GET /resolve/:code returns 400 if malformed', async () => {
    const r = await request(app).get('/api/v1/codes/resolve/garbage');
    expect(r.status).toBe(400);
  });

  test('POST /scan/:code increments scanCount', async () => {
    const entityId = new mongoose.Types.ObjectId().toString();
    const gen = await request(app)
      .post('/api/v1/codes/generate')
      .send({ entityType: 'EMP', entityId });
    const code = gen.body.data.code;

    const s1 = await request(app).post(`/api/v1/codes/scan/${code}`);
    expect(s1.status).toBe(200);
    expect(s1.body.data.scanCount).toBe(1);

    const s2 = await request(app).post(`/api/v1/codes/scan/${code}`);
    expect(s2.body.data.scanCount).toBe(2);
  });

  test('POST /scan/:code returns 410 on revoked', async () => {
    const entityId = new mongoose.Types.ObjectId().toString();
    const gen = await request(app)
      .post('/api/v1/codes/generate')
      .send({ entityType: 'INV', entityId });
    const code = gen.body.data.code;
    await request(app).post(`/api/v1/codes/revoke/${code}`);
    const s = await request(app).post(`/api/v1/codes/scan/${code}`);
    expect(s.status).toBe(410);
  });

  test('GET /render/:code.png returns PNG (QR)', async () => {
    const r = await request(app).get('/api/v1/codes/render/RH-BNF-AAAAAA.png');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/image\/png/);
    expect(r.body[0]).toBe(0x89); // PNG magic
  });

  test('GET /render/:code.png?type=barcode returns Code-128 PNG', async () => {
    const r = await request(app).get('/api/v1/codes/render/RH-BNF-AAAAAA.png?type=barcode');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/image\/png/);
  });
});
