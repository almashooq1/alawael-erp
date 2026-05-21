'use strict';

/**
 * aac-foundation-wave263.test.js — Wave 263.
 *
 * Foundation tests for AAC (Augmentative & Alternative Communication):
 *   - AacProfile model invariants (W18-style)
 *   - AacSymbolLibrary slug + status invariants
 *   - aacProfile.service CRUD + PECS phase transitions
 *   - aac.routes registration + health endpoint shape
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AacProfile;
let AacSymbolLibrary;
let aac;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w263-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  AacProfile = require('../models/AacProfile');
  AacSymbolLibrary = require('../models/AacSymbolLibrary');
  aac = require('../services/aacProfile.service');
  await AacProfile.init();
  await AacSymbolLibrary.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await AacProfile.deleteMany({});
  await AacSymbolLibrary.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────
function makeProfileData(overrides = {}) {
  return {
    primaryModality: 'low_tech',
    receptiveLanguageLevel: 'concrete_symbols',
    expressiveLanguageLevel: 'pre_symbolic',
    accessMethod: 'direct_selection',
    assessedAt: new Date('2026-04-01'),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════
// Model invariants
// ════════════════════════════════════════════════════════════════════

describe('W263 — AacProfile model', () => {
  test('rejects assessedAt in the future', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const doc = new AacProfile({
      beneficiaryId: new mongoose.Types.ObjectId(),
      ...makeProfileData({ assessedAt: future }),
      assessedBy: new mongoose.Types.ObjectId(),
    });
    await expect(doc.save()).rejects.toThrow(/cannot be in the future/);
  });

  test('auto-fills vocabularyEstimatedAt when vocab size > 0', async () => {
    const doc = await AacProfile.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      ...makeProfileData({ currentVocabularySize: 25 }),
      assessedBy: new mongoose.Types.ObjectId(),
    });
    expect(doc.vocabularyEstimatedAt).toBeInstanceOf(Date);
  });

  test('auto-computes nextReviewDue from assessedAt + reviewIntervalDays', async () => {
    const assessedAt = new Date('2026-04-01');
    const doc = await AacProfile.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      ...makeProfileData({ assessedAt }),
      assessedBy: new mongoose.Types.ObjectId(),
      reviewIntervalDays: 90,
    });
    expect(doc.nextReviewDue).toBeInstanceOf(Date);
    const expectedTs = assessedAt.getTime() + 90 * 24 * 60 * 60 * 1000;
    expect(doc.nextReviewDue.getTime()).toBe(expectedTs);
  });

  test('enforces reviewIntervalDays bounds [14, 365]', async () => {
    const ben = new mongoose.Types.ObjectId();
    const tooShort = new AacProfile({
      beneficiaryId: ben,
      ...makeProfileData(),
      assessedBy: new mongoose.Types.ObjectId(),
      reviewIntervalDays: 7,
    });
    await expect(tooShort.save()).rejects.toThrow();

    const tooLong = new AacProfile({
      beneficiaryId: new mongoose.Types.ObjectId(),
      ...makeProfileData(),
      assessedBy: new mongoose.Types.ObjectId(),
      reviewIntervalDays: 400,
    });
    await expect(tooLong.save()).rejects.toThrow();
  });

  test('enforces one profile per beneficiary (unique index)', async () => {
    const ben = new mongoose.Types.ObjectId();
    await AacProfile.create({
      beneficiaryId: ben,
      ...makeProfileData(),
      assessedBy: new mongoose.Types.ObjectId(),
    });
    await expect(
      AacProfile.create({
        beneficiaryId: ben,
        ...makeProfileData(),
        assessedBy: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });

  test('isReviewOverdue virtual reflects nextReviewDue vs now', async () => {
    const ben = new mongoose.Types.ObjectId();
    const doc = await AacProfile.create({
      beneficiaryId: ben,
      ...makeProfileData({ assessedAt: new Date('2024-01-01') }),
      assessedBy: new mongoose.Types.ObjectId(),
      reviewIntervalDays: 30,
    });
    expect(doc.isReviewOverdue).toBe(true);
  });
});

describe('W263 — AacSymbolLibrary model', () => {
  test('rejects invalid code slug', async () => {
    await expect(
      AacSymbolLibrary.create({
        code: 'Food Water', // invalid: spaces + uppercase
        label_ar: 'ماء',
        category: 'drink',
      })
    ).rejects.toThrow();
  });

  test('requires label_ar', async () => {
    await expect(
      AacSymbolLibrary.create({
        code: 'water',
        label_ar: '',
        category: 'drink',
      })
    ).rejects.toThrow();
  });

  test('defaults status=draft', async () => {
    const sym = await AacSymbolLibrary.create({
      code: 'water',
      label_ar: 'ماء',
      category: 'drink',
    });
    expect(sym.status).toBe('draft');
  });

  test('enforces unique code', async () => {
    await AacSymbolLibrary.create({ code: 'water', label_ar: 'ماء', category: 'drink' });
    await expect(
      AacSymbolLibrary.create({ code: 'water', label_ar: 'ماء بارد', category: 'drink' })
    ).rejects.toThrow();
  });

  test('exposes SYMBOL_CATEGORIES on the static', () => {
    expect(Array.isArray(AacSymbolLibrary.SYMBOL_CATEGORIES)).toBe(true);
    expect(AacSymbolLibrary.SYMBOL_CATEGORIES).toContain('religion_culture');
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: profile CRUD
// ════════════════════════════════════════════════════════════════════

describe('W263 — aacProfile.service profile CRUD', () => {
  const actorId = new mongoose.Types.ObjectId();
  const beneficiaryId = new mongoose.Types.ObjectId();

  test('upsertProfile creates a new profile when none exists', async () => {
    const doc = await aac.upsertProfile(beneficiaryId, makeProfileData(), actorId);
    expect(doc).toBeTruthy();
    expect(String(doc.beneficiaryId)).toBe(String(beneficiaryId));
    expect(doc.primaryModality).toBe('low_tech');
    expect(String(doc.createdBy)).toBe(String(actorId));
  });

  test('upsertProfile updates existing profile on second call', async () => {
    await aac.upsertProfile(beneficiaryId, makeProfileData(), actorId);
    const updated = await aac.upsertProfile(
      beneficiaryId,
      makeProfileData({ primaryModality: 'high_tech', deviceModel: 'iPad Pro' }),
      actorId
    );
    expect(updated.primaryModality).toBe('high_tech');
    expect(updated.deviceModel).toBe('iPad Pro');
    const all = await AacProfile.find({ beneficiaryId });
    expect(all.length).toBe(1);
  });

  test('upsertProfile strips pecsPhase from incoming data (protected)', async () => {
    const dirty = {
      ...makeProfileData(),
      pecsPhase: { current: 6, masteredPhases: [1, 2, 3, 4, 5] },
    };
    const doc = await aac.upsertProfile(beneficiaryId, dirty, actorId);
    expect(doc.pecsPhase.current).toBe(null);
    expect(doc.pecsPhase.masteredPhases).toEqual([]);
  });

  test('upsertProfile rejects missing required fields', async () => {
    await expect(
      aac.upsertProfile(beneficiaryId, { primaryModality: 'low_tech' }, actorId)
    ).rejects.toThrow(/receptiveLanguageLevel/);
  });

  test('getByBeneficiary returns null when no profile', async () => {
    const doc = await aac.getByBeneficiary(new mongoose.Types.ObjectId());
    expect(doc).toBe(null);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: PECS phase transitions
// ════════════════════════════════════════════════════════════════════

describe('W263 — aacProfile.service PECS transitions', () => {
  const actorId = new mongoose.Types.ObjectId();
  const beneficiaryId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await aac.upsertProfile(beneficiaryId, makeProfileData(), actorId);
  });

  test('initial entry from null → phase 1 (no skip-gate)', async () => {
    const doc = await aac.transitionPecsPhase(
      { beneficiaryId, toPhase: 1, criteriaMet: ['reaches_for_picture'] },
      actorId
    );
    expect(doc.pecsPhase.current).toBe(1);
    expect(doc.pecsPhase.transitionHistory).toHaveLength(1);
    expect(doc.pecsPhase.transitionHistory[0].fromPhase).toBe(0);
    expect(doc.pecsPhase.transitionHistory[0].toPhase).toBe(1);
  });

  test('initial entry can jump straight to a later phase (no skip-gate from null)', async () => {
    const doc = await aac.transitionPecsPhase({ beneficiaryId, toPhase: 4 }, actorId);
    expect(doc.pecsPhase.current).toBe(4);
  });

  test('advances exactly one phase and marks previous as mastered', async () => {
    await aac.transitionPecsPhase({ beneficiaryId, toPhase: 1 }, actorId);
    const doc = await aac.transitionPecsPhase({ beneficiaryId, toPhase: 2 }, actorId);
    expect(doc.pecsPhase.current).toBe(2);
    expect(doc.pecsPhase.masteredPhases).toContain(1);
  });

  test('rejects skipping more than one phase (mid-protocol)', async () => {
    await aac.transitionPecsPhase({ beneficiaryId, toPhase: 1 }, actorId);
    await expect(aac.transitionPecsPhase({ beneficiaryId, toPhase: 3 }, actorId)).rejects.toThrow(
      /Cannot skip phases/
    );
  });

  test('allows regression (clinical re-baseline) and records it in history', async () => {
    await aac.transitionPecsPhase({ beneficiaryId, toPhase: 3 }, actorId);
    const doc = await aac.transitionPecsPhase({ beneficiaryId, toPhase: 2 }, actorId);
    expect(doc.pecsPhase.current).toBe(2);
    const last = doc.pecsPhase.transitionHistory[doc.pecsPhase.transitionHistory.length - 1];
    expect(last.fromPhase).toBe(3);
    expect(last.toPhase).toBe(2);
  });

  test('idempotent — re-applying same phase is a no-op', async () => {
    await aac.transitionPecsPhase({ beneficiaryId, toPhase: 1 }, actorId);
    const before = await AacProfile.findOne({ beneficiaryId }).lean();
    await aac.transitionPecsPhase({ beneficiaryId, toPhase: 1 }, actorId);
    const after = await AacProfile.findOne({ beneficiaryId }).lean();
    expect(after.pecsPhase.transitionHistory.length).toBe(
      before.pecsPhase.transitionHistory.length
    );
  });

  test('rejects invalid phase numbers', async () => {
    await expect(aac.transitionPecsPhase({ beneficiaryId, toPhase: 7 }, actorId)).rejects.toThrow(
      /1-6/
    );
    await expect(aac.transitionPecsPhase({ beneficiaryId, toPhase: 0 }, actorId)).rejects.toThrow(
      /1-6/
    );
  });

  test('throws on unknown beneficiary', async () => {
    await expect(
      aac.transitionPecsPhase({ beneficiaryId: new mongoose.Types.ObjectId(), toPhase: 1 }, actorId)
    ).rejects.toThrow(/not found/);
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: listByBranch + overdue
// ════════════════════════════════════════════════════════════════════

describe('W263 — aacProfile.service listing', () => {
  const branchA = new mongoose.Types.ObjectId();
  const branchB = new mongoose.Types.ObjectId();
  const actor = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await aac.upsertProfile(
      new mongoose.Types.ObjectId(),
      makeProfileData({ branchId: branchA, primaryModality: 'low_tech' }),
      actor
    );
    await aac.upsertProfile(
      new mongoose.Types.ObjectId(),
      makeProfileData({ branchId: branchA, primaryModality: 'high_tech' }),
      actor
    );
    await aac.upsertProfile(
      new mongoose.Types.ObjectId(),
      makeProfileData({ branchId: branchB, primaryModality: 'low_tech' }),
      actor
    );
  });

  test('listByBranch filters by branch + modality', async () => {
    const out = await aac.listByBranch(branchA, { modality: 'low_tech' });
    expect(out.total).toBe(1);
    expect(out.items[0].primaryModality).toBe('low_tech');
    expect(String(out.items[0].branchId)).toBe(String(branchA));
  });

  test('listByBranch with no branchId spans all branches', async () => {
    const out = await aac.listByBranch(null, {});
    expect(out.total).toBe(3);
  });

  test('listByBranch clamps limit', async () => {
    const out = await aac.listByBranch(null, { limit: 99999 });
    expect(out.items.length).toBeLessThanOrEqual(200);
  });

  test('listOverdueReviews returns only past nextReviewDue', async () => {
    // Insert an overdue profile directly (bypass service to control date).
    await AacProfile.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: branchA,
      ...makeProfileData({ assessedAt: new Date('2023-01-01') }),
      assessedBy: actor,
      reviewIntervalDays: 30,
    });
    const out = await aac.listOverdueReviews(branchA);
    expect(out.items.length).toBeGreaterThanOrEqual(1);
    for (const p of out.items) {
      expect(p.nextReviewDue.getTime()).toBeLessThan(Date.now());
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// Service: symbol library
// ════════════════════════════════════════════════════════════════════

describe('W263 — aacProfile.service symbol library', () => {
  const actor = new mongoose.Types.ObjectId();

  test('createSymbol persists with draft status and required fields', async () => {
    const s = await aac.createSymbol(
      { code: 'water', label_ar: 'ماء', label_en: 'water', category: 'drink' },
      actor
    );
    expect(s.code).toBe('water');
    expect(s.status).toBe('draft');
    expect(String(s.createdBy)).toBe(String(actor));
  });

  test('createSymbol rejects missing required fields', async () => {
    await expect(aac.createSymbol({ label_ar: 'ماء' }, actor)).rejects.toThrow(
      /code, label_ar, and category/
    );
  });

  test('publishSymbol moves draft → published and stamps publishedAt', async () => {
    const s = await aac.createSymbol({ code: 'food', label_ar: 'طعام', category: 'food' }, actor);
    const p = await aac.publishSymbol(s._id, actor);
    expect(p.status).toBe('published');
    expect(p.publishedAt).toBeInstanceOf(Date);
    expect(String(p.publishedBy)).toBe(String(actor));
  });

  test('publishSymbol refuses to publish archived', async () => {
    const s = await aac.createSymbol({ code: 'food', label_ar: 'طعام', category: 'food' }, actor);
    await AacSymbolLibrary.findByIdAndUpdate(s._id, { status: 'archived' });
    await expect(aac.publishSymbol(s._id, actor)).rejects.toThrow(/archived/);
  });

  test('listSymbols filters by category + status and supports q substring', async () => {
    await aac.createSymbol({ code: 'water', label_ar: 'ماء', category: 'drink' }, actor);
    await aac.createSymbol({ code: 'tea', label_ar: 'شاي', category: 'drink' }, actor);
    await aac.createSymbol({ code: 'bread', label_ar: 'خبز', category: 'food' }, actor);
    // Publish two of the drinks; leave 'bread' as draft.
    const drinks = await AacSymbolLibrary.find({ category: 'drink' });
    for (const d of drinks) await aac.publishSymbol(d._id, actor);

    const drinkPublished = await aac.listSymbols({
      category: 'drink',
      status: 'published',
    });
    expect(drinkPublished.total).toBe(2);

    const q = await aac.listSymbols({ q: 'ماء', status: 'published' });
    expect(q.total).toBe(1);
    expect(q.items[0].code).toBe('water');
  });
});

// ════════════════════════════════════════════════════════════════════
// Route registration + health
// ════════════════════════════════════════════════════════════════════

describe('W263 — aac.routes registration', () => {
  test('expected endpoints are registered', () => {
    jest.isolateModules(() => {
      const router = require('../routes/aac.routes');
      const paths = router.stack
        .filter(layer => layer.route)
        .map(layer => {
          const method = Object.keys(layer.route.methods)[0];
          return `${method.toUpperCase()} ${layer.route.path}`;
        });
      expect(paths).toContain('GET /_health');
      expect(paths).toContain('GET /profile/:beneficiaryId');
      expect(paths).toContain('PUT /profile/:beneficiaryId');
      expect(paths).toContain('GET /profiles');
      expect(paths).toContain('POST /profile/:beneficiaryId/pecs-phase');
      expect(paths).toContain('GET /reviews/overdue');
      expect(paths).toContain('GET /symbols');
      expect(paths).toContain('POST /symbols');
      expect(paths).toContain('PATCH /symbols/:id/publish');
    });
  });

  test('_health endpoint returns wave + endpoint count', () => {
    jest.isolateModules(() => {
      const router = require('../routes/aac.routes');
      const layer = router.stack.find(
        l => l.route && l.route.path === '/_health' && l.route.methods.get
      );
      const handler = layer.route.stack[layer.route.stack.length - 1].handle;
      const res = {};
      res.json = jest.fn(body => {
        res._body = body;
      });
      handler({}, res);
      expect(res._body.data.wave).toBe('W263');
      // Inequality from day-one per W257h/k/l lesson.
      expect(res._body.data.endpoints).toBeGreaterThanOrEqual(9);
      expect(res._body.data.services.some(s => /W263/.test(s))).toBe(true);
    });
  });
});
