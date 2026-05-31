'use strict';

/**
 * safetyincident-branch-tenancy-wave664.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B denormalization (facility/HSE model). SafetyIncident had no
 * branch dimension, so GET /ehs/incidents/statistics/summary (3 counts + 1
 * aggregate) leaked all-branch incident stats. W664 denormalizes branchId —
 * DERIVED FROM THE REPORTER (an incident belongs to the branch where it was
 * filed; `location` is free text, not a Branch ref) — and branch-scopes that
 * dashboard. branchFilter = {} for cross-branch/HQ safety officers → org-wide
 * HSE oversight preserved.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'HSE.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'enterpriseProPlus.routes.js'),
  'utf8'
);

describe('W664 static — SafetyIncident model carries reporter-derived branch tenancy', () => {
  it('declares branchId reffing Branch + index + reporter-derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/incidentSchema\.index\(\{\s*branchId:\s*1,\s*status:\s*1/);
    expect(MODEL_SRC).toMatch(
      /incidentSchema\.pre\(\s*'save',\s*async function deriveBranchFromReporter/
    );
  });
});

describe('W664 static — incident summary is branch-scoped', () => {
  it('imports branchFilter + scopes the SafetyIncident stats', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter/);
    expect(ROUTE_SRC).toMatch(/SafetyIncident\.countDocuments\(\{\s*\.\.\.scope/);
    expect(ROUTE_SRC).toMatch(
      /SafetyIncident\.aggregate\s*\(\s*\[\s*\{\s*\$match:\s*\{\s*\.\.\.scope/
    );
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SafetyIncident;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w664-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/User');
  ({ SafetyIncident } = require('../models/HSE'));
  await SafetyIncident.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SafetyIncident.deleteMany({});
  await mongoose.connection.collection('users').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const baseIncident = (o = {}) => ({
  titleAr: 'حادث سلامة',
  description: 'وصف الحادث',
  incidentType: 'injury',
  location: 'Riyadh Branch',
  incidentDate: new Date(),
  reportedBy: oid(),
  ...o,
});

describe('W664 behavioral — branchId derivation from the reporter', () => {
  it('derives branchId from the reporter User when unset', async () => {
    const branchId = oid();
    const reportedBy = oid();
    await mongoose.connection.collection('users').insertOne({ _id: reportedBy, branchId });

    const inc = new SafetyIncident(baseIncident({ reportedBy }));
    await inc.save();
    expect(String(inc.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const reportedBy = oid();
    await mongoose.connection.collection('users').insertOne({ _id: reportedBy, branchId: oid() });

    const inc = new SafetyIncident(baseIncident({ reportedBy, branchId: explicit }));
    await inc.save();
    expect(String(inc.branchId)).toBe(String(explicit));
  });
});
