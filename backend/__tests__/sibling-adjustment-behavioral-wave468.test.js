'use strict';

/**
 * sibling-adjustment-behavioral-wave468.test.js — behavioral counterpart to
 * the static drift guard `sibling-adjustment-wave468.test.js`.
 *
 * W468 — SiblingAdjustmentRecord + intelligence/sdq-scoring.lib (SDQ 25-item
 * → 5 subscales → totalDifficulties → band → wellbeing0-100 → feeds W467
 * WBCI siblingAdjustment component).
 *
 * The model's pre-save hook calls into the lib to:
 *   1. Validate the 5 subscale subtotals
 *   2. Compute totalDifficulties (sum of 4 difficulty subscales, NOT prosocial)
 *   3. Band by SDQ cutoffs (close_to_average ≤13, slightly_raised 14-16,
 *      high 17-19, very_high ≥20)
 *   4. Translate to wellbeing 0-100 (with prosocial≥7 bonus)
 *   5. Auto-flag referralRecommended on very_high band
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 19× application across W356-W468.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Rec;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w468-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Rec = require('../models/SiblingAdjustmentRecord');
  await Rec.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Rec.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseRec(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    assessmentDate: new Date(),
    raterType: 'parent',
    scores: { emotional: 3, conduct: 2, hyperactivity: 4, peer: 2, prosocial: 7 },
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W468 behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Rec({ ...baseRec(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without each of the 5 score subtotals', async () => {
    for (const missing of ['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial']) {
      const scores = { emotional: 3, conduct: 2, hyperactivity: 4, peer: 2, prosocial: 7 };
      delete scores[missing];
      const p = new Rec(baseRec({ scores }));
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });
});

// ─── 2. siblingAgeMonths bounds (36-252 = 3-17 yr) ────────────────────

describe('W468 behavioral — siblingAgeMonths SDQ-valid range', () => {
  it('SAVES with siblingAgeMonths=36 (3 yr)', async () => {
    const doc = await Rec.create(baseRec({ siblingAgeMonths: 36 }));
    expect(doc.siblingAgeMonths).toBe(36);
  });

  it('SAVES with siblingAgeMonths=252 (17 yr)', async () => {
    const doc = await Rec.create(baseRec({ siblingAgeMonths: 252 }));
    expect(doc.siblingAgeMonths).toBe(252);
  });

  it('REJECTS siblingAgeMonths=35 (below SDQ-valid)', async () => {
    const p = new Rec(baseRec({ siblingAgeMonths: 35 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS siblingAgeMonths=253 (above SDQ-valid)', async () => {
    const p = new Rec(baseRec({ siblingAgeMonths: 253 }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Subscale bounds 0-10 ──────────────────────────────────────────

describe('W468 behavioral — subscale 0-10 bounds', () => {
  it('REJECTS emotional=11', async () => {
    const p = new Rec(
      baseRec({ scores: { emotional: 11, conduct: 2, hyperactivity: 4, peer: 2, prosocial: 7 } })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS conduct=-1', async () => {
    const p = new Rec(
      baseRec({ scores: { emotional: 3, conduct: -1, hyperactivity: 4, peer: 2, prosocial: 7 } })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with all subscales at 10 (max valid)', async () => {
    const doc = await Rec.create(
      baseRec({
        scores: { emotional: 10, conduct: 10, hyperactivity: 10, peer: 10, prosocial: 10 },
      })
    );
    expect(doc.totalDifficulties).toBe(40); // 10+10+10+10 (NOT prosocial)
  });
});

// ─── 4. Enum validation ───────────────────────────────────────────────

describe('W468 behavioral — assessmentType + raterType enums', () => {
  for (const valid of [
    'baseline',
    'periodic',
    'event_triggered',
    'pre_intervention',
    'post_intervention',
  ]) {
    it(`SAVES assessmentType='${valid}'`, async () => {
      const doc = await Rec.create(baseRec({ assessmentType: valid }));
      expect(doc.assessmentType).toBe(valid);
    });
  }

  it('REJECTS invalid assessmentType', async () => {
    const p = new Rec(baseRec({ assessmentType: 'never' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const raterType of ['parent', 'teacher', 'self']) {
    it(`SAVES raterType='${raterType}'`, async () => {
      const doc = await Rec.create(baseRec({ raterType }));
      expect(doc.raterType).toBe(raterType);
    });
  }
});

// ─── 5. Pre-save auto-compute (THE CORE) ──────────────────────────────

describe('W468 behavioral — pre-save auto-compute totalDifficulties', () => {
  it('totalDifficulties = sum of 4 difficulty subscales (excludes prosocial)', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 3, conduct: 2, hyperactivity: 4, peer: 2, prosocial: 10 } })
    );
    expect(doc.totalDifficulties).toBe(11); // 3+2+4+2, not + 10
  });

  it('totalBand=close_to_average for low total (≤13)', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 1, conduct: 1, hyperactivity: 2, peer: 1, prosocial: 8 } })
    );
    expect(doc.totalDifficulties).toBe(5);
    expect(doc.totalBand).toBe('close_to_average');
  });

  it('totalBand=slightly_raised for 14-16', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 4, conduct: 4, hyperactivity: 4, peer: 3, prosocial: 5 } })
    );
    expect(doc.totalDifficulties).toBe(15);
    expect(doc.totalBand).toBe('slightly_raised');
  });

  it('totalBand=high for 17-19', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 5, conduct: 4, hyperactivity: 5, peer: 4, prosocial: 5 } })
    );
    expect(doc.totalDifficulties).toBe(18);
    expect(doc.totalBand).toBe('high');
  });

  it('totalBand=very_high for ≥20', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 8, conduct: 7, hyperactivity: 8, peer: 7, prosocial: 3 } })
    );
    expect(doc.totalDifficulties).toBe(30);
    expect(doc.totalBand).toBe('very_high');
  });
});

// ─── 6. Wellbeing translation + prosocial bonus ───────────────────────

describe('W468 behavioral — wellbeing 0-100 translation', () => {
  it('total=0 + prosocial=8 → wellbeing≈100 (max + bonus capped)', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 0, conduct: 0, hyperactivity: 0, peer: 0, prosocial: 8 } })
    );
    expect(doc.wellbeing).toBe(100);
  });

  it('total=20 + prosocial=5 → wellbeing=50 (no bonus, prosocial<7)', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 5, conduct: 5, hyperactivity: 5, peer: 5, prosocial: 5 } })
    );
    expect(doc.totalDifficulties).toBe(20);
    expect(doc.wellbeing).toBe(50); // (1 - 20/40) * 100 = 50
  });

  it('total=20 + prosocial=7 → wellbeing=55 (+5 bonus)', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 5, conduct: 5, hyperactivity: 5, peer: 5, prosocial: 7 } })
    );
    expect(doc.totalDifficulties).toBe(20);
    expect(doc.wellbeing).toBe(55); // 50 + 5 prosocial bonus
  });
});

// ─── 7. Auto-flag referralRecommended on very_high ───────────────────

describe('W468 behavioral — referralRecommended auto-flag', () => {
  it('very_high total auto-sets referralRecommended=true + reason', async () => {
    const doc = await Rec.create(
      baseRec({ scores: { emotional: 9, conduct: 8, hyperactivity: 9, peer: 8, prosocial: 2 } })
    );
    expect(doc.totalBand).toBe('very_high');
    expect(doc.referralRecommended).toBe(true);
    expect(doc.referralReason).toMatch(/very_high/);
  });

  it('close_to_average does NOT auto-set referralRecommended', async () => {
    const doc = await Rec.create(baseRec());
    expect(doc.totalBand).toBe('close_to_average');
    expect(doc.referralRecommended).toBeFalsy();
  });

  it('does NOT override existing referralReason on very_high', async () => {
    const doc = await Rec.create(
      baseRec({
        referralRecommended: true,
        referralReason: 'Pre-existing custom reason for clinical follow-up',
        scores: { emotional: 9, conduct: 8, hyperactivity: 9, peer: 8, prosocial: 2 },
      })
    );
    expect(doc.referralReason).toBe('Pre-existing custom reason for clinical follow-up');
  });
});

// ─── 8. Indexes + collection ──────────────────────────────────────────

describe('W468 behavioral — indexes', () => {
  it('declares 3 documented compound indexes', async () => {
    const indexes = await Rec.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+assessmentDate');
    expect(keys).toContain('branchId+totalBand+assessmentDate');
    expect(keys).toContain('siblingId+assessmentDate');
  });
});
