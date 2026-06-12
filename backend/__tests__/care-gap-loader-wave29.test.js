/**
 * care-gap-loader-wave29.test.js — Wave 29.
 *
 *   1. Factory returns null when Beneficiary model is missing
 *   2. Loader returns empty when no active beneficiaries
 *   3. Loader assembles per-beneficiary ctx (plan + goals + vaccinations)
 *   4. Goal `updatedAt` is mapped to `lastProgressAt` for the generator
 *   5. SmartGoal status='active' is normalized to 'in-progress'
 *   6. Vaccination filter: scheduled + administeredAt=null + dueDate IN PAST
 *      (we leave dueDate filtering to the generator — loader passes raw)
 *   7. tenureDays computed from enrollmentDate / registrationDate
 *   8. Query failures are caught — loader returns empty rather than throwing
 *   9. End-to-end: ctx survives the generator's evaluate() + survives the
 *      Insight schema's G-validators
 *  10. Boot registry: real loader replaces stub when models are present;
 *      stub remains when models are absent (loader factory returns null)
 */

'use strict';

// Opt out of global mongoose mock (jest.setup.js:19) — required so
// new Model(...) returns a real constructor. See insight-foundation-wave18.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { createCareGapLoader } = require('../intelligence/loaders/care-gap.loader');
const { buildLoaders } = require('../intelligence/orchestrator-loaders.registry');
const careGapGenerator = require('../intelligence/generators/care-gap.generator');

const insightModelExports = require('../intelligence/insight.model');
const Insight =
  mongoose.models.Insight || mongoose.model('Insight', insightModelExports.InsightSchema);

// ─── Mongoose chainable-thenable stubs ─────────────────────────

function modelFromRows(rows) {
  // `.find().select().limit().lean()` chain → Promise<rows>
  // also supports `.find().select().lean()` without .limit
  function chain(out) {
    return {
      select: () => chain(out),
      limit: () => chain(out),
      lean: () => Promise.resolve(out),
    };
  }
  return { find: () => chain(rows) };
}

function modelThatThrows(message) {
  return {
    find: () => {
      throw new Error(message);
    },
  };
}

// ─── 1-2. Factory + empty case ─────────────────────────────────

describe('care-gap.loader — factory', () => {
  test('returns null when Beneficiary model is missing', () => {
    const loader = createCareGapLoader({ logger: { warn: () => {} } });
    expect(loader).toBeNull();
  });

  test('returns a loader function when Beneficiary is provided', () => {
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([]),
    });
    expect(typeof loader).toBe('function');
  });

  test('loader returns empty ctx when no active beneficiaries', async () => {
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([]),
    });
    const ctx = await loader();
    expect(ctx.beneficiaries).toEqual([]);
    expect(ctx.now).toBeInstanceOf(Date);
  });
});

// ─── 3-7. Assembly + mapping ───────────────────────────────────

