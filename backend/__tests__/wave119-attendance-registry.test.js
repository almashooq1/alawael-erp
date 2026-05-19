/**
 * wave119-attendance-registry.test.js — Wave 119.
 *
 * Tests for the generalized attendance source registry. Pure helpers
 * are tested directly; schema-level validation is covered via the
 * mongoose model's own invariants.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');

// ─── 1. Catalogue completeness ──────────────────────────────────

describe('attendance.registry — catalogue', () => {
  test('SOURCE_KINDS includes all 10 design sources + legacy aliases', () => {
    expect(reg.SOURCE_KINDS).toEqual(
      expect.arrayContaining([
        'face-terminal',
        'fingerprint',
        'camera-passive',
        'card',
        'manual',
        'nfc',
        'mobile-gps',
        'qr-scan',
        'kiosk',
        'api-import',
        'supervisor-override',
        'auto-rule',
      ])
    );
  });

  test('every source has a baseline trust tier', () => {
    for (const s of reg.SOURCE_KINDS) {
      expect(reg.SOURCE_TRUST_BASELINE[s]).toBeDefined();
      expect(reg.TRUST_TIERS).toContain(reg.SOURCE_TRUST_BASELINE[s]);
    }
  });

  test('every source has an Arabic label', () => {
    for (const s of reg.SOURCE_KINDS) {
      expect(reg.SOURCE_LABELS_AR[s]).toBeTruthy();
    }
  });

  test('TRUST_TIERS are T1..T4 only', () => {
    expect([...reg.TRUST_TIERS].sort()).toEqual(['T1', 'T2', 'T3', 'T4']);
  });
});

// ─── 2. inferTrustTier ──────────────────────────────────────────

describe('attendance.registry — inferTrustTier', () => {
  test('face-terminal at 95% stays T1', () => {
    expect(reg.inferTrustTier('face-terminal', 95)).toBe('T1');
  });

  test('face-terminal at 70% (below floor 85) demotes to T2', () => {
    expect(reg.inferTrustTier('face-terminal', 70)).toBe('T2');
  });

  test('mobile-gps at 50% (below floor 60) demotes T3 → T4', () => {
    expect(reg.inferTrustTier('mobile-gps', 50)).toBe('T4');
  });

  test('time-drift flag demotes one tier', () => {
    expect(reg.inferTrustTier('face-terminal', 95, { driftFlag: 'time-drift' })).toBe('T2');
  });

  test('low-confidence flag demotes one tier', () => {
    expect(reg.inferTrustTier('camera-passive', 95, { flags: ['low-confidence'] })).toBe('T3');
  });

  test('multiple demotions stack but cap at T4', () => {
    const r = reg.inferTrustTier('face-terminal', 50, {
      driftFlag: 'time-drift',
      flags: ['low-confidence'],
    });
    expect(r).toBe('T4');
  });

  test('unknown source defaults to T4', () => {
    expect(reg.inferTrustTier('totally-unknown', 100)).toBe('T4');
  });

  test('NFC is T2 by design (hardware-binary)', () => {
    expect(reg.inferTrustTier('nfc', 100)).toBe('T2');
  });

  test('manual override is T4 regardless of confidence', () => {
    expect(reg.inferTrustTier('supervisor-override', 100)).toBe('T4');
  });
});

// ─── 3. inferEffectiveConfidence ────────────────────────────────

describe('attendance.registry — inferEffectiveConfidence', () => {
  test('no flags → identity', () => {
    expect(reg.inferEffectiveConfidence({ source: 'face-terminal', baseConfidence: 92 })).toBe(92);
  });

  test('time-drift subtracts 20', () => {
    expect(
      reg.inferEffectiveConfidence({
        source: 'face-terminal',
        baseConfidence: 92,
        flags: ['time-drift'],
      })
    ).toBe(72);
  });

  test('manual-override forces 100', () => {
    expect(
      reg.inferEffectiveConfidence({
        source: 'supervisor-override',
        baseConfidence: 50,
        flags: ['manual-override'],
      })
    ).toBe(100);
  });

  test('multiple penalties stack but clamp at 0', () => {
    const c = reg.inferEffectiveConfidence({
      source: 'mobile-gps',
      baseConfidence: 30,
      flags: ['time-drift', 'low-confidence', 'fallback-source'],
    });
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(30);
  });

  test('out-of-range base confidence clamps to [0,100]', () => {
    expect(reg.inferEffectiveConfidence({ source: 'face-terminal', baseConfidence: 150 })).toBe(
      100
    );
    expect(reg.inferEffectiveConfidence({ source: 'face-terminal', baseConfidence: -10 })).toBe(0);
  });
});

// ─── 4. Role restrictions ───────────────────────────────────────

describe('attendance.registry — role restrictions', () => {
  test('therapist allowed: face-terminal + kiosk + override', () => {
    const allowed = reg.classifySourceForRole('therapist');
    expect(allowed).toContain('face-terminal');
    expect(allowed).toContain('kiosk');
    expect(allowed).not.toContain('nfc');
  });

  test('driver allowed: nfc + mobile-gps + override', () => {
    const allowed = reg.classifySourceForRole('driver');
    expect(allowed).toContain('nfc');
    expect(allowed).toContain('mobile-gps');
    expect(allowed).not.toContain('face-terminal');
  });

  test('branch_manager allowed everything', () => {
    expect(reg.classifySourceForRole('branch_manager')).toEqual(reg.SOURCE_KINDS);
  });

  test('unknown role defaults to all sources (fail-open at policy layer)', () => {
    expect(reg.classifySourceForRole('mystery-role')).toEqual(reg.SOURCE_KINDS);
  });

  test('isSourceAllowedForRole quick check', () => {
    expect(reg.isSourceAllowedForRole('face-terminal', 'therapist')).toBe(true);
    expect(reg.isSourceAllowedForRole('nfc', 'therapist')).toBe(false);
  });
});

// ─── 5. Fallback / confirm-only semantics ───────────────────────

describe('attendance.registry — fallback + confirm-only', () => {
  test('mobile-gps / qr-scan / kiosk are fallback sources', () => {
    expect(reg.isFallbackSource('mobile-gps')).toBe(true);
    expect(reg.isFallbackSource('qr-scan')).toBe(true);
    expect(reg.isFallbackSource('kiosk')).toBe(true);
  });

  test('face-terminal is NOT a fallback', () => {
    expect(reg.isFallbackSource('face-terminal')).toBe(false);
  });

  test('camera-passive is confirm-only', () => {
    expect(reg.isConfirmOnlySource('camera-passive')).toBe(true);
  });

  test('nfc is NOT confirm-only (can originate events)', () => {
    expect(reg.isConfirmOnlySource('nfc')).toBe(false);
  });
});

// ─── 6. Legacy numeric tier bridge ──────────────────────────────

describe('attendance.registry — trustTierToNumeric', () => {
  test('T1 → 1', () => {
    expect(reg.trustTierToNumeric('T1')).toBe(1);
  });
  test('T2 → 2', () => {
    expect(reg.trustTierToNumeric('T2')).toBe(2);
  });
  test('T3 → 3', () => {
    expect(reg.trustTierToNumeric('T3')).toBe(3);
  });
  test('T4 → 3 (legacy schema collapses)', () => {
    expect(reg.trustTierToNumeric('T4')).toBe(3);
  });
  test('unknown → 3 (safe default)', () => {
    expect(reg.trustTierToNumeric('Tnope')).toBe(3);
  });
});

// ─── 7. REASON catalogue ────────────────────────────────────────

describe('attendance.registry — REASON codes', () => {
  test('all expected codes present', () => {
    expect(reg.REASON.SOURCE_NOT_SUPPORTED).toBe('ATTENDANCE_SOURCE_NOT_SUPPORTED');
    expect(reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE).toBe('ATTENDANCE_SOURCE_NOT_ALLOWED_FOR_ROLE');
    expect(reg.REASON.CONFIRM_ONLY_WITHOUT_PRIMARY).toBe('ATTENDANCE_CONFIRM_ONLY_WITHOUT_PRIMARY');
    expect(reg.REASON.DUPLICATE_WITHIN_WINDOW).toBe('ATTENDANCE_DUPLICATE_WITHIN_WINDOW');
  });
});

// ─── 8. Defaults ────────────────────────────────────────────────

describe('attendance.registry — DEFAULTS', () => {
  test('windows are sensible', () => {
    expect(reg.DEFAULTS.DUPLICATE_SUPPRESSION_WINDOW_MS).toBe(60_000);
    expect(reg.DEFAULTS.CORROBORATION_WINDOW_MS).toBe(30_000);
    expect(reg.DEFAULTS.IMPOSSIBLE_TRAVEL_WINDOW_MS).toBe(5 * 60_000);
  });
});
