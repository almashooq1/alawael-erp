/**
 * i18n Translation Tests — ALAWAEL ERP
 *
 * Ensures Arabic (ar) and English (en) translation files are in sync,
 * all keys are present, and Arabic translations meet quality standards.
 *
 * اختبارات الترجمة - نظام الأوائل
 */

const ar = require('../../../src/locales/ar.json');
const en = require('../../../src/locales/en.json');

// ── Helpers ──────────────────────────────────────────────────────────────────
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr && curr[key], obj);
}

const arKeys = flattenKeys(ar);
const enKeys = flattenKeys(en);
const arSet = new Set(arKeys);

// Arabic Unicode ranges: \u0600-\u06FF (Arabic), \u0750-\u077F (Arabic Supplement),
// \uFB50-\uFDFF (Arabic Presentation A), \uFE70-\uFEFF (Arabic Presentation B)
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('i18n Translation Files', () => {
  describe('JSON Structure', () => {
    it('ar.json should be valid JSON', () => {
      expect(ar).toBeDefined();
      expect(typeof ar).toBe('object');
    });

    it('en.json should be valid JSON', () => {
      expect(en).toBeDefined();
      expect(typeof en).toBe('object');
    });

    it('both files should have top-level sections', () => {
      const requiredSections = ['login', 'header', 'sidebar', 'dashboard', 'common'];

      for (const section of requiredSections) {
        expect(ar).toHaveProperty(section);
        expect(en).toHaveProperty(section);
      }
    });
  });

  describe('Key Completeness', () => {
    it('all English keys should exist in Arabic', () => {
      const missingInAr = enKeys.filter(k => !arSet.has(k));
      if (missingInAr.length > 0) {
        console.warn(
          `⚠️ ${missingInAr.length} keys missing in ar.json:\n` +
            missingInAr
              .slice(0, 20)
              .map(k => `  - ${k}`)
              .join('\n')
        );
      }
      expect(missingInAr).toEqual([]);
    });

    it('Arabic should have at least as many keys as English', () => {
      expect(arKeys.length).toBeGreaterThanOrEqual(enKeys.length);
    });

    it('shared top-level sections should have matching sub-keys', () => {
      const sharedSections = Object.keys(en).filter(k => k in ar);

      for (const section of sharedSections) {
        if (typeof en[section] !== 'object' || typeof ar[section] !== 'object') continue;
        const enSubKeys = flattenKeys(en[section]);
        const arSubKeys = new Set(flattenKeys(ar[section]));

        const missing = enSubKeys.filter(k => !arSubKeys.has(k));
        if (missing.length > 0) {
          console.warn(`Section "${section}": ${missing.length} keys missing in AR`);
        }
        expect(missing).toEqual([]);
      }
    });
  });

  describe('Arabic Translation Quality', () => {
    it('all Arabic leaf values should contain Arabic characters', () => {
      const nonArabicValues = [];

      for (const key of arKeys) {
        const value = getNestedValue(ar, key);
        if (typeof value !== 'string') continue;

        // Skip keys that are typically not translated (URLs, codes, etc.)
        if (key.includes('url') || key.includes('code') || key.includes('format')) continue;
        // Skip empty strings
        if (value === '') continue;
        // Skip values with only numbers/symbols (e.g. "{{count}}")
        if (/^[\d\s{}%.,\-:@/\\]+$/.test(value)) continue;

        if (!ARABIC_REGEX.test(value)) {
          nonArabicValues.push({ key, value });
        }
      }

      if (nonArabicValues.length > 0) {
        console.warn(
          `⚠️ ${nonArabicValues.length} AR values without Arabic characters:\n` +
            nonArabicValues
              .slice(0, 10)
              .map(({ key, value }) => `  - ${key}: "${value}"`)
              .join('\n')
        );
      }

      // Allow some tolerance (placeholders, short codes)
      expect(nonArabicValues.length).toBeLessThan(arKeys.length * 0.05);
    });

    it('Arabic values should not be empty strings', () => {
      const emptyValues = arKeys.filter(key => {
        const value = getNestedValue(ar, key);
        return typeof value === 'string' && value.trim() === '';
      });

      if (emptyValues.length > 0) {
        console.warn(
          `⚠️ ${emptyValues.length} empty AR values:\n` +
            emptyValues
              .slice(0, 10)
              .map(k => `  - ${k}`)
              .join('\n')
        );
      }

      expect(emptyValues.length).toBe(0);
    });

    it('Arabic login section should have correct translations', () => {
      // Spot-check critical UI strings
      expect(ar.login).toBeDefined();

      if (ar.login.title) {
        expect(ARABIC_REGEX.test(ar.login.title)).toBe(true);
      }
      if (ar.login.submit) {
        expect(ARABIC_REGEX.test(ar.login.submit)).toBe(true);
      }
    });

    it('sidebar navigation items should be in Arabic', () => {
      expect(ar.sidebar).toBeDefined();

      const sidebarValues = flattenKeys(ar.sidebar).map(k => getNestedValue(ar.sidebar, k));
      const arabicValues = sidebarValues.filter(v => typeof v === 'string' && ARABIC_REGEX.test(v));

      // At least 90% of sidebar items should be in Arabic
      expect(arabicValues.length / sidebarValues.length).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Interpolation Variables', () => {
    it('interpolation placeholders should match between AR and EN', () => {
      const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;
      const mismatched = [];

      // Only check keys that exist in both
      const sharedKeys = enKeys.filter(k => arSet.has(k));

      for (const key of sharedKeys) {
        const arVal = getNestedValue(ar, key);
        const enVal = getNestedValue(en, key);

        if (typeof arVal !== 'string' || typeof enVal !== 'string') continue;

        const arPlaceholders = [...arVal.matchAll(PLACEHOLDER_RE)].map(m => m[1]).sort();
        const enPlaceholders = [...enVal.matchAll(PLACEHOLDER_RE)].map(m => m[1]).sort();

        if (JSON.stringify(arPlaceholders) !== JSON.stringify(enPlaceholders)) {
          mismatched.push({ key, ar: arPlaceholders, en: enPlaceholders });
        }
      }

      if (mismatched.length > 0) {
        console.warn(
          `⚠️ ${mismatched.length} keys with mismatched placeholders:\n` +
            mismatched
              .slice(0, 5)
              .map(m => `  - ${m.key}: AR=[${m.ar}] EN=[${m.en}]`)
              .join('\n')
        );
      }

      expect(mismatched).toEqual([]);
    });
  });

  describe('RTL-specific', () => {
    it('Arabic translations should not have incorrect LTR characters mixed in', () => {
      // Check for common LTR leaks: full English words in Arabic values (except proper nouns / technical terms)
      const technicalTerms = [
        'email',
        'url',
        'api',
        'http',
        'SMS',
        'MFA',
        'OTP',
        'PDF',
        'CSV',
        'Excel',
        'WhatsApp',
      ];
      const suspiciousValues = [];

      for (const key of arKeys) {
        const value = getNestedValue(ar, key);
        if (typeof value !== 'string') continue;

        // Find sequences of 4+ Latin characters that aren't technical terms
        const latinWords = value.match(/[a-zA-Z]{4,}/g);
        if (latinWords) {
          const nonTechnical = latinWords.filter(
            w => !technicalTerms.some(t => t.toLowerCase() === w.toLowerCase())
          );
          if (nonTechnical.length > 0) {
            suspiciousValues.push({ key, words: nonTechnical });
          }
        }
      }

      if (suspiciousValues.length > 0) {
        console.warn(
          `⚠️ ${suspiciousValues.length} AR values with suspicious Latin text:\n` +
            suspiciousValues
              .slice(0, 10)
              .map(({ key, words }) => `  - ${key}: [${words.join(', ')}]`)
              .join('\n')
        );
      }

      // Allow some technical terms but flag excessive English leakage
      expect(suspiciousValues.length).toBeLessThan(arKeys.length * 0.1);
    });
  });
});
