'use strict';

/**
 * W1214 — Blueprint 43 §6.4 outcomes roll-up ladder (R7 final tier).
 *
 * Layers:
 *  1. PURE  — foldGoals decision table (achievement over CLOSED only, mean
 *     progress over ACTIVE only, per-domain breakdown).
 *  2. BEHAVIORAL — the 4-tier ladder over a REAL in-memory MongoDB with the
 *     real TherapeuticGoal model.
 *  3. STATIC — READ-ONLY service+route contract, W269 gates, center tier is
 *     cross-branch-only, registry mount.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

const { foldGoals } = require('../services/outcomesRollup.service');

let mongod;
let svc;
let TherapeuticGoal;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1214-rollup-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  svc = require('../services/outcomesRollup.service');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TherapeuticGoal.deleteMany({});
});

/* ─────────────────────────── pure layer ─────────────────────────── */

describe('W1214 pure — foldGoals', () => {
  test('achievement rate over CLOSED goals only; active goals cannot "fail" yet', () => {
    const out = foldGoals([
      { status: 'achieved', domain: 'speech' },
      { status: 'not_achieved', domain: 'speech' },
      { status: 'active', currentProgress: 40, domain: 'speech' },
      { status: 'active', currentProgress: 60, domain: 'motor_gross' },
      { status: 'draft', domain: 'motor_gross' },
    ]);
    expect(out.total).toBe(5);
    expect(out.closed).toBe(2);
    expect(out.achieved).toBe(1);
    expect(out.achievedPctOfClosed).toBe(50); // 1 of 2 closed — draft/active excluded
    expect(out.activeCount).toBe(2);
    expect(out.avgActiveProgress).toBe(50); // (40+60)/2
  });

  test('per-domain breakdown sorted by volume', () => {
    const out = foldGoals([
      { status: 'achieved', domain: 'speech' },
      { status: 'achieved', domain: 'speech' },
      { status: 'partially_achieved', domain: 'speech' },
      { status: 'active', currentProgress: 80, domain: 'behavioral' },
    ]);
    expect(out.byDomain[0].domain).toBe('speech');
    expect(out.byDomain[0].closed).toBe(3);
    expect(out.byDomain[0].achievedPctOfClosed).toBe(67); // 2/3
    expect(out.byDomain[1]).toMatchObject({ domain: 'behavioral', avgActiveProgress: 80 });
  });

  test('no closed goals → achievedPctOfClosed is null (no fake 0%); empty input safe', () => {
    expect(foldGoals([{ status: 'active', currentProgress: 10 }]).achievedPctOfClosed).toBeNull();
    expect(foldGoals([]).total).toBe(0);
    expect(foldGoals([]).avgActiveProgress).toBeNull();
  });
});

/* ─────────────────────────── behavioral ladder ─────────────────────────── */

