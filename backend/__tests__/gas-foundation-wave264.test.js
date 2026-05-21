'use strict';

/**
 * gas-foundation-wave264.test.js — Wave 264.
 *
 * Goal Attainment Scaling (GAS) foundation:
 *   - GasScale + GasScoring model invariants
 *   - service: scale lifecycle (create/supersede/archive)
 *   - service: scoring lifecycle (record/supersede/list)
 *   - service: T-score analytics (individual + beneficiary composite)
 *   - pure T-score formula correctness on Kiresuk-textbook cases
 *   - route registration + _health
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let GasScale;
let GasScoring;
let gas;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w264-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  GasScale = require('../models/GasScale');
  GasScoring = require('../models/GasScoring');
  gas = require('../services/gas.service');
  await GasScale.init();
  await GasScoring.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await GasScale.deleteMany({});
  await GasScoring.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────
function fiveLevels() {
  return [
    { level: -2, description_ar: 'تراجع كبير عن خط الأساس' },
    { level: -1, description_ar: 'لم يتغير عن خط الأساس' },
    { level: 0, description_ar: 'حقق الهدف المتوقع' },
    { level: 1, description_ar: 'تجاوز التوقعات قليلاً' },
    { level: 2, description_ar: 'تجاوز التوقعات بشكل ملحوظ' },
  ];
}

function makeScalePayload(overrides = {}) {
  return {
    goalId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    title_ar: 'المشي 10 أمتار بدون مساعدة',
    domain: 'motor',
    levels: fiveLevels(),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════
// Model invariants
// ════════════════════════════════════════════════════════════════════

describe('W264 — GasScale model', () => {
  test('requires exactly 5 levels covering -2..+2', async () => {
    const fourLevels = fiveLevels().slice(0, 4);
    const doc = new GasScale({
      ...makeScalePayload(),
      levels: fourLevels,
      createdBy: new mongoose.Types.ObjectId(),
    });
    await expect(doc.save()).rejects.toThrow(/exactly one entry/);
  });

  test('rejects duplicate level entries', async () => {
    const levels = fiveLevels();
    levels[0].level = 0; // now two zeros
    const doc = new GasScale({
      ...makeScalePayload({ levels }),
      createdBy: new mongoose.Types.ObjectId(),
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('rejects baselineLevel >= expectedOutcomeLevel', async () => {
    const doc = new GasScale({
      ...makeScalePayload(),
      baselineLevel: 0,
      expectedOutcomeLevel: 0,
      createdBy: new mongoose.Types.ObjectId(),
    });
    await expect(doc.save()).rejects.toThrow(/strictly greater/);
  });

  test('sorts levels predictably on save (-2 first)', async () => {
    const reversed = fiveLevels().reverse();
    const doc = await GasScale.create({
      ...makeScalePayload({ levels: reversed }),
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(doc.levels.map(l => l.level)).toEqual([-2, -1, 0, 1, 2]);
  });

  test('partial unique index — one active scale per goal', async () => {
    const goalId = new mongoose.Types.ObjectId();
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GasScale.create({
      ...makeScalePayload({ goalId, beneficiaryId }),
      createdBy: new mongoose.Types.ObjectId(),
    });
    await expect(
      GasScale.create({
        ...makeScalePayload({ goalId, beneficiaryId }),
        createdBy: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  test('allows multiple superseded versions for same goal', async () => {
    const goalId = new mongoose.Types.ObjectId();
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GasScale.create({
      ...makeScalePayload({ goalId, beneficiaryId }),
      status: 'superseded',
      createdBy: new mongoose.Types.ObjectId(),
    });
    await GasScale.create({
      ...makeScalePayload({ goalId, beneficiaryId }),
      status: 'superseded',
      createdBy: new mongoose.Types.ObjectId(),
    });
    // Should not throw — both are superseded, partial index lets it pass.
    const count = await GasScale.countDocuments({ goalId });
    expect(count).toBe(2);
  });

  test('LEVELS static is exported', () => {
    expect(GasScale.LEVELS).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe('W264 — GasScoring model', () => {
  test('rejects scoredAt in the future', async () => {
    const doc = new GasScoring({
      scaleId: new mongoose.Types.ObjectId(),
      goalId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      achievedLevel: 0,
      scoredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scoredBy: new mongoose.Types.ObjectId(),
      snapshot: {
        scaleVersion: 1,
        weight: 1,
        expectedOutcomeLevel: 0,
        baselineLevel: -1,
      },
    });
    await expect(doc.save()).rejects.toThrow(/future/);
  });

  test('rejects invalid achievedLevel', async () => {
    const doc = new GasScoring({
      scaleId: new mongoose.Types.ObjectId(),
      goalId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      achievedLevel: 3, // out of range
      scoredBy: new mongoose.Types.ObjectId(),
      snapshot: {
        scaleVersion: 1,
        weight: 1,
        expectedOutcomeLevel: 0,
        baselineLevel: -1,
      },
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('metExpected virtual returns true when achieved >= expected', async () => {
    const doc = await GasScoring.create({
      scaleId: new mongoose.Types.ObjectId(),
      goalId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      achievedLevel: 1,
      scoredBy: new mongoose.Types.ObjectId(),
      snapshot: {
        scaleVersion: 1,
        weight: 1,
        expectedOutcomeLevel: 0,
        baselineLevel: -1,
      },
    });
    expect(doc.metExpected).toBe(true);
  });

  test('metExpected virtual returns false when achieved < expected', async () => {
    const doc = await GasScoring.create({
      scaleId: new mongoose.Types.ObjectId(),
      goalId: new mongoose.Types.ObjectId(),
      beneficiaryId: new mongoose.Types.ObjectId(),
      achievedLevel: -1,
      scoredBy: new mongoose.Types.ObjectId(),
      snapshot: {
        scaleVersion: 1,
        weight: 1,
        expectedOutcomeLevel: 0,
        baselineLevel: -1,
      },
    });
    expect(doc.metExpected).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: scale lifecycle
// ════════════════════════════════════════════════════════════════════

describe('W264 — gas.service scale lifecycle', () => {
  const actor = new mongoose.Types.ObjectId();

  test('createScale sets version=1 and active status', async () => {
    const scale = await gas.createScale(makeScalePayload(), actor);
    expect(scale.version).toBe(1);
    expect(scale.status).toBe('active');
    expect(String(scale.createdBy)).toBe(String(actor));
  });

  test('createScale rejects duplicate active per goal', async () => {
    const goalId = new mongoose.Types.ObjectId();
    await gas.createScale(makeScalePayload({ goalId }), actor);
    await expect(gas.createScale(makeScalePayload({ goalId }), actor)).rejects.toThrow(
      /already exists/
    );
  });

  test('supersedeScale marks old as superseded + creates v2 active', async () => {
    const v1 = await gas.createScale(makeScalePayload(), actor);
    const v2 = await gas.supersedeScale(
      v1._id,
      { title_ar: 'مراجعة: المشي 15 متر' },
      'توسعة الهدف بعد التقدم في الأسابيع الأولى',
      actor
    );
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('active');
    expect(String(v2.supersedes)).toBe(String(v1._id));
    const refreshed = await GasScale.findById(v1._id).lean();
    expect(refreshed.status).toBe('superseded');
  });

  test('supersedeScale rejects without reason', async () => {
    const v1 = await gas.createScale(makeScalePayload(), actor);
    await expect(gas.supersedeScale(v1._id, { title_ar: 'x' }, '', actor)).rejects.toThrow(
      /supersedeReason_ar/
    );
  });

  test('archiveScale sets archivedAt + archiveReason', async () => {
    const v1 = await gas.createScale(makeScalePayload(), actor);
    const archived = await gas.archiveScale(v1._id, 'تم تحقيق الهدف نهائياً', actor);
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBeTruthy();
    expect(archived.archiveReason_ar).toContain('تحقيق');
  });

  test('listVersions returns all versions sorted ascending', async () => {
    const v1 = await gas.createScale(makeScalePayload(), actor);
    await gas.supersedeScale(v1._id, {}, 'مراجعة 1', actor);
    const versions = await gas.listVersions(v1.goalId);
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe(1);
    expect(versions[1].version).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: scoring lifecycle
// ════════════════════════════════════════════════════════════════════

describe('W264 — gas.service scoring lifecycle', () => {
  const actor = new mongoose.Types.ObjectId();
  let scale;

  beforeEach(async () => {
    scale = await gas.createScale(makeScalePayload(), actor);
  });

  test('recordScoring captures snapshot fields', async () => {
    const sc = await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: 0, evidence_ar: 'مشى 10م مع طلب توجيه واحد' },
      actor
    );
    expect(sc.achievedLevel).toBe(0);
    expect(sc.snapshot.scaleVersion).toBe(1);
    expect(sc.snapshot.weight).toBe(scale.weight);
    expect(sc.snapshot.expectedOutcomeLevel).toBe(0);
    expect(sc.snapshot.baselineLevel).toBe(-1);
    expect(sc.snapshot.levelDescription_ar).toContain('الهدف المتوقع');
  });

  test('recordScoring rejects unknown scale', async () => {
    await expect(
      gas.recordScoring({ scaleId: new mongoose.Types.ObjectId(), achievedLevel: 0 }, actor)
    ).rejects.toThrow(/not found/);
  });

  test('recordScoring rejects against archived scale', async () => {
    await gas.archiveScale(scale._id, 'إنهاء الخدمة', actor);
    await expect(
      gas.recordScoring({ scaleId: scale._id, achievedLevel: 0 }, actor)
    ).rejects.toThrow(/archived/);
  });

  test('supersedeScoring creates new active + marks old superseded', async () => {
    const v1 = await gas.recordScoring({ scaleId: scale._id, achievedLevel: -1 }, actor);
    const v2 = await gas.supersedeScoring(
      v1._id,
      { achievedLevel: 0 },
      'تصحيح: لم تُحسب محاولات الجلسة الثانية',
      actor
    );
    expect(v2.achievedLevel).toBe(0);
    const refreshedOld = await GasScoring.findById(v1._id).lean();
    expect(refreshedOld.status).toBe('superseded');
    expect(String(refreshedOld.supersededBy)).toBe(String(v2._id));
  });

  test('listScoringsByGoal sorts ascending by scoredAt', async () => {
    await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: -2, scoredAt: '2026-01-01' },
      actor
    );
    await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: 0, scoredAt: '2026-03-01' },
      actor
    );
    await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: 1, scoredAt: '2026-02-01' },
      actor
    );
    const out = await gas.listScoringsByGoal(scale.goalId);
    expect(out.items.map(s => s.achievedLevel)).toEqual([-2, 1, 0]);
  });

  test('listScoringsByGoal excludes superseded by default', async () => {
    const v1 = await gas.recordScoring({ scaleId: scale._id, achievedLevel: -1 }, actor);
    await gas.supersedeScoring(v1._id, { achievedLevel: 0 }, 'تصحيح', actor);
    const out = await gas.listScoringsByGoal(scale.goalId);
    expect(out.items.length).toBe(1);
    expect(out.items[0].achievedLevel).toBe(0);
    const withSuperseded = await gas.listScoringsByGoal(scale.goalId, {
      includeSuperseded: true,
    });
    expect(withSuperseded.items.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════
// Pure T-score formula (Kiresuk reference cases)
// ════════════════════════════════════════════════════════════════════

describe('W264 — gas.service pure T-score formula', () => {
  test('all goals achieved at expected (x=0) → T=50', () => {
    const items = [
      { x: 0, w: 1 },
      { x: 0, w: 1 },
      { x: 0, w: 1 },
    ];
    expect(gas._tScore(items, 0.3)).toBe(50);
  });

  test('single goal at +1 with weight 1, rho=0.3', () => {
    // T = 50 + (10*1) / sqrt(0.7*1 + 0.3*1) = 50 + 10 = 60
    expect(gas._tScore([{ x: 1, w: 1 }], 0.3)).toBeCloseTo(60.0, 2);
  });

  test('single goal at -2 with weight 1, rho=0.3', () => {
    // T = 50 + (10*-2) / sqrt(0.7 + 0.3) = 50 - 20 = 30
    expect(gas._tScore([{ x: -2, w: 1 }], 0.3)).toBeCloseTo(30.0, 2);
  });

  test('three goals all at +1, equal weights → T > 50, increases with N', () => {
    // T = 50 + 30 / sqrt(0.7*3 + 0.3*9) = 50 + 30/sqrt(4.8) ≈ 63.69
    const t = gas._tScore(
      [
        { x: 1, w: 1 },
        { x: 1, w: 1 },
        { x: 1, w: 1 },
      ],
      0.3
    );
    expect(t).toBeCloseTo(63.69, 1);
  });

  test('mixed +1 and -1 cancel → T = 50', () => {
    const t = gas._tScore(
      [
        { x: 1, w: 1 },
        { x: -1, w: 1 },
        { x: 1, w: 1 },
        { x: -1, w: 1 },
      ],
      0.3
    );
    expect(t).toBe(50);
  });

  test('higher weight goal dominates composite', () => {
    // One goal with weight 5 at +1 + one goal weight 1 at -2.
    const tHighWeight = gas._tScore(
      [
        { x: 1, w: 5 },
        { x: -2, w: 1 },
      ],
      0.3
    );
    // The weight-5 goal pulls T well above 50 even though one goal is -2.
    expect(tHighWeight).toBeGreaterThan(50);
  });

  test('empty items returns null', () => {
    expect(gas._tScore([], 0.3)).toBe(null);
  });

  test('rho=0 (independent goals) yields larger spread than rho=0.5', () => {
    const items = [
      { x: 1, w: 1 },
      { x: 1, w: 1 },
      { x: 1, w: 1 },
    ];
    const tRho0 = gas._tScore(items, 0);
    const tRho05 = gas._tScore(items, 0.5);
    expect(tRho0).toBeGreaterThan(tRho05);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: analytics endpoints (uses DB)
// ════════════════════════════════════════════════════════════════════

describe('W264 — gas.service analytics', () => {
  const actor = new mongoose.Types.ObjectId();

  test('computeIndividualTScore returns null when no scoring exists', async () => {
    const scale = await gas.createScale(makeScalePayload(), actor);
    const t = await gas.computeIndividualTScore(scale._id);
    expect(t).toBe(null);
  });

  test('computeIndividualTScore reflects latest scoring', async () => {
    const scale = await gas.createScale(makeScalePayload(), actor);
    await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: -1, scoredAt: '2026-01-01' },
      actor
    );
    await gas.recordScoring(
      { scaleId: scale._id, achievedLevel: 1, scoredAt: '2026-03-01' },
      actor
    );
    const t = await gas.computeIndividualTScore(scale._id);
    expect(t).toBeCloseTo(60, 1); // latest = +1 → T = 60
  });

  test('computeBeneficiaryComposite aggregates across active scales', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s1 = await gas.createScale(makeScalePayload({ beneficiaryId }), actor);
    const s2 = await gas.createScale(makeScalePayload({ beneficiaryId }), actor);
    await gas.recordScoring({ scaleId: s1._id, achievedLevel: 1 }, actor);
    await gas.recordScoring({ scaleId: s2._id, achievedLevel: -1 }, actor);
    const out = await gas.computeBeneficiaryComposite(beneficiaryId);
    expect(out.tScore).toBe(50); // +1 and -1 cancel
    expect(out.totals.contributing).toBe(2);
    expect(out.totals.missing).toBe(0);
  });

  test('computeBeneficiaryComposite excludes unscored scales from formula but reports missing', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s1 = await gas.createScale(makeScalePayload({ beneficiaryId }), actor);
    await gas.createScale(makeScalePayload({ beneficiaryId }), actor);
    await gas.recordScoring({ scaleId: s1._id, achievedLevel: 1 }, actor);
    const out = await gas.computeBeneficiaryComposite(beneficiaryId);
    expect(out.totals.contributing).toBe(1);
    expect(out.totals.missing).toBe(1);
    expect(out.tScore).toBeCloseTo(60, 1);
  });

  test('computeBeneficiaryComposite returns null tScore when no active scales', async () => {
    const out = await gas.computeBeneficiaryComposite(new mongoose.Types.ObjectId());
    expect(out.tScore).toBe(null);
    expect(out.contributingScales).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════
// Route registration + _health
// ════════════════════════════════════════════════════════════════════

describe('W264 — gas.routes registration', () => {
  test('expected endpoints are registered', () => {
    jest.isolateModules(() => {
      const router = require('../routes/gas.routes');
      const paths = router.stack
        .filter(layer => layer.route)
        .map(layer => {
          const method = Object.keys(layer.route.methods)[0];
          return `${method.toUpperCase()} ${layer.route.path}`;
        });
      expect(paths).toContain('GET /_health');
      expect(paths).toContain('GET /scale/goal/:goalId');
      expect(paths).toContain('GET /scale/goal/:goalId/versions');
      expect(paths).toContain('POST /scale');
      expect(paths).toContain('POST /scale/:id/supersede');
      expect(paths).toContain('PATCH /scale/:id/archive');
      expect(paths).toContain('POST /scoring');
      expect(paths).toContain('POST /scoring/:id/supersede');
      expect(paths).toContain('GET /scoring/goal/:goalId');
      expect(paths).toContain('GET /scoring/beneficiary/:beneficiaryId');
      expect(paths).toContain('GET /tscore/scale/:scaleId');
      expect(paths).toContain('GET /tscore/beneficiary/:beneficiaryId');
    });
  });

  test('_health endpoint returns wave + endpoint count', () => {
    jest.isolateModules(() => {
      const router = require('../routes/gas.routes');
      const layer = router.stack.find(
        l => l.route && l.route.path === '/_health' && l.route.methods.get
      );
      const handler = layer.route.stack[layer.route.stack.length - 1].handle;
      const res = {};
      res.json = jest.fn(body => {
        res._body = body;
      });
      handler({}, res);
      expect(res._body.data.wave).toBe('W264');
      expect(res._body.data.endpoints).toBeGreaterThanOrEqual(13);
      expect(res._body.data.services.some(s => /W264/.test(s))).toBe(true);
    });
  });
});
