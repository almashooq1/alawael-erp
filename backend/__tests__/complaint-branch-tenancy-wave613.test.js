'use strict';

/**
 * complaint-branch-tenancy-wave613.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 schema-denormalization wave. Complaint was a multi-source model with
 * NO branch dimension, so its /stats aggregates + / list leaked all-branch
 * complaint data to single-branch callers (and couldn't be plugin-scoped).
 * W613 denormalizes branchId onto Complaint (set from the filer's branch at
 * the route, fallback to the linked beneficiary's branch via pre-save) and
 * branch-scopes the list + every /stats aggregate.
 *
 * STATIC guard — the model carries branchId + index + derive hook, and the
 * route scopes list/stats/create. BEHAVIORAL — the pre-save hook actually
 * derives branchId from the beneficiary and never overwrites an explicit one.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'complaints.routes.js'),
  'utf8'
);

// ── STATIC ───────────────────────────────────────────────────────────
describe('W613 static — Complaint model carries branch tenancy', () => {
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

describe('W613 static — complaints route branch-scopes list/stats/create', () => {
  it('imports branchFilter', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter/);
  });
  it('list filter composes branchFilter(req)', () => {
    expect(ROUTE_SRC).toMatch(/const filter = \{\s*\.\.\.branchFilter\(req\)/);
  });
  it('every Complaint.aggregate in /stats has a branch-scoped $match', () => {
    const re = /Complaint\.aggregate\s*\(\s*\[/g;
    let m;
    const bodies = [];
    while ((m = re.exec(ROUTE_SRC))) {
      const end = ROUTE_SRC.indexOf('])', m.index);
      bodies.push(ROUTE_SRC.slice(m.index, end === -1 ? m.index + 400 : end));
    }
    expect(bodies.length).toBeGreaterThanOrEqual(5);
    const unscoped = bodies.filter(b => !/\$match[^]*?(scope|branchFilter)/.test(b));
    expect(unscoped).toEqual([]);
  });
  it('create stamps branchId from req.branchScope (never from the body)', () => {
    expect(ROUTE_SRC).toMatch(/branchId:\s*req\.branchScope\.branchId/);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Complaint;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w609-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary'); // register so the hook's mongoose.model('Beneficiary') resolves
  Complaint = require('../models/Complaint');
  await Complaint.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Complaint.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const baseComplaint = (o = {}) => ({
  subject: 'موضوع',
  description: 'وصف الشكوى',
  source: 'student',
  type: 'complaint',
  ...o,
});

describe('W613 behavioral — branchId derivation', () => {
  it('derives branchId from the linked beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiaryId = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiaryId, branchId });

    const c = new Complaint(baseComplaint({ beneficiaryId }));
    await c.save();
    expect(String(c.branchId)).toBe(String(branchId));
  });

  it('does NOT overwrite an explicitly set branchId', async () => {
    const explicit = oid();
    const beneficiaryId = oid();
    await mongoose.connection
      .collection('beneficiaries')
      .insertOne({ _id: beneficiaryId, branchId: oid() });

    const c = new Complaint(baseComplaint({ beneficiaryId, branchId: explicit }));
    await c.save();
    expect(String(c.branchId)).toBe(String(explicit));
  });

  it('leaves branchId unset (no throw) when there is no beneficiary anchor', async () => {
    const c = new Complaint(baseComplaint({ source: 'employee' }));
    await c.save();
    expect(c.branchId).toBeUndefined();
  });
});
