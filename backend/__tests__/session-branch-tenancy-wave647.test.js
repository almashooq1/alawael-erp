'use strict';

/**
 * session-branch-tenancy-wave647.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B denormalization (template → TherapySession). The model had no
 * branch dimension, so the BI session dashboards (bi-analytics /sessions +
 * bi.routes sessions trend/stats) leaked all-branch session stats to
 * single-branch callers. W647 denormalizes branchId — beneficiary's branch
 * (preferred) else the therapist's Employee branch, since beneficiary is
 * optional — and branch-scopes those aggregates.
 *
 * (bi-analytics aggregates ClinicalAssessment + CarePlan too — those lack
 * branchId and remain a future denormalization wave; only TherapySession is
 * scoped here. requireBranchAccess was added to bi-analytics so branchFilter
 * works; it = {} for cross-branch/HQ analysts → org-wide BI preserved.)
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'TherapySession.js'),
  'utf8'
);
const BIA_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'bi-analytics.routes.js'),
  'utf8'
);
const BI_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'bi.routes.js'), 'utf8');

describe('W647 static — TherapySession model carries branch tenancy', () => {
  it('declares branchId reffing Branch + index + derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/index\(\{\s*branchId:\s*1,\s*date:\s*1\s*\}\)/);
    expect(MODEL_SRC).toMatch(/deriveBranchFromBeneficiary/);
  });
});

describe('W647 static — BI session aggregates are branch-scoped', () => {
  it('bi-analytics adds requireBranchAccess + scopes every TherapySession aggregate', () => {
    expect(BIA_SRC).toMatch(/requireBranchAccess/);
    const bodies = BIA_SRC.match(/TherapySession\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(4);
    expect(bodies.every(b => /(scope|branchFilter)/.test(b))).toBe(true);
  });
  it('bi.routes scopes its TherapySession aggregates', () => {
    expect(BI_SRC).toMatch(/branchFilter/);
    const bodies = BI_SRC.match(/TherapySession\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.every(b => /branchFilter|sessionFilter/.test(b))).toBe(true);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapySession;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w647-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  require('../models/HR/Employee');
  TherapySession = require('../models/TherapySession');
  await TherapySession.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TherapySession.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
  await mongoose.connection.collection('employees').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('W647 behavioral — branchId derivation (beneficiary → therapist fallback)', () => {
  it('derives from the beneficiary when present', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const s = new TherapySession({ date: new Date(), beneficiary });
    await s.save();
    expect(String(s.branchId)).toBe(String(branchId));
  });

  it('falls back to the therapist Employee branch when no beneficiary', async () => {
    const branchId = oid();
    const therapist = oid();
    await mongoose.connection.collection('employees').insertOne({ _id: therapist, branchId });

    const s = new TherapySession({ date: new Date(), therapist });
    await s.save();
    expect(String(s.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiary = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiary, branchId: oid() });

    const s = new TherapySession({ date: new Date(), beneficiary, branchId: explicit });
    await s.save();
    expect(String(s.branchId)).toBe(String(explicit));
  });
});
