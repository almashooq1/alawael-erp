/**
 * kpi-aliases.test.js — Phase 10 Commit 10.
 *
 * Locks the contract for `config/kpi.aliases.js`:
 *   - every non-null alias target exists in kpi.registry;
 *   - `resolveKpiId()` returns the canonical id, the raw id, or null
 *     in the documented cases;
 *   - `gapAliases()` matches the null-targeted subset.
 */

'use strict';

const { KPI_ALIASES, resolveKpiId, gapAliases, aliasKeys } = require('../config/kpi.aliases');
const kpi = require('../config/kpi.registry');

describe('KPI_ALIASES shape', () => {
  test('is a frozen object', () => {
    expect(Object.isFrozen(KPI_ALIASES)).toBe(true);
  });

  test('every non-null value is an id that exists in kpi.registry', () => {
    for (const [alias, target] of Object.entries(KPI_ALIASES)) {
      if (target == null) continue;
      expect(kpi.byId(target)).toBeTruthy();
    }
  });

  test('every alias key is unique (by construction)', () => {
    expect(new Set(aliasKeys()).size).toBe(aliasKeys().length);
  });
});

describe('resolveKpiId', () => {
  test('returns the canonical id for a mapped alias', () => {
    expect(resolveKpiId('rehab.goal.mastery_rate')).toBe('rehab.goals.achievement_rate.pct');
    expect(resolveKpiId('hr.cpe.compliance_rate')).toBe('hr.credentials.compliance.pct');
  });

  test('returns the input unchanged when it is already a valid registry id', () => {
    const existing = kpi.KPIS[0].id;
    expect(resolveKpiId(existing)).toBe(existing);
  });

  test('returns null for a gap alias (catalog refers to a KPI not yet in registry)', () => {
    expect(resolveKpiId('hr.turnover.voluntary_rate')).toBeNull();
    expect(resolveKpiId('finance.invoices.aging_ratio')).toBeNull();
  });

  test('returns null for a completely unknown id', () => {
    expect(resolveKpiId('mars.rover.uptime')).toBeNull();
    expect(resolveKpiId('')).toBeNull();
    expect(resolveKpiId(null)).toBeNull();
  });
});

describe('gapAliases', () => {
  test('lists exactly the null-targeted aliases', () => {
    const gaps = gapAliases().sort();
    const expected = Object.entries(KPI_ALIASES)
      .filter(([, v]) => v == null)
      .map(([k]) => k)
      .sort();
    expect(gaps).toEqual(expected);
  });

  test('gap count is bounded (future commits reduce it)', () => {
    expect(gapAliases().length).toBeLessThanOrEqual(5);
  });
});