describe('care-gap.loader — ctx assembly', () => {
  const fixedNow = new Date('2026-05-17T10:00:00Z');
  const benId1 = new mongoose.Types.ObjectId();
  const benId2 = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  function buildLoader({
    beneficiaries,
    carePlans = [],
    smartGoals = [],
    therapeuticGoals = [],
    vaccinations = [],
  } = {}) {
    return createCareGapLoader({
      Beneficiary: modelFromRows(beneficiaries),
      CarePlan: modelFromRows(carePlans),
      SmartGoal: modelFromRows(smartGoals),
      TherapeuticGoal: modelFromRows(therapeuticGoals),
      Vaccination: modelFromRows(vaccinations),
      now: () => fixedNow,
    });
  }

  test('attaches care plan + goals + vaccinations per beneficiary', async () => {
    const loader = buildLoader({
      beneficiaries: [
        {
          _id: benId1,
          branchId,
          fileNumber: 'F-001',
          name: 'Ahmed',
          enrollmentDate: new Date('2025-05-17T10:00:00Z'),
        },
        {
          _id: benId2,
          branchId,
          fileNumber: 'F-002',
          name: 'Sara',
        },
      ],
      carePlans: [
        {
          _id: 'cp-1',
          beneficiary: benId1,
          reviewDate: new Date('2026-04-01'),
          startDate: new Date('2025-12-01'),
        },
      ],
      smartGoals: [
        {
          _id: 'g-1',
          beneficiary: benId1,
          status: 'active',
          updatedAt: new Date('2026-03-01'),
        },
        {
          _id: 'g-2',
          beneficiary: benId1,
          status: 'active',
          updatedAt: new Date('2026-05-15'),
        },
        {
          _id: 'g-3',
          beneficiary: benId2,
          status: 'active',
          updatedAt: new Date('2026-05-16'),
        },
      ],
      vaccinations: [
        {
          _id: 'v-1',
          beneficiaryId: benId1,
          dueDate: new Date('2026-04-01'),
          vaccineName: 'MMR',
        },
      ],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries).toHaveLength(2);

    const a = ctx.beneficiaries.find(b => String(b._id) === String(benId1));
    expect(a.activeCarePlan._id).toBe('cp-1');
    expect(a.activeGoals).toHaveLength(2);
    expect(a.dueVaccinations).toHaveLength(1);
    expect(a.dueVaccinations[0].vaccineName).toBe('MMR');

    const b = ctx.beneficiaries.find(x => String(x._id) === String(benId2));
    expect(b.activeCarePlan).toBeNull();
    expect(b.activeGoals).toHaveLength(1);
    expect(b.dueVaccinations).toHaveLength(0);
  });

  // W1243 — care-gap stalled detection now reads the canonical TherapeuticGoal
  // (the model the UI writes), not only the deprecated/empty SmartGoal.
  test('attaches TherapeuticGoal (in_progress) into activeGoals, merged with SmartGoals', async () => {
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId }],
      smartGoals: [
        { _id: 'sg-1', beneficiary: benId1, status: 'active', updatedAt: new Date('2026-03-01') },
      ],
      therapeuticGoals: [
        {
          _id: 'tg-1',
          beneficiaryId: benId1,
          status: 'in_progress',
          updatedAt: new Date('2026-02-01'),
        },
        {
          _id: 'tg-2',
          beneficiaryId: benId1,
          status: 'in_progress',
          updatedAt: new Date('2026-05-10'),
        },
      ],
    });
    const ctx = await loader();
    const a = ctx.beneficiaries.find(x => String(x._id) === String(benId1));
    // 1 SmartGoal + 2 TherapeuticGoals all merged into activeGoals
    expect(a.activeGoals).toHaveLength(3);
    const tg1 = a.activeGoals.find(g => String(g._id) === 'tg-1');
    expect(tg1).toBeTruthy();
    expect(tg1.status).toBe('in-progress'); // normalized for the stalled generator
    expect(tg1.lastProgressAt).toEqual(new Date('2026-02-01')); // updatedAt proxy
  });

  test('TherapeuticGoal query failure is non-fatal (SmartGoals still attach)', async () => {
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId1, branchId }]),
      SmartGoal: modelFromRows([
        { _id: 'sg-1', beneficiary: benId1, status: 'active', updatedAt: new Date('2026-03-01') },
      ]),
      TherapeuticGoal: modelThatThrows('tg boom'),
      now: () => fixedNow,
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    const a = ctx.beneficiaries.find(x => String(x._id) === String(benId1));
    expect(a.activeGoals).toHaveLength(1); // SmartGoal still there, TG failure swallowed
  });

  test('maps SmartGoal.status=active to in-progress (generator expects that name)', async () => {
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId }],
      smartGoals: [
        {
          _id: 'g-1',
          beneficiary: benId1,
          status: 'active',
          updatedAt: new Date('2026-03-01'),
        },
      ],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].activeGoals[0].status).toBe('in-progress');
  });

  test('maps SmartGoal.updatedAt to lastProgressAt', async () => {
    const updated = new Date('2026-03-15T10:00:00Z');
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId }],
      smartGoals: [{ _id: 'g-1', beneficiary: benId1, status: 'active', updatedAt: updated }],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].activeGoals[0].lastProgressAt).toEqual(updated);
  });

  test('picks the LATEST active care plan when multiple exist for one beneficiary', async () => {
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId }],
      carePlans: [
        {
          _id: 'cp-old',
          beneficiary: benId1,
          reviewDate: new Date('2025-12-01'),
          startDate: new Date('2025-09-01'),
        },
        {
          _id: 'cp-new',
          beneficiary: benId1,
          reviewDate: new Date('2026-04-01'),
          startDate: new Date('2026-01-01'),
        },
      ],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].activeCarePlan._id).toBe('cp-new');
  });

  test('computes tenureDays from enrollmentDate', async () => {
    const enroll = new Date('2026-04-17T10:00:00Z'); // ~30 days ago
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId, enrollmentDate: enroll }],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].tenureDays).toBe(30);
  });

  test('tenureDays = null when no enrollment date', async () => {
    const loader = buildLoader({
      beneficiaries: [{ _id: benId1, branchId }],
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].tenureDays).toBeNull();
  });

  test('passes stalledDays through to ctx.opts', async () => {
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId1, branchId }]),
      stalledDays: 21,
    });
    const ctx = await loader();
    expect(ctx.opts.stalledDays).toBe(21);
  });
});

// ─── 8. Resilience ────────────────────────────────────────────

