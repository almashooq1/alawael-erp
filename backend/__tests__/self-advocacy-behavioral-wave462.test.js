'use strict';

/**
 * self-advocacy-behavioral-wave462.test.js — behavioral counterpart to the
 * static-analysis drift guard `self-advocacy-wave462.test.js`.
 *
 * W462 — SelfAdvocacyTrainingPlan model + intelligence/self-advocacy-curriculum.lib
 * (5-Rights curriculum tracks per Phase B Innovation 8). The model has a legacy
 * `pre('save', function(next))` hook that:
 *   1. Refreshes completionPercentage via lib.completionRate(track, completedCodes)
 *   2. Auto-finalizes status='active' → 'completed' when percentage hits 100
 *   3. Enforces skipReason when module.status='skipped'
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 16× application across W356-W462.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/self-advocacy-behavioral-wave462.test.js --runInBand
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w462-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Plan = require('../models/SelfAdvocacyTrainingPlan');
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
    track: 'track_primary',
    createdBy: oid(),
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W462 behavioral — required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Plan({ ...basePlan(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Plan({ ...basePlan(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without track', async () => {
    const p = new Plan({ ...basePlan(), track: undefined });
    await expect(p.save()).rejects.toThrow(/track/);
  });

  it('REJECTS without createdBy', async () => {
    const p = new Plan({ ...basePlan(), createdBy: undefined });
    await expect(p.save()).rejects.toThrow(/createdBy/);
  });

  it('SAVES with all required fields + defaults populate', async () => {
    const doc = await Plan.create(basePlan());
    expect(doc.status).toBe('active');
    expect(doc.modules).toEqual([]);
    expect(doc.completionPercentage).toBe(0);
    expect(doc.startedAt).toBeInstanceOf(Date);
  });
});

// ─── 2. Uniqueness — one plan per beneficiary ─────────────────────────

describe('W462 behavioral — beneficiaryId uniqueness', () => {
  it('REJECTS second plan for same beneficiaryId (E11000)', async () => {
    const benId = oid();
    await Plan.create(basePlan({ beneficiaryId: benId }));
    await expect(Plan.create(basePlan({ beneficiaryId: benId }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });
});

// ─── 3. Enum validation ───────────────────────────────────────────────

describe('W462 behavioral — track enum (4 values)', () => {
  for (const valid of ['track_early', 'track_primary', 'track_teen', 'track_adult']) {
    it(`SAVES with track='${valid}'`, async () => {
      const doc = await Plan.create(basePlan({ beneficiaryId: oid(), track: valid }));
      expect(doc.track).toBe(valid);
    });
  }

  it('REJECTS invalid track', async () => {
    const p = new Plan(basePlan({ track: 'track_legendary' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W462 behavioral — status enum (4 values)', () => {
  for (const valid of ['active', 'on_hold', 'completed', 'archived']) {
    it(`SAVES with status='${valid}'`, async () => {
      const doc = await Plan.create(basePlan({ beneficiaryId: oid(), status: valid }));
      expect(doc.status).toBe(valid);
    });
  }
});

describe('W462 behavioral — module subdoc enums', () => {
  it('REJECTS invalid rightCode', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'be_invisible', status: 'not_started' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid module status', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'consent', status: 'maybe_someday' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid deliveredByRole', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'consent', status: 'in_progress', deliveredByRole: 'celebrity' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with all 5 valid rightCodes', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'not_started' },
          { rightCode: 'consent', status: 'not_started' },
          { rightCode: 'refuse', status: 'not_started' },
          { rightCode: 'complain', status: 'not_started' },
          { rightCode: 'community', status: 'not_started' },
        ],
      })
    );
    expect(doc.modules).toHaveLength(5);
  });
});

// ─── 4. Wave-18: skipped requires skipReason ──────────────────────────

describe('W462 behavioral — skipped module requires skipReason', () => {
  it('REJECTS module status=skipped without skipReason', async () => {
    const p = new Plan(basePlan({ modules: [{ rightCode: 'community', status: 'skipped' }] }));
    await expect(p.save()).rejects.toThrow(/skipReason.*≥5 chars/);
  });

  it('REJECTS module status=skipped with too-short skipReason', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'community', status: 'skipped', skipReason: 'no' }],
      })
    );
    await expect(p.save()).rejects.toThrow(/skipReason.*≥5 chars/);
  });

  it('SAVES module status=skipped with valid skipReason', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          {
            rightCode: 'community',
            status: 'skipped',
            skipReason:
              'Beneficiary is housebound; community module deferred until home visits start',
          },
        ],
      })
    );
    expect(doc.modules[0].status).toBe('skipped');
  });

  it('does NOT enforce skipReason on non-skipped modules', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'not_started' },
          { rightCode: 'consent', status: 'in_progress' },
        ],
      })
    );
    expect(doc.modules).toHaveLength(2);
  });
});

// ─── 5. Wave-18: pre-save auto-computes completionPercentage ─────────

describe('W462 behavioral — completionPercentage auto-compute via lib', () => {
  it('computes 0% for empty modules[]', async () => {
    const doc = await Plan.create(basePlan({ modules: [] }));
    expect(doc.completionPercentage).toBe(0);
  });

  it('computes 20% with 1 of 5 modules completed', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'completed' },
          { rightCode: 'consent', status: 'not_started' },
        ],
      })
    );
    expect(doc.completionPercentage).toBe(20);
  });

  it('computes 60% with 3 of 5 modules completed', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'completed' },
          { rightCode: 'consent', status: 'completed' },
          { rightCode: 'refuse', status: 'completed' },
          { rightCode: 'complain', status: 'in_progress' },
        ],
      })
    );
    expect(doc.completionPercentage).toBe(60);
  });

  it('only counts status=completed (not in_progress)', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'in_progress' },
          { rightCode: 'consent', status: 'in_progress' },
        ],
      })
    );
    expect(doc.completionPercentage).toBe(0);
  });

  it('recomputes percentage on subsequent saves', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [{ rightCode: 'be_heard', status: 'completed' }],
      })
    );
    expect(doc.completionPercentage).toBe(20);
    doc.modules.push({ rightCode: 'consent', status: 'completed' });
    doc.modules.push({ rightCode: 'refuse', status: 'completed' });
    await doc.save();
    expect(doc.completionPercentage).toBe(60);
  });
});

// ─── 6. Wave-18: auto-finalize on 100% ──────────────────────────────

describe('W462 behavioral — auto-finalize when completionPercentage = 100', () => {
  it('flips status active → completed when all 5 modules completed', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [
          { rightCode: 'be_heard', status: 'completed' },
          { rightCode: 'consent', status: 'completed' },
          { rightCode: 'refuse', status: 'completed' },
          { rightCode: 'complain', status: 'completed' },
          { rightCode: 'community', status: 'completed' },
        ],
      })
    );
    expect(doc.completionPercentage).toBe(100);
    expect(doc.status).toBe('completed');
    expect(doc.completedAt).toBeInstanceOf(Date);
  });

  it('does NOT touch status=on_hold even at 100%', async () => {
    const doc = await Plan.create(
      basePlan({
        status: 'on_hold',
        modules: [
          { rightCode: 'be_heard', status: 'completed' },
          { rightCode: 'consent', status: 'completed' },
          { rightCode: 'refuse', status: 'completed' },
          { rightCode: 'complain', status: 'completed' },
          { rightCode: 'community', status: 'completed' },
        ],
      })
    );
    expect(doc.completionPercentage).toBe(100);
    expect(doc.status).toBe('on_hold');
  });

  it('honours pre-existing completedAt if set', async () => {
    const explicit = new Date('2026-04-01T12:00:00Z');
    const doc = await Plan.create(
      basePlan({
        completedAt: explicit,
        modules: [
          { rightCode: 'be_heard', status: 'completed' },
          { rightCode: 'consent', status: 'completed' },
          { rightCode: 'refuse', status: 'completed' },
          { rightCode: 'complain', status: 'completed' },
          { rightCode: 'community', status: 'completed' },
        ],
      })
    );
    expect(doc.completedAt.toISOString()).toBe(explicit.toISOString());
  });
});

// ─── 7. Module subdoc range bounds ────────────────────────────────────

describe('W462 behavioral — module sessionsRequired bounds (1-10)', () => {
  it('REJECTS sessionsRequired=11', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'consent', status: 'in_progress', sessionsRequired: 11 }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS sessionsRequired=0', async () => {
    const p = new Plan(
      basePlan({
        modules: [{ rightCode: 'consent', status: 'in_progress', sessionsRequired: 0 }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with sessionsRequired=10 (max)', async () => {
    const doc = await Plan.create(
      basePlan({
        modules: [{ rightCode: 'consent', status: 'in_progress', sessionsRequired: 10 }],
      })
    );
    expect(doc.modules[0].sessionsRequired).toBe(10);
  });
});

// ─── 8. Indexes ───────────────────────────────────────────────────────

describe('W462 behavioral — indexes', () => {
  it('beneficiaryId carries UNIQUE index', async () => {
    const indexes = await Plan.collection.indexes();
    const benIdx = indexes.find(i => Object.keys(i.key).join('+') === 'beneficiaryId');
    expect(benIdx).toBeDefined();
    expect(benIdx.unique).toBe(true);
  });

  it('declares compound branchId+status + beneficiaryId+status indexes', async () => {
    const indexes = await Plan.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('beneficiaryId+status');
  });

  it('uses canonical collection name self_advocacy_training_plans', () => {
    expect(Plan.collection.collectionName).toBe('self_advocacy_training_plans');
  });
});
