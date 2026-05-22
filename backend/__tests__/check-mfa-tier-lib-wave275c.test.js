'use strict';

/**
 * check-mfa-tier-lib-wave275c.test.js — Wave 275c.
 *
 * Unit tests for the extracted `intelligence/_checkMfaTier.lib.js`.
 * The lib was extracted from inline duplicates in payroll-period
 * (W275) + fraud-detection (W275b) when the 3rd service adopter
 * (face-enrollment, W275c) triggered the extraction per CLAUDE.md
 * "three similar lines is better than a premature abstraction".
 *
 * Coverage parity with the previous inline tests in W275/W275b
 * (proves nothing regressed in the extraction).
 */

const { checkMfaTier } = require('../intelligence/mfa-tier-check.lib');
const reg = require('../intelligence/hikvision.registry');

const NOW = () => new Date('2026-05-22T15:00:00Z');

// ─── enforceMfa flag ──────────────────────────────────────────────

describe('Wave 275c — checkMfaTier enforceMfa flag', () => {
  test('returns ok unconditionally when enforceMfa=false', () => {
    const r = checkMfaTier({ userId: 'u' }, 3, 5, { enforceMfa: false, now: NOW });
    expect(r.ok).toBe(true);
  });

  test('default enforceMfa is true (security-first when omitted)', () => {
    // No mfaLevel → would reject at tier check
    const r = checkMfaTier({ userId: 'u' }, 2, 15, { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
  });
});

// ─── Tier check ───────────────────────────────────────────────────

describe('Wave 275c — checkMfaTier tier check', () => {
  test('rejects MFA_TIER_REQUIRED when actor.mfaLevel < requiredTier', () => {
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 1, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      2,
      15,
      { enforceMfa: true, now: NOW }
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.requiredTier).toBe(2);
    expect(r.actorTier).toBe(1);
  });

  test('treats missing actor as tier 0', () => {
    const r = checkMfaTier(null, 1, 60, { enforceMfa: true, now: NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_TIER_REQUIRED);
    expect(r.actorTier).toBe(0);
  });

  test('treats actor.mfaLevel of wrong type as 0', () => {
    const r = checkMfaTier({ userId: 'u', mfaLevel: 'two' }, 2, 15, {
      enforceMfa: true,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.actorTier).toBe(0);
  });

  test('accepts when actor.mfaLevel exceeds requiredTier', () => {
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:59:30Z') },
      2,
      15,
      { enforceMfa: true, now: NOW }
    );
    expect(r.ok).toBe(true);
  });
});

// ─── Freshness check ──────────────────────────────────────────────

describe('Wave 275c — checkMfaTier freshness check', () => {
  test('rejects MFA_FRESHNESS_REQUIRED when assertion older than maxAgeMin', () => {
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
      2,
      15,
      { enforceMfa: true, now: NOW }
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.maxAgeMin).toBe(15);
    expect(r.ageMin).toBe(20);
  });

  test('rejects MFA_FRESHNESS_REQUIRED when mfaAssertedAt is null', () => {
    const r = checkMfaTier({ userId: 'u', mfaLevel: 2, mfaAssertedAt: null }, 2, 15, {
      enforceMfa: true,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBeNull();
  });

  test('rejects MFA_FRESHNESS_REQUIRED on invalid date string', () => {
    const r = checkMfaTier({ userId: 'u', mfaLevel: 2, mfaAssertedAt: 'not-a-date' }, 2, 15, {
      enforceMfa: true,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.MFA_FRESHNESS_REQUIRED);
    expect(r.ageMin).toBeNull();
  });

  test('accepts when assertion is within window (Date)', () => {
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
      2,
      15,
      { enforceMfa: true, now: NOW }
    );
    expect(r.ok).toBe(true);
  });

  test('accepts when assertion is within window (ISO string)', () => {
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 2, mfaAssertedAt: '2026-05-22T14:50:00Z' },
      2,
      15,
      {
        enforceMfa: true,
        now: NOW,
      }
    );
    expect(r.ok).toBe(true);
  });

  test('floors fractional minutes', () => {
    // 30 sec ago → 0 minutes → within any window
    const r = checkMfaTier(
      { userId: 'u', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:59:30Z') },
      2,
      0,
      { enforceMfa: true, now: NOW }
    );
    expect(r.ok).toBe(true);
  });
});

// ─── now() injection ──────────────────────────────────────────────

describe('Wave 275c — checkMfaTier now injection', () => {
  test('uses opts.now when provided', () => {
    let called = 0;
    const customNow = () => {
      called++;
      return new Date('2026-05-22T15:00:00Z');
    };
    checkMfaTier(
      { userId: 'u', mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:55:00Z') },
      2,
      15,
      { enforceMfa: true, now: customNow }
    );
    expect(called).toBeGreaterThanOrEqual(1);
  });

  test('defaults to real new Date() when no opts.now', () => {
    // Real-time call — assertion 0ms ago → fresh
    const r = checkMfaTier({ userId: 'u', mfaLevel: 2, mfaAssertedAt: new Date() }, 2, 15, {
      enforceMfa: true,
    });
    expect(r.ok).toBe(true);
  });
});

// ─── Registry constants sanity ────────────────────────────────────

describe('Wave 275c — registry constants', () => {
  test('MFA_TIER_REQUIRED is registered', () => {
    expect(reg.REASON.MFA_TIER_REQUIRED).toBe('MFA_TIER_REQUIRED');
  });

  test('MFA_FRESHNESS_REQUIRED is registered', () => {
    expect(reg.REASON.MFA_FRESHNESS_REQUIRED).toBe('MFA_FRESHNESS_REQUIRED');
  });
});
