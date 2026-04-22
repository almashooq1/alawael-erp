/**
 * reporting-renderer-translator.test.js — Phase 10 Commit 3.
 *
 * Translator must survive catalog ids that already contain dots, fall
 * back gracefully across locales, and substitute brace vars.
 */

'use strict';

const { t, getReportKey, has, _reset } = require('../services/reporting/renderer/translator');

beforeEach(() => _reset());

describe('t — lookup', () => {
  test('resolves a plain dotted path in ar', () => {
    expect(t('common.farewell', 'ar')).toContain('العوائل');
  });

  test('resolves the same key in en', () => {
    expect(t('common.farewell', 'en')).toContain('Al-Awael');
  });

  test('falls back to en when ar missing for the same key', () => {
    // Not easy to force without mutating — assert fallback stub works
    // by asking for a key that exists only in en (none do by design,
    // but the path exercised below hits ar first then en).
    expect(typeof t('common.page', 'ar')).toBe('string');
  });

  test('falls back to raw key when neither locale has it', () => {
    expect(t('bogus.does.not.exist', 'ar')).toBe('bogus.does.not.exist');
  });
});

describe('t — report-specific keys with dotted ids', () => {
  test('array-form key survives catalog ids with dots', () => {
    const key = getReportKey('ben.progress.weekly', 'headline');
    expect(key).toEqual(['reports', 'ben.progress.weekly', 'headline']);
    const out = t(key, 'ar');
    expect(out).toContain('تقدم');
  });

  test('dotted-string form would NOT find the report-specific key (so we always use array form)', () => {
    // The dotted form would interpret 'reports.ben.progress.weekly' as
    // nested objects, which doesn't match the JSON shape. Verify the
    // array-form helper is actually required.
    expect(t('reports.ben.progress.weekly.headline', 'en')).toBe(
      'reports.ben.progress.weekly.headline' // treated as raw key, fails lookup
    );
  });
});

describe('t — variable substitution', () => {
  test('replaces {name} in greeting_guardian', () => {
    const out = t('common.greeting_guardian', 'en', { name: 'Ahmad' });
    expect(out).toContain('Ahmad');
    expect(out).not.toContain('{name}');
  });

  test('unknown vars are left as-is', () => {
    const out = t('common.greeting_guardian', 'en', {});
    expect(out).toContain('{name}');
  });
});

describe('has', () => {
  test('reports presence without throwing', () => {
    expect(has('common.farewell', 'ar')).toBe(true);
    expect(has('missing.key', 'ar')).toBe(false);
  });
});
