'use strict';

/**
 * sleep-assessment-behavioral-wave1020.test.js — behavioral counterpart to
 * `sleep-assessment-wave1020.test.js` (static drift guard).
 * MongoMemoryServer-based: real documents, real .create()/.save(), asserts
 * Wave-18 invariants fire + virtuals compute + computeSleepSeverity bands
 * deterministically + round-trip persistence.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SleepAssessment;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1020-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  SleepAssessment = require('../models/SleepAssessment');
  await SleepAssessment.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SleepAssessment.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    tool: 'bears',
    problemSeverity: 'none',
    problemScore: 0,
    ...overrides,
  };
}

describe('W1020 behavioral — base save + enum gating', () => {
  it('SAVES a minimal no-problem draft', async () => {
    const doc = await SleepAssessment.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.problemSeverity).toBe('none');
  });

  it('REJECTS an invalid tool', async () => {
    await expect(SleepAssessment.create(baseDoc({ tool: 'astrology' }))).rejects.toThrow(/tool/);
  });

  it('REJECTS an invalid problemSeverity', async () => {
    await expect(
      SleepAssessment.create(baseDoc({ problemSeverity: 'apocalyptic' }))
    ).rejects.toThrow(/problemSeverity/);
  });
});

describe('W1020 behavioral — severity drives plan + review requirements', () => {
  it('REJECTS moderate severity with no intervention', async () => {
    await expect(
      SleepAssessment.create(baseDoc({ problemSeverity: 'moderate', problemScore: 4 }))
    ).rejects.toThrow(/sleepHygieneInterventions/);
  });

  it('REJECTS severe severity with no nextReviewDue', async () => {
    await expect(
      SleepAssessment.create(
        baseDoc({
          problemSeverity: 'severe',
          problemScore: 7,
          sleepHygieneInterventions: ['consistent_bedtime_routine'],
        })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES severe with a plan + review date', async () => {
    const doc = await SleepAssessment.create(
      baseDoc({
        problemSeverity: 'severe',
        problemScore: 7,
        sleepHygieneInterventions: ['consistent_bedtime_routine', 'melatonin_review'],
        nextReviewDue: new Date('2026-07-01'),
      })
    );
    expect(doc.isHighSeverity).toBe(true);
  });
});

describe('W1020 behavioral — OSA + referral gates', () => {
  it('REJECTS suspectedOSA with no referral', async () => {
    await expect(SleepAssessment.create(baseDoc({ suspectedOSA: true }))).rejects.toThrow(
      /referralMade/
    );
  });

  it('REJECTS referralMade with no referralTarget', async () => {
    await expect(SleepAssessment.create(baseDoc({ referralMade: true }))).rejects.toThrow(
      /referralTarget/
    );
  });

  it('SAVES suspectedOSA with an ENT referral', async () => {
    const doc = await SleepAssessment.create(
      baseDoc({ suspectedOSA: true, referralMade: true, referralTarget: 'ent' })
    );
    expect(doc.suspectedOSA).toBe(true);
    expect(doc.referralTarget).toBe('ent');
  });
});

describe('W1020 behavioral — finalize gating + date sanity', () => {
  it('REJECTS finalized with no finalizer', async () => {
    await expect(
      SleepAssessment.create(baseDoc({ status: 'finalized', finalizedAt: new Date() }))
    ).rejects.toThrow(/finalizedBy/);
  });

  it('REJECTS nextReviewDue earlier than date', async () => {
    await expect(
      SleepAssessment.create(
        baseDoc({ nextReviewDue: new Date('2026-05-01'), date: new Date('2026-06-01') })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES a finalized assessment with finalizer + time', async () => {
    const doc = await SleepAssessment.create(
      baseDoc({
        status: 'finalized',
        finalizedByName: 'د. منى',
        finalizedAt: new Date('2026-06-01T09:00:00Z'),
      })
    );
    expect(doc.status).toBe('finalized');
  });
});

describe('W1020 behavioral — computeSleepSeverity banding', () => {
  it('scores 0 → none', () => {
    expect(SleepAssessment.computeSleepSeverity({})).toEqual({ score: 0, level: 'none' });
  });

  it('one flag → mild', () => {
    expect(SleepAssessment.computeSleepSeverity({ bedtimeResistance: true })).toEqual({
      score: 1,
      level: 'mild',
    });
  });

  it('three flags → moderate', () => {
    const r = SleepAssessment.computeSleepSeverity({
      bedtimeResistance: true,
      sleepOnsetDelay: true,
      frequentNightWakings: true,
    });
    expect(r).toEqual({ score: 3, level: 'moderate' });
  });

  it('quantitative thresholds each add a point', () => {
    const r = SleepAssessment.computeSleepSeverity({
      sleepOnsetLatencyMinutes: 45, // >30 → +1
      nightWakingsPerNight: 3, // >=2 → +1
      totalSleepHours: 5, // <7 → +1
    });
    expect(r.score).toBe(3);
    expect(r.level).toBe('moderate');
  });

  it('six factors → severe', () => {
    const r = SleepAssessment.computeSleepSeverity({
      bedtimeResistance: true,
      sleepOnsetDelay: true,
      frequentNightWakings: true,
      earlyMorningWaking: true,
      daytimeSleepiness: true,
      snoring: true,
    });
    expect(r.score).toBe(6);
    expect(r.level).toBe('severe');
  });
});

describe('W1020 behavioral — virtuals + round-trip persistence', () => {
  it('isReassessmentOverdue true for finalized + past due', async () => {
    const doc = await SleepAssessment.create(
      baseDoc({
        date: new Date('2019-12-01'),
        problemSeverity: 'severe',
        problemScore: 7,
        sleepHygieneInterventions: ['consistent_bedtime_routine'],
        nextReviewDue: new Date('2020-01-01'),
        status: 'finalized',
        finalizedByName: 'د. منى',
        finalizedAt: new Date('2019-12-01'),
      })
    );
    const reloaded = await SleepAssessment.findById(doc._id);
    expect(reloaded.isReassessmentOverdue).toBe(true);
  });

  it('round-trips factor inputs + computed result', async () => {
    const factors = {
      sleepOnsetLatencyMinutes: 45,
      nightWakingsPerNight: 3,
      totalSleepHours: 5,
      bedtimeResistance: true,
      daytimeSleepiness: true,
    };
    const computed = SleepAssessment.computeSleepSeverity(factors);
    const doc = await SleepAssessment.create(
      baseDoc({
        ...factors,
        problemScore: computed.score,
        problemSeverity: computed.level,
        sleepHygieneInterventions: ['consistent_bedtime_routine', 'sleep_diary'],
        nextReviewDue: new Date('2026-07-01'),
      })
    );
    const reloaded = await SleepAssessment.findById(doc._id).lean();
    expect(reloaded.sleepOnsetLatencyMinutes).toBe(45);
    expect(reloaded.bedtimeResistance).toBe(true);
    expect(reloaded.problemScore).toBe(computed.score);
    expect(reloaded.problemSeverity).toBe(computed.level);
  });
});
