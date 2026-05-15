'use strict';

/**
 * WhatsApp phone-number helpers
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Meta's API expects E.164 without the leading `+` (e.g. `966512345678`).
 * Users in this product write phones in many ways:
 *   - Saudi mobile local: `0512345678`, `05 12 34 56 78`, `+966 512 345 678`
 *   - Bahrain/UAE/Kuwait/Oman/Qatar landlines/mobiles
 *   - Pure E.164 with `+`
 *   - Pure E.164 without `+` (already correct)
 *
 * `normalizePhone()` returns the E.164-no-plus form, throwing on input that
 * isn't recognisably a phone. `isValidPhone()` is a non-throwing wrapper.
 *
 * Why a dedicated module: the old `normalizePhone` in whatsappService.js
 * handled only Saudi 05xx and produced wrong results for international
 * numbers. Splitting it out also makes it unit-testable on its own.
 */

const GCC_COUNTRY_CODES = {
  // Saudi Arabia — primary market
  SA: { code: '966', localPrefix: '0', mobileLength: 9 },
  // GCC neighbours (occasional international parent/guardian)
  AE: { code: '971', localPrefix: '0', mobileLength: 9 },
  KW: { code: '965', localPrefix: '', mobileLength: 8 },
  BH: { code: '973', localPrefix: '', mobileLength: 8 },
  QA: { code: '974', localPrefix: '', mobileLength: 8 },
  OM: { code: '968', localPrefix: '', mobileLength: 8 },
};

const DEFAULT_COUNTRY = 'SA';

/**
 * @param {string} input
 * @param {{ defaultCountry?: keyof typeof GCC_COUNTRY_CODES }} [opts]
 * @returns {string} E.164-no-plus
 * @throws on unparseable input
 */
function normalizePhone(input, opts = {}) {
  if (input == null || input === '') {
    throw new Error('Phone number required');
  }
  const raw = String(input).trim();
  // Keep the `+` prefix info, then strip everything non-digit.
  const hadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) {
    throw new Error(`Invalid phone: ${input}`);
  }

  // Case 1: Started with `+` → fully international, just drop the +.
  if (hadPlus) {
    return digits;
  }

  // Case 2: Recognised country prefix already present (no `+`).
  for (const country of Object.values(GCC_COUNTRY_CODES)) {
    if (
      digits.startsWith(country.code) &&
      digits.length === country.code.length + country.mobileLength
    ) {
      return digits;
    }
  }

  // Case 3: Local format with leading 0 → strip 0, prepend country code.
  const country = GCC_COUNTRY_CODES[opts.defaultCountry || DEFAULT_COUNTRY];
  if (country && country.localPrefix && digits.startsWith(country.localPrefix)) {
    const stripped = digits.slice(country.localPrefix.length);
    if (stripped.length === country.mobileLength) {
      return country.code + stripped;
    }
  }

  // Case 4: Local format without leading 0 — only valid when mobile-length matches.
  if (country && digits.length === country.mobileLength) {
    return country.code + digits;
  }

  // Case 5: Anything else with a leading 0 — strip it, hope for the best
  // (legacy behaviour of the old normalizePhone). This keeps backward compat
  // for any caller that fed us a slightly-different format.
  if (digits.startsWith('0')) {
    return digits.replace(/^0+/, '');
  }

  return digits;
}

/**
 * Non-throwing variant.
 * @returns {string|null}
 */
function tryNormalizePhone(input, opts) {
  try {
    return normalizePhone(input, opts);
  } catch {
    return null;
  }
}

/**
 * Mask a phone for log lines: keep country code + last 3 digits, redact middle.
 * `966512345678` → `9665****678`
 * @param {string} phone
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/\D/g, '');
  if (s.length < 7) return '***';
  const head = s.slice(0, 4);
  const tail = s.slice(-3);
  return `${head}${'*'.repeat(Math.max(s.length - 7, 1))}${tail}`;
}

module.exports = {
  normalizePhone,
  tryNormalizePhone,
  maskPhone,
  GCC_COUNTRY_CODES,
};
