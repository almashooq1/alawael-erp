'use strict';

/**
 * goal-consolidation-readiness-script.test.js — unit tests for the pure
 * `buildVerdicts()` of the READ-ONLY consolidation-readiness audit
 * (scripts/goal-model-consolidation-readiness.js).
 *
 * Pure logic — no DB. Requiring the script must NOT open a connection (the CLI
 * main() is guarded by `require.main === module`), so this is safe + fast.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/goal-consolidation-readiness-script.test.js
 */

const { buildVerdicts } = require('../scripts/goal-model-consolidation-readiness');

describe('goal-model-consolidation-readiness — buildVerdicts (pure)', () => {
  test('requiring the script exports buildVerdicts WITHOUT opening a DB connection', () => {
    expect(typeof buildVerdicts).toBe('function');
  });

  test('ADR-040: an EMPTY SmartGoal collection → retire is trivial', () => {
    const a040 = buildVerdicts({ SmartGoal: 0, TherapeuticGoal: 12 }).find(
      v => v.adr === 'ADR-040'
    );
    expect(a040.finding).toMatch(/EMPTY/);
    expect(a040.finding).toMatch(/NO data migration/);
  });

  test('ADR-040: a non-empty SmartGoal → migrate N to TherapeuticGoal', () => {
    const a040 = buildVerdicts({ SmartGoal: 7, TherapeuticGoal: 12 }).find(
      v => v.adr === 'ADR-040'
    );
    expect(a040.finding).toMatch(/7 doc/);
    expect(a040.finding).toMatch(/migrate/);
  });

  test('ADR-041: an EMPTY MeasurementMaster → fence/retire trivial (Measure canonical)', () => {
    const a041 = buildVerdicts({ Measure: 40, MeasurementMaster: 0 }).find(
      v => v.adr === 'ADR-041'
    );
    expect(a041.finding).toMatch(/EMPTY/);
  });

  test('ADR-041: MeasurementMaster outweighing Measure → flags re-examine canonical', () => {
    const a041 = buildVerdicts({ Measure: 3, MeasurementMaster: 50 }).find(
      v => v.adr === 'ADR-041'
    );
    expect(a041.finding).toMatch(/re-examine/);
  });

  test('ADR-042/026: reports CarePlan vs TherapeuticPlan counts', () => {
    const a = buildVerdicts({ CarePlan: 100, TherapeuticPlan: 5 }).find(
      v => v.adr === 'ADR-042/026'
    );
    expect(a.finding).toMatch(/CarePlan=100/);
    expect(a.finding).toMatch(/TherapeuticPlan=5/);
  });

  test('unresolved (null) counts produce NO verdicts (no false readiness signal)', () => {
    expect(buildVerdicts({ SmartGoal: null, Measure: null, CarePlan: null })).toEqual([]);
  });
});
