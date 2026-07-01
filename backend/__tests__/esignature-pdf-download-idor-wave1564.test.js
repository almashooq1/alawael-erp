'use strict';

/**
 * esignature-pdf-download-idor-wave1564.test.js — W1564
 *
 * Guards the cross-user IDOR on the signed-PDF download endpoints of
 * routes/eSignaturePdf.routes.js (authenticated, but no per-record check):
 *  - GET /download/:id streamed ANY ESignature certificate PDF by id.
 *  - GET /stamped/:stampId streamed ANY EStamp's stamped PDFs by id.
 *
 * Fix: gate by creator / named signer (ESignature) or the model's isUserAuthorized
 * ACL (EStamp), plus admin. Restrictive — external parties still verify via the
 * public verification-code endpoints; legitimate creator/signer/authorized access
 * is unchanged.
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
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authenticateToken: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

const creator = new mongoose.Types.ObjectId();
const signer = new mongoose.Types.ObjectId();
const authedMember = new mongoose.Types.ObjectId();
const stranger = new mongoose.Types.ObjectId();

let mongod;
let app;
let ESignature;
let EStamp;
let sigId;
let stampId;

const as = (id, role) => {
  mockUser.u = { _id: id, id: String(id), role: role || 'staff' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1564-esig' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ESignature = require('../models/ESignature');
  EStamp = require('../models/EStamp');
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String }, { strict: false }));
  }
  app = express();
  app.use(express.json());
  app.use('/api/esign', require('../routes/eSignaturePdf.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const sig = await ESignature.collection.insertOne({
    requestId: 'REQ-W1564',
    documentTitle: 'consent',
    createdBy: creator,
    signers: [{ userId: signer, name: 'S', email: 's@x.co', role: 'signer' }],
  });
  sigId = sig.insertedId;
  const stamp = await EStamp.collection.insertOne({
    stampId: 'STM-W1564',
    name_ar: 'ختم',
    createdBy: creator,
    authorizedUsers: [{ userId: authedMember, role: 'user' }],
  });
  stampId = stamp.insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1564 — eSignature/eStamp PDF download access control', () => {
  // For an authorized caller the access gate passes and the handler falls through
  // to the "no generated PDF" check (404) in the test env → `not 403` proves access.
  it('GET /download/:id — a stranger is 403 (was: any authed user could download)', async () => {
    as(stranger);
    const r = await request(app).get(`/api/esign/download/${sigId}`);
    expect(r.status).toBe(403);
  });

  it('GET /download/:id — the creator passes the access gate', async () => {
    as(creator);
    const r = await request(app).get(`/api/esign/download/${sigId}`);
    expect(r.status).not.toBe(403);
  });

  it('GET /download/:id — a named signer passes the access gate', async () => {
    as(signer);
    const r = await request(app).get(`/api/esign/download/${sigId}`);
    expect(r.status).not.toBe(403);
  });

  it('GET /download/:id — an admin passes the access gate', async () => {
    as(stranger, 'admin');
    const r = await request(app).get(`/api/esign/download/${sigId}`);
    expect(r.status).not.toBe(403);
  });

  it('GET /stamped/:stampId — a stranger is 403', async () => {
    as(stranger);
    const r = await request(app).get(`/api/esign/stamped/${stampId}`);
    expect(r.status).toBe(403);
  });

  it('GET /stamped/:stampId — the creator and an authorized member pass the gate', async () => {
    as(creator);
    expect((await request(app).get(`/api/esign/stamped/${stampId}`)).status).not.toBe(403);
    as(authedMember);
    expect((await request(app).get(`/api/esign/stamped/${stampId}`)).status).not.toBe(403);
  });

  it('static: both downloads check access before streaming', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'eSignaturePdf.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/isSigner/);
    expect(src).toMatch(/stamp\.isUserAuthorized\(uid\)/);
    expect((src.match(/غير مصرح بتنزيل/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
