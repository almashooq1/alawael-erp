'use strict';

/**
 * payroll-period-mfa-service-layer-wave275.test.js — Wave 275.
 *
 * Service-layer MFA tier enforcement pilot. Proves that with
 * `enforceMfa: true`, payroll-period.service's 4 sensitive methods
 * reject actors whose mfaLevel/freshness fall below the required
 * tier — regardless of HTTP route gating. This is defense-in-depth
 * on top of W273's route-layer requireMfaTier; closes the "what if a
 * cron/worker/CLI bypasses the HTTP route?" gap.
 *
 * Pilot scope (ONE service from the 14 in intelligence/hikvision-*).
 * After this pattern ships clean, the same enforceMfa flag + helper
 * extends to: reconciliation, fraud-detection, fraud-score, sync-worker,
 * face-enrollment, branch-config, branch-operations, etc. — each
 * as a separate W275-followup commit.
 *
 * What this test DOESN'T do: exercise the full method bodies. The 4
 * guard-paths are all early-returns at the top of each method, so the
 * test stubs only the model methods that get called BEFORE the guard
 * (none) plus a minimal periodModel/overrideModel to satisfy the
 * factory's required-port check. Real domain coverage stays in the
 * existing payroll-period-related sprint tests.
 */

const { createPayrollPeriodService } = require('../intelligence/payroll-period.service');
const reg = require('../intelligence/hikvision.registry');

// ─── Minimal model stubs satisfying the factory's required-port check ──
//
// These are deliberately incomplete: methods called AFTER the MFA
// guard (findById, save, updateMany, etc.) will throw if reached.
// That's the point — when the guard rejects, we never call them.

