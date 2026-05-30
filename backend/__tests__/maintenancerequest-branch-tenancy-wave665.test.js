'use strict';

/**
 * maintenancerequest-branch-tenancy-wave665.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B (facility model). MaintenanceRequest had no branch dimension, so
 * the bi-dashboard maintenance stats aggregate leaked all-branch maintenance
 * stats (an audit FALSE-NEGATIVE — masked by the W661 Complaint scoping a few
 * lines above). W665 denormalizes branchId — derived from createdBy →
 * requestedBy User.branchId (the raising branch) — and scopes the aggregate.
 * branchFilter = {} for cross-branch/HQ → org-wide preserved.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'MaintenanceRequest.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'bi-dashboard.routes.js'),
  'utf8'
);

describe('W665 static — MaintenanceRequest model + scoped aggregate', () => {
  it('declares branchId reffing Branch + index + derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/index\(\{\s*branchId:\s*1,\s*status:\s*1/);
    expect(MODEL_SRC).toMatch(/deriveBranchFromUser/);
  });
  it('bi-dashboard MaintenanceRequest aggregate is branch-scoped', () => {
    expect(ROUTE_SRC).toMatch(
      /MaintenanceRequest\.aggregate\s*\(\s*\[\s*[^]*?\$match:\s*\{\s*\.\.\.branchFilter\(req\)/
    );
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MaintenanceRequest;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w665-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/User');
  MaintenanceRequest = require('../models/MaintenanceRequest');
  await MaintenanceRequest.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MaintenanceRequest.deleteMany({});
  await mongoose.connection.collection('users').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const baseReq = (o = {}) => ({ title: 'إصلاح', description: 'وصف الطلب', ...o });

describe('W665 behavioral — branchId derivation from createdBy/requestedBy', () => {
  it('derives branchId from createdBy User when unset', async () => {
    const branchId = oid();
    const createdBy = oid();
    await mongoose.connection.collection('users').insertOne({ _id: createdBy, branchId });

    const mr = new MaintenanceRequest(baseReq({ createdBy }));
    await mr.save();
    expect(String(mr.branchId)).toBe(String(branchId));
  });

  it('falls back to requestedBy when no createdBy', async () => {
    const branchId = oid();
    const requestedBy = oid();
    await mongoose.connection.collection('users').insertOne({ _id: requestedBy, branchId });

    const mr = new MaintenanceRequest(baseReq({ requestedBy }));
    await mr.save();
    expect(String(mr.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const createdBy = oid();
    await mongoose.connection.collection('users').insertOne({ _id: createdBy, branchId: oid() });

    const mr = new MaintenanceRequest(baseReq({ createdBy, branchId: explicit }));
    await mr.save();
    expect(String(mr.branchId)).toBe(String(explicit));
  });
});
