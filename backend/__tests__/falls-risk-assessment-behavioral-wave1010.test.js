'use strict';

/**
 * falls-risk-assessment-behavioral-wave1010.test.js — behavioral
 * counterpart to `falls-risk-assessment-wave1010.test.js` (static drift
 * guard). MongoMemoryServer-based: instantiates real documents, calls
 * .create()/.save(), and asserts Wave-18 invariants actually fire +
 * virtuals compute on persisted docs + computeRisk scores deterministically.
 *
 * Validates:
 *   - tool / riskLevel enum gating
 *   - riskLevel=high ⇒ ≥1 preventionInterventions AND nextReviewDue
 *   - assessmentType=post_fall ⇒ lastFallDate
 *   - (historyOfFalling | numberOfFallsLast6Months>0) ⇒ lastFallDate
 *   - status=finalized ⇒ finalizedBy(name) + finalizedAt
 *   - nextReviewDue ≥ date
 *   - computeRisk banding (low / moderate / high) is exact
 *   - isHighRisk + isReassessmentOverdue virtuals
 *   - round-trip persistence of factor inputs + result
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FallsRiskAssessment;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1010-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  FallsRiskAssessment = require('../models/FallsRiskAssessment');
  await FallsRiskAssessment.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await FallsRiskAssessment.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    tool: 'morse',
    riskLevel: 'low',
    riskScore: 0,
    ...overrides,
  };
}

describe('W1010 behavioral — base save + enum gating', () => {
  it('SAVES a minimal low-risk draft', async () => {
    const doc = await FallsRiskAssessment.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.riskLevel).toBe('low');
    expect(doc.assessmentType).toBe('initial');
  });

  it('REJECTS an invalid tool', async () => {
    await expect(FallsRiskAssessment.create(baseDoc({ tool: 'made_up' }))).rejects.toThrow(/tool/);
  });

  it('REJECTS an invalid riskLevel', async () => {
    await expect(
      FallsRiskAssessment.create(baseDoc({ riskLevel: 'catastrophic' }))
    ).rejects.toThrow(/riskLevel/);
  });
});

describe('W1010 behavioral — high-risk requires a plan + review', () => {
  it('REJECTS high risk with no prevention intervention', async () => {
    await expect(
      FallsRiskAssessment.create(
        baseDoc({ riskLevel: 'high', riskScore: 60, nextReviewDue: new Date('2026-07-01') })
      )
    ).rejects.toThrow(/preventionInterventions/);
  });

  it('REJECTS high risk with no nextReviewDue', async () => {
    await expect(
      FallsRiskAssessment.create(
        baseDoc({
          riskLevel: 'high',
          riskScore: 60,
          preventionInterventions: ['supervision_increase'],
        })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES high risk with a plan + review date', async () => {
    const doc = await FallsRiskAssessment.create(
      baseDoc({
        riskLevel: 'high',
        riskScore: 60,
        preventionInterventions: ['supervision_increase', 'bed_chair_alarm'],
        nextReviewDue: new Date('2026-07-01'),
      })
    );
    expect(doc.isHighRisk).toBe(true);
    expect(doc.preventionInterventions).toHaveLength(2);
  });
});

describe('W1010 behavioral — fall history + post-fall require lastFallDate', () => {
  it('REJECTS post_fall with no lastFallDate', async () => {
    await expect(
      FallsRiskAssessment.create(baseDoc({ assessmentType: 'post_fall' }))
    ).rejects.toThrow(/lastFallDate/);
  });

  it('REJECTS historyOfFalling with no lastFallDate', async () => {
    await expect(FallsRiskAssessment.create(baseDoc({ historyOfFalling: true }))).rejects.toThrow(
      /lastFallDate/
    );
  });

  it('REJECTS numberOfFallsLast6Months>0 with no lastFallDate', async () => {
    await expect(
      FallsRiskAssessment.create(baseDoc({ numberOfFallsLast6Months: 3 }))
    ).rejects.toThrow(/lastFallDate/);
  });

  it('SAVES post_fall when lastFallDate present', async () => {
    const doc = await FallsRiskAssessment.create(
      baseDoc({ assessmentType: 'post_fall', lastFallDate: new Date('2026-05-30') })
    );
    expect(doc.assessmentType).toBe('post_fall');
  });
});

describe('W1010 behavioral — finalize gating + date sanity', () => {
  it('REJECTS finalized with no finalizer', async () => {
    await expect(
      FallsRiskAssessment.create(baseDoc({ status: 'finalized', finalizedAt: new Date() }))
    ).rejects.toThrow(/finalizedBy/);
  });

  it('REJECTS finalized with no finalizedAt', async () => {
    await expect(
      FallsRiskAssessment.create(baseDoc({ status: 'finalized', finalizedByName: 'د. سارة' }))
    ).rejects.toThrow(/finalizedAt/);
  });

  it('REJECTS nextReviewDue earlier than date', async () => {
    await expect(
      FallsRiskAssessment.create(
        baseDoc({ nextReviewDue: new Date('2026-05-01'), date: new Date('2026-06-01') })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES a finalized assessment with finalizer + time', async () => {
    const doc = await FallsRiskAssessment.create(
      baseDoc({
        status: 'finalized',
        finalizedByName: 'د. سارة',
        finalizedAt: new Date('2026-06-01T09:00:00Z'),
      })
    );
    expect(doc.status).toBe('finalized');
  });
});

describe('W1010 behavioral — computeRisk banding is exact', () => {
  it('scores 0 → low for a no-factor screen', () => {
    expect(FallsRiskAssessment.computeRisk({})).toEqual({ score: 0, level: 'low' });
  });

  it('scores history-of-falling alone = 25 → moderate (band starts at 25)', () => {
    expect(FallsRiskAssessment.computeRisk({ historyOfFalling: true })).toEqual({
      score: 25,
      level: 'moderate',
    });
  });

  it('scores a stacked high-risk profile ≥ 50 → high', () => {
    const r = FallsRiskAssessment.computeRisk({
      historyOfFalling: true, // 25
      gaitBalanceImpairment: 'severe', // 30
    });
    expect(r.score).toBe(55);
    expect(r.level).toBe('high');
  });

  it('furniture-surfing weights 30 (Morse high-risk marker)', () => {
    expect(FallsRiskAssessment.computeRisk({ mobilityAid: 'furniture_surfing' }).score).toBe(30);
  });
});

describe('W1010 behavioral — virtuals + round-trip persistence', () => {
  it('isReassessmentOverdue true for finalized + past due', async () => {
    // Past-dated assessment whose review date has already lapsed — the
    // sweeper-target case. date < nextReviewDue < now keeps the
    // nextReviewDue ≥ date invariant satisfied.
    const doc = await FallsRiskAssessment.create(
      baseDoc({
        date: new Date('2019-12-01'),
        riskLevel: 'high',
        riskScore: 60,
        preventionInterventions: ['supervision_increase'],
        nextReviewDue: new Date('2020-01-01'),
        status: 'finalized',
        finalizedByName: 'د. سارة',
        finalizedAt: new Date('2019-12-01'),
      })
    );
    const reloaded = await FallsRiskAssessment.findById(doc._id);
    expect(reloaded.isReassessmentOverdue).toBe(true);
  });

  it('isReassessmentOverdue false for a draft (never finalized)', async () => {
    const doc = await FallsRiskAssessment.create(
      baseDoc({ date: new Date('2019-12-01'), nextReviewDue: new Date('2020-01-01') })
    );
    expect(doc.isReassessmentOverdue).toBe(false);
  });

  it('round-trips factor inputs + computed result', async () => {
    const factors = {
      historyOfFalling: true,
      numberOfFallsLast6Months: 2,
      lastFallDate: new Date('2026-05-20'),
      gaitBalanceImpairment: 'moderate',
      mobilityAid: 'walker',
      visualImpairment: true,
      cognitiveBehavioralImpairment: true,
      highRiskMedication: true,
      continenceUrgency: true,
    };
    const computed = FallsRiskAssessment.computeRisk(factors);
    const doc = await FallsRiskAssessment.create(
      baseDoc({
        ...factors,
        riskScore: computed.score,
        riskLevel: computed.level,
        preventionInterventions: ['supervision_increase', 'physiotherapy_referral'],
        nextReviewDue: new Date('2026-07-01'),
      })
    );
    const reloaded = await FallsRiskAssessment.findById(doc._id).lean();
    expect(reloaded.mobilityAid).toBe('walker');
    expect(reloaded.visualImpairment).toBe(true);
    expect(reloaded.riskScore).toBe(computed.score);
    expect(reloaded.riskLevel).toBe(computed.level);
    expect(reloaded.numberOfFallsLast6Months).toBe(2);
  });
});
