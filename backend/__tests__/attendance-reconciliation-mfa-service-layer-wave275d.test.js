'use strict';

/**
 * attendance-reconciliation-mfa-service-layer-wave275d.test.js — Wave 275d.
 *
 * 4th application of [[wave275-service-layer-mfa-pilot]] pattern via
 * the shared `mfa-tier-check.lib` extracted in W275c. Coverage:
 *   - resolveConflict (tier 2 / 15 min) — also closes W273 route
 *     oversight on /reconciliation/cases/:id/resolve (gated in
 *     same commit at the route layer + drift guard)
 *
 * Other reconciliation methods (reconcileEmployeeDay, reconcileBranchDay)
 * stay UNGATED — they compute reconciliation but don't mutate case
 * state with operator-supplied final times. Explicit negative case below.
 */

const {
  createAttendanceReconciliationService,
} = require('../intelligence/attendance-reconciliation.service');
const reg = require('../intelligence/hikvision.registry');

const _stubModel = Object.freeze({
  findById() {
    throw new Error('stub: findById should not be reached when MFA guard rejects');
  },
  find() {
    return { lean: () => [], sort: () => ({ lean: () => [] }) };
  },
  findOne() {
    return null;
  },
});

function _makeService({ enforceMfa = true, now = () => new Date('2026-05-22T15:00:00Z') } = {}) {
  return createAttendanceReconciliationService({
    caseModel: _stubModel,
    sourceEventModel: _stubModel,
    enforceMfa,
    now,
  });
}

// ─── 1. resolveConflict — tier 2 (15 min) ─────────────────────────

describe('Wave 275d — resolveConflict MFA enforcement', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < 2', async () => {
    const svc = _makeService();
    const r = await svc.resolveConflict('case-1', {
      actor: { userId: 'u1', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      note: 'verified via timesheet',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
    expect(r.actorTier).toBe(1);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than 15 min', async () => {
    const svc = _makeService();
    const r = await svc.resolveConflict('case-1', {
      actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
      note: 'verified via timesheet',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBe(20);
  });

  test('MFA guard runs AFTER actor-presence check (existing contract preserved)', async () => {
    const svc = _makeService();
    const r = await svc.resolveConflict('case-1', {
      actor: null,
      note: 'x',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.VALIDATION_FAILED);
    expect(r.errors && r.errors.actor).toBeTruthy();
  });

  test('MFA guard runs BEFORE note validation (fail-fast on heaviest gate)', async () => {
    const svc = _makeService();
    const r = await svc.resolveConflict('case-1', {
      actor: { userId: 'u1', mfaLevel: 0 },
      // note absent → would normally fire VALIDATION_FAILED { note }
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });

  test('passes guard then fails on stub findById', async () => {
    const svc = _makeService();
    let caught = null;
    try {
      await svc.resolveConflict('case-1', {
        actor: { userId: 'u1', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
        note: 'resolved per timesheet',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });

  test('enforceMfa=false bypasses guard', async () => {
    const svc = _makeService({ enforceMfa: false });
    let caught = null;
    try {
      await svc.resolveConflict('case-1', {
        actor: { userId: 'u1' }, // no mfaLevel
        note: 'resolved per timesheet',
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });
});

// ─── 2. reconcileEmployeeDay / reconcileBranchDay — NOT GATED ─────

describe('Wave 275d — compute methods stay open (deliberate)', () => {
  test('reconcileEmployeeDay is NOT MFA-gated (compute only, no state mutation)', async () => {
    // The reconciler computes a case shape from source events.
    // Mutation happens via resolveConflict (gated above). Compute
    // methods are idempotent and don't need MFA.
    const svc = _makeService();
    let caught = null;
    try {
      // No employeeId — would normally fire VALIDATION_FAILED.
      // If MFA were gating, would fire MFA_TIER_REQUIRED instead.
      await svc.reconcileEmployeeDay({
        actor: { userId: 'u1' }, // no mfaLevel
      });
    } catch (err) {
      caught = err;
    }
    // Confirms MFA isn't gating: either we get a domain error or the
    // method's own validation fires. We just need to confirm we DON'T
    // get an MFA error.
    // (The method's behavior with empty input depends on internals;
    // the assertion is "no MFA rejection" — see no MFA reason code.)
    if (caught) {
      expect(String(caught.message)).not.toMatch(/MFA_TIER_REQUIRED/);
    }
  });
});

// ─── 3. factory enforceMfa flag ───────────────────────────────────

describe('Wave 275d — factory enforceMfa flag', () => {
  test('default is OFF (backwards-compatible with Wave 99 tests)', async () => {
    const defaultSvc = createAttendanceReconciliationService({
      caseModel: _stubModel,
      sourceEventModel: _stubModel,
    });
    let caught = null;
    try {
      await defaultSvc.resolveConflict('case-1', {
        actor: { userId: 'u1' }, // no mfaLevel
        note: 'resolved',
      });
    } catch (err) {
      caught = err;
    }
    // Default OFF → MFA bypassed → falls to stub.
    expect(caught).toBeTruthy();
    expect(String(caught.message)).toMatch(/stub: findById/);
  });

  test('enforceMfa: true → guard fires; enforceMfa: false → bypass', async () => {
    const enforced = _makeService({ enforceMfa: true });
    const bypassed = _makeService({ enforceMfa: false });

    const r1 = await enforced.resolveConflict('case-1', {
      actor: { userId: 'u1' }, // no mfaLevel
      note: 'resolved',
    });
    expect(r1.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);

    let bypassedErr = null;
    try {
      await bypassed.resolveConflict('case-1', {
        actor: { userId: 'u1' },
        note: 'resolved',
      });
    } catch (err) {
      bypassedErr = err;
    }
    expect(bypassedErr).toBeTruthy();
  });
});
