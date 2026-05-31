'use strict';

/**
 * rehabplan-branch-tenancy-wave629.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 schema-denormalization wave #3 (W613/W621 template → UnifiedRehabPlan,
 * the last beneficiary-scoped model in the operational batch). The model had
 * no branch dimension, so the mdt-coordination dashboards (/plans-stats,
 * /dashboard/team-workload, overview) leaked all-branch plan stats. W629
 * denormalizes branchId (from the required beneficiary via pre-save) and
 * branch-scopes those dashboard stats.
 *
 * Also converts the existing unifiedRehabPlanSchema callback pre-save hook to
 * async so it can coexist with the new async derive hook (Mongoose-9 mixed
 * dispatch breaks the chain — check:hook-style gate; baseline ratcheted DOWN).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'MDTCoordination.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'mdt-coordination.routes.js'),
  'utf8'
);

describe('W629 static — UnifiedRehabPlan model + hook style', () => {
  it('declares a branchId field reffing Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
  });
  it('indexes { branchId: 1, status: 1 }', () => {
    expect(MODEL_SRC).toMatch(/unifiedRehabPlanSchema\.index\(\{\s*branchId:\s*1,\s*status:\s*1/);
  });
  it('has the derive-from-beneficiary pre-save hook', () => {
    expect(MODEL_SRC).toMatch(/deriveBranchFromBeneficiary/);
  });
  it('no longer uses callback-style pre-save on unifiedRehabPlanSchema', () => {
    // the converted hook is async; assert no `pre('save', function (next)` remains
    expect(MODEL_SRC).not.toMatch(/unifiedRehabPlanSchema\.pre\(\s*'save',\s*function\s*\(\s*next/);
  });
});

describe('W629 static — mdt-coordination route branch-scopes dashboards', () => {
  it('imports branchFilter', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter/);
  });
  it('every UnifiedRehabPlan.aggregate has a branch-scoped $match (except the entity-scoped one)', () => {
    const re = /UnifiedRehabPlan\.aggregate\s*\(\s*\[/g;
    let m;
    let scoped = 0;
    let entityScoped = 0;
    while ((m = re.exec(ROUTE_SRC))) {
      const end = ROUTE_SRC.indexOf('])', m.index);
      const body = ROUTE_SRC.slice(m.index, end === -1 ? m.index + 600 : end);
      if (/\$match[^]*?(scope|branchFilter)/.test(body)) scoped++;
      else if (/beneficiary:\s*new/.test(body)) entityScoped++; // single-beneficiary detail
    }
    // 5 dashboard aggregates scoped + 1 entity-scoped (single beneficiary)
    expect(scoped).toBeGreaterThanOrEqual(5);
    expect(scoped + entityScoped).toBeGreaterThanOrEqual(6);
  });
});

// ── BEHAVIORAL ───────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let UnifiedRehabPlan;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w629-behavioral' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  ({ UnifiedRehabPlan } = require('../models/MDTCoordination'));
  await UnifiedRehabPlan.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await UnifiedRehabPlan.deleteMany({});
  await mongoose.connection.collection('beneficiaries').deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
const basePlan = (o = {}) => ({
  planNumber: `PLAN-${(seq += 1)}`,
  title: 'خطة تأهيل',
  startDate: new Date(),
  beneficiary: oid(),
  ...o,
});
const goal = (o = {}) => ({
  title: 'هدف',
  domain: 'PHYSICAL',
  status: 'ACTIVE',
  progress: 0,
  ...o,
});

describe('W629 behavioral — branchId derivation + async hook coexistence', () => {
  it('derives branchId from the beneficiary when unset', async () => {
    const branchId = oid();
    const beneficiary = oid();
    await mongoose.connection.collection('beneficiaries').insertOne({ _id: beneficiary, branchId });

    const p = new UnifiedRehabPlan(basePlan({ beneficiary }));
    await p.save();
    expect(String(p.branchId)).toBe(String(branchId));
  });

  it('still runs the (converted-to-async) overallProgress hook', async () => {
    const p = new UnifiedRehabPlan(
      basePlan({ goals: [goal({ progress: 40 }), goal({ progress: 60 })] })
    );
    await p.save();
    expect(p.overallProgress).toBe(50); // (40+60)/2 — proves the hook chain still fires
  });
});
