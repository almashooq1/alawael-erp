/**
 * reporting-renderer-formatters.test.js — Phase 10 Commit 3.
 *
 * Pure-function tests: locale picking, null safety, Arabic-digits
 * conversion, percent vs ratio detection, period key grammar.
 */

'use strict';

const f = require('../services/reporting/renderer/formatters');

describe('toArabicDigits', () => {
  test('converts 0–9 to Arabic-Indic digits', () => {
    expect(f.toArabicDigits('1234567890')).toBe('١٢٣٤٥٦٧٨٩٠');
    expect(f.toArabicDigits('x-3')).toBe('x-٣');
  });
});

describe('formatDate', () => {
  test('returns ar formatted by default', () => {
    const d = new Date(Date.UTC(2026, 3, 22));
    expect(f.formatDate(d)).toMatch(/22 .+ 2026/);
  });

  test('en locale uses English month names', () => {
    const d = new Date(Date.UTC(2026, 3, 22));
    expect(f.formatDate(d, { locale: 'en' })).toContain('Apr');
  });

  test('null / invalid dates return —', () => {
    expect(f.formatDate(null)).toBe('—');
    expect(f.formatDate('not-a-date')).toBe('—');
  });

  test('useArabicDigits flips digits', () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    expect(f.formatDate(d, { useArabicDigits: true })).toContain('٥');
  });
});

describe('formatPeriodKey', () => {
  test('handles YYYY / YYYY-MM / YYYY-W## / YYYY-Q# / YYYY-H#', () => {
    expect(f.formatPeriodKey('2026')).toBe('2026');
    expect(f.formatPeriodKey('2026-04')).toContain('2026');
    expect(f.formatPeriodKey('2026-W17')).toContain('17');
    expect(f.formatPeriodKey('2026-Q2', { locale: 'en' })).toBe('Q2 2026');
    expect(f.formatPeriodKey('2026-H1', { locale: 'en' })).toBe('H1 2026');
  });
  test('unknown shape returns the raw key', () => {
    expect(f.formatPeriodKey('weird')).toBe('weird');
  });
  test('falsy returns —', () => {
    expect(f.formatPeriodKey(null)).toBe('—');
  });
});

describe('formatNumber', () => {
  test('uses thousands separator', () => {
    expect(f.formatNumber(1234567.891)).toBe('1,234,567.89');
  });
  test('rounds to maxFractionDigits', () => {
    // 1.005 is a float-rounding trap; use values that are exact in IEEE 754.
    expect(f.formatNumber(1.25, { maxFractionDigits: 1 })).toBe('1.3');
    expect(f.formatNumber(0.125, { maxFractionDigits: 2 })).toBe('0.13');
  });
  test('non-finite returns —', () => {
    expect(f.formatNumber(NaN)).toBe('—');
    expect(f.formatNumber('12')).toBe('—');
  });
});

describe('formatPercent', () => {
  test('treats 0..1 as ratio', () => {
    expect(f.formatPercent(0.753)).toBe('75.3%');
  });
  test('treats >1 as already-scaled', () => {
    expect(f.formatPercent(82.5)).toBe('82.5%');
  });
  test('negative ratio works', () => {
    expect(f.formatPercent(-0.2)).toBe('-20%');
  });
});

describe('formatCurrencySar', () => {
  test('ar locale suffixes ر.س', () => {
    expect(f.formatCurrencySar(1234.5, { locale: 'ar' })).toBe('1,234.5 ر.س');
  });
  test('en locale prefixes SAR', () => {
    expect(f.formatCurrencySar(1234.5, { locale: 'en' })).toBe('SAR 1,234.5');
  });
});

describe('formatDurationHours', () => {
  test('splits into hours + minutes', () => {
    expect(f.formatDurationHours(1.5, { locale: 'en' })).toBe('1h 30m');
    expect(f.formatDurationHours(1.5, { locale: 'ar' })).toBe('1 س 30 د');
  });
});

describe('formatList', () => {
  test('joins with locale-appropriate separator', () => {
    expect(f.formatList(['a', 'b', 'c'], { locale: 'en' })).toBe('a, b, c');
    expect(f.formatList(['أ', 'ب', 'ج'], { locale: 'ar' })).toBe('أ، ب، ج');
  });
  test('empty / falsy returns fallback', () => {
    expect(f.formatList([], { fallback: 'none' })).toBe('none');
  });
});

describe('escapeHtml', () => {
  test('escapes the standard five', () => {
    expect(f.escapeHtml('<a href="x&y">1\'2</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;1&#39;2&lt;/a&gt;'
    );
  });
  test('null-safe', () => {
    expect(f.escapeHtml(null)).toBe('');
  });
});
