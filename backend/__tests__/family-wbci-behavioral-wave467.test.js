'use strict';

/**
 * family-wbci-behavioral-wave467.test.js — behavioral counterpart to the
 * static drift guard `family-wbci-wave467.test.js`.
 *
 * W467 — FamilyWellbeingSnapshot + intelligence/family-wbci.lib (5-component
 * Family Wellbeing Composite Index per Phase F Innovation 4). The model has a
 * legacy `pre('save', function(next))` that calls into the lib to:
 *   1. Compute wbci (0-100 weighted average over PRESENT components)
 *   2. Band the wbci (thriving/stable/monitor/at_risk/crisis/insufficient_data)
 *   3. Compute coverage / presentComponents / missingComponents counts
 *   4. Auto-populate triggeredActions based on wbci thresholds (<35 critical,
 *      <50 standard intervention)
 *
 * The static drift guard checks source text shape. This behavioral test
 * verifies the actual band thresholds + trigger generation + coverage math.
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 18× application across W356-W467.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/family-wbci-behavioral-wave467.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Snap;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w467-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Snap = require('../models/FamilyWellbeingSnapshot');
  await Snap.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Snap.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseSnap(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    components: {
      caregiverBurdenInverse: 80,
      siblingAdjustment: 75,
      financialStressInverse: 70,
      extendedFamilyEngagement: 60,
      familyCommunicationHealth: 85,
    },
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W467 behavioral — required fields + defaults', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Snap({ branchId: oid(), components: {} });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new Snap({ beneficiaryId: oid(), components: {} });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('SAVES with both refs + defaults populate', async () => {
    const doc = await Snap.create({ beneficiaryId: oid(), branchId: oid() });
    expect(doc.snapshotType).toBe('quarterly');
    expect(doc.snapshotDate).toBeInstanceOf(Date);
    expect(doc.band).toBe('insufficient_data'); // No components present
  });
});

// ─── 2. Enum validation ───────────────────────────────────────────────

describe('W467 behavioral — snapshotType enum (4 values)', () => {
  for (const valid of ['quarterly', 'event_triggered', 'manual', 'intake']) {
    it(`SAVES with snapshotType='${valid}'`, async () => {
      const doc = await Snap.create(baseSnap({ snapshotType: valid }));
      expect(doc.snapshotType).toBe(valid);
    });
  }

  it('REJECTS invalid snapshotType', async () => {
    const p = new Snap(baseSnap({ snapshotType: 'biennial' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W467 behavioral — capturedByRole enum', () => {
  for (const valid of [
    'family_counsellor',
    'social_worker',
    'case_manager',
    'system',
    'family_self_report',
  ]) {
    it(`SAVES with capturedByRole='${valid}'`, async () => {
      const doc = await Snap.create(baseSnap({ capturedByRole: valid }));
      expect(doc.capturedByRole).toBe(valid);
    });
  }

  it('REJECTS invalid capturedByRole', async () => {
    const p = new Snap(baseSnap({ capturedByRole: 'celebrity_spokesperson' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Component bounds 0-100 ────────────────────────────────────────

describe('W467 behavioral — component 0-100 bounds', () => {
  it('REJECTS caregiverBurdenInverse > 100', async () => {
    const p = new Snap(
      baseSnap({ components: { caregiverBurdenInverse: 110, siblingAdjustment: 50 } })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS siblingAdjustment < 0', async () => {
    const p = new Snap(baseSnap({ components: { siblingAdjustment: -5 } }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 4. Pre-save auto-compute (THE CORE BEHAVIOR) ─────────────────────

describe('W467 behavioral — pre-save auto-compute wbci + band', () => {
  it('all 5 components present → coverage=100, presentComponents=5', async () => {
    const doc = await Snap.create(baseSnap());
    expect(doc.coverage).toBe(100);
    expect(doc.presentComponents).toBe(5);
    expect(doc.missingComponents).toBe(0);
  });

  it('1 component present → coverage=20, missingComponents=4', async () => {
    const doc = await Snap.create(baseSnap({ components: { caregiverBurdenInverse: 75 } }));
    expect(doc.coverage).toBe(20);
    expect(doc.presentComponents).toBe(1);
    expect(doc.missingComponents).toBe(4);
  });

  it('zero components → wbci=null, band=insufficient_data, coverage=0', async () => {
    const doc = await Snap.create({ beneficiaryId: oid(), branchId: oid(), components: {} });
    expect(doc.wbci == null).toBe(true);
    expect(doc.band).toBe('insufficient_data');
    expect(doc.coverage).toBe(0);
  });

  it('bands: wbci ≥ 80 → thriving', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 90,
          siblingAdjustment: 85,
          financialStressInverse: 88,
          extendedFamilyEngagement: 82,
          familyCommunicationHealth: 90,
        },
      })
    );
    expect(doc.wbci).toBeGreaterThanOrEqual(80);
    expect(doc.band).toBe('thriving');
  });

  it('bands: wbci 65-79 → stable', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 70,
          siblingAdjustment: 72,
          financialStressInverse: 68,
          extendedFamilyEngagement: 70,
          familyCommunicationHealth: 72,
        },
      })
    );
    expect(doc.wbci).toBeGreaterThanOrEqual(65);
    expect(doc.wbci).toBeLessThan(80);
    expect(doc.band).toBe('stable');
  });

  it('bands: wbci 50-64 → monitor', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 55,
          siblingAdjustment: 50,
          financialStressInverse: 52,
          extendedFamilyEngagement: 60,
          familyCommunicationHealth: 55,
        },
      })
    );
    expect(doc.wbci).toBeGreaterThanOrEqual(50);
    expect(doc.wbci).toBeLessThan(65);
    expect(doc.band).toBe('monitor');
  });

  it('bands: wbci 35-49 → at_risk', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 40,
          siblingAdjustment: 38,
          financialStressInverse: 42,
          extendedFamilyEngagement: 45,
          familyCommunicationHealth: 40,
        },
      })
    );
    expect(doc.wbci).toBeGreaterThanOrEqual(35);
    expect(doc.wbci).toBeLessThan(50);
    expect(doc.band).toBe('at_risk');
  });

  it('bands: wbci < 35 → crisis', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 20,
          siblingAdjustment: 25,
          financialStressInverse: 22,
          extendedFamilyEngagement: 30,
          familyCommunicationHealth: 18,
        },
      })
    );
    expect(doc.wbci).toBeLessThan(35);
    expect(doc.band).toBe('crisis');
  });

  it('uses present-weight-only normalization (1 component=75 → wbci=75)', async () => {
    const doc = await Snap.create(baseSnap({ components: { caregiverBurdenInverse: 75 } }));
    expect(doc.wbci).toBe(75);
  });
});

// ─── 5. Trigger generation ────────────────────────────────────────────

describe('W467 behavioral — triggeredActions auto-populate from wbci', () => {
  it('crisis (wbci < 35) generates a CRITICAL priority urgent-counsellor trigger', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 20,
          siblingAdjustment: 25,
          financialStressInverse: 22,
          extendedFamilyEngagement: 30,
          familyCommunicationHealth: 18,
        },
      })
    );
    expect(doc.triggeredActions.length).toBeGreaterThan(0);
    const critical = doc.triggeredActions.find(a => a.priority === 'critical');
    expect(critical).toBeDefined();
    expect(critical.action).toMatch(/counsellor|urgent/);
  });

  it('thriving (wbci ≥ 80) generates NO triggered actions', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 95,
          siblingAdjustment: 92,
          financialStressInverse: 90,
          extendedFamilyEngagement: 88,
          familyCommunicationHealth: 90,
        },
      })
    );
    expect(doc.triggeredActions).toEqual([]);
  });
});

// ─── 6. Subdoc enum + recompute on re-save ────────────────────────────

describe('W467 behavioral — triggered action priority enum', () => {
  it('persists 4 valid priorities (critical/high/medium/low)', async () => {
    // Crisis case populates priority=critical naturally via the hook
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 10,
          siblingAdjustment: 15,
          financialStressInverse: 12,
          extendedFamilyEngagement: 20,
          familyCommunicationHealth: 18,
        },
      })
    );
    const validPriorities = new Set(['critical', 'high', 'medium', 'low']);
    for (const action of doc.triggeredActions) {
      expect(validPriorities.has(action.priority)).toBe(true);
    }
  });
});

describe('W467 behavioral — re-save recomputes from updated components', () => {
  it('changing components from stable → crisis updates band + adds critical trigger', async () => {
    const doc = await Snap.create(
      baseSnap({
        components: {
          caregiverBurdenInverse: 70,
          siblingAdjustment: 72,
          financialStressInverse: 68,
          extendedFamilyEngagement: 70,
          familyCommunicationHealth: 72,
        },
      })
    );
    expect(doc.band).toBe('stable');
    expect(doc.triggeredActions).toEqual([]);

    // Family situation deteriorates
    doc.components.caregiverBurdenInverse = 20;
    doc.components.siblingAdjustment = 25;
    doc.components.financialStressInverse = 22;
    doc.components.extendedFamilyEngagement = 30;
    doc.components.familyCommunicationHealth = 18;
    await doc.save();

    expect(doc.band).toBe('crisis');
    expect(doc.triggeredActions.length).toBeGreaterThan(0);
    expect(doc.triggeredActions.some(a => a.priority === 'critical')).toBe(true);
  });
});

// ─── 7. Indexes + collection ──────────────────────────────────────────

describe('W467 behavioral — indexes + collection', () => {
  it('declares 2 documented compound indexes', async () => {
    const indexes = await Snap.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+snapshotDate');
    expect(keys).toContain('branchId+band+snapshotDate');
  });

  it('uses canonical collection name family_wellbeing_snapshots', () => {
    expect(Snap.collection.collectionName).toBe('family_wellbeing_snapshots');
  });
});
