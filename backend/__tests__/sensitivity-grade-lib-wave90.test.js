/**
 * sensitivity-grade-lib-wave90.test.js — Wave 90.
 *
 * Direct tests for the canonical sensitivity-grade library. The platform
 * had four parallel measures (severity / mfaTier / freshness / retention)
 * that drifted apart; this lib makes LEVEL the single dial and derives
 * everything else.
 */

'use strict';

const lib = require('../intelligence/sensitivity-grade.lib');

const {
  SENSITIVITY_LEVELS,
  SENSITIVITY_GRADES,
  sensitivityGrade,
  gradeForSeverity,
  gradeForLifecycleTransition,
  isValidLevel,
} = lib;

describe('sensitivity-grade.lib — exports + constants (Wave 90)', () => {
  test('SENSITIVITY_LEVELS frozen with 4 named levels', () => {
    expect(Object.isFrozen(SENSITIVITY_LEVELS)).toBe(true);
    expect(Object.keys(SENSITIVITY_LEVELS).sort()).toEqual(['CRITICAL', 'HIGH', 'LOW', 'MEDIUM']);
    expect(SENSITIVITY_LEVELS.LOW).toBe('LOW');
    expect(SENSITIVITY_LEVELS.CRITICAL).toBe('CRITICAL');
  });

  test('SENSITIVITY_GRADES frozen with one entry per level', () => {
    expect(Object.isFrozen(SENSITIVITY_GRADES)).toBe(true);
    for (const level of Object.values(SENSITIVITY_LEVELS)) {
      expect(Object.isFrozen(SENSITIVITY_GRADES[level])).toBe(true);
    }
  });

  test('isValidLevel — true for canonical, false for everything else', () => {
    expect(isValidLevel('LOW')).toBe(true);
    expect(isValidLevel('CRITICAL')).toBe(true);
    expect(isValidLevel('low')).toBe(false);
    expect(isValidLevel('EXTREME')).toBe(false);
    expect(isValidLevel(null)).toBe(false);
    expect(isValidLevel(3)).toBe(false);
  });
});

describe('sensitivity-grade.lib — baseline grade table (Wave 90)', () => {
  test('LOW — no MFA / no ledger / 1y retention / no banner', () => {
    const g = SENSITIVITY_GRADES.LOW;
    expect(g.mfaTier).toBe(1);
    expect(g.mfaFreshnessMs).toBe(0);
    expect(g.requiresLedgerAnchor).toBe(false);
    expect(g.requiresNafath).toBe(false);
    expect(g.auditRetentionYears).toBe(1);
    expect(g.pdplBanner).toBeNull();
  });

  test('MEDIUM — tier 1 / 3y retention / no banner', () => {
    const g = SENSITIVITY_GRADES.MEDIUM;
    expect(g.mfaTier).toBe(1);
    expect(g.auditRetentionYears).toBe(3);
    expect(g.requiresLedgerAnchor).toBe(false);
    expect(g.pdplBanner).toBeNull();
  });

  test('HIGH — tier 2 / 15min freshness / ledger / 7y / Art13 banner', () => {
    const g = SENSITIVITY_GRADES.HIGH;
    expect(g.mfaTier).toBe(2);
    expect(g.mfaFreshnessMs).toBe(15 * 60 * 1000);
    expect(g.requiresLedgerAnchor).toBe(true);
    expect(g.requiresNafath).toBe(false);
    expect(g.auditRetentionYears).toBe(7);
    expect(g.pdplBanner).toBe('Art13');
  });

  test('CRITICAL — tier 3 / 5min freshness / ledger + Nafath / 10y / Art13', () => {
    const g = SENSITIVITY_GRADES.CRITICAL;
    expect(g.mfaTier).toBe(3);
    expect(g.mfaFreshnessMs).toBe(5 * 60 * 1000);
    expect(g.requiresLedgerAnchor).toBe(true);
    expect(g.requiresNafath).toBe(true);
    expect(g.auditRetentionYears).toBe(10);
    expect(g.pdplBanner).toBe('Art13');
  });

  test('retention monotonically increases with severity', () => {
    expect(SENSITIVITY_GRADES.LOW.auditRetentionYears).toBeLessThan(
      SENSITIVITY_GRADES.MEDIUM.auditRetentionYears
    );
    expect(SENSITIVITY_GRADES.MEDIUM.auditRetentionYears).toBeLessThan(
      SENSITIVITY_GRADES.HIGH.auditRetentionYears
    );
    expect(SENSITIVITY_GRADES.HIGH.auditRetentionYears).toBeLessThan(
      SENSITIVITY_GRADES.CRITICAL.auditRetentionYears
    );
  });

  test('mfaTier weakly increases with severity (HIGH→tier2, CRITICAL→tier3)', () => {
    expect(SENSITIVITY_GRADES.HIGH.mfaTier).toBeGreaterThanOrEqual(2);
    expect(SENSITIVITY_GRADES.CRITICAL.mfaTier).toBe(3);
  });
});

