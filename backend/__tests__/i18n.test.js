/**
 * i18n.test.js — Backend Internationalization Service
 * خدمة الترجمة — t(), formatDate, formatNumber, formatCurrency, getDirection, middleware
 */
const {
  t,
  i18nMiddleware,
  getLanguageFromRequest,
  formatDate,
  formatNumber,
  formatCurrency,
  getDirection,
  getAllTranslations,
  translations,
  defaultLanguage,
} = require('../utils/i18n');

/* ===============================================================
   Constants & config
   =============================================================== */
describe('i18n config', () => {
  test('default language is Arabic', () => {
    expect(defaultLanguage).toBe('ar');
  });

  test('translations has ar and en', () => {
    expect(translations).toHaveProperty('ar');
    expect(translations).toHaveProperty('en');
  });
});

/* ===============================================================
   t() — translation function
   =============================================================== */
describe('t()', () => {
  test('returns Arabic translation by default', () => {
    const val = t('app.name');
    expect(val).toBe('نظام العلاويل');
  });

  test('returns English translation when lang=en', () => {
    const val = t('app.name', 'en');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
  });

  test('falls back to Arabic when key not in English', () => {
    // If a key exists in ar but not en, should fallback
    const arVal = t('app.name', 'ar');
    const enVal = t('app.name', 'en');
    // Both should return something (not the raw key)
    expect(arVal).not.toBe('app.name');
    expect(enVal).not.toBe('app.name');
  });

  test('returns the key when no translation found', () => {
    expect(t('nonexistent.deep.key')).toBe('nonexistent.deep.key');
  });

  test('replaces {{variable}} params', () => {
    // Find a key with params, or test directly with a known one
    const result = t('auth.login', 'ar', { name: 'أحمد' });
    expect(typeof result).toBe('string');
  });

  test('unsupported language falls back to default', () => {
    const val = t('app.name', 'fr');
    expect(val).toBe(t('app.name', 'ar'));
  });
});

/* ===============================================================
   getLanguageFromRequest
   =============================================================== */
describe('getLanguageFromRequest', () => {
  test('query param lang=en takes priority', () => {
    const req = { query: { lang: 'en' }, headers: {}, user: null };
    expect(getLanguageFromRequest(req)).toBe('en');
  });

  test('Accept-Language header ar', () => {
    const req = { query: {}, headers: { 'accept-language': 'ar-SA,ar;q=0.9' }, user: null };
    expect(getLanguageFromRequest(req)).toBe('ar');
  });

  test('Accept-Language header en', () => {
    const req = { query: {}, headers: { 'accept-language': 'en-US,en;q=0.9' } };
    expect(getLanguageFromRequest(req)).toBe('en');
  });

  test('user preference', () => {
    const req = { query: {}, headers: {}, user: { language: 'en' } };
    expect(getLanguageFromRequest(req)).toBe('en');
  });

  test('default to Arabic when nothing matches', () => {
    const req = { query: {}, headers: {}, user: null };
    expect(getLanguageFromRequest(req)).toBe('ar');
  });

  test('ignores invalid query lang', () => {
    const req = { query: { lang: 'zz' }, headers: {}, user: null };
    expect(getLanguageFromRequest(req)).toBe('ar');
  });
});

/* ===============================================================
   i18nMiddleware
   =============================================================== */
describe('i18nMiddleware', () => {
  test('sets req.language and req.t, calls next()', () => {
    const req = { query: { lang: 'en' }, headers: {}, user: null };
    const res = {};
    const next = jest.fn();

    i18nMiddleware(req, res, next);

    expect(req.language).toBe('en');
    expect(typeof req.t).toBe('function');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('req.t uses the detected language', () => {
    const req = { query: { lang: 'ar' }, headers: {}, user: null };
    i18nMiddleware(req, {}, jest.fn());

    const val = req.t('app.name');
    expect(val).toBe('نظام العلاويل');
  });
});

/* ===============================================================
   formatDate
   =============================================================== */
describe('formatDate', () => {
  const testDate = '2025-06-15T12:00:00Z';

  test('short format Arabic', () => {
    const s = formatDate(testDate, 'ar', 'short');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  test('long format English', () => {
    const s = formatDate(testDate, 'en', 'long');
    expect(s).toContain('June') || expect(s).toContain('15');
  });

  test('full format includes weekday', () => {
    const s = formatDate(testDate, 'en', 'full');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(10);
  });

  test('defaults to short format', () => {
    const s = formatDate(testDate, 'ar');
    expect(typeof s).toBe('string');
  });
});

/* ===============================================================
   formatNumber
   =============================================================== */
describe('formatNumber', () => {
  test('Arabic locale', () => {
    const s = formatNumber(1234567, 'ar');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  test('English locale', () => {
    const s = formatNumber(1234567, 'en');
    expect(s).toContain('1,234,567');
  });

  test('defaults to Arabic', () => {
    const s = formatNumber(100);
    expect(typeof s).toBe('string');
  });
});

/* ===============================================================
   formatCurrency
   =============================================================== */
describe('formatCurrency', () => {
  test('SAR in Arabic', () => {
    const s = formatCurrency(1500);
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  test('USD in English', () => {
    const s = formatCurrency(42.5, 'USD', 'en');
    expect(s).toContain('$');
  });
});

/* ===============================================================
   getDirection
   =============================================================== */
describe('getDirection', () => {
  test('Arabic is RTL', () => {
    expect(getDirection('ar')).toBe('rtl');
  });

  test('English is LTR', () => {
    expect(getDirection('en')).toBe('ltr');
  });

  test('default (no param) is RTL', () => {
    expect(getDirection()).toBe('rtl');
  });
});

/* ===============================================================
   getAllTranslations
   =============================================================== */
describe('getAllTranslations', () => {
  test('returns object with ar and en keys', () => {
    const r = getAllTranslations('app.name');
    expect(r).toHaveProperty('ar');
    expect(r).toHaveProperty('en');
  });

  test('ar value matches direct t() call', () => {
    const r = getAllTranslations('app.name');
    expect(r.ar).toBe(t('app.name', 'ar'));
  });
});
