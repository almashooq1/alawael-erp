'use strict';

const { normalize, escapeRegex, buildOrClause } = require('../../utils/arabicSearch');

describe('arabicSearch — normalize()', () => {
  test('returns empty string for null', () => {
    expect(normalize(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('');
  });

  test('normalizes alef variants to bare alef (ا)', () => {
    expect(normalize('أحمد')).toBe('احمد');
    expect(normalize('إبراهيم')).toBe('ابراهيم');
    expect(normalize('آمنة')).toBe('امنه');
  });

  test('normalizes ta marbuta (ة) to ha (ه)', () => {
    expect(normalize('فاطمة')).toBe('فاطمه');
    expect(normalize('ممرضة')).toBe('ممرضه');
  });

  test('normalizes alef maksura (ى) to ya (ي)', () => {
    expect(normalize('يحيى')).toBe('يحيي');
    expect(normalize('موسى')).toBe('موسي');
  });

  test('normalizes hamza-on-waw (ؤ) to waw (و)', () => {
    expect(normalize('لؤلؤ')).toBe('لولو');
  });

  test('normalizes hamza-on-ya (ئ) to ya (ي)', () => {
    expect(normalize('شيئ')).toBe('شيي');
  });

  test('strips tashkeel (diacritics)', () => {
    expect(normalize('مَرِيضٌ')).toBe('مريض');
  });

  test('converts Arabic-Indic digits to ASCII', () => {
    expect(normalize('١٢٣٤٥')).toBe('12345');
    expect(normalize('٠')).toBe('0');
  });

  test('collapses multiple spaces to single space', () => {
    expect(normalize('أحمد   علي')).toBe('احمد علي');
  });

  test('lowercases Latin characters', () => {
    expect(normalize('Ahmed ALI')).toBe('ahmed ali');
  });

  test('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  test('handles strings with only spaces', () => {
    expect(normalize('   ')).toBe('');
  });

  test('handles mixed Arabic and numbers', () => {
    const result = normalize('٣ مرضى');
    expect(result).toBe('3 مرضي'); // ى→ي
  });
});

describe('arabicSearch — escapeRegex()', () => {
  test('escapes dot, star, plus', () => {
    expect(escapeRegex('a.b*c+')).toBe('a\\.b\\*c\\+');
  });

  test('escapes parentheses and brackets', () => {
    expect(escapeRegex('(hello)[world]')).toBe('\\(hello\\)\\[world\\]');
  });

  test('escapes caret and dollar', () => {
    expect(escapeRegex('^start$end')).toBe('\\^start\\$end');
  });

  test('leaves plain Arabic text unescaped', () => {
    expect(escapeRegex('احمد')).toBe('احمد');
  });

  test('coerces non-string to string', () => {
    expect(escapeRegex(123)).toBe('123');
  });
});

describe('arabicSearch — buildOrClause()', () => {
  test('returns null for empty query', () => {
    expect(buildOrClause('', ['name'])).toBeNull();
  });

  test('returns null for whitespace-only query', () => {
    expect(buildOrClause('   ', ['name'])).toBeNull();
  });

  test('returns array of field matchers for valid query', () => {
    const result = buildOrClause('احمد', ['firstName', 'lastName']);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('firstName');
    expect(result[1]).toHaveProperty('lastName');
  });

  test('prefix mode (default) anchors pattern with ^', () => {
    const result = buildOrClause('احمد', ['name']);
    const rx = result[0].name;
    expect(rx.source.startsWith('^')).toBe(true);
  });

  test('substring mode does NOT anchor with ^', () => {
    const result = buildOrClause('احمد', ['name'], { mode: 'substring' });
    const rx = result[0].name;
    expect(rx.source.startsWith('^')).toBe(false);
  });

  test('pattern matches both alef variants (case-insensitive)', () => {
    const result = buildOrClause('احمد', ['name']);
    const rx = result[0].name;
    // Both 'احمد' and 'أحمد' should match
    expect(rx.test('احمد')).toBe(true);
    expect(rx.test('أحمد')).toBe(true);
    expect(rx.test('إحمد')).toBe(true);
  });

  test('normalizes query before building pattern', () => {
    // Input with hamza → should still match normalized forms
    const result = buildOrClause('أحمد', ['name']);
    const rx = result[0].name;
    expect(rx.test('احمد')).toBe(true);
  });

  test('single field returns array with one entry', () => {
    const result = buildOrClause('محمد', ['firstName']);
    expect(result).toHaveLength(1);
  });
});
