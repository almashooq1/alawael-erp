'use strict';

/**
 * gas-snapshot-behavioral-wave455.test.js — behavioral counterpart to the
 * static-analysis drift guard `gas-snapshot-wave455.test.js`.
 *
 * The static guard checks SOURCE TEXT (regex matches against
 * models/GasScoreSnapshot.js + startup/gasSnapshotBootstrap.js + app.js wire)
 * but cannot catch behavioral bugs — e.g. an enum value typo that the
 * source-regex matches but the runtime schema rejects, a `min`/`max` range
 * that's declared in source but doesn't actually enforce, or a regex pattern
 * that's wrong vs. the docs' intent.
 *
 * Pairs the W356-W384 doctrine (CLAUDE.md): "Pair every static drift guard
 * with a behavioral counterpart" — now 13× across W356-W458.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/gas-snapshot-behavioral-wave455.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let GasScoreSnapshot;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w455-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  // GasScoreSnapshot has no legacy `pre('save', function(next))` hooks but we
  // load the shim anyway for safety (cheap + future-proof if hooks are added).
  require('../config/mongoose.plugins');
  GasScoreSnapshot = require('../models/GasScoreSnapshot');
  await GasScoreSnapshot.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await GasScoreSnapshot.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseSnapshot(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    snapshotDate: new Date(),
    tScore: 50,
    goalCount: 3,
    totalWeight: 3,
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W455 behavioral — required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new GasScoreSnapshot({
      branchId: oid(),
      snapshotDate: new Date(),
      tScore: 50,
      goalCount: 3,
      totalWeight: 3,
    });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new GasScoreSnapshot({
      beneficiaryId: oid(),
      snapshotDate: new Date(),
      tScore: 50,
      goalCount: 3,
      totalWeight: 3,
    });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without snapshotDate', async () => {
    const p = new GasScoreSnapshot({
      beneficiaryId: oid(),
      branchId: oid(),
      tScore: 50,
      goalCount: 3,
      totalWeight: 3,
    });
    await expect(p.save()).rejects.toThrow(/snapshotDate/);
  });

  it('REJECTS without tScore', async () => {
    const p = new GasScoreSnapshot({
      beneficiaryId: oid(),
      branchId: oid(),
      snapshotDate: new Date(),
      goalCount: 3,
      totalWeight: 3,
    });
    await expect(p.save()).rejects.toThrow(/tScore/);
  });

  it('REJECTS without goalCount', async () => {
    const p = new GasScoreSnapshot({
      beneficiaryId: oid(),
      branchId: oid(),
      snapshotDate: new Date(),
      tScore: 50,
      totalWeight: 3,
    });
    await expect(p.save()).rejects.toThrow(/goalCount/);
  });

  it('REJECTS without totalWeight', async () => {
    const p = new GasScoreSnapshot({
      beneficiaryId: oid(),
      branchId: oid(),
      snapshotDate: new Date(),
      tScore: 50,
      goalCount: 3,
    });
    await expect(p.save()).rejects.toThrow(/totalWeight/);
  });

  it('SAVES with all required fields (defaults populate)', async () => {
    const doc = await GasScoreSnapshot.create(baseSnapshot());
    expect(doc.snapshotType).toBe('weekly');
    expect(doc.triggeredBy).toBe('cron');
    expect(doc.rhoUsed).toBe(0.3);
    expect(doc.calculationVersion).toBe('v1');
    expect(doc.goals).toEqual([]);
  });
});

// ─── 2. Enum validation ───────────────────────────────────────────────

describe('W455 behavioral — snapshotType enum', () => {
  for (const valid of ['session', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc']) {
    it(`SAVES with snapshotType='${valid}'`, async () => {
      const doc = await GasScoreSnapshot.create(baseSnapshot({ snapshotType: valid }));
      expect(doc.snapshotType).toBe(valid);
    });
  }

  it('REJECTS invalid snapshotType', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ snapshotType: 'fortnightly' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W455 behavioral — triggeredBy enum', () => {
  for (const valid of ['cron', 'manual', 'session', 'event']) {
    it(`SAVES with triggeredBy='${valid}'`, async () => {
      const doc = await GasScoreSnapshot.create(baseSnapshot({ triggeredBy: valid }));
      expect(doc.triggeredBy).toBe(valid);
    });
  }

  it('REJECTS invalid triggeredBy', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ triggeredBy: 'celestial-alignment' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Goals subdoc — achievedLevel + weight bounds ──────────────────

describe('W455 behavioral — goals[].achievedLevel bounds (±2)', () => {
  it('SAVES with achievedLevel=2 (max)', async () => {
    const doc = await GasScoreSnapshot.create(
      baseSnapshot({
        goals: [{ goalId: oid(), scaleId: oid(), achievedLevel: 2, weight: 1 }],
      })
    );
    expect(doc.goals[0].achievedLevel).toBe(2);
  });

  it('SAVES with achievedLevel=-2 (min)', async () => {
    const doc = await GasScoreSnapshot.create(
      baseSnapshot({
        goals: [{ goalId: oid(), scaleId: oid(), achievedLevel: -2, weight: 1 }],
      })
    );
    expect(doc.goals[0].achievedLevel).toBe(-2);
  });

  it('REJECTS achievedLevel=3 (above max)', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: 3 }] }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS achievedLevel=-3 (below min)', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: -3 }] }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W455 behavioral — goals[].weight bounds (1-3)', () => {
  it('defaults weight to 1', async () => {
    const doc = await GasScoreSnapshot.create(
      baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: 0 }] })
    );
    expect(doc.goals[0].weight).toBe(1);
  });

  it('SAVES with weight=3 (max)', async () => {
    const doc = await GasScoreSnapshot.create(
      baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: 0, weight: 3 }] })
    );
    expect(doc.goals[0].weight).toBe(3);
  });

  it('REJECTS weight=4 (above max)', async () => {
    const p = new GasScoreSnapshot(
      baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: 0, weight: 4 }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS weight=0 (below min)', async () => {
    const p = new GasScoreSnapshot(
      baseSnapshot({ goals: [{ goalId: oid(), achievedLevel: 0, weight: 0 }] })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. icfCode regex pattern `^[bsde]\d+$` ───────────────────────────

describe('W455 behavioral — goals[].icfCode regex', () => {
  for (const valid of ['b730', 's730', 'd550', 'e310', 'b1', 'd99999']) {
    it(`SAVES with icfCode='${valid}'`, async () => {
      const doc = await GasScoreSnapshot.create(
        baseSnapshot({
          goals: [{ goalId: oid(), achievedLevel: 0, weight: 1, icfCode: valid }],
        })
      );
      expect(doc.goals[0].icfCode).toBe(valid);
    });
  }

  for (const invalid of ['x730', 'B730', 'd-550', 'd', '730']) {
    it(`REJECTS icfCode='${invalid}'`, async () => {
      const p = new GasScoreSnapshot(
        baseSnapshot({
          goals: [{ goalId: oid(), achievedLevel: 0, weight: 1, icfCode: invalid }],
        })
      );
      await expect(p.save()).rejects.toThrow();
    });
  }
});

// ─── 5. Range bounds for top-level numeric fields ─────────────────────

describe('W455 behavioral — top-level numeric bounds', () => {
  it('REJECTS goalCount < 0', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ goalCount: -1 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS totalWeight < 0', async () => {
    const p = new GasScoreSnapshot(baseSnapshot({ totalWeight: -0.5 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with goalCount=0 + totalWeight=0 (empty snapshot)', async () => {
    const doc = await GasScoreSnapshot.create(baseSnapshot({ goalCount: 0, totalWeight: 0 }));
    expect(doc.goalCount).toBe(0);
  });
});

// ─── 6. Indexes ───────────────────────────────────────────────────────

describe('W455 behavioral — indexes', () => {
  it('declares the 3 documented compound indexes', async () => {
    const indexes = await GasScoreSnapshot.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+snapshotDate');
    expect(keys).toContain('branchId+snapshotDate+snapshotType');
    expect(keys).toContain('episodeOfCareId+snapshotDate');
  });

  it('declares per-field indexes for the 4 inline `index: true` fields', async () => {
    const indexes = await GasScoreSnapshot.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId');
    expect(keys).toContain('branchId');
    expect(keys).toContain('episodeOfCareId');
    expect(keys).toContain('snapshotDate');
  });

  it('uses canonical collection name gas_score_snapshots', () => {
    expect(GasScoreSnapshot.collection.collectionName).toBe('gas_score_snapshots');
  });
});

// ─── 7. End-to-end weekly snapshot scenario ───────────────────────────

describe('W455 behavioral — weekly snapshot end-to-end persistence', () => {
  it('records a 3-goal snapshot with full attribution + reloads correctly', async () => {
    const benId = oid();
    const branchId = oid();
    const episodeId = oid();

    const doc = await GasScoreSnapshot.create({
      beneficiaryId: benId,
      branchId,
      episodeOfCareId: episodeId,
      snapshotDate: new Date('2026-05-22T03:00:00Z'),
      snapshotType: 'weekly',
      tScore: 53.2,
      ci95Lower: 48.1,
      ci95Upper: 58.3,
      goalCount: 3,
      totalWeight: 5, // 2 + 2 + 1
      goals: [
        { goalId: oid(), scaleId: oid(), achievedLevel: 1, weight: 2, icfCode: 'd550' },
        { goalId: oid(), scaleId: oid(), achievedLevel: 0, weight: 2, icfCode: 'b730' },
        { goalId: oid(), scaleId: oid(), achievedLevel: 2, weight: 1, icfCode: 'e310' },
      ],
      triggeredBy: 'cron',
      notes: 'Weekly Friday snapshot batch 2026-W21',
    });

    const reloaded = await GasScoreSnapshot.findById(doc._id);
    expect(reloaded.tScore).toBe(53.2);
    expect(reloaded.ci95Lower).toBe(48.1);
    expect(reloaded.goals).toHaveLength(3);
    expect(reloaded.goals[0].icfCode).toBe('d550');
    expect(reloaded.totalWeight).toBe(5);
    expect(reloaded.triggeredBy).toBe('cron');
  });
});
