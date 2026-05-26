'use strict';

/**
 * financial-navigation-behavioral-wave469.test.js — behavioral counterpart to
 * the static drift guard `financial-navigation-wave469.test.js`.
 *
 * W469 — FinancialNavigationPlan + intelligence/benefits-navigator.lib (per-
 * family financial profile → Saudi benefits suggestions + financialStressLikert
 * → feeds W467 WBCI financialStressInverse component).
 *
 * The model has a legacy `pre('save', function(next))` that:
 *   1. Translates banded incomeBand → midpoint $ and computes stress via lib
 *   2. Translates stress → financialWellbeing 0-100 via WBCI lib
 *   3. Suggests programs from profile via lib, preserving applicationStatus
 *      on already-listed programs (idempotent refresh)
 *
 * Per CLAUDE.md doctrine — 20× application across W356-W469.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Plan;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w469-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Plan = require('../models/FinancialNavigationPlan');
  await Plan.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Plan.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function basePlan(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    createdBy: oid(),
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W469 behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Plan({ ...basePlan(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Plan({ ...basePlan(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without createdBy', async () => {
    const p = new Plan({ ...basePlan(), createdBy: undefined });
    await expect(p.save()).rejects.toThrow(/createdBy/);
  });

  it('SAVES with all required + defaults populate', async () => {
    const doc = await Plan.create(basePlan());
    expect(doc.status).toBe('active');
    expect(doc.suggestedPrograms).toEqual([]);
  });
});

// ─── 2. Uniqueness ─────────────────────────────────────────────────────

describe('W469 behavioral — beneficiaryId uniqueness', () => {
  it('REJECTS 2nd plan for same beneficiary (E11000)', async () => {
    const benId = oid();
    await Plan.create(basePlan({ beneficiaryId: benId }));
    await expect(Plan.create(basePlan({ beneficiaryId: benId }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });
});

// ─── 3. Enum + range validation ───────────────────────────────────────

describe('W469 behavioral — enums', () => {
  for (const valid of ['draft', 'active', 'on_hold', 'completed', 'archived']) {
    it(`SAVES with status='${valid}'`, async () => {
      const doc = await Plan.create(basePlan({ beneficiaryId: oid(), status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  for (const valid of [
    'under_5k',
    '5_to_10k',
    '10_to_20k',
    '20_to_40k',
    'over_40k',
    'undisclosed',
  ]) {
    it(`SAVES with budget.incomeBand='${valid}'`, async () => {
      const doc = await Plan.create(
        basePlan({ beneficiaryId: oid(), budget: { incomeBand: valid } })
      );
      expect(doc.budget.incomeBand).toBe(valid);
    });
  }

  it('REJECTS invalid incomeBand', async () => {
    const p = new Plan(basePlan({ budget: { incomeBand: 'invalid_band' } }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W469 behavioral — budget range bounds', () => {
  it('REJECTS expenseRatio > 5', async () => {
    const p = new Plan(basePlan({ budget: { expenseRatio: 6 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS disabilityCostsRatio > 2', async () => {
    const p = new Plan(basePlan({ budget: { disabilityCostsRatio: 3 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS savingsMonths > 24', async () => {
    const p = new Plan(basePlan({ budget: { savingsMonths: 36 } }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS savingsMonths < 0', async () => {
    const p = new Plan(basePlan({ budget: { savingsMonths: -2 } }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W469 behavioral — suggestedPrograms subdoc enums', () => {
  it('REJECTS invalid authority enum', async () => {
    const p = new Plan(
      basePlan({
        suggestedPrograms: [
          { programCode: 'TEST', authority: 'fake_authority', applicationStatus: 'not_started' },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid applicationStatus', async () => {
    const p = new Plan(
      basePlan({
        suggestedPrograms: [
          { programCode: 'TEST', authority: 'hrsd', applicationStatus: 'flying' },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS relevanceScore > 10', async () => {
    const p = new Plan(
      basePlan({
        suggestedPrograms: [{ programCode: 'X', relevanceScore: 11 }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Pre-save auto-compute financialStress + wellbeing ─────────────

describe('W469 behavioral — pre-save financial stress + wellbeing translation', () => {
  it('budget with under_5k income + expenseRatio=1 → high stress (high Likert)', async () => {
    const doc = await Plan.create(
      basePlan({
        budget: { incomeBand: 'under_5k', expenseRatio: 1.0, savingsMonths: 0 },
      })
    );
    expect(doc.financialStressLikert).toBeGreaterThanOrEqual(4);
    expect(doc.financialWellbeing).toBeLessThanOrEqual(40);
  });

  it('budget with 20_to_40k income + expenseRatio=0.5 + 6mo savings → low stress', async () => {
    const doc = await Plan.create(
      basePlan({
        budget: { incomeBand: '20_to_40k', expenseRatio: 0.5, savingsMonths: 6 },
      })
    );
    expect(doc.financialStressLikert).toBeLessThanOrEqual(2);
    expect(doc.financialWellbeing).toBeGreaterThanOrEqual(60);
  });

  it('financialStressLikert clamped to 1-5', async () => {
    const doc = await Plan.create(
      basePlan({
        budget: {
          incomeBand: 'under_5k',
          expenseRatio: 2.0, // catastrophic — burden >= 1 +2 step
          disabilityCostsRatio: 1.0, // >= 0.3 +1 step
          savingsMonths: 0,
        },
      })
    );
    expect(doc.financialStressLikert).toBeGreaterThanOrEqual(1);
    expect(doc.financialStressLikert).toBeLessThanOrEqual(5);
  });

  it('no budget data → no stress computation (leaves fields undefined)', async () => {
    const doc = await Plan.create(basePlan());
    expect(doc.financialStressLikert).toBeUndefined();
    expect(doc.financialWellbeing).toBeUndefined();
  });

  it('incomeBand=undisclosed → no compute (lib midpoint returns null)', async () => {
    const doc = await Plan.create(
      basePlan({ budget: { incomeBand: 'undisclosed', expenseRatio: 0.5, savingsMonths: 3 } })
    );
    expect(doc.financialStressLikert).toBeUndefined();
  });
});

// ─── 5. Pre-save suggested-programs auto-populate ─────────────────────

describe('W469 behavioral — suggestedPrograms auto-populate from profile', () => {
  it('profile with hasDisabilityCard + isSaudiCitizen → at least 1 suggested program', async () => {
    const doc = await Plan.create(
      basePlan({
        profile: {
          hasDisabilityCard: true,
          isSaudiCitizen: true,
          lowIncomeHousehold: true,
        },
      })
    );
    expect(doc.suggestedPrograms.length).toBeGreaterThan(0);
    expect(doc.suggestedPrograms.every(p => p.applicationStatus === 'not_started')).toBe(true);
  });

  it('PRESERVES applicationStatus on already-listed programs across re-save', async () => {
    const doc = await Plan.create(
      basePlan({
        profile: { hasDisabilityCard: true, isSaudiCitizen: true, lowIncomeHousehold: true },
      })
    );

    if (doc.suggestedPrograms.length === 0) {
      // No programs matched the profile — skip this assertion contextually
      return;
    }

    // Mark the first suggested program as submitted
    const firstCode = doc.suggestedPrograms[0].programCode;
    doc.suggestedPrograms[0].applicationStatus = 'submitted';
    doc.suggestedPrograms[0].appliedAt = new Date('2026-05-01T00:00:00Z');
    await doc.save();

    // Re-trigger pre-save by toggling profile + re-saving
    doc.profile.employedCaregiver = true;
    await doc.save();

    const reloadedFirst = doc.suggestedPrograms.find(p => p.programCode === firstCode);
    expect(reloadedFirst).toBeDefined();
    expect(reloadedFirst.applicationStatus).toBe('submitted');
    expect(reloadedFirst.appliedAt).toBeInstanceOf(Date);
  });
});

// ─── 6. Indexes + collection ──────────────────────────────────────────

describe('W469 behavioral — indexes', () => {
  it('beneficiaryId UNIQUE index', async () => {
    const indexes = await Plan.collection.indexes();
    const benIdx = indexes.find(i => Object.keys(i.key).join('+') === 'beneficiaryId');
    expect(benIdx).toBeDefined();
    expect(benIdx.unique).toBe(true);
  });

  it('declares compound branchId+status + beneficiaryId+status', async () => {
    const indexes = await Plan.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('beneficiaryId+status');
  });

  it('uses canonical collection name financial_navigation_plans', () => {
    expect(Plan.collection.collectionName).toBe('financial_navigation_plans');
  });
});