describe('sensitivity-grade.lib — sensitivityGrade(level, overrides) (Wave 90)', () => {
  test('returns frozen baseline when no overrides', () => {
    const g = sensitivityGrade('HIGH');
    expect(Object.isFrozen(g)).toBe(true);
    expect(g).toBe(SENSITIVITY_GRADES.HIGH); // same reference
  });

  test('throws on invalid level', () => {
    expect(() => sensitivityGrade('low')).toThrow(/invalid level/);
    expect(() => sensitivityGrade('EXTREME')).toThrow(/invalid level/);
    expect(() => sensitivityGrade(null)).toThrow(/invalid level/);
  });

  test('mfaTier override honoured', () => {
    const g = sensitivityGrade('HIGH', { mfaTier: 3 });
    expect(g.mfaTier).toBe(3);
    expect(g.level).toBe('HIGH'); // level unchanged
    expect(g.auditRetentionYears).toBe(7); // unchanged
  });

  test('requiresNafath override honoured (HIGH transition that DOES need Nafath)', () => {
    const g = sensitivityGrade('HIGH', { requiresNafath: true });
    expect(g.requiresNafath).toBe(true);
  });

  test('throws on invalid mfaTier override', () => {
    expect(() => sensitivityGrade('HIGH', { mfaTier: 4 })).toThrow(/mfaTier must be 1\|2\|3/);
    expect(() => sensitivityGrade('HIGH', { mfaTier: '3' })).toThrow(/mfaTier must be 1\|2\|3/);
  });

  test('throws on invalid pdplBanner override', () => {
    expect(() => sensitivityGrade('HIGH', { pdplBanner: 'Art99' })).toThrow(/pdplBanner must be/);
  });

  test('cannot override level via overrides', () => {
    expect(() => sensitivityGrade('HIGH', { level: 'LOW' })).toThrow(/cannot override level/);
  });

  test('returned grade is frozen', () => {
    const g = sensitivityGrade('HIGH', { mfaTier: 3 });
    expect(Object.isFrozen(g)).toBe(true);
    expect(() => {
      g.mfaTier = 1;
    }).toThrow();
  });

  test('null/undefined overrides ignored (except pdplBanner=null explicitly)', () => {
    const g = sensitivityGrade('HIGH', { mfaTier: undefined, requiresNafath: null });
    expect(g.mfaTier).toBe(2); // baseline
    expect(g.requiresNafath).toBe(false); // baseline
  });

  test('pdplBanner=null explicit override sets to null', () => {
    const g = sensitivityGrade('CRITICAL', { pdplBanner: null });
    expect(g.pdplBanner).toBeNull();
  });
});

describe('sensitivity-grade.lib — gradeForSeverity (Wave 90)', () => {
  test('normalises lowercase severity to canonical level', () => {
    expect(gradeForSeverity('low').level).toBe('LOW');
    expect(gradeForSeverity('medium').level).toBe('MEDIUM');
    expect(gradeForSeverity('high').level).toBe('HIGH');
    expect(gradeForSeverity('critical').level).toBe('CRITICAL');
  });

  test('case insensitive', () => {
    expect(gradeForSeverity('High').level).toBe('HIGH');
    expect(gradeForSeverity('CRITICAL').level).toBe('CRITICAL');
  });

  test('throws on unknown severity', () => {
    expect(() => gradeForSeverity('extreme')).toThrow(/invalid severity/);
    expect(() => gradeForSeverity(null)).toThrow(/invalid severity/);
  });

  test('overrides flow through', () => {
    const g = gradeForSeverity('high', { mfaTier: 3, requiresNafath: true });
    expect(g.mfaTier).toBe(3);
    expect(g.requiresNafath).toBe(true);
  });
});

describe('sensitivity-grade.lib — gradeForLifecycleTransition adapter (Wave 90)', () => {
  test('reads severity + applies mfaTier + requiresNafath from transition', () => {
    const transition = {
      id: 'transfer-branch',
      severity: 'critical',
      mfaTier: 3,
      requiresNafath: true,
    };
    const g = gradeForLifecycleTransition(transition);
    expect(g.level).toBe('CRITICAL');
    expect(g.mfaTier).toBe(3);
    expect(g.requiresNafath).toBe(true);
    expect(g.requiresLedgerAnchor).toBe(true);
    expect(g.auditRetentionYears).toBe(10);
    expect(g.pdplBanner).toBe('Art13');
  });

  test('high severity without explicit Nafath defaults to false', () => {
    const transition = {
      id: 'reassign-therapist',
      severity: 'high',
      mfaTier: 2,
      requiresNafath: false,
    };
    const g = gradeForLifecycleTransition(transition);
    expect(g.level).toBe('HIGH');
    expect(g.mfaTier).toBe(2);
    expect(g.requiresNafath).toBe(false);
  });

  test('low severity transition gets baseline grade (no overrides)', () => {
    const transition = { id: 'note', severity: 'low', mfaTier: 1 };
    const g = gradeForLifecycleTransition(transition);
    expect(g.mfaTier).toBe(1);
    expect(g.auditRetentionYears).toBe(1);
  });

  test('throws when transition object missing', () => {
    expect(() => gradeForLifecycleTransition(null)).toThrow(/transition object required/);
    expect(() => gradeForLifecycleTransition('x')).toThrow(/transition object required/);
  });

  test('throws when severity missing or unknown', () => {
    expect(() => gradeForLifecycleTransition({ id: 'x', severity: 'extreme' })).toThrow(
      /invalid severity/
    );
  });
});