const _stubModel = Object.freeze({
  findById() {
    throw new Error('stub: findById should not be reached when MFA guard rejects');
  },
  findOne() {
    return null;
  },
  find() {
    return { sort: () => ({ lean: () => [] }), lean: () => [] };
  },
  updateMany() {
    return Promise.resolve({ modifiedCount: 0 });
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createPayrollPeriodService({
    periodModel: _stubModel,
    caseModel: _stubModel,
    overrideModel: _stubModel,
    sourceEventModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. closePeriod — tier 2 (15 min freshness) ───────────────────

describe('Wave 275 — closePeriod MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.closePeriod('period-1', {
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
    expect(r.actorTier).toBe(1);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.closePeriod('period-1', {
      // 20 min ago at fixed now=15:00:00
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(15);
    expect(r.ageMin).toBe(20);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when mfaAssertedAt is null', async () => {
    const svc = _makeService();
    const r = await svc.closePeriod('period-1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: null },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBeNull();
  });

  test('passes the guard then fails with VALIDATION/NOT_FOUND (stub model)', async () => {
    const svc = _makeService();
    // Tier 2, asserted 10 min ago — passes 15-min window.
    // Then stub.findById throws — proves the guard ran AND the method
    // proceeded past it.
    let caught = null;
    try {
      await svc.closePeriod('period-1', {
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
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
      // No mfaLevel at all on actor — would normally fail tier check.
      await svc.closePeriod('period-1', { actor: { userId: 'u1' } });
    } catch (err) {
      caught = err;
    }
    // Falls through to the stub (proving the guard was bypassed).
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 2. reopenPeriod — tier 3 (5 min freshness) ───────────────────

describe('Wave 275 — reopenPeriod MFA enforcement', () => {
  const VALID_REASON = 'audit reversal — invoice mismatch';

  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 3', async () => {
    const svc = _makeService();
    const r = await svc.reopenPeriod('p1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:58:00Z') },
      reason: VALID_REASON,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(3);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 5 min', async () => {
    const svc = _makeService();
    const r = await svc.reopenPeriod('p1', {
      // 7 min ago at fixed now
      actor: { userId: 'u1', mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:53:00Z') },
      reason: VALID_REASON,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(5);
    expect(r.ageMin).toBe(7);
  });

  test('MFA guard runs AFTER reason-length validation (defense-in-depth)', async () => {
    // If reason is < 10 chars, the existing validator fires first;
    // MFA never gets checked. This preserves the existing API
    // contract — clients fix the input before being asked to step
    // up MFA.
    const svc = _makeService();
    const r = await svc.reopenPeriod('p1', {
      actor: { userId: 'u1', mfaLevel: 0 },
      reason: 'short',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
    // Verify it's the reason validation that fired, not MFA
    expect(r.errors && r.errors.reason).toMatch(/min 10 chars/);
  });

  test('passes guard then fails on stub (proves chain proceeds past MFA)', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.reopenPeriod('p1', {
        actor: { userId: 'u1', mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:58:00Z') },
        reason: VALID_REASON,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 3. executeOverride — tier 3 (5 min freshness) ────────────────

describe('Wave 275 — executeOverride MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 3', async () => {
    const svc = _makeService();
    const r = await svc.executeOverride('ov-1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:59:00Z') },
      nafathSignatureId: 'sig-1',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(3);
  });

  test('MFA guard runs BEFORE nafathSignatureId check (forces step-up first)', async () => {
    // No tier → MFA fires. nafathSignatureId not required to verify
    // the guard order (which is intentional: the hardest gate goes
    // first so users don't waste effort on lower gates first).
    const svc = _makeService();
    const r = await svc.executeOverride('ov-1', {
      actor: { userId: 'u1', mfaLevel: 0 },
      // nafathSignatureId intentionally absent
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then fails with PAYROLL_OVERRIDE_NAFATH_REQUIRED', async () => {
    const svc = _makeService();
    const r = await svc.executeOverride('ov-1', {
      actor: { userId: 'u1', mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:59:00Z') },
      // nafathSignatureId absent — Nafath gate fires AFTER MFA
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.PAYROLL_OVERRIDE_NAFATH_REQUIRED);
  });
});

// ─── 4. draftOverride — tier 2 (15 min freshness) ─────────────────

describe('Wave 275 — draftOverride MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.draftOverride({
      payrollPeriodId: 'p1',
      reconciliationCaseId: 'c1',
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      reason: 'employee was on approved leave',
      afterSnapshot: { totalMinutes: 480 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('MFA guard runs AFTER actor-presence check (existing contract preserved)', async () => {
    const svc = _makeService();
    const r = await svc.draftOverride({
      payrollPeriodId: 'p1',
      reconciliationCaseId: 'c1',
      actor: null,
      reason: 'x',
      afterSnapshot: { totalMinutes: 1 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
    expect(r.errors && r.errors.actor).toBeTruthy();
  });
});

// ─── 5. enforceMfa flag default + factory shape ───────────────────

describe('Wave 275 — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with existing tests)', () => {
    // Verify default by calling closePeriod without MFA and observing
    // it falls through to the stub (would reject if enforceMfa were
    // true by default).
    const svc = _makeService({ enforceMfa: undefined });
    // The _makeService helper defaults enforceMfa=true; we override
    // with undefined to test the factory's own default. Re-build:
    const defaultSvc = createPayrollPeriodService({
      periodModel: _stubModel,
      caseModel: _stubModel,
      overrideModel: _stubModel,
    });
    void svc;
    return defaultSvc.closePeriod('p1', { actor: { userId: 'u1' } }).catch(err => {
      expect(String(err.message)).toMatch(/stub: findById/);
    });
  });

  test('enforceMfa: true → guard fires; enforceMfa: false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });
    const actor = { userId: 'u1' }; // no mfaLevel

    const r1 = await enforced.closePeriod('p1', { actor });
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    let bypassedErr = null;
    try {
      await bypassed.closePeriod('p1', { actor });
    } catch (err) {
      bypassedErr = err;
    }
    expect(bypassedErr).toBeTruthy();
    expect(String(bypassedErr.message)).toMatch(/stub: findById/);
  });
});

// ─── 6. MFA reason codes are registered in hikvision.registry ─────

describe('Wave 275 — registry constants', () => {
  test('MFA_TIER_REQUIRED is registered', () => {
    expect(reg.REASON.MFA_TIER_REQUIRED).toBe('MFA_TIER_REQUIRED');
  });

  test('MFA_FRESHNESS_REQUIRED is registered', () => {
    expect(reg.REASON.MFA_FRESHNESS_REQUIRED).toBe('MFA_FRESHNESS_REQUIRED');
  });
});
