'use strict';

/**
 * decision-rights-behavioral-wave461.test.js — behavioral counterpart to the
 * static-analysis drift guard `decision-rights-wave461.test.js`.
 *
 * W461 ships TWO surfaces:
 *   • backend/intelligence/decision-rights.lib.js — pure lib (CRPD Art. 12
 *     supported-decision framework: compositeScore, routeDecision, requiresAdvocate)
 *   • backend/models/DecisionRightsAssessment.js — model with pre-save hook that
 *     calls into the lib to compute compositeScore + routedLayer + enforce
 *     supportArrangement + advocateInvolved invariants
 *
 * The model uses legacy `pre('save', function (next) { ... next(); })` style →
 * requires the Mongoose-9 compat shim BEFORE require (same recipe as W458/W460).
 *
 * This file:
 *   • Verifies the lib's pure functions return the documented routing
 *   • Verifies the model's pre-save hook AUTO-COMPUTES compositeScore + routedLayer
 *   • Verifies the lib-bound finalization invariants actually fire
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 15× application across W356-W461.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/decision-rights-behavioral-wave461.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DRA;
let lib;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w461-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  DRA = require('../models/DecisionRightsAssessment');
  lib = require('../intelligence/decision-rights.lib');
  await DRA.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await DRA.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseAssessment(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    decisionType: 'therapy_participation',
    capacity: { understanding: 3, retention: 3, weighing: 2, communication: 2 },
    assessedBy: oid(),
    assessedByRole: 'case_manager',
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════
// PART 1 — Pure lib
// ═════════════════════════════════════════════════════════════════════

describe('W461 behavioral — lib.compositeScore', () => {
  it('returns 0 for null input', () => {
    expect(lib.compositeScore(null)).toBe(0);
  });

  it('sums the 4 capacity criteria', () => {
    expect(
      lib.compositeScore({ understanding: 3, retention: 3, weighing: 3, communication: 3 })
    ).toBe(12);
    expect(
      lib.compositeScore({ understanding: 0, retention: 0, weighing: 0, communication: 0 })
    ).toBe(0);
    expect(
      lib.compositeScore({ understanding: 2, retention: 2, weighing: 1, communication: 1 })
    ).toBe(6);
  });

  it('treats missing criteria as 0', () => {
    expect(lib.compositeScore({ understanding: 3 })).toBe(3);
  });
});

describe('W461 behavioral — lib.routeDecision', () => {
  it('routes score ≥ 10 to "autonomy" (Layer 1)', () => {
    const r = lib.routeDecision({
      understanding: 3,
      retention: 3,
      weighing: 2,
      communication: 2,
    });
    expect(r.layer).toBe('autonomy');
    expect(r.score).toBe(10);
  });

  it('routes score 6-9 to "supported" (Layer 2)', () => {
    const r = lib.routeDecision({
      understanding: 2,
      retention: 2,
      weighing: 1,
      communication: 1,
    });
    expect(r.layer).toBe('supported');
    expect(r.score).toBe(6);
  });

  it('routes score 5 to "substituted" (Layer 3 boundary)', () => {
    const r = lib.routeDecision({
      understanding: 2,
      retention: 1,
      weighing: 1,
      communication: 1,
    });
    expect(r.layer).toBe('substituted');
    expect(r.score).toBe(5);
  });

  it('routes score < 6 to "substituted" (Layer 3)', () => {
    const r = lib.routeDecision({
      understanding: 0,
      retention: 0,
      weighing: 0,
      communication: 0,
    });
    expect(r.layer).toBe('substituted');
  });

  it('forces "emergency" when opts.emergency=true regardless of score', () => {
    const r = lib.routeDecision(
      { understanding: 3, retention: 3, weighing: 3, communication: 3 },
      { emergency: true }
    );
    expect(r.layer).toBe('emergency');
  });
});

describe('W461 behavioral — lib.requiresAdvocate', () => {
  it('returns true for restraint regardless of layer', () => {
    expect(lib.requiresAdvocate('restraint', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('restraint', 'supported')).toBe(true);
  });

  it('returns true for seclusion/research_consent/complaint regardless of layer', () => {
    expect(lib.requiresAdvocate('seclusion', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('research_consent', 'autonomy')).toBe(true);
    expect(lib.requiresAdvocate('complaint', 'autonomy')).toBe(true);
  });

  it('returns true for substituted layer regardless of decisionType', () => {
    expect(lib.requiresAdvocate('therapy_participation', 'substituted')).toBe(true);
    expect(lib.requiresAdvocate('daily_preferences', 'substituted')).toBe(true);
  });

  it('returns true for emergency layer (post-hoc review)', () => {
    expect(lib.requiresAdvocate('medication_change', 'emergency')).toBe(true);
  });

  it('returns false for routine decisions in autonomy/supported layers', () => {
    expect(lib.requiresAdvocate('therapy_participation', 'autonomy')).toBe(false);
    expect(lib.requiresAdvocate('daily_preferences', 'supported')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — Model: pre-save lib integration
// ═════════════════════════════════════════════════════════════════════

describe('W461 behavioral — model required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new DRA({ ...baseAssessment(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without decisionType', async () => {
    const p = new DRA({ ...baseAssessment(), decisionType: undefined });
    await expect(p.save()).rejects.toThrow(/decisionType/);
  });

  it('REJECTS without capacity.understanding', async () => {
    const p = new DRA(
      baseAssessment({
        capacity: { retention: 2, weighing: 2, communication: 2 },
      })
    );
    await expect(p.save()).rejects.toThrow(/understanding/);
  });

  it('REJECTS without assessedBy', async () => {
    const p = new DRA({ ...baseAssessment(), assessedBy: undefined });
    await expect(p.save()).rejects.toThrow(/assessedBy/);
  });

  it('REJECTS without assessedByRole', async () => {
    const p = new DRA({ ...baseAssessment(), assessedByRole: undefined });
    await expect(p.save()).rejects.toThrow(/assessedByRole/);
  });

  it('SAVES with all required fields + defaults populate', async () => {
    const doc = await DRA.create(baseAssessment());
    expect(doc.status).toBe('draft');
    expect(doc.advocateInvolved).toBe(false);
    expect(doc.assessedAt).toBeInstanceOf(Date);
  });
});

describe('W461 behavioral — model capacity 0-3 bounds', () => {
  it('REJECTS understanding=4 (above max)', async () => {
    const p = new DRA(
      baseAssessment({
        capacity: { understanding: 4, retention: 2, weighing: 2, communication: 2 },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS retention=-1 (below min)', async () => {
    const p = new DRA(
      baseAssessment({
        capacity: { understanding: 2, retention: -1, weighing: 2, communication: 2 },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W461 behavioral — model decisionType + role enums', () => {
  for (const valid of ['restraint', 'seclusion', 'research_consent', 'medication_change']) {
    it(`SAVES with decisionType='${valid}'`, async () => {
      const doc = await DRA.create(baseAssessment({ decisionType: valid }));
      expect(doc.decisionType).toBe(valid);
    });
  }

  it('REJECTS invalid decisionType', async () => {
    const p = new DRA(baseAssessment({ decisionType: 'astrology_consult' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid assessedByRole', async () => {
    const p = new DRA(baseAssessment({ assessedByRole: 'janitor' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W461 behavioral — pre-save auto-computes compositeScore + routedLayer', () => {
  it('Layer 1 (autonomy): score 10 → routedLayer=autonomy on save', async () => {
    const doc = await DRA.create(
      baseAssessment({
        capacity: { understanding: 3, retention: 3, weighing: 2, communication: 2 },
      })
    );
    expect(doc.compositeScore).toBe(10);
    expect(doc.routedLayer).toBe('autonomy');
  });

  it('Layer 2 (supported): score 8 → routedLayer=supported on save', async () => {
    const doc = await DRA.create(
      baseAssessment({
        capacity: { understanding: 2, retention: 2, weighing: 2, communication: 2 },
      })
    );
    expect(doc.compositeScore).toBe(8);
    expect(doc.routedLayer).toBe('supported');
  });

  it('Layer 3 (substituted): score 3 → routedLayer=substituted on save', async () => {
    const doc = await DRA.create(
      baseAssessment({
        capacity: { understanding: 1, retention: 1, weighing: 1, communication: 0 },
      })
    );
    expect(doc.compositeScore).toBe(3);
    expect(doc.routedLayer).toBe('substituted');
  });

  it('Re-saving with updated capacity recomputes compositeScore + routedLayer', async () => {
    const doc = await DRA.create(
      baseAssessment({
        capacity: { understanding: 3, retention: 3, weighing: 3, communication: 3 },
      })
    );
    expect(doc.compositeScore).toBe(12);
    doc.capacity = { understanding: 0, retention: 0, weighing: 1, communication: 1 };
    await doc.save();
    expect(doc.compositeScore).toBe(2);
    expect(doc.routedLayer).toBe('substituted');
  });
});

describe('W461 behavioral — pre-save Layer 2/3 supportArrangement invariant', () => {
  it('SAVES draft Layer 2 (supported) WITHOUT supportArrangement (only enforced on finalize)', async () => {
    const doc = await DRA.create(
      baseAssessment({
        status: 'draft',
        capacity: { understanding: 2, retention: 2, weighing: 2, communication: 2 },
      })
    );
    expect(doc.status).toBe('draft');
    expect(doc.routedLayer).toBe('supported');
  });

  it('REJECTS finalized Layer 2 (supported) WITHOUT supportArrangement', async () => {
    const p = new DRA(
      baseAssessment({
        status: 'finalized',
        capacity: { understanding: 2, retention: 2, weighing: 2, communication: 2 },
      })
    );
    await expect(p.save()).rejects.toThrow(/supportArrangement.*≥20 chars/);
  });

  it('REJECTS finalized Layer 3 (substituted) WITH too-short supportArrangement', async () => {
    const p = new DRA(
      baseAssessment({
        status: 'finalized',
        capacity: { understanding: 0, retention: 0, weighing: 0, communication: 0 },
        supportArrangement: 'short',
        advocateInvolved: true, // substituted also needs advocate
      })
    );
    await expect(p.save()).rejects.toThrow(/supportArrangement.*≥20 chars/);
  });

  it('SAVES finalized Layer 2 WITH valid supportArrangement', async () => {
    const doc = await DRA.create(
      baseAssessment({
        status: 'finalized',
        capacity: { understanding: 2, retention: 2, weighing: 2, communication: 2 },
        supportArrangement:
          'Family + AAC-mediated decision; beneficiary indicated preference with picture symbols + verbal confirmation',
      })
    );
    expect(doc.supportArrangement.length).toBeGreaterThanOrEqual(20);
  });
});

describe('W461 behavioral — pre-save advocate-required invariant', () => {
  it('REJECTS finalized restraint decision without advocateInvolved (any layer)', async () => {
    const p = new DRA(
      baseAssessment({
        decisionType: 'restraint',
        status: 'finalized',
        // Layer 1 autonomy capacity but restraint always needs advocate
        capacity: { understanding: 3, retention: 3, weighing: 2, communication: 2 },
      })
    );
    await expect(p.save()).rejects.toThrow(/requires advocateInvolved=true/);
  });

  it('REJECTS finalized Layer 3 substituted without advocate (even for routine decisions)', async () => {
    const p = new DRA(
      baseAssessment({
        decisionType: 'therapy_participation',
        status: 'finalized',
        capacity: { understanding: 0, retention: 1, weighing: 1, communication: 0 },
        supportArrangement:
          'Substituted decision by guardian after 3 unsuccessful attempts at supported decision-making',
      })
    );
    await expect(p.save()).rejects.toThrow(/requires advocateInvolved=true/);
  });

  it('SAVES finalized restraint with advocate involved', async () => {
    const doc = await DRA.create(
      baseAssessment({
        decisionType: 'restraint',
        status: 'finalized',
        capacity: { understanding: 1, retention: 1, weighing: 1, communication: 1 },
        supportArrangement:
          'Brief mechanical restraint during acute self-injury episode; reviewed by MDT same day',
        advocateInvolved: true,
        advocateUserId: oid(),
      })
    );
    expect(doc.advocateInvolved).toBe(true);
  });
});

describe('W461 behavioral — indexes + collection', () => {
  it('declares the 3 documented compound indexes', async () => {
    const indexes = await DRA.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+assessedAt');
    expect(keys).toContain('beneficiaryId+decisionType+status');
    expect(keys).toContain('branchId+routedLayer+assessedAt');
  });

  it('uses canonical collection name decision_rights_assessments', () => {
    expect(DRA.collection.collectionName).toBe('decision_rights_assessments');
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 3 — End-to-end CRPD scenario
// ═════════════════════════════════════════════════════════════════════

describe('W461 behavioral — full CRPD-compliant assessment lifecycle', () => {
  it('draft → finalize chain with supersession on capacity change', async () => {
    const benId = oid();
    const branchId = oid();
    const assessorId = oid();
    const advocateId = oid();

    // 1. Initial assessment — Layer 2 supported decision-making
    const initial = await DRA.create({
      beneficiaryId: benId,
      branchId,
      decisionType: 'plan_change',
      decisionDescription: 'Move from individual to group therapy',
      capacity: { understanding: 2, retention: 2, weighing: 2, communication: 1 },
      assessedBy: assessorId,
      assessedByRole: 'psychologist',
      assessmentInstrument: 'MacCAT-T',
      status: 'draft',
    });
    expect(initial.compositeScore).toBe(7);
    expect(initial.routedLayer).toBe('supported');
    expect(initial.status).toBe('draft');

    // 2. Finalize with proper support arrangement
    initial.supportArrangement =
      'Decision made with family + advocate present; beneficiary confirmed via AAC selection of group-therapy symbol after 3 separate sessions';
    initial.advocateInvolved = true;
    initial.advocateUserId = advocateId;
    initial.decisionOutcome = 'Move to weekly group therapy starting 2026-06-01';
    initial.decisionMadeBy = assessorId;
    initial.decisionMadeAt = new Date();
    initial.status = 'finalized';
    await initial.save();

    expect(initial.status).toBe('finalized');

    // 3. Re-assess 3 months later — capacity changed; supersede prior
    const reassess = await DRA.create({
      beneficiaryId: benId,
      branchId,
      decisionType: 'plan_change',
      capacity: { understanding: 3, retention: 3, weighing: 2, communication: 2 },
      assessedBy: assessorId,
      assessedByRole: 'psychologist',
      assessedAt: new Date(),
    });
    expect(reassess.compositeScore).toBe(10);
    expect(reassess.routedLayer).toBe('autonomy');

    // 4. Mark initial as superseded
    initial.status = 'superseded';
    initial.supersededBy = reassess._id;
    await initial.save();

    const reloaded = await DRA.findById(initial._id);
    expect(reloaded.status).toBe('superseded');
    expect(reloaded.supersededBy.toString()).toBe(reassess._id.toString());
  });
});
