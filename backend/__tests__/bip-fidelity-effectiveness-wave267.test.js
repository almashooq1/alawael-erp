'use strict';

/**
 * bip-fidelity-effectiveness-wave267.test.js — Wave 267.
 *
 * BIP fidelity + effectiveness tracking:
 *   - BipFidelityCheck model invariants + auto-status banding
 *   - BipEffectiveness model invariants + percentChangeFromBaseline
 *   - service: fidelity record + trend
 *   - service: effectiveness record + trend (with reduction-goal flip)
 *   - service: combined diagnosis (4-bucket matrix)
 *   - pure helpers _classifyTrend + _invertForReduction
 *   - route registration + _health
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BipFidelityCheck;
let BipEffectiveness;
let FBA;
let bip;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w267-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  BipFidelityCheck = require('../models/BipFidelityCheck');
  BipEffectiveness = require('../models/BipEffectiveness');
  FBA = require('../models/clinical-assessment/behavioral-function-assessment.model');
  bip = require('../services/bipFidelityEffectiveness.service');
  await BipFidelityCheck.init();
  await BipEffectiveness.init();
  await FBA.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await BipFidelityCheck.deleteMany({});
  await BipEffectiveness.deleteMany({});
  await FBA.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────
async function makeFba(overrides = {}) {
  return FBA.create({
    beneficiary: overrides.beneficiary || new mongoose.Types.ObjectId(),
    assessor: new mongoose.Types.ObjectId(),
    branch: overrides.branch || new mongoose.Types.ObjectId(),
    assessment_date: new Date('2026-01-01'),
    target_behavior: {
      name_ar: 'صراخ',
      operational_definition_ar: 'صراخ بصوت عالٍ يدوم > 5 ثوانٍ',
      measurement_method: 'frequency',
      baseline_data: {
        average_frequency: 12, // 12/day baseline
        data_collection_days: 5,
      },
    },
    status: 'bip_active',
    ...overrides,
  });
}

function makeCriteria(scores) {
  return scores.map((s, i) => ({
    criterion_ar: `معيار ${i + 1}`,
    score: s,
  }));
}

// ════════════════════════════════════════════════════════════════════
// Model invariants — BipFidelityCheck
// ════════════════════════════════════════════════════════════════════

describe('W267 — BipFidelityCheck model', () => {
  test('rejects checkedAt in the future', async () => {
    const doc = new BipFidelityCheck({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: makeCriteria([100]),
    });
    await expect(doc.save()).rejects.toThrow(/future/);
  });

  test('rejects empty criteria', async () => {
    const doc = new BipFidelityCheck({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: [],
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('auto-computes overallFidelityPercent + status passing', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: makeCriteria([100, 80, 90]),
    });
    expect(doc.overallFidelityPercent).toBe(90);
    expect(doc.status).toBe('passing');
  });

  test('auto-status concerning (60-79%)', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: makeCriteria([60, 70, 80]),
    });
    expect(doc.overallFidelityPercent).toBe(70);
    expect(doc.status).toBe('concerning');
  });

  test('auto-status failing (< 60%)', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: makeCriteria([40, 30, 60]),
    });
    expect(doc.overallFidelityPercent).toBeLessThan(60);
    expect(doc.status).toBe('failing');
    expect(doc.requiresSupervisorReview).toBe(true);
  });

  test('NA criteria excluded from denominator', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: [
        { criterion_ar: 'A', score: 100 },
        { criterion_ar: 'B', score: 80 },
        { criterion_ar: 'C', notApplicable: true }, // excluded
      ],
    });
    expect(doc.overallFidelityPercent).toBe(90); // (100+80)/2 not /3
  });

  test('all-NA → undefined fidelity + undefined status', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: [
        { criterion_ar: 'A', notApplicable: true },
        { criterion_ar: 'B', notApplicable: true },
      ],
    });
    expect(doc.overallFidelityPercent).toBeUndefined();
    expect(doc.status).toBeUndefined();
  });

  test('escalation barrier flags supervisor review even when passing', async () => {
    const doc = await BipFidelityCheck.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      checkedBy: new mongoose.Types.ObjectId(),
      criteria: makeCriteria([95, 90, 100]),
      barriers: ['staff_turnover'],
    });
    expect(doc.status).toBe('passing');
    expect(doc.requiresSupervisorReview).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
// Model invariants — BipEffectiveness
// ════════════════════════════════════════════════════════════════════

describe('W267 — BipEffectiveness model', () => {
  test('rejects measuredAt in the future', async () => {
    const doc = new BipEffectiveness({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      measuredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      measuredBy: new mongoose.Types.ObjectId(),
      target: { frequency: 5 },
    });
    await expect(doc.save()).rejects.toThrow(/future/);
  });

  test('rejects reading with no target measurement', async () => {
    const doc = new BipEffectiveness({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      measuredBy: new mongoose.Types.ObjectId(),
      target: {},
    });
    await expect(doc.save()).rejects.toThrow(/at least one/);
  });

  test('auto-computes rate from frequency + observationHours', async () => {
    const doc = await BipEffectiveness.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      measuredBy: new mongoose.Types.ObjectId(),
      observationHours: 5,
      target: { frequency: 10 },
    });
    expect(doc.target.rate).toBe(2); // 10 / 5
  });

  test('percentChangeFromBaseline virtual works', async () => {
    const doc = await BipEffectiveness.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      measuredBy: new mongoose.Types.ObjectId(),
      target: { frequency: 6 },
      snapshot: {
        measurementMethod: 'frequency',
        baselineFrequency: 12, // halved → -50%
      },
    });
    expect(doc.percentChangeFromBaseline).toBe(-50);
  });

  test('percentChangeFromBaseline null when baseline missing', async () => {
    const doc = await BipEffectiveness.create({
      fbaAssessmentId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      measuredBy: new mongoose.Types.ObjectId(),
      target: { frequency: 6 },
    });
    expect(doc.percentChangeFromBaseline).toBe(null);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: fidelity
// ════════════════════════════════════════════════════════════════════

describe('W267 — service: fidelity', () => {
  const actor = new mongoose.Types.ObjectId();

  test('recordFidelityCheck denormalizes beneficiaryId from FBA', async () => {
    const fba = await makeFba();
    const check = await bip.recordFidelityCheck(
      {
        fbaAssessmentId: fba._id,
        criteria: makeCriteria([90, 85, 95]),
      },
      actor
    );
    expect(String(check.beneficiaryId)).toBe(String(fba.beneficiary));
    expect(String(check.branchId)).toBe(String(fba.branch));
    expect(check.status).toBe('passing');
  });

  test('recordFidelityCheck rejects unknown FBA', async () => {
    await expect(
      bip.recordFidelityCheck(
        {
          fbaAssessmentId: new mongoose.Types.ObjectId(),
          criteria: makeCriteria([90]),
        },
        actor
      )
    ).rejects.toThrow(/not found/);
  });

  test('computeFidelityTrend reports direction across last N', async () => {
    const fba = await makeFba();
    // 4 checks, descending fidelity → "declining"
    for (const [i, score] of [95, 85, 65, 45].entries()) {
      await bip.recordFidelityCheck(
        {
          fbaAssessmentId: fba._id,
          checkedAt: new Date(`2026-0${i + 1}-15`),
          criteria: makeCriteria([score, score, score]),
        },
        actor
      );
    }
    const trend = await bip.computeFidelityTrend(fba._id, { lastN: 4 });
    expect(trend.rolling.length).toBe(4);
    expect(trend.direction).toBe('declining');
    expect(trend.sampleSize).toBe(4);
  });

  test('computeFidelityTrend returns insufficient_data with 1 check', async () => {
    const fba = await makeFba();
    await bip.recordFidelityCheck(
      { fbaAssessmentId: fba._id, criteria: makeCriteria([80]) },
      actor
    );
    const trend = await bip.computeFidelityTrend(fba._id);
    expect(trend.direction).toBe('insufficient_data');
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: effectiveness
// ════════════════════════════════════════════════════════════════════

describe('W267 — service: effectiveness', () => {
  const actor = new mongoose.Types.ObjectId();

  test('recordEffectivenessReading captures FBA baseline snapshot', async () => {
    const fba = await makeFba();
    const reading = await bip.recordEffectivenessReading(
      {
        fbaAssessmentId: fba._id,
        target: { frequency: 6 },
      },
      actor
    );
    expect(reading.snapshot.baselineFrequency).toBe(12);
    expect(reading.snapshot.measurementMethod).toBe('frequency');
  });

  test('computeEffectivenessTrend INVERTS direction for reduction-goal context', async () => {
    const fba = await makeFba();
    // Target frequency declining 12 → 10 → 6 → 3 = IMPROVING outcome
    for (const [i, freq] of [12, 10, 6, 3].entries()) {
      await bip.recordEffectivenessReading(
        {
          fbaAssessmentId: fba._id,
          measuredAt: new Date(`2026-0${i + 1}-15`),
          target: { frequency: freq },
        },
        actor
      );
    }
    const trend = await bip.computeEffectivenessTrend(fba._id, { lastN: 4 });
    // Raw _classifyTrend sees DECLINING; inverted to IMPROVING for reduction goal.
    expect(trend.direction).toBe('improving');
    expect(trend.baselinePercentChange).toBeLessThan(0); // declined from baseline
  });

  test('computeEffectivenessTrend declining outcome when frequency rising', async () => {
    const fba = await makeFba();
    for (const [i, freq] of [3, 6, 10, 12].entries()) {
      await bip.recordEffectivenessReading(
        {
          fbaAssessmentId: fba._id,
          measuredAt: new Date(`2026-0${i + 1}-15`),
          target: { frequency: freq },
        },
        actor
      );
    }
    const trend = await bip.computeEffectivenessTrend(fba._id, { lastN: 4 });
    expect(trend.direction).toBe('declining'); // bad — behavior increasing
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: cross-cutting + at-risk
// ════════════════════════════════════════════════════════════════════

describe('W267 — service: at-risk + diagnosis', () => {
  const actor = new mongoose.Types.ObjectId();

  test('listAtRiskBips returns only failing fidelity', async () => {
    const branch = new mongoose.Types.ObjectId();
    const fba1 = await makeFba({ branch });
    const fba2 = await makeFba({ branch });
    await bip.recordFidelityCheck(
      { fbaAssessmentId: fba1._id, criteria: makeCriteria([95, 90]) },
      actor
    );
    await bip.recordFidelityCheck(
      { fbaAssessmentId: fba2._id, criteria: makeCriteria([30, 40]) },
      actor
    );
    const out = await bip.listAtRiskBips({ branchId: branch });
    expect(out.total).toBe(1);
    expect(String(out.items[0].fbaAssessmentId)).toBe(String(fba2._id));
  });
});

// ════════════════════════════════════════════════════════════════════
// Pure helpers
// ════════════════════════════════════════════════════════════════════

describe('W267 — pure helpers', () => {
  test('_classifyTrend insufficient_data with < 2 values', () => {
    expect(bip._classifyTrend([])).toBe('insufficient_data');
    expect(bip._classifyTrend([50])).toBe('insufficient_data');
  });

  test('_classifyTrend improving when later mean exceeds earlier by > minDelta', () => {
    expect(bip._classifyTrend([50, 60, 80, 90])).toBe('improving');
  });

  test('_classifyTrend declining when later mean below earlier', () => {
    expect(bip._classifyTrend([90, 80, 60, 50])).toBe('declining');
  });

  test('_classifyTrend stable when delta below threshold', () => {
    expect(bip._classifyTrend([70, 72, 71, 73])).toBe('stable');
  });

  test('_invertForReduction flips improving/declining only', () => {
    expect(bip._invertForReduction('improving')).toBe('declining');
    expect(bip._invertForReduction('declining')).toBe('improving');
    expect(bip._invertForReduction('stable')).toBe('stable');
    expect(bip._invertForReduction('insufficient_data')).toBe('insufficient_data');
  });

  test('_diagnoseBip four-bucket matrix', () => {
    const passing = { status: 'passing' };
    const failing = { status: 'failing' };
    const improving = { direction: 'improving' };
    const declining = { direction: 'declining' };

    expect(bip._diagnoseBip(passing, improving)).toBe('working');
    expect(bip._diagnoseBip(passing, declining)).toBe('hypothesis_likely_wrong');
    expect(bip._diagnoseBip(failing, declining)).toBe('implementation_problem');
    expect(bip._diagnoseBip(failing, improving)).toBe('misleading_signal');
  });

  test('_diagnoseBip returns insufficient_data on missing inputs', () => {
    expect(bip._diagnoseBip(null, { direction: 'improving' })).toBe('insufficient_data');
    expect(bip._diagnoseBip({ status: 'passing' }, null)).toBe('insufficient_data');
    expect(bip._diagnoseBip({ status: 'passing' }, { direction: 'insufficient_data' })).toBe(
      'insufficient_data'
    );
  });
});

// ════════════════════════════════════════════════════════════════════
// Route registration
// ════════════════════════════════════════════════════════════════════

describe('W267 — bip-tracking.routes registration', () => {
  test('expected endpoints registered', () => {
    jest.isolateModules(() => {
      const router = require('../routes/bip-tracking.routes');
      const paths = router.stack
        .filter(layer => layer.route)
        .map(layer => {
          const method = Object.keys(layer.route.methods)[0];
          return `${method.toUpperCase()} ${layer.route.path}`;
        });
      expect(paths).toContain('GET /_health');
      expect(paths).toContain('POST /fidelity');
      expect(paths).toContain('GET /fidelity/fba/:fbaAssessmentId');
      expect(paths).toContain('GET /fidelity/fba/:fbaAssessmentId/trend');
      expect(paths).toContain('POST /effectiveness');
      expect(paths).toContain('GET /effectiveness/fba/:fbaAssessmentId');
      expect(paths).toContain('GET /effectiveness/fba/:fbaAssessmentId/trend');
      expect(paths).toContain('GET /at-risk');
      expect(paths).toContain('GET /diagnosis/fba/:fbaAssessmentId');
    });
  });

  test('_health endpoint reports wave + endpoint count', () => {
    jest.isolateModules(() => {
      const router = require('../routes/bip-tracking.routes');
      const layer = router.stack.find(
        l => l.route && l.route.path === '/_health' && l.route.methods.get
      );
      const handler = layer.route.stack[layer.route.stack.length - 1].handle;
      const res = {};
      res.json = jest.fn(body => {
        res._body = body;
      });
      handler({}, res);
      expect(res._body.data.wave).toBe('W267');
      expect(res._body.data.endpoints).toBeGreaterThanOrEqual(9);
      expect(res._body.data.services.some(s => /W267/.test(s))).toBe(true);
    });
  });
});
