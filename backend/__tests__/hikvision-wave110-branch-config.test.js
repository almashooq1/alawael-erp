/**
 * hikvision-wave110-branch-config.test.js — Wave 110.
 *
 * Sections:
 *   1. Registry pure helpers — validateBranchConfigPatch + mergeBranchConfig
 *   2. Service — get / list / upsert (create) / upsert (update) / reset
 *   3. Service — resolveEffective with no override → defaults
 *   4. Service — resolveEffective with override → merged
 *   5. Service — resolveEffective cache (TTL respects clock)
 *   6. Service — fail-open on db error → defaults returned
 *   7. Service — revision bumps + lastEditedBy required on update
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionBranchConfigService,
} = require('../intelligence/hikvision-branch-config.service');

// ─── In-memory model mock ─────────────────────────────────────

function buildConfigModel() {
  const store = [];
  let counter = 0;

  function Model(data) {
    Object.assign(this, data);
    this._id = data._id || `cfg-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {
      if (!this.branchId) {
        const e = new Error('Validation failed');
        e.errors = { branchId: { message: 'required' } };
        throw e;
      }
      if (this.revision > 1 && !this.lastEditedBy) {
        const e = new Error('Validation failed');
        e.errors = { lastEditedBy: { message: 'required for revisions > 1' } };
        throw e;
      }
      // Reject unknown override keys defensively (mirror model).
      if (this.confidenceThresholds) {
        for (const k of Object.keys(this.confidenceThresholds)) {
          if (!reg.BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS.includes(k)) {
            const e = new Error('Validation failed');
            e.errors = { [`confidenceThresholds.${k}`]: { message: 'INVALID_KEY' } };
            throw e;
          }
        }
      }
    };
    this.save = async () => {
      const idx = store.findIndex(r => String(r._id) === String(this._id));
      if (idx >= 0) {
        store[idx] = { ...this };
      } else {
        // Unique on branchId
        const conflict = store.find(r => String(r.branchId) === String(this.branchId));
        if (conflict) {
          const e = new Error('E11000 duplicate key');
          e.code = 11000;
          throw e;
        }
        store.push({ ...this });
      }
      return this;
    };
  }

  Model.findOne = function (query) {
    const match = store.find(r => {
      for (const [k, v] of Object.entries(query)) {
        if (String(r[k]) !== String(v)) return false;
      }
      return true;
    });
    if (!match) return { lean: async () => null, then: r => r(null) };
    const inst = new Model({ ...match });
    inst._id = match._id;
    return { lean: async () => ({ ...match }), then: r => r(inst) };
  };

  Model.find = function (query = {}) {
    void query;
    let matches = store.slice();
    const chain = {
      sort() {
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
    return chain;
  };

  Model.countDocuments = async function () {
    return store.length;
  };

  Model._store = store;
  return Model;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// Manual clock helper for cache TTL tests.
function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// ═══ 1. Registry pure helpers ══════════════════════════════════

describe('registry — branch-config helpers', () => {
  test('validateBranchConfigPatch — happy path', () => {
    const r = reg.validateBranchConfigPatch({
      confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 },
      fraudDefaults: { BURST_THRESHOLD: 10 },
    });
    expect(r.ok).toBe(true);
    expect(r.normalized.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(92);
    expect(r.normalized.fraudDefaults.BURST_THRESHOLD).toBe(10);
  });

  test('validateBranchConfigPatch — unknown key rejected with INVALID_KEY', () => {
    const r = reg.validateBranchConfigPatch({
      confidenceThresholds: { UNKNOWN_KEY: 50 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors['confidenceThresholds.UNKNOWN_KEY']).toBe(reg.REASON.BRANCH_CONFIG_INVALID_KEY);
  });

  test('validateBranchConfigPatch — out-of-bounds rejected', () => {
    const r = reg.validateBranchConfigPatch({
      confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 30 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors['confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT']).toMatch(
      /BRANCH_CONFIG_INVALID_THRESHOLD/
    );
  });

  test('validateBranchConfigPatch — non-numeric rejected', () => {
    const r = reg.validateBranchConfigPatch({
      confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 'high' },
    });
    expect(r.ok).toBe(false);
  });

  test('mergeBranchConfig — empty override returns defaults', () => {
    const m = reg.mergeBranchConfig(reg.DEFAULT_CONFIDENCE_THRESHOLDS, reg.FRAUD_DEFAULTS, null);
    expect(m.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.FACE_TERMINAL_AUTO_ACCEPT
    );
  });

  test('mergeBranchConfig — override layered on top of defaults', () => {
    const m = reg.mergeBranchConfig(reg.DEFAULT_CONFIDENCE_THRESHOLDS, reg.FRAUD_DEFAULTS, {
      confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 },
    });
    expect(m.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(92);
    // Other keys preserved.
    expect(m.confidenceThresholds.CAMERA_GATE_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.CAMERA_GATE_AUTO_ACCEPT
    );
  });

  test('mergeBranchConfig — unknown keys in override silently dropped', () => {
    const m = reg.mergeBranchConfig(reg.DEFAULT_CONFIDENCE_THRESHOLDS, reg.FRAUD_DEFAULTS, {
      confidenceThresholds: {
        FACE_TERMINAL_AUTO_ACCEPT: 92,
        ROGUE_KEY: 999,
      },
    });
    expect(m.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(92);
    expect(m.confidenceThresholds.ROGUE_KEY).toBeUndefined();
  });
});

// ═══ 2. Service — CRUD ═══════════════════════════════════════════

describe('branch-config service — CRUD', () => {
  test('get returns null when no row exists', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.get('br-1');
    expect(r.ok).toBe(true);
    expect(r.config).toBeNull();
  });

  test('upsert — create writes row with revision=1', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'user-1',
    });
    expect(r.ok).toBe(true);
    expect(r.config.revision).toBe(1);
    expect(r.config.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(92);
  });

  test('upsert — update bumps revision', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'user-1',
    });
    const r2 = await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 95 } },
      actorId: 'user-2',
    });
    expect(r2.ok).toBe(true);
    expect(r2.config.revision).toBe(2);
    expect(r2.config.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(95);
  });

  test('upsert — update without actorId rejected', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'user-1',
    });
    const r = await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 95 } },
      // no actorId
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
    expect(r.errors.lastEditedBy).toBeDefined();
  });

  test('upsert — invalid key rejected via validateBranchConfigPatch', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { ROGUE: 50 } },
      actorId: 'user-1',
    });
    expect(r.ok).toBe(false);
    expect(r.errors['confidenceThresholds.ROGUE']).toBe(reg.REASON.BRANCH_CONFIG_INVALID_KEY);
  });

  test('upsert — missing branchId returns BRANCH_CONFIG_NO_BRANCH', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.upsert({ patch: {}, actorId: 'user-1' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.BRANCH_CONFIG_NO_BRANCH);
  });

  test('reset clears both buckets + bumps revision', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    await s.upsert({
      branchId: 'br-1',
      patch: {
        confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 },
        fraudDefaults: { BURST_THRESHOLD: 10 },
      },
      actorId: 'user-1',
    });
    const r = await s.reset('br-1', 'user-2');
    expect(r.ok).toBe(true);
    expect(r.config.revision).toBe(2);
    expect(r.config.confidenceThresholds).toEqual({});
    expect(r.config.fraudDefaults).toEqual({});
  });

  test('list returns rows + total', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    await s.upsert({ branchId: 'br-1', patch: {}, actorId: 'u1' });
    await s.upsert({ branchId: 'br-2', patch: {}, actorId: 'u1' });
    const r = await s.list();
    expect(r.ok).toBe(true);
    expect(r.total).toBe(2);
    expect(r.items.length).toBe(2);
  });
});

// ═══ 3. resolveEffective — no override ═══════════════════════════

describe('branch-config service — resolveEffective', () => {
  test('no row for branch → defaults + source=defaults', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.resolveEffective('br-unknown');
    expect(r.ok).toBe(true);
    expect(r.source).toBe('defaults');
    expect(r.effective.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.FACE_TERMINAL_AUTO_ACCEPT
    );
  });

  test('with row → merged + source=branch-override', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'u1',
    });
    const r = await s.resolveEffective('br-1');
    expect(r.ok).toBe(true);
    expect(r.source).toBe('branch-override');
    expect(r.effective.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(92);
    // unaffected keys preserved
    expect(r.effective.confidenceThresholds.CAMERA_GATE_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.CAMERA_GATE_AUTO_ACCEPT
    );
  });

  test('null branchId → defaults', async () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.resolveEffective(null);
    expect(r.ok).toBe(true);
    expect(r.source).toBe('defaults');
  });
});

// ═══ 4. Cache (TTL) ═════════════════════════════════════════════

describe('branch-config service — cache', () => {
  test('repeated resolveEffective hits cache (single DB read)', async () => {
    const Model = buildConfigModel();
    let findOneCalls = 0;
    const origFindOne = Model.findOne;
    Model.findOne = function (...args) {
      findOneCalls += 1;
      return origFindOne.apply(this, args);
    };
    const clock = makeClock();
    const s = createHikvisionBranchConfigService({
      configModel: Model,
      logger: SILENT,
      now: clock.now,
      cacheTtlMs: 10_000,
    });
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'u1',
    });
    findOneCalls = 0;
    await s.resolveEffective('br-1');
    await s.resolveEffective('br-1');
    await s.resolveEffective('br-1');
    expect(findOneCalls).toBe(1);
  });

  test('cache expires after TTL', async () => {
    const Model = buildConfigModel();
    let findOneCalls = 0;
    const origFindOne = Model.findOne;
    Model.findOne = function (...args) {
      findOneCalls += 1;
      return origFindOne.apply(this, args);
    };
    const clock = makeClock();
    const s = createHikvisionBranchConfigService({
      configModel: Model,
      logger: SILENT,
      now: clock.now,
      cacheTtlMs: 1_000,
    });
    await s.upsert({ branchId: 'br-1', patch: {}, actorId: 'u1' });
    findOneCalls = 0;
    await s.resolveEffective('br-1');
    clock.advance(2_000); // past TTL
    await s.resolveEffective('br-1');
    expect(findOneCalls).toBe(2);
  });

  test('upsert invalidates cache for that branch', async () => {
    const Model = buildConfigModel();
    let findOneCalls = 0;
    const origFindOne = Model.findOne;
    Model.findOne = function (...args) {
      findOneCalls += 1;
      return origFindOne.apply(this, args);
    };
    const s = createHikvisionBranchConfigService({
      configModel: Model,
      logger: SILENT,
      cacheTtlMs: 60_000,
    });
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 92 } },
      actorId: 'u1',
    });
    await s.resolveEffective('br-1');
    findOneCalls = 0;
    // mutation → cache must invalidate
    await s.upsert({
      branchId: 'br-1',
      patch: { confidenceThresholds: { FACE_TERMINAL_AUTO_ACCEPT: 95 } },
      actorId: 'u2',
    });
    const r = await s.resolveEffective('br-1');
    expect(r.effective.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(95);
    expect(findOneCalls).toBeGreaterThanOrEqual(1);
  });
});

// ═══ 5. Fail-open on DB error ═══════════════════════════════════

describe('branch-config service — fail-open', () => {
  test('db error in resolveEffective returns defaults (not error)', async () => {
    const Model = buildConfigModel();
    Model.findOne = () => ({
      lean: async () => {
        throw new Error('mongo offline');
      },
    });
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const r = await s.resolveEffective('br-1');
    expect(r.ok).toBe(true);
    expect(r.source).toBe('defaults');
    expect(r.effective.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.FACE_TERMINAL_AUTO_ACCEPT
    );
  });
});

// ═══ 6. Defaults introspection ══════════════════════════════════

describe('branch-config service — getDefaults', () => {
  test('returns global defaults + overridable key lists + bounds', () => {
    const Model = buildConfigModel();
    const s = createHikvisionBranchConfigService({ configModel: Model, logger: SILENT });
    const d = s.getDefaults();
    expect(d.confidenceThresholds.FACE_TERMINAL_AUTO_ACCEPT).toBe(
      reg.DEFAULT_CONFIDENCE_THRESHOLDS.FACE_TERMINAL_AUTO_ACCEPT
    );
    expect(d.overridableConfidenceKeys).toContain('FACE_TERMINAL_AUTO_ACCEPT');
    expect(d.overridableFraudKeys).toContain('BURST_THRESHOLD');
    expect(d.bounds.FACE_TERMINAL_AUTO_ACCEPT.min).toBe(50);
  });
});
