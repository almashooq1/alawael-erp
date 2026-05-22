'use strict';

/**
 * fraud-detection-mfa-service-layer-wave275b.test.js — Wave 275b.
 *
 * Second application of the service-layer MFA enforcement pattern
 * established in [[wave275-service-layer-mfa-pilot]] (payroll-period).
 * Coverage: dismissFlag + escalateFlag on hikvision-fraud-detection
 * (both tier 2 / 15 min). Mirrors the W275 6-section test shape.
 *
 * Pilot count after this commit: 2 of 13 services. The shared
 * `_checkMfaTier` helper still lives inline in each service per
 * CLAUDE.md "three similar lines is better than a premature
 * abstraction" — extract when 3rd service adopts.
 *
 * The escalateFlag guard ALSO closes a W273 route-layer oversight:
 * the original W273 audit listed dismissFlag but not escalateFlag.
 * Same commit adds requireMfaTier(2) at the route layer +
 * service layer + drift-guard rule so all 3 layers stay symmetric.
 */

const {
  createHikvisionFraudDetectionService,
} = require('../intelligence/hikvision-fraud-detection.service');
const reg = require('../intelligence/hikvision.registry');

// ─── Minimal model stubs ──────────────────────────────────────────
//
// `findById` throws on access — the guard MUST short-circuit before
// reaching it, OR the test "passes guard then fails on stub" path
// must catch the throw as the proof-of-passage assertion.

const _stubModel = Object.freeze({
  findById() {
    throw new Error('stub: findById should not be reached when MFA guard rejects');
  },
  findOne() {
    return null;
  },
  find() {
    return { limit: () => [], sort: () => ({ lean: () => [] }), lean: () => [] };
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createHikvisionFraudDetectionService({
    flagModel: _stubModel,
    processedEventModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. dismissFlag — tier 2 (15 min freshness) ───────────────────

describe('Wave 275b — dismissFlag MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.dismissFlag('flag-1', {
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      note: 'not actual fraud — pre-approved overtime',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
    expect(r.actorTier).toBe(1);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.dismissFlag('flag-1', {
      // 20 min ago at fixed now=15:00:00
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
      note: 'reviewed and dismissed',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(15);
    expect(r.ageMin).toBe(20);
  });

  test('MFA guard runs BEFORE note validation (fail-fast on heaviest gate)', async () => {
    // dismissFlag's domain check is `note.trim() required`. The W275
    // pilot's convention was "guard order = cost-to-fix order". For
    // dismiss, MFA goes FIRST because the user typing a dismissal
    // reason can't submit anything without MFA anyway — saves them
    // wasted effort.
    const svc = _makeService();
    const r = await svc.dismissFlag('flag-1', {
      actor: { userId: 'u1', mfaLevel: 0 },
      // note intentionally absent → would normally fire
      // FRAUD_FLAG_RESOLUTION_REASON_REQUIRED first
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then fails on stub (proves chain proceeds past MFA)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.dismissFlag('flag-1', {
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
        note: 'reviewed and dismissed',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById should not be reached/);
  });

  test('enforceMfa=false bypasses the MFA guard entirely', async () => {
    const svc = _makeService({ enforceMfa: false });
    let caught = null;
    try {
      // No mfaLevel + no note — would normally fail tier check.
      // With enforceMfa=false, MFA bypassed → note validation fires.
      await svc.dismissFlag('flag-1', { actor: { userId: 'u1' } });
    } catch (err) {
      caught = err;
    }
    // Bypass means MFA didn't fire — but note validation did, returning
    // a normal error object (not a throw). So no catch.
    expect(caught).toBeNull();
  });
});

// ─── 2. escalateFlag — tier 2 (15 min freshness) ──────────────────

describe('Wave 275b — escalateFlag MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.escalateFlag('flag-1', {
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      escalatedToRole: 'compliance_officer',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.escalateFlag('flag-1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:30:00Z') },
      escalatedToRole: 'compliance_officer',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(15);
    expect(r.ageMin).toBe(30);
  });

  test('MFA guard runs BEFORE escalatedToRole validation', async () => {
    // Same fail-fast rationale as dismissFlag.
    const svc = _makeService();
    const r = await svc.escalateFlag('flag-1', {
      actor: { userId: 'u1', mfaLevel: 0 },
      // escalatedToRole intentionally absent
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then fails on stub (proves chain proceeds past MFA)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.escalateFlag('flag-1', {
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
        escalatedToRole: 'compliance_officer',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 3. acknowledgeFlag — INTENTIONALLY NOT GATED (low impact) ────

describe('Wave 275b — acknowledgeFlag stays open (deliberate)', () => {
  test('acknowledgeFlag is NOT MFA-gated (matches W273 route-layer)', async () => {
    // acknowledgeFlag = "I saw this flag". Low impact, doesn't dismiss
    // or escalate state. Both W273 route layer and W275b service layer
    // explicitly leave it open. If a future audit decides otherwise,
    // add a guard here + at the route + a drift rule in W273b.
    const svc = _makeService();
    let caught = null;
    try {
      await svc.acknowledgeFlag('flag-1', {
        actor: { userId: 'u1' }, // no mfaLevel — would fail any guard
        note: 'noted',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 4. enforceMfa flag default + factory shape ───────────────────

describe('Wave 275b — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 100 tests)', async () => {
    // Construct WITHOUT enforceMfa option → default false.
    const defaultSvc = createHikvisionFraudDetectionService({
      flagModel: _stubModel,
      processedEventModel: _stubModel,
    });
    let caught = null;
    try {
      // No mfaLevel — would reject if enforceMfa were true.
      await defaultSvc.dismissFlag('flag-1', {
        actor: { userId: 'u1' },
        note: 'dismiss reason',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });

  test('enforceMfa: true → guard fires; enforceMfa: false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });

    const r1 = await enforced.dismissFlag('flag-1', {
      actor: { userId: 'u1' }, // no mfaLevel
      note: 'reason',
    });
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    let bypassedErr = null;
    try {
      await bypassed.dismissFlag('flag-1', {
        actor: { userId: 'u1' },
        note: 'reason',
      });
    } catch (err) {
      bypassedErr = err;
    }
    expect(bypassedErr).toBeTruthy();
    expect(String(bypassedErr.message)).toMatch(/stub: findById/);
  });
});

// ─── 5. Registry constants (already proven in W275; sanity here) ──

describe('Wave 275b — registry constants', () => {
  test('MFA_TIER_REQUIRED is exported', () => {
    expect(reg.REASON.MFA_TIER_REQUIRED).toBe('MFA_TIER_REQUIRED');
  });

  test('MFA_FRESHNESS_REQUIRED is exported', () => {
    expect(reg.REASON.MFA_FRESHNESS_REQUIRED).toBe('MFA_FRESHNESS_REQUIRED');
  });
});
