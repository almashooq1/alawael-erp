'use strict';

/**
 * careplan-branch-tenancy-wave654.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 Phase-B denormalization (template → CarePlan). The model had no branch
 * dimension, so care-plans-admin stats (count + 2 aggregates + 5 counts) and
 * bi-analytics /goals leaked all-branch care-plan stats to single-branch
 * callers. W654 denormalizes branchId (from the required beneficiary) and
 * branch-scopes those dashboards.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'CarePlan.js'), 'utf8');
const ADMIN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'care-plans-admin.routes.js'),
  'utf8'
);
const BIA_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'bi-analytics.routes.js'),
  'utf8'
);

describe('W654 static — CarePlan model carries branch tenancy', () => {
  it('declares branchId reffing Branch + index + derive hook', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/index\(\{\s*branchId:\s*1,\s*status:\s*1\s*\}\)/);
    expect(MODEL_SRC).toMatch(/deriveBranchFromBeneficiary/);
  });
});

describe('W654 static — care-plan dashboards are branch-scoped', () => {
  it('care-plans-admin adds requireBranchAccess + scopes its CarePlan aggregates', () => {
    expect(ADMIN_SRC).toMatch(/requireBranchAccess/);
    const bodies = ADMIN_SRC.match(/CarePlan\.aggregate\s*\(\s*\[[^]*?\$match[^]*?\}/g) || [];
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    expect(bodies.every(b => /(scope|branchFilter)/.test(b))).toBe(true);
  });
  it('bi-analytics /goals scopes its CarePlan aggregate', () => {
    expect(BIA_SRC).toMatch(
      /CarePlan\.aggregate\s*\(\s*\[\s*[^]*?\$match:\s*\{\s*\.\.\.branchFilter\(req\)/
    );
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CarePlan;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w654-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  CarePlan = require('../models/CarePlan');
  await CarePlan.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await CarePlan.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const basePlan = (o = {}) => ({
  title: 'خطة رعاية',
  beneficiary: oid(),
  startDate: new Date(),
  ...o,
});

describe('W654 behavioral — branchId derivation from the beneficiary', () => {
  it('derives branchId from the (required) beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const cp = new CarePlan(basePlan({ beneficiary }));
    await cp.save();
    expect(String(cp.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiary = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiary, branchId: oid() });

    const cp = new CarePlan(basePlan({ beneficiary, branchId: explicit }));
    await cp.save();
    expect(String(cp.branchId)).toBe(String(explicit));
  });
});
