/**
 * arabicUtils — Arabic / RTL text helpers.
 * أدوات النصوص العربية والاتجاه من اليمين لليسار
 */

/** Eastern Arabic digits map */
const EASTERN_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert Western digits to Eastern Arabic digits.
 * @param {string|number} value
 * @returns {string}
 */
export const toArabicDigits = value => {
  return String(value).replace(/\d/g, d => EASTERN_DIGITS[d]);
};

/**
 * Convert Eastern Arabic digits to Western digits.
 * @param {string} value
 * @returns {string}
 */
export const toWesternDigits = value => {
  return String(value).replace(/[٠-٩]/g, d => EASTERN_DIGITS.indexOf(d));
};

/**
 * Detect whether a string is primarily RTL.
 * @param {string} text
 * @returns {boolean}
 */
export const isRtlText = text => {
  if (!text) return false;
  const rtlCount = (
    text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []
  ).length;
  const ltrCount = (text.match(/[A-Za-z]/g) || []).length;
  return rtlCount >= ltrCount;
};

/**
 * Normalize Arabic text — remove tashkeel (diacritics) and normalize characters.
 * @param {string} text
 * @returns {string}
 */
export const normalizeArabic = text => {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
    .replace(/[أإآ]/g, 'ا') // Normalize alef
    .replace(/ة/g, 'ه') // Normalize taa marbuta
    .replace(/ى/g, 'ي') // Normalize alef maqsura
    .trim();
};

/**
 * Arabic-aware case-insensitive search.
 * @param {string} text — Text to search in
 * @param {string} query — Search query
 * @returns {boolean}
 */
export const arabicSearch = (text, query) => {
  if (!text || !query) return false;
  return normalizeArabic(text).includes(normalizeArabic(query));
};

/**
 * Get Arabic plural form based on count.
 * Arabic has 6 plural forms but for UI we simplify to 3.
 * @param {number} count
 * @param {string} singular — مستخدم
 * @param {string} dual — مستخدمان
 * @param {string} plural — مستخدمين (3-10)
 * @param {string} [many] — مستخدم (11+) — defaults to singular
 * @returns {string}
 */
export const arabicPlural = (count, singular, dual, plural, many) => {
  const n = Math.abs(count);
  if (n === 0) return singular;
  if (n === 1) return singular;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return plural;
  return many || singular;
};

/**
 * Format a number with Arabic locale.
 * @param {number} value
 * @param {object} [options] — Intl.NumberFormat options
 * @returns {string}
 */
export const formatArabicNumber = (value, options = {}) => {
  if (value === null || value === undefined) return '';
  try {
    return new Intl.NumberFormat('ar-SA', options).format(value);
  } catch {
    return String(value);
  }
};

/**
 * Format currency in SAR.
 * @param {number} amount
 * @param {boolean} [showSymbol=true]
 * @returns {string}
 */
export const formatSAR = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined) return '';
  const formatted = new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return showSymbol ? `${formatted} ر.س` : formatted;
};

/**
 * Truncate text with ellipsis, preserving Arabic word boundaries.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateArabic = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
};

/**
 * Get text direction — 'rtl' or 'ltr'.
 * @param {string} text
 * @returns {'rtl'|'ltr'}
 */
export const getTextDirection = text => (isRtlText(text) ? 'rtl' : 'ltr');

/**
 * Arabic ordinal suffix.
 * @param {number} n
 * @returns {string}
 */
export const arabicOrdinal = n => {
  const ordinals = {
    1: 'الأول',
    2: 'الثاني',
    3: 'الثالث',
    4: 'الرابع',
    5: 'الخامس',
    6: 'السادس',
    7: 'السابع',
    8: 'الثامن',
    9: 'التاسع',
    10: 'العاشر',
  };
  return ordinals[n] || `الـ ${toArabicDigits(n)}`;
};

/**
 * Common Arabic greeting based on time of day.
 * @param {Date} [date]
 * @returns {string}
 */
export const arabicGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء الخير';
};

export default {
  toArabicDigits,
  toWesternDigits,
  isRtlText,
  normalizeArabic,
  arabicSearch,
  arabicPlural,
  formatArabicNumber,
  formatSAR,
  truncateArabic,
  getTextDirection,
  arabicOrdinal,
  arabicGreeting,
};
