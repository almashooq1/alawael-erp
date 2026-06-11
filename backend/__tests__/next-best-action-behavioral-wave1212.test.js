'use strict';

/**
 * next-best-action-behavioral-wave1212.test.js — behavioral counterpart to
 * the W1206 static drift guard (next-best-action-wave1206.test.js).
 *
 * Runs services/nextBestAction.service.js against a REAL in-memory MongoDB
 * with the REAL TherapeuticGoal / ClinicalSession / MeasureAlert /
 * RiskSnapshot / EpisodeOfCare models — proving the 5-source fusion actually
 * fires end-to-end (the static guard only proves the rules exist in source).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/next-best-action-behavioral-wave1212.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let svc;
let TherapeuticGoal;
let MeasureAlert;
let RiskSnapshot;
let EpisodeOfCare;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1209-nba-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  // W954 legacy-hook adapter — before any schema.pre(...) runs.
  require('../config/mongoose.plugins');

  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  require('../domains/sessions/models/ClinicalSession'); // registers for goldenThread trace
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  RiskSnapshot = require('../models/RiskSnapshot');
  ({ EpisodeOfCare } = require('../domains/episodes/models/EpisodeOfCare'));

  svc = require('../services/nextBestAction.service');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([
    TherapeuticGoal.deleteMany({}),
    MeasureAlert.deleteMany({}),
    RiskSnapshot.deleteMany({}),
    EpisodeOfCare.deleteMany({}),
    mongoose.model('ClinicalSession').deleteMany({}),
  ]);
});

const daysAgo = n => new Date(Date.now() - n * 24 * 3600 * 1000);

async function seedFullSignalBeneficiary() {
  const beneficiaryId = new mongoose.Types.ObjectId();

  // Episode stuck in initial_assessment for 20 days → STALE_ASSESSMENT
  await EpisodeOfCare.create({
    beneficiaryId,
    status: 'active',
    currentPhase: 'initial_assessment',
    phases: [{ name: 'initial_assessment', status: 'in_progress', startedAt: daysAgo(20) }],
    startDate: daysAgo(25),
  });

  // Active goal at 95% with NO measure links → SUGGEST_GOAL_CLOSURE +
  // golden-thread LINK_MEASURE (threadStage no_measure_link)
  const goal = await TherapeuticGoal.create({
    beneficiaryId,
    episodeId: new mongoose.Types.ObjectId(),
    title: 'هدف تجريبي شارف على التحقق',
    type: 'short_term',
    status: 'active',
    currentProgress: 95,
    startDate: daysAgo(60),
    target: { value: 100 },
  });

  // Open plateau alert → REVIEW_PLAN
  await MeasureAlert.create({
    beneficiaryId,
    measureId: new mongoose.Types.ObjectId(),
    measureCode: 'VABS-3',
    alertType: 'PLATEAU_DETECTED',
    severity: 'medium',
    status: 'open',
  });

  // Critical risk snapshot → ESCALATE_SAFETY (P0)
  await RiskSnapshot.create({
    beneficiaryId,
    sweepRunId: 'w1209-test-run',
    overallScore: 88,
    overallTier: 'critical',
    tierDelta: 'escalated',
    reason: 'behavioral escalation cluster',
    computedAt: daysAgo(0),
  });

  return { beneficiaryId, goal };
}

describe('W1212 behavioral — computeForBeneficiary (5-source fusion)', () => {
  test('all five engines contribute and safety ranks first', async () => {
    const { beneficiaryId } = await seedFullSignalBeneficiary();

    const out = await svc.computeForBeneficiary(beneficiaryId);

    const codes = out.actions.map(a => a.code);
    expect(out.actions[0].code).toBe('ESCALATE_SAFETY'); // P0 always wins
    expect(codes).toEqual(
      expect.arrayContaining([
        'ESCALATE_SAFETY',
        'LINK_MEASURE',
        'STALE_ASSESSMENT',
        'REVIEW_PLAN',
        'SUGGEST_GOAL_CLOSURE',
      ])
    );

    // ranking is priority-ascending
    const priorities = out.actions.map(a => a.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);

    // evidence carried through from each engine
    const safety = out.actions.find(a => a.code === 'ESCALATE_SAFETY');
    expect(safety.evidence.tier).toBe('critical');
    const review = out.actions.find(a => a.code === 'REVIEW_PLAN');
    expect(review.evidence.alertType).toBe('PLATEAU_DETECTED');
    expect(review.evidence.count).toBe(1);
    const stale = out.actions.find(a => a.code === 'STALE_ASSESSMENT');
    expect(stale.evidence.daysInPhase).toBeGreaterThanOrEqual(19);
    const closure = out.actions.find(a => a.code === 'SUGGEST_GOAL_CLOSURE');
    expect(closure.evidence.currentProgress).toBe(95);

    // summary integrity — all models registered, nothing degraded
    expect(out.summary.total).toBe(out.actions.length);
    expect(out.summary.degradedSources).toEqual([]);
    expect(out.summary.urgent).toBeGreaterThanOrEqual(2); // P0 + P1
  });

  test('quiet beneficiary → zero actions, no fabrication', async () => {
    const out = await svc.computeForBeneficiary(new mongoose.Types.ObjectId());
    expect(out.actions).toEqual([]);
    expect(out.summary.total).toBe(0);
  });

  test('moderate risk tier does NOT escalate; resolved alerts are ignored', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await RiskSnapshot.create({
      beneficiaryId,
      sweepRunId: 'w1209-quiet',
      overallTier: 'moderate',
      reason: 'routine',
      computedAt: new Date(),
    });
    await MeasureAlert.create({
      beneficiaryId,
      measureId: new mongoose.Types.ObjectId(),
      measureCode: 'X',
      alertType: 'REGRESSION_DETECTED',
      status: 'resolved',
      resolvedAt: new Date(),
    });

    const out = await svc.computeForBeneficiary(beneficiaryId);
    const codes = out.actions.map(a => a.code);
    expect(codes).not.toContain('ESCALATE_SAFETY');
    expect(codes).not.toContain('REVIEW_PLAN');
  });

  test('fresh assessment phase (<14d) does not flag STALE_ASSESSMENT', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await EpisodeOfCare.create({
      beneficiaryId,
      status: 'active',
      currentPhase: 'initial_assessment',
      phases: [{ name: 'initial_assessment', status: 'in_progress', startedAt: daysAgo(5) }],
      startDate: daysAgo(6),
    });
    const out = await svc.computeForBeneficiary(beneficiaryId);
    expect(out.actions.map(a => a.code)).not.toContain('STALE_ASSESSMENT');
  });
});

describe('W1212 behavioral — computeForCaseload', () => {
  test('rows only for beneficiaries WITH actions, sorted most-urgent-first', async () => {
    const { beneficiaryId: hot } = await seedFullSignalBeneficiary();
    const quiet = new mongoose.Types.ObjectId();
    // a mild case: only a closure candidate (P3)
    const mild = new mongoose.Types.ObjectId();
    await TherapeuticGoal.create({
      beneficiaryId: mild,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'هدف هادئ',
      type: 'short_term',
      status: 'active',
      currentProgress: 92,
      startDate: daysAgo(30),
      target: { value: 100 },
      objectives: [], // no thread breaks beyond no-goals? goal exists w/o links → LINK_MEASURE P1
    });

    const out = await svc.computeForCaseload([hot, quiet, mild]);

    expect(out.rows.map(r => r.beneficiaryId)).toEqual([String(hot), String(mild)]);
    expect(out.rows[0].topAction.code).toBe('ESCALATE_SAFETY');
    expect(out.summary.beneficiariesNeedingAction).toBe(2);
    expect(out.summary.urgentCount).toBeGreaterThanOrEqual(2);
    expect(out.summary.totalActions).toBe(out.rows.reduce((s, r) => s + r.actionCount, 0));
  });
});
