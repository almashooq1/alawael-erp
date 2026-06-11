'use strict';

/**
 * golden-thread-integrity-script.test.js — unit tests for the pure
 * `summarizeThread()` of the READ-ONLY golden-thread integrity audit
 * (scripts/golden-thread-integrity.js).
 *
 * Pure logic — no DB. Requiring the script must NOT open a connection (the CLI
 * main() is guarded by `require.main === module`), so this is safe + fast.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-integrity-script.test.js
 */

const { summarizeThread, STAGES } = require('../scripts/golden-thread-integrity');

describe('golden-thread-integrity — summarizeThread (pure)', () => {
  test('requiring the script exports summarizeThread WITHOUT opening a DB connection', () => {
    expect(typeof summarizeThread).toBe('function');
    expect(STAGES).toContain('complete');
    expect(STAGES).toContain('no_measure_link');
  });

  test('empty data → NO_DATA grade + no false readiness signal', () => {
    const r = summarizeThread({ total: 0, byStage: {} });
    expect(r.grade).toBe('NO_DATA');
    expect(r.findings.join(' ')).toMatch(/no goals/i);
  });

  test('≥80% complete → HEALTHY', () => {
    const r = summarizeThread({ total: 10, byStage: { complete: 9, no_measure_link: 1 } });
    expect(r.grade).toBe('HEALTHY');
    expect(r.percentages.complete).toBe(90);
  });

  test('50–79% complete → PARTIAL', () => {
    const r = summarizeThread({
      total: 10,
      byStage: { complete: 6, no_measure_link: 2, linked_no_outcome: 2 },
    });
    expect(r.grade).toBe('PARTIAL');
  });

  test('<50% complete → FRAGMENTED', () => {
    const r = summarizeThread({
      total: 10,
      byStage: { complete: 3, no_measure_link: 5, linked_no_baseline: 2 },
    });
    expect(r.grade).toBe('FRAGMENTED');
    expect(r.percentages.complete).toBe(30);
  });

  test('surfaces the no_measure_link break-stage with a count + leverage hint', () => {
    const r = summarizeThread({ total: 4, byStage: { complete: 1, no_measure_link: 3 } });
    const f = r.findings.join(' ');
    expect(f).toMatch(/3 goal\(s\)/);
    expect(f).toMatch(/NO measure link/);
    expect(f).toMatch(/PRIMARY measure/);
  });

  test('surfaces linked_no_baseline + linked_no_outcome distinctly', () => {
    const r = summarizeThread({
      total: 4,
      byStage: { complete: 0, linked_no_baseline: 2, linked_no_outcome: 2 },
    });
    const f = r.findings.join(' ');
    expect(f).toMatch(/NO baseline/);
    expect(f).toMatch(/NO progress entries/);
  });

  test('percentages are computed for every stage even when absent (0%, no undefined)', () => {
    const r = summarizeThread({ total: 5, byStage: { complete: 5 } });
    for (const s of STAGES) {
      expect(typeof r.percentages[s]).toBe('number');
      expect(typeof r.counts[s]).toBe('number');
    }
    expect(r.percentages.complete).toBe(100);
    expect(r.counts.no_measure_link).toBe(0);
  });

  test('defensive: undefined arg → NO_DATA, no throw', () => {
    expect(() => summarizeThread()).not.toThrow();
    expect(summarizeThread().grade).toBe('NO_DATA');
  });
});