describe('care-gap.loader — resilience', () => {
  test('Beneficiary query throw → empty ctx, no crash', async () => {
    const loader = createCareGapLoader({
      Beneficiary: modelThatThrows('mongo unavailable'),
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.beneficiaries).toEqual([]);
  });

  test('CarePlan query throw → loader still returns beneficiaries (with no plans)', async () => {
    const benId = new mongoose.Types.ObjectId();
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId }]),
      CarePlan: modelThatThrows('careplan down'),
      SmartGoal: modelFromRows([]),
      Vaccination: modelFromRows([]),
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.beneficiaries).toHaveLength(1);
    expect(ctx.beneficiaries[0].activeCarePlan).toBeNull();
  });

  test('SmartGoal throw → loader still returns beneficiaries (with empty goals)', async () => {
    const benId = new mongoose.Types.ObjectId();
    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId }]),
      CarePlan: modelFromRows([]),
      SmartGoal: modelThatThrows('goals down'),
      Vaccination: modelFromRows([]),
      logger: { warn: () => {} },
    });
    const ctx = await loader();
    expect(ctx.beneficiaries[0].activeGoals).toEqual([]);
  });
});

// ─── 9. End-to-end: loader → generator → schema ───────────────

describe('care-gap.loader — integration with generator + Insight schema', () => {
  test('loader output → generator emits → insight passes G-validators', async () => {
    const benId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T10:00:00Z');
    const stalledLong = new Date('2026-03-01T10:00:00Z'); // > 30d ago

    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId, branchId, fileNumber: 'F-001', name: 'Ahmed' }]),
      CarePlan: modelFromRows([
        {
          _id: 'cp-1',
          beneficiary: benId,
          reviewDate: new Date('2026-04-01'), // overdue
          startDate: new Date('2025-12-01'),
        },
      ]),
      SmartGoal: modelFromRows([
        { _id: 'g-1', beneficiary: benId, status: 'active', updatedAt: stalledLong },
      ]),
      Vaccination: modelFromRows([
        { _id: 'v-1', beneficiaryId: benId, dueDate: new Date('2026-04-01') },
      ]),
      now: () => fixedNow,
    });

    const ctx = await loader();
    const payloads = await careGapGenerator.evaluate(ctx);
    expect(payloads).toHaveLength(1);

    // 3 gaps detected (plan-review-overdue + goals-stalled + vaccinations-overdue)
    expect(payloads[0].reasoning.supportingFacts).toHaveLength(3);

    // Survives the Insight schema's 5 G-guarantees
    const doc = new Insight(payloads[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('clean beneficiary (no gaps) → generator emits zero payloads', async () => {
    const benId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const fixedNow = new Date('2026-05-17T10:00:00Z');

    const loader = createCareGapLoader({
      Beneficiary: modelFromRows([{ _id: benId, branchId }]),
      CarePlan: modelFromRows([
        // Future reviewDate — no gap
        {
          _id: 'cp-1',
          beneficiary: benId,
          reviewDate: new Date('2026-07-01'),
          startDate: new Date('2026-01-01'),
        },
      ]),
      SmartGoal: modelFromRows([
        // Recent updatedAt — not stalled
        {
          _id: 'g-1',
          beneficiary: benId,
          status: 'active',
          updatedAt: new Date('2026-05-15'),
        },
      ]),
      Vaccination: modelFromRows([]), // no overdue
      now: () => fixedNow,
    });

    const ctx = await loader();
    const payloads = await careGapGenerator.evaluate(ctx);
    expect(payloads).toEqual([]);
  });
});

// ─── 10. Boot registry: real vs. stub ─────────────────────────

describe('orchestrator-loaders — care-gap real vs stub', () => {
  test('Beneficiary model present → real loader replaces stub', async () => {
    const benId = new mongoose.Types.ObjectId();
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        models: {
          Beneficiary: modelFromRows([{ _id: benId, branchId: 'B-1' }]),
        },
      },
    });
    expect(stubbedGeneratorIds).not.toContain('care-gap.v1');
    const ctx = await loaders['care-gap.v1']();
    expect(ctx.beneficiaries).toHaveLength(1);
  });

  test('Beneficiary model absent → stub remains (zero beneficiaries)', async () => {
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {
        // models.Beneficiary intentionally missing
      },
    });
    expect(stubbedGeneratorIds).toContain('care-gap.v1');
    const ctx = await loaders['care-gap.v1']();
    expect(ctx.beneficiaries).toEqual([]);
  });

  test('caller-supplied realLoaders overrides both reference + stub', async () => {
    const customLoader = async () => ({ beneficiaries: [{ _id: 'custom' }] });
    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: {},
      realLoaders: { 'care-gap.v1': customLoader },
    });
    expect(stubbedGeneratorIds).not.toContain('care-gap.v1');
    expect(loaders['care-gap.v1']).toBe(customLoader);
  });
});
