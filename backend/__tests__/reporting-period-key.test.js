/**
 * reporting-period-key.test.js — Phase 10 Commit 7a.
 *
 * Pins the periodKey grammar shared by all real builders.
 */

'use strict';

const {
  parsePeriodKey,
  parseScopeKey,
  isoWeekRange,
} = require('../services/reporting/builders/periodKey');

function iso(date) {
  return date && date.toISOString().slice(0, 10);
}

describe('parsePeriodKey', () => {
  test('annual: YYYY → Jan 1 to Jan 1 next year', () => {
    const r = parsePeriodKey('2026');
    expect(r.kind).toBe('annual');
    expect(iso(r.start)).toBe('2026-01-01');
    expect(iso(r.end)).toBe('2027-01-01');
  });

  test('monthly: YYYY-MM spans that calendar month', () => {
    const r = parsePeriodKey('2026-04');
    expect(r.kind).toBe('monthly');
    expect(iso(r.start)).toBe('2026-04-01');
    expect(iso(r.end)).toBe('2026-05-01');
  });

  test('daily: YYYY-MM-DD spans exactly 24h', () => {
    const r = parsePeriodKey('2026-04-22');
    expect(r.kind).toBe('daily');
    expect(iso(r.start)).toBe('2026-04-22');
    expect(iso(r.end)).toBe('2026-04-23');
  });

  test('quarterly: YYYY-Q1..Q4 spans the 3 months', () => {
    const q1 = parsePeriodKey('2026-Q1');
    expect(iso(q1.start)).toBe('2026-01-01');
    expect(iso(q1.end)).toBe('2026-04-01');
    const q4 = parsePeriodKey('2026-Q4');
    expect(iso(q4.start)).toBe('2026-10-01');
    expect(iso(q4.end)).toBe('2027-01-01');
  });

  test('semiannual: YYYY-H1/H2 spans 6 months', () => {
    const h1 = parsePeriodKey('2026-H1');
    expect(iso(h1.start)).toBe('2026-01-01');
    expect(iso(h1.end)).toBe('2026-07-01');
    const h2 = parsePeriodKey('2026-H2');
    expect(iso(h2.start)).toBe('2026-07-01');
    expect(iso(h2.end)).toBe('2027-01-01');
  });

  test('weekly: YYYY-Www aligns to ISO-8601 week (Mon → next Mon)', () => {
    // 2026-W17: Monday Apr 20 2026 through Monday Apr 27 2026.
    const r = parsePeriodKey('2026-W17');
    expect(r.kind).toBe('weekly');
    expect(iso(r.start)).toBe('2026-04-20');
    expect(iso(r.end)).toBe('2026-04-27');
  });

  test('weekly: W01 uses the week containing Jan 4', () => {
    // 2026-01-01 is Thursday → ISO week 1 starts Monday 2025-12-29.
    const r = parsePeriodKey('2026-W01');
    expect(iso(r.start)).toBe('2025-12-29');
    expect(iso(r.end)).toBe('2026-01-05');
  });

  test('unknown shapes return null', () => {
    expect(parsePeriodKey('')).toBeNull();
    expect(parsePeriodKey(null)).toBeNull();
    expect(parsePeriodKey('2026-W99x')).toBeNull();
    expect(parsePeriodKey('not-a-key')).toBeNull();
  });
});

describe('parseScopeKey', () => {
  test('grammar type:id', () => {
    expect(parseScopeKey('beneficiary:abc')).toEqual({ type: 'beneficiary', id: 'abc' });
    expect(parseScopeKey('branch:507f')).toEqual({ type: 'branch', id: '507f' });
  });

  test('malformed returns null', () => {
    expect(parseScopeKey('no-colon')).toBeNull();
    expect(parseScopeKey(null)).toBeNull();
  });

  test('preserves id content after the first colon (allows sub-paths)', () => {
    expect(parseScopeKey('report:some:thing')).toEqual({ type: 'report', id: 'some:thing' });
  });
});

describe('isoWeekRange', () => {
  test('week boundaries are Monday→next-Monday inclusive/exclusive', () => {
    const r = isoWeekRange(2026, 17);
    expect(iso(r.start)).toBe('2026-04-20');
    expect(iso(r.end)).toBe('2026-04-27');
  });
});
