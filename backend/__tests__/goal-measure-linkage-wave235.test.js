'use strict';

/**
 * goal-measure-linkage-wave235.test.js — Wave 235.
 *
 * Verifies the goal-measure linkage layer:
 *
 *   Model invariants (pre-validate):
 *     - linkRationale ≥ 10 chars enforced
 *     - exactly one PRIMARY per objective's measureLinks
 *     - PRIMARY.weight ≥ 0.5
 *     - weight sum == 1.0 (±0.01) across contributing
 *     - interventionRefs ≥ 1 required (skipped for CONTRAINDICATED)
 *     - unlinked status requires unlinkReason
 *     - CONTRAINDICATED links don't count in weight-sum rule
 *
 *   Legacy compatibility:
 *     - pre-save mirrors PRIMARY link's measureId to objective.measureId
 *       (so W216 keeps working)
 *
 *   Pure rules (weightedProgress):
 *     - all SUSTAINED → score = 1.0, status='achieved_pending'
 *     - mixed → weighted average
 *     - INSUFFICIENT_DATA links excluded from average + renormalized
 *     - all null → status='insufficient_data'
 *     - REGRESSION dominates worst-wins
 *
 *   Pure rules (decisions):
 *     - modifyDecision STAGNANT → lower_target, blocked when baseline unlocked
 *     - addSecondaryDecision when mcidMissing + 3+ admins
 *     - unlinkDecision when measure deprecated
 *     - closeAchievedDecision: cumulative gates
 *     - closeFailedDecision: always blocks on MDT requirement
 *
 *   Service:
 *     - createLink with SoD-ready audit fields
 *     - reviewLink first review SoD: reviewer ≠ linkedBy
 *     - unlinkLink SoD + reason required
 *     - computeWeightedProgress without interpretations falls back to interpreter
 *     - dueForReview window
 *     - goalsForMeasure reverse lookup
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let TherapeuticGoal;
let LINK_TYPES;
let linkage;
let rules;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w235-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ TherapeuticGoal, LINK_TYPES } = require('../domains/goals/models/TherapeuticGoal'));
  linkage = require('../services/goalMeasureLinkage.service');
  rules = require('../measures/linkage/rules');
  await Measure.init();
  await TherapeuticGoal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

// ─── Fixtures ──────────────────────────────────────────────────────────

async function seedMeasure({ code = 'BERG', mcid = 4, status = 'active' } = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status,
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation:
      mcid != null
        ? { mcid: { value: mcid, type: 'absolute', status: 'established', source: 'cite' } }
        : undefined,
    targetPopulation: ['all'],
  });
}

async function seedGoal({ beneficiaryId, episodeId, withLinks = false, ...rest }) {
  const goal = new TherapeuticGoal({
    beneficiaryId: beneficiaryId || new mongoose.Types.ObjectId(),
    episodeId: episodeId || new mongoose.Types.ObjectId(),
    title: 'Improve balance',
    type: 'short_term',
    startDate: new Date(),
    targetDate: new Date(Date.now() + 90 * 86400000),
    baseline: { value: 20, date: new Date() },
    target: { value: 40 },
    objectives: [
      {
        title: 'Hit Berg target',
      },
    ],
    status: 'active',
    ...rest,
  });
  if (!withLinks) return goal.save();
  return goal;
}

function makeLink({
  measureId,
  measureCode = 'BERG',
  linkType = 'PRIMARY',
  weight = 1,
  rationale = 'evidence-based primary measure',
  interventionRefs = ['PROGRAM_BERG_TRAINING'],
  status = 'active',
  linkedBy,
}) {
  return {
    measureId,
    measureCode,
    linkType,
    weight,
    linkRationale: rationale,
    interventionRefs,
    status,
    linkedBy: linkedBy || new mongoose.Types.ObjectId(),
    linkedAt: new Date(),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. Model invariants
// ════════════════════════════════════════════════════════════════════════

describe('W235 — model invariants', () => {
  test('linkRationale < 10 chars rejected', async () => {
    const m = await seedMeasure();
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [makeLink({ measureId: m._id, rationale: 'short' })],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/linkRationale.*≥ 10 chars/);
  });

  test('two PRIMARY links rejected', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            makeLink({ measureId: m1._id, measureCode: 'M1', weight: 0.5 }),
            makeLink({ measureId: m2._id, measureCode: 'M2', weight: 0.5 }),
          ],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/exactly 1 PRIMARY/);
  });

  test('PRIMARY.weight < 0.5 rejected', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            makeLink({ measureId: m1._id, measureCode: 'M1', linkType: 'PRIMARY', weight: 0.3 }),
            makeLink({ measureId: m2._id, measureCode: 'M2', linkType: 'SECONDARY', weight: 0.7 }),
          ],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/PRIMARY measureLink weight must be ≥ 0.5/);
  });

  test('weights summing != 1.0 rejected', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            makeLink({ measureId: m1._id, measureCode: 'M1', linkType: 'PRIMARY', weight: 0.6 }),
            makeLink({ measureId: m2._id, measureCode: 'M2', linkType: 'SECONDARY', weight: 0.3 }),
          ],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/weights must sum to 1.0/);
  });

  test('valid 1 PRIMARY + 2 SECONDARY accepted', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const m3 = await seedMeasure({ code: 'M3' });
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            makeLink({ measureId: m1._id, measureCode: 'M1', linkType: 'PRIMARY', weight: 0.6 }),
            makeLink({ measureId: m2._id, measureCode: 'M2', linkType: 'SECONDARY', weight: 0.3 }),
            makeLink({ measureId: m3._id, measureCode: 'M3', linkType: 'SECONDARY', weight: 0.1 }),
          ],
        },
      ],
    });
    const saved = await goal.save();
    expect(saved.objectives[0].measureLinks.length).toBe(3);
  });

  test('interventionRefs missing rejected (non-CONTRAINDICATED)', async () => {
    const m = await seedMeasure();
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [makeLink({ measureId: m._id, interventionRefs: [] })],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/interventionRefs.*≥ 1/);
  });

  test('CONTRAINDICATED link does NOT count in weight-sum', async () => {
    const m1 = await seedMeasure({ code: 'M1' });
    const m2 = await seedMeasure({ code: 'M2' });
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            makeLink({ measureId: m1._id, measureCode: 'M1', linkType: 'PRIMARY', weight: 1 }),
            makeLink({
              measureId: m2._id,
              measureCode: 'M2',
              linkType: 'CONTRAINDICATED',
              weight: 0,
              interventionRefs: [], // allowed for CONTRAINDICATED
            }),
          ],
        },
      ],
    });
    const saved = await goal.save();
    expect(saved.objectives[0].measureLinks.length).toBe(2);
  });

  test('unlinked link requires unlinkReason', async () => {
    const m = await seedMeasure();
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [{ ...makeLink({ measureId: m._id }), status: 'unlinked', weight: 0 }],
        },
      ],
    });
    await expect(goal.save()).rejects.toThrow(/unlinkReason required/);
  });

  test('all-unlinked objective allowed (no PRIMARY rule)', async () => {
    const m = await seedMeasure();
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [
            {
              ...makeLink({ measureId: m._id }),
              status: 'unlinked',
              weight: 0,
              unlinkReason: 'measure deprecated',
            },
          ],
        },
      ],
    });
    const saved = await goal.save();
    expect(saved.objectives[0].measureLinks[0].status).toBe('unlinked');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Legacy mirror
// ════════════════════════════════════════════════════════════════════════

describe('W235 — legacy measureId mirror', () => {
  test('pre-save mirrors PRIMARY.measureId to objective.measureId', async () => {
    const m = await seedMeasure();
    const goal = new TherapeuticGoal({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      title: 'g',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 40 },
      objectives: [
        {
          title: 'o',
          measureLinks: [makeLink({ measureId: m._id })],
        },
      ],
    });
    const saved = await goal.save();
    expect(String(saved.objectives[0].measureId)).toBe(String(m._id));
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Pure rules — weightedProgress
// ════════════════════════════════════════════════════════════════════════

describe('W235 — weightedProgress', () => {
  test('all SUSTAINED → score 1.0', () => {
    const links = [
      { measureId: 'a', linkType: 'PRIMARY', weight: 0.7 },
      { measureId: 'b', linkType: 'SECONDARY', weight: 0.3 },
    ];
    const interps = new Map([
      ['a', { category: 'SUSTAINED_IMPROVEMENT' }],
      ['b', { category: 'SUSTAINED_IMPROVEMENT' }],
    ]);
    const r = rules.weightedProgress(links, interps);
    expect(r.score).toBe(1);
    expect(r.status).toBe('achieved_pending');
  });

  test('REGRESSION drags weighted score down', () => {
    const links = [
      { measureId: 'a', linkType: 'PRIMARY', weight: 0.6 },
      { measureId: 'b', linkType: 'SECONDARY', weight: 0.4 },
    ];
    const interps = new Map([
      ['a', { category: 'SUSTAINED_IMPROVEMENT' }], // 1.0
      ['b', { category: 'REGRESSION' }], // 0.0
    ]);
    const r = rules.weightedProgress(links, interps);
    expect(r.score).toBe(0.6);
    expect(r.status).toBe('progressing'); // 0.6 ≥ 0.4
  });

  test('INSUFFICIENT_DATA excluded + renormalized', () => {
    const links = [
      { measureId: 'a', linkType: 'PRIMARY', weight: 0.7 },
      { measureId: 'b', linkType: 'SECONDARY', weight: 0.3 },
    ];
    const interps = new Map([
      ['a', { category: 'SUSTAINED_IMPROVEMENT' }],
      ['b', { category: 'INSUFFICIENT_DATA' }],
    ]);
    const r = rules.weightedProgress(links, interps);
    // Only 'a' counts, weight=0.7. Renormalized: 1.0 * 0.7 / 0.7 = 1.0
    expect(r.score).toBe(1);
  });

  test('all interpretations missing → insufficient_data', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1 }];
    const r = rules.weightedProgress(links, new Map());
    expect(r.score).toBeNull();
    expect(r.status).toBe('insufficient_data');
  });

  test('breakdown includes per-link detail', () => {
    const links = [{ measureId: 'a', measureCode: 'BERG', linkType: 'PRIMARY', weight: 1 }];
    const interps = new Map([['a', { category: 'SLOW_PROGRESS' }]]);
    const r = rules.weightedProgress(links, interps);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0]).toMatchObject({
      measureCode: 'BERG',
      category: 'SLOW_PROGRESS',
      score: 0.6,
      contributedToAvg: true,
    });
  });

  test('score 0.15 → at_risk', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1 }];
    const interps = new Map([['a', { category: 'STAGNANT' }]]); // 0.1
    const r = rules.weightedProgress(links, interps);
    expect(r.status).toBe('failing');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Pure rules — decisions
// ════════════════════════════════════════════════════════════════════════

describe('W235 — modifyDecision', () => {
  test('STAGNANT + n≥5 + baselineLocked → recommend lower_target', () => {
    const link = { linkType: 'PRIMARY' };
    const interp = { category: 'STAGNANT', references: { historyCount: 6 } };
    const r = rules.modifyDecision(link, interp, { baselineLocked: true });
    expect(r.recommend).toBe(true);
    expect(r.action).toBe('lower_target');
  });

  test('STAGNANT + baseline unlocked → blocked', () => {
    const r = rules.modifyDecision(
      { linkType: 'PRIMARY' },
      { category: 'STAGNANT', references: { historyCount: 6 } },
      { baselineLocked: false }
    );
    expect(r.recommend).toBe(false);
    expect(r.blockers).toContain('baseline must be locked before modify');
  });

  test('PLATEAU + plateauDays > half plannedDuration → change_measure', () => {
    const r = rules.modifyDecision(
      { linkType: 'PRIMARY' },
      { category: 'PLATEAU' },
      { baselineLocked: true, plateauDays: 120, plannedDurationDays: 180 }
    );
    expect(r.recommend).toBe(true);
    expect(r.action).toBe('change_measure');
  });

  test('SECONDARY link not eligible', () => {
    const r = rules.modifyDecision(
      { linkType: 'SECONDARY' },
      { category: 'STAGNANT', references: { historyCount: 10 } },
      { baselineLocked: true }
    );
    expect(r.recommend).toBe(false);
  });
});

describe('W235 — addSecondaryDecision', () => {
  test('PRIMARY + mcidMissing + n≥3 → recommend', () => {
    const r = rules.addSecondaryDecision(
      { linkType: 'PRIMARY' },
      {
        caveats: ['MCID derived from percent-of-range fallback'],
        references: { historyCount: 5 },
      }
    );
    expect(r.recommend).toBe(true);
  });

  test('established MCID → no recommendation', () => {
    const r = rules.addSecondaryDecision(
      { linkType: 'PRIMARY' },
      { caveats: [], references: { historyCount: 10 } }
    );
    expect(r.recommend).toBe(false);
  });

  test('mcidMissing but only 2 admins → too early', () => {
    const r = rules.addSecondaryDecision(
      { linkType: 'PRIMARY' },
      {
        caveats: ['MCID derived from percent-of-range fallback'],
        references: { historyCount: 2 },
      }
    );
    expect(r.recommend).toBe(false);
    expect(r.reasoning[0]).toMatch(/too early/);
  });
});

describe('W235 — unlinkDecision', () => {
  test('measure deprecated + supersededBy → unlink_and_replace', () => {
    const r = rules.unlinkDecision(
      { status: 'active' },
      { status: 'deprecated', supersededBy: { measureCode: 'BERG-2' } },
      { status: 'active' }
    );
    expect(r.recommend).toBe(true);
    expect(r.action).toBe('unlink_and_replace');
  });

  test('measure deprecated no successor → unlink', () => {
    const r = rules.unlinkDecision(
      { status: 'active' },
      { status: 'deprecated' },
      { status: 'active' }
    );
    expect(r.recommend).toBe(true);
    expect(r.action).toBe('unlink');
  });

  test('CONTRAINDICATED + 3 continue verdicts → retag', () => {
    const r = rules.unlinkDecision(
      {
        linkType: 'CONTRAINDICATED',
        status: 'active',
        reviewHistory: [{ verdict: 'continue' }, { verdict: 'continue' }, { verdict: 'continue' }],
      },
      { status: 'active' },
      { status: 'active' }
    );
    expect(r.recommend).toBe(true);
    expect(r.action).toBe('retag_or_unlink');
  });

  test('discharged + peripheral link → unlink', () => {
    const r = rules.unlinkDecision(
      { status: 'active', weight: 0.2, linkType: 'SECONDARY' },
      { status: 'active' },
      { status: 'discharged' }
    );
    expect(r.recommend).toBe(true);
  });

  test('no triggers → no recommendation', () => {
    const r = rules.unlinkDecision(
      { status: 'active', weight: 1, linkType: 'PRIMARY' },
      { status: 'active' },
      { status: 'active' }
    );
    expect(r.recommend).toBe(false);
  });

  test('already unlinked → no recommendation', () => {
    const r = rules.unlinkDecision(
      { status: 'unlinked' },
      { status: 'deprecated' },
      { status: 'active' }
    );
    expect(r.recommend).toBe(false);
  });
});

describe('W235 — closeAchievedDecision', () => {
  function ctx({
    category = 'SUSTAINED_IMPROVEMENT',
    staleness = false,
    baselineId = 'b1',
    historyCount = 5,
  } = {}) {
    return {
      category,
      references: { baselineApplicationId: baselineId, historyCount },
      signals: { staleness },
    };
  }
  test('all gates pass → recommend close', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', ctx()]]);
    const r = rules.closeAchievedDecision({}, links, interps);
    expect(r.recommend).toBe(true);
  });

  test('low weighted score → blocked', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', ctx({ category: 'SLOW_PROGRESS' })]]); // 0.6
    const r = rules.closeAchievedDecision({}, links, interps);
    expect(r.recommend).toBe(false);
    expect(r.blockers.join(' ')).toMatch(/0\.6.*0\.75/);
  });

  test('stale primary admin → blocked', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', ctx({ staleness: true })]]);
    const r = rules.closeAchievedDecision({}, links, interps);
    expect(r.recommend).toBe(false);
    expect(r.blockers).toContain('latest PRIMARY admin is stale');
  });

  test('REGRESSION on any contributing link → blocked', () => {
    const links = [
      { measureId: 'a', linkType: 'PRIMARY', weight: 0.6, status: 'active' },
      { measureId: 'b', linkType: 'SECONDARY', weight: 0.4, status: 'active' },
    ];
    const interps = new Map([
      ['a', ctx()],
      ['b', ctx({ category: 'REGRESSION' })],
    ]);
    const r = rules.closeAchievedDecision({}, links, interps);
    expect(r.recommend).toBe(false);
    expect(r.blockers).toContain('open REGRESSION on a contributing link');
  });
});

describe('W235 — closeFailedDecision', () => {
  test('always carries MDT-review blocker', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', { category: 'REGRESSION', references: { historyCount: 8 } }]]);
    const r = rules.closeFailedDecision({}, links, interps, {
      daysAtFailing: 90,
      modifyAttempts: 2,
    });
    expect(r.blockers).toContain('MDT review required — cannot auto-close as failed');
  });

  test('with all clinical conditions + MDT blocker → recommend=true', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', { category: 'REGRESSION' }]]);
    const r = rules.closeFailedDecision({}, links, interps, {
      daysAtFailing: 90,
      modifyAttempts: 2,
    });
    expect(r.recommend).toBe(true); // ready but still gated by MDT
  });

  test('clinical conditions fail → recommend=false', () => {
    const links = [{ measureId: 'a', linkType: 'PRIMARY', weight: 1, status: 'active' }];
    const interps = new Map([['a', { category: 'STABLE' }]]); // 0.3 not <0.15
    const r = rules.closeFailedDecision({}, links, interps, {
      daysAtFailing: 90,
      modifyAttempts: 2,
    });
    expect(r.recommend).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Service — createLink
// ════════════════════════════════════════════════════════════════════════

describe('W235 — createLink', () => {
  test('creates link with snapshot fields + audit', async () => {
    const m = await seedMeasure();
    const goal = await seedGoal({});
    const linker = new mongoose.Types.ObjectId();
    const out = await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'evidence-based primary measure for balance',
      interventionRefs: ['PROGRAM_BERG_TRAINING'],
      actor: { userId: linker },
    });
    expect(out.linkIndex).toBe(0);
    expect(out.link.measureCode).toBe('BERG');
    expect(out.link.reviewIntervalDays).toBe(90);
    expect(out.link.nextLinkReviewAt).toBeTruthy();
    expect(String(out.link.linkedBy)).toBe(String(linker));
  });

  test('rationale < 10 chars rejected at service level', async () => {
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await expect(
      linkage.createLink({
        goalId: goal._id,
        objectiveIndex: 0,
        measureId: m._id,
        linkType: 'PRIMARY',
        linkRationale: 'too short',
        interventionRefs: ['x'],
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/≥ 10 chars/);
  });

  test('actor.userId required', async () => {
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await expect(
      linkage.createLink({
        goalId: goal._id,
        objectiveIndex: 0,
        measureId: m._id,
        linkType: 'PRIMARY',
        linkRationale: 'enough chars here for rationale',
        interventionRefs: ['x'],
      })
    ).rejects.toThrow(/actor\.userId required/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. Service — reviewLink SoD
// ════════════════════════════════════════════════════════════════════════

describe('W235 — reviewLink SoD', () => {
  async function setupGoalWithLink(linkerId) {
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'evidence-based primary measure',
      interventionRefs: ['PROGRAM_X'],
      actor: { userId: linkerId },
    });
    return goal;
  }

  test('first review by linker rejected', async () => {
    const linker = new mongoose.Types.ObjectId();
    const goal = await setupGoalWithLink(linker);
    await expect(
      linkage.reviewLink({
        goalId: goal._id,
        objectiveIndex: 0,
        linkIndex: 0,
        verdict: 'continue',
        actor: { userId: linker },
      })
    ).rejects.toThrow(/SoD/);
  });

  test('first review by different actor accepted', async () => {
    const linker = new mongoose.Types.ObjectId();
    const reviewer = new mongoose.Types.ObjectId();
    const goal = await setupGoalWithLink(linker);
    const out = await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'continue',
      notes: 'looks good',
      actor: { userId: reviewer },
    });
    expect(out.link.reviewHistory.length).toBe(1);
    expect(out.link.reviewHistory[0].verdict).toBe('continue');
    expect(String(out.link.lastReviewedBy)).toBe(String(reviewer));
  });

  test('second+ review by linker allowed (SoD applies only to first)', async () => {
    const linker = new mongoose.Types.ObjectId();
    const reviewer = new mongoose.Types.ObjectId();
    const goal = await setupGoalWithLink(linker);
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'continue',
      actor: { userId: reviewer },
    });
    // Now linker can review subsequently
    const out = await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'continue',
      actor: { userId: linker },
    });
    expect(out.link.reviewHistory.length).toBe(2);
  });

  test('continue verdict bumps nextLinkReviewAt forward', async () => {
    const linker = new mongoose.Types.ObjectId();
    const reviewer = new mongoose.Types.ObjectId();
    const goal = await setupGoalWithLink(linker);
    const before = (await TherapeuticGoal.findById(goal._id).lean()).objectives[0].measureLinks[0]
      .nextLinkReviewAt;
    await linkage.reviewLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      verdict: 'continue',
      actor: { userId: reviewer },
    });
    const after = (await TherapeuticGoal.findById(goal._id).lean()).objectives[0].measureLinks[0]
      .nextLinkReviewAt;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Service — unlinkLink SoD
// ════════════════════════════════════════════════════════════════════════

describe('W235 — unlinkLink', () => {
  test('SoD: unlinker ≠ linkedBy', async () => {
    const linker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    await expect(
      linkage.unlinkLink({
        goalId: goal._id,
        objectiveIndex: 0,
        linkIndex: 0,
        reason: 'measure deprecated',
        actor: { userId: linker },
      })
    ).rejects.toThrow(/SoD/);
  });

  test('reason required', async () => {
    const linker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    await expect(
      linkage.unlinkLink({
        goalId: goal._id,
        objectiveIndex: 0,
        linkIndex: 0,
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/unlink reason required/);
  });

  test('valid unlink succeeds + status=unlinked + audit', async () => {
    const linker = new mongoose.Types.ObjectId();
    const unlinker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    const out = await linkage.unlinkLink({
      goalId: goal._id,
      objectiveIndex: 0,
      linkIndex: 0,
      reason: 'measure deprecated 2026',
      actor: { userId: unlinker },
    });
    expect(out.link.status).toBe('unlinked');
    expect(out.link.unlinkReason).toBe('measure deprecated 2026');
    expect(out.link.weight).toBe(0);
    expect(String(out.link.unlinkedBy)).toBe(String(unlinker));
  });
});

// ════════════════════════════════════════════════════════════════════════
// 8. Service — read-side
// ════════════════════════════════════════════════════════════════════════

describe('W235 — read-side', () => {
  test('dueForReview returns links within window', async () => {
    const linker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    // Default nextLinkReviewAt = now + 90 days. Within 100-day window → yes.
    const items = await linkage.dueForReview({ withinDays: 100 });
    expect(items.length).toBe(1);
    expect(items[0].measureCode).toBe('BERG');
    // Within 30-day window → no.
    const none = await linkage.dueForReview({ withinDays: 30 });
    expect(none.length).toBe(0);
  });

  test('goalsForMeasure reverse lookup', async () => {
    const linker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goalA = await seedGoal({});
    const goalB = await seedGoal({});
    await linkage.createLink({
      goalId: goalA._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    await linkage.createLink({
      goalId: goalB._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    const rows = await linkage.goalsForMeasure({ measureId: m._id });
    expect(rows.length).toBe(2);
    expect(rows.map(r => r.linkType).sort()).toEqual(['PRIMARY', 'PRIMARY']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 9. Service — computeWeightedProgress
// ════════════════════════════════════════════════════════════════════════

describe('W235 — computeWeightedProgress', () => {
  test('with explicit interpretations bypasses interpreter', async () => {
    const linker = new mongoose.Types.ObjectId();
    const m = await seedMeasure();
    const goal = await seedGoal({});
    await linkage.createLink({
      goalId: goal._id,
      objectiveIndex: 0,
      measureId: m._id,
      linkType: 'PRIMARY',
      weight: 1,
      linkRationale: 'rationale long enough',
      interventionRefs: ['X'],
      actor: { userId: linker },
    });
    const interps = new Map([[String(m._id), { category: 'SLOW_PROGRESS' }]]);
    const out = await linkage.computeWeightedProgress({
      goalId: goal._id,
      interpretations: interps,
    });
    expect(out.objectives[0].score).toBe(0.6);
    expect(out.objectives[0].status).toBe('progressing');
  });
});
