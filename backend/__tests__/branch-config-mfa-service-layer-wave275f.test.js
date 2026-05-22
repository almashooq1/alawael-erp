'use strict';

/**
 * branch-config-mfa-service-layer-wave275f.test.js — Wave 275f.
 *
 * 5th service-layer adopter via shared [[wave275c-extract-face-enrollment]]
 * mfa-tier-check.lib. Coverage:
 *   - upsert (tier 2 / 15 min) — single source of MFA guard
 *   - reset → upsert chain test (proves actor flows through)
 *
 * Also tests the 6th W273 oversight closed atomically:
 *   PUT /branch-configs/:branchId + DELETE /branch-configs/:branchId
 *   had no requireMfaTier — both now gated at route + service +
 *   drift guard (3-layer symmetry).
 *
 * branch-config is the FIRST W275 service whose method delegates to
 * another (reset → upsert). The chain test confirms the guard fires
 * once at upsert without needing duplicate gates.
 */

const {
  createHikvisionBranchConfigService,
} = require('../intelligence/hikvision-branch-config.service');
const reg = require('../intelligence/hikvision.registry');

// Constructor-style stub so `new configModel(docData)` works inside
// upsert's create-path. validate/save resolve immediately so the
// "passes guard" tests can confirm MFA didn't fire by reaching past
// the guard into the persistence path.
function _StubConfigModel(data) {
  Object.assign(this, data || {});
}
_StubConfigModel.findOne = () => Promise.resolve(null);
_StubConfigModel.find = () => ({
  sort: () => ({ skip: () => ({ limit: () => ({ lean: () => [] }) }) }),
});
_StubConfigModel.countDocuments = () => 0;
_StubConfigModel.prototype.validate = function () {
  return Promise.resolve();
};
_StubConfigModel.prototype.save = function () {
  return Promise.resolve(this);
};
_StubConfigModel.prototype.toObject = function () {
  return { ...this };
};

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionBranchConfigService({
    configModel: _StubConfigModel,
    enforceMfa,
    now,
  });
}

// ─── 1. upsert — tier 2 (15 min) ──────────────────────────────────

describe('Wave 275f — upsert MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.upsert({
      branchId: 'branch-1',
      patch: { confidenceThresholds: {} },
      actorId: 'u1',
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
    expect(r.actorTier).toBe(1);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.upsert({
      branchId: 'branch-1',
      patch: { confidenceThresholds: {} },
      actorId: 'u1',
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBe(20);
  });

  test('MFA guard runs BEFORE branchId validation (fail-fast)', async () => {
    const svc = _makeService();
    const r = await svc.upsert({
      // No branchId — would normally fire BRANCH_CONFIG_NO_BRANCH
      patch: {},
      actor: { userId: 'u1', mfaLevel: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard and proceeds to validation (no actor.userId fail)', async () => {
    const svc = _makeService();
    const r = await svc.upsert({
      branchId: 'branch-1',
      // No patch specifics + new-config path so actorId not strictly
      // required for the create flow. Guard passes → reaches save.
      patch: {},
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
    });
    // Past MFA guard. May fail on later validation steps (model not
    // properly stubbed for full save), but NOT on MFA.
    if (!r.ok) {
      expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
      expect(r.reason).not.toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    }
  });

  test('enforceMfa=false bypasses guard (no actor needed)', async () => {
    const svc = _makeService({ enforceMfa: false });
    const r = await svc.upsert({
      branchId: 'branch-1',
      patch: {},
    });
    // MFA bypassed → proceeds to domain. Either ok or domain error,
    // but NOT MFA.
    if (!r.ok) {
      expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
      expect(r.reason).not.toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    }
  });
});

// ─── 2. reset → upsert chain (actor flows through) ────────────────

describe('Wave 275f — reset chain test', () => {
  test('reset propagates opts.actor to upsert MFA guard', async () => {
    const svc = _makeService();
    const r = await svc.reset('branch-1', 'u1', {
      actor: { userId: 'u1', mfaLevel: 0 },
    });
    // reset → upsert → MFA tier check fires → reject
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('reset without opts.actor → MFA reject (defaults to tier 0)', async () => {
    const svc = _makeService();
    const r = await svc.reset('branch-1', 'u1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.actorTier).toBe(0);
  });

  test('reset with fresh tier-2 actor passes MFA', async () => {
    const svc = _makeService();
    const r = await svc.reset('branch-1', 'u1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    // Past MFA. May fail later but NOT on MFA.
    if (!r.ok) {
      expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
      expect(r.reason).not.toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    }
  });

  test('reset still rejects missing branchId early (existing contract preserved)', async () => {
    const svc = _makeService({ enforceMfa: false }); // bypass MFA to test domain check
    const r = await svc.reset(null, 'u1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.BRANCH_CONFIG_NO_BRANCH);
  });
});

// ─── 3. Read methods stay open (deliberate) ───────────────────────

describe('Wave 275f — read methods stay open', () => {
  test('list is NOT MFA-gated (read-only)', async () => {
    const svc = _makeService();
    // No actor at all — would fail any tier gate.
    const r = await svc.list();
    expect(r.ok).toBe(true);
  });

  test('get is NOT MFA-gated (read-only)', async () => {
    const svc = _makeService();
    const r = await svc.get('branch-1');
    expect(r.ok).toBe(true);
  });

  test('resolveEffective is NOT MFA-gated (hot-path read)', async () => {
    const svc = _makeService();
    const r = await svc.resolveEffective('branch-1');
    expect(r.ok).toBe(true);
    // resolveEffective is called from the parser per-event — gating
    // would tank throughput. Stays unconditionally open.
  });
});

// ─── 4. factory enforceMfa flag ───────────────────────────────────

describe('Wave 275f — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 110 tests)', async () => {
    const defaultSvc = createHikvisionBranchConfigService({
      configModel: _StubConfigModel,
    });
    const r = await defaultSvc.upsert({
      branchId: 'branch-1',
      patch: {},
      // No actor — would reject if enforceMfa were true by default.
    });
    // Default OFF → MFA bypassed → either ok or domain error.
    if (!r.ok) {
      expect(r.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
    }
  });

  test('enforceMfa: true → guard fires; enforceMfa: false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });

    const r1 = await enforced.upsert({
      branchId: 'branch-1',
      patch: {},
      actor: { userId: 'u1' },
    });
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    const r2 = await bypassed.upsert({
      branchId: 'branch-1',
      patch: {},
    });
    if (!r2.ok) {
      expect(r2.reason).not.toBe(reg.REASON.MFA_TIER_REQUIRED);
    }
  });
});
