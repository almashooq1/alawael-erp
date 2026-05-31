'use strict';

/**
 * referral-branch-tenancy-wave621.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 schema-denormalization wave (sibling of W613/Complaint). MedicalReferral
 * had no branch dimension, so GET /medical-referrals/dashboard/stats (7 counts
 * + 2 aggregates) + the list leaked all-branch referral data to single-branch
 * callers. W621 denormalizes branchId (from the required beneficiary via
 * pre-save) and branch-scopes the list + every dashboard stat.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'medicalReferral.model.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'medicalReferrals.routes.js'),
  'utf8'
);

// ── STATIC ───────────────────────────────────────────────────────────
describe('W621 static — MedicalReferral model carries branch tenancy', () => {
  it('declares a branchId field reffing Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
  });
  it('indexes { branchId: 1, status: 1 }', () => {
    expect(MODEL_SRC).toMatch(/index\(\{\s*branchId:\s*1,\s*status:\s*1\s*\}\)/);
  });
  it('has the derive-from-beneficiary pre-save hook', () => {
    expect(MODEL_SRC).toMatch(/deriveBranchFromBeneficiary/);
  });
});

describe('W621 static — referrals route branch-scopes list + dashboard stats', () => {
  it('imports branchFilter', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter/);
  });
  it('list filter composes branchFilter(req)', () => {
    expect(ROUTE_SRC).toMatch(/const filter = \{\s*\.\.\.branchFilter\(req\)/);
  });
  it('every MedicalReferral.aggregate has a branch-scoped $match', () => {
    const re = /MedicalReferral\.aggregate\s*\(\s*\[/g;
    let m;
    const bodies = [];
    while ((m = re.exec(ROUTE_SRC))) {
      const end = ROUTE_SRC.indexOf('])', m.index);
      bodies.push(ROUTE_SRC.slice(m.index, end === -1 ? m.index + 400 : end));
    }
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    const unscoped = bodies.filter(b => !/\$match[^]*?(scope|branchFilter)/.test(b));
    expect(unscoped).toEqual([]);
  });
  it('the dashboard countDocuments calls compose the scope', () => {
    // every countDocuments in the stats handler spreads ...scope
    expect(ROUTE_SRC).toMatch(/countDocuments\(\{\s*\.\.\.scope/);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MedicalReferral;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w621-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ MedicalReferral } = require('../models/medicalReferral.model'));
  await MedicalReferral.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MedicalReferral.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const baseReferral = (o = {}) => ({ referralType: 'internal', ...o });

describe('W621 behavioral — branchId derivation from the beneficiary', () => {
  it('derives branchId from the (required) beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const r = new MedicalReferral(baseReferral({ beneficiary }));
    await r.save();
    expect(String(r.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiary = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiary, branchId: oid() });

    const r = new MedicalReferral(baseReferral({ beneficiary, branchId: explicit }));
    await r.save();
    expect(String(r.branchId)).toBe(String(explicit));
  });
});
