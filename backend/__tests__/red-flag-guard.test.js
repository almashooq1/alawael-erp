/**
 * red-flag-guard.test.js — Beneficiary-360 Commit 3c.
 *
 * The guard is the one place that reads `record.blocking`.
 * These tests pin its contract so that callers (routes,
 * schedulers, session-start UI) never need to re-implement
 * "what counts as blocking".
 */

'use strict';

const { canStartSession } = require('../services/redFlagGuard');

function fakeStore(active) {
  return { getAllActive: () => active };
}

describe('canStartSession — input guardrails', () => {
  it('throws when beneficiaryId is missing', () => {
    expect(() => canStartSession('', fakeStore([]))).toThrow(/beneficiaryId/);
    expect(() => canStartSession(null, fakeStore([]))).toThrow(/beneficiaryId/);
  });

  it('throws when store lacks getAllActive()', () => {
    expect(() => canStartSession('BEN-1', {})).toThrow(/getAllActive/);
  });
});

describe('canStartSession — standard verdicts', () => {
  it('allowed: true with no active flags', () => {
    const v = canStartSession('BEN-1', fakeStore([]));
    expect(v).toEqual({ allowed: true, blockingFlags: [], emergencyOverride: false });
  });

  it('allowed: true when active flags exist but none are blocking', () => {
    const active = [
      { flagId: 'attendance.monthly.rate.low_70', severity: 'warning', blocking: false },
      { flagId: 'family.portal.inactive.90d', severity: 'info', blocking: false },
    ];
    const v = canStartSession('BEN-1', fakeStore(active));
    expect(v.allowed).toBe(true);
    expect(v.blockingFlags).toEqual([]);
  });

  it('allowed: false when at least one blocking flag is active', () => {
    const active = [
      {
        flagId: 'clinical.consent.treatment.missing_pre_session',
        severity: 'critical',
        blocking: true,
      },
      { flagId: 'attendance.monthly.rate.low_70', severity: 'warning', blocking: false },
    ];
    const v = canStartSession('BEN-1', fakeStore(active));
    expect(v.allowed).toBe(false);
    expect(v.blockingFlags).toHaveLength(1);
    expect(v.blockingFlags[0].flagId).toBe('clinical.consent.treatment.missing_pre_session');
  });

  it('returns all blocking flags when multiple are raised', () => {
    const active = [
      { flagId: 'a', severity: 'critical', blocking: true },
      { flagId: 'b', severity: 'critical', blocking: true },
      { flagId: 'c', severity: 'warning', blocking: false },
    ];
    const v = canStartSession('BEN-1', fakeStore(active));
    expect(v.blockingFlags.map(f => f.flagId).sort()).toEqual(['a', 'b']);
  });
});

describe('canStartSession — emergency override', () => {
  it('emergency: true forces allowed: true even with blocking flags', () => {
    const active = [{ flagId: 'a', severity: 'critical', blocking: true }];
    const v = canStartSession('BEN-1', fakeStore(active), { emergency: true });
    expect(v.allowed).toBe(true);
    expect(v.emergencyOverride).toBe(true);
    expect(v.blockingFlags).toHaveLength(1);
  });

  it('emergency: true with no blocking flags → emergencyOverride: false', () => {
    const v = canStartSession('BEN-1', fakeStore([]), { emergency: true });
    expect(v.allowed).toBe(true);
    expect(v.emergencyOverride).toBe(false);
  });
});

describe('canStartSession — defensive parsing', () => {
  it('skips null entries in active list', () => {
    const active = [null, undefined, { flagId: 'a', severity: 'critical', blocking: true }];
    const v = canStartSession('BEN-1', fakeStore(active));
    expect(v.blockingFlags).toHaveLength(1);
    expect(v.allowed).toBe(false);
  });

  it('treats truthy-but-not-true `blocking` as not blocking', () => {
    const active = [{ flagId: 'a', severity: 'critical', blocking: 1 }];
    const v = canStartSession('BEN-1', fakeStore(active));
    expect(v.allowed).toBe(true);
  });
});