describe('W1214 behavioral — 4-tier ladder over real goals', () => {
  const BRANCH_A = new mongoose.Types.ObjectId();
  const BRANCH_B = new mongoose.Types.ObjectId();
  const BEN_1 = new mongoose.Types.ObjectId();
  const BEN_2 = new mongoose.Types.ObjectId();
  const BEN_3 = new mongoose.Types.ObjectId();

  const goal = (beneficiaryId, branchId, status, domain, currentProgress = 0) => ({
    beneficiaryId,
    episodeId: new mongoose.Types.ObjectId(),
    branchId,
    title: `هدف ${domain} ${status}`,
    type: 'short_term',
    status,
    domain,
    currentProgress,
    startDate: new Date(),
    target: { value: 100 },
  });

  async function seedLadder() {
    await TherapeuticGoal.create([
      // branch A / beneficiary 1 — speech program doing well
      goal(BEN_1, BRANCH_A, 'achieved', 'speech'),
      goal(BEN_1, BRANCH_A, 'achieved', 'speech'),
      goal(BEN_1, BRANCH_A, 'active', 'speech', 70),
      // branch A / beneficiary 2 — behavioral program struggling
      goal(BEN_2, BRANCH_A, 'not_achieved', 'behavioral'),
      goal(BEN_2, BRANCH_A, 'active', 'behavioral', 30),
      // branch B / beneficiary 3
      goal(BEN_3, BRANCH_B, 'achieved', 'motor_gross'),
    ]);
    // soft-deleted goal must be excluded everywhere
    await TherapeuticGoal.create({
      ...goal(BEN_1, BRANCH_A, 'achieved', 'speech'),
      isDeleted: true,
    });
  }

  test('tier 1 — beneficiary', async () => {
    await seedLadder();
    const out = await svc.rollupForBeneficiary(BEN_1);
    expect(out.tier).toBe('beneficiary');
    expect(out.total).toBe(3); // soft-deleted excluded
    expect(out.achieved).toBe(2);
    expect(out.achievedPctOfClosed).toBe(100);
    expect(out.avgActiveProgress).toBe(70);
  });

  test('tiers 2+3 — branch with per-program breakdown', async () => {
    await seedLadder();
    const out = await svc.rollupForBranch(BRANCH_A);
    expect(out.tier).toBe('branch');
    expect(out.beneficiariesWithGoals).toBe(2);
    expect(out.total).toBe(5);
    expect(out.achievedPctOfClosed).toBe(67); // 2 achieved of 3 closed

    const speech = out.byDomain.find(d => d.domain === 'speech');
    const behavioral = out.byDomain.find(d => d.domain === 'behavioral');
    expect(speech.achievedPctOfClosed).toBe(100);
    expect(behavioral.achievedPctOfClosed).toBe(0); // 0 of 1 closed
    expect(behavioral.avgActiveProgress).toBe(30);
  });

  test('tier 4 — center: one row per branch + executive topline', async () => {
    await seedLadder();
    const out = await svc.rollupForCenter();
    expect(out.tier).toBe('center');
    expect(out.branchCount).toBe(2);
    expect(out.branches[0].branchId).toBe(String(BRANCH_A)); // sorted by volume
    expect(out.branches[0].total).toBe(5);
    expect(out.branches[1].total).toBe(1);
    expect(out.center.total).toBe(6);
    expect(out.center.achieved).toBe(3);
  });

  test('empty system → zeros and nulls, never throws', async () => {
    const out = await svc.rollupForCenter();
    expect(out.branchCount).toBe(0);
    expect(out.center.total).toBe(0);
    expect(out.center.achievedPctOfClosed).toBeNull();
  });
});

/* ─────────────────────────── static wiring ─────────────────────────── */

describe('W1214 static wiring', () => {
  test('service is READ-ONLY', () => {
    const src = read('services/outcomesRollup.service.js');
    expect(src).not.toMatch(/\.create\(/);
    expect(src).not.toMatch(/\.save\(/);
    expect(src).not.toMatch(/\.updateOne\(|\.updateMany\(|\.findOneAndUpdate\(|\.deleteOne\(/);
  });

  test('routes: READ-ONLY + W269 gates + center tier denies restricted callers', () => {
    const src = read('routes/outcomes-rollup.routes.js');
    expect(src).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(src).toMatch(/enforceBeneficiaryBranch\(req, req\.params\.beneficiaryId\)/);
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.branchId/);
    // center: scoped caller → 403
    const centerBlock = src.split("'/center'")[1] || '';
    expect(centerBlock).toMatch(/effectiveBranchScope\(req\)/);
    expect(centerBlock).toMatch(/status\(403\)/);
  });

  test('mounted via dualMountAuth in features.registry', () => {
    const src = read('routes/registries/features.registry.js');
    expect(src).toMatch(/safeRequire\('\.\.\/routes\/outcomes-rollup\.routes'\)/);
    expect(src).toMatch(
      /dualMountAuth\(app, 'outcomes-rollup', outcomesRollupRoutes, authenticate\)/
    );
  });
});
