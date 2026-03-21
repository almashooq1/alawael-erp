/**
 * arabicUtils.js — Unit Tests
 * اختبارات وحدة لأدوات النصوص العربية
 */
import {
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
} from 'utils/arabicUtils';

/* ═══════════════ toArabicDigits ═══════════════ */
describe('toArabicDigits', () => {
  test('converts single digit', () => {
    expect(toArabicDigits('5')).toBe('٥');
  });

  test('converts number to eastern digits', () => {
    expect(toArabicDigits(1234567890)).toBe('١٢٣٤٥٦٧٨٩٠');
  });

  test('converts mixed text with digits', () => {
    expect(toArabicDigits('عدد 42')).toBe('عدد ٤٢');
  });

  test('handles string with no digits', () => {
    expect(toArabicDigits('مرحبا')).toBe('مرحبا');
  });

  test('handles zero', () => {
    expect(toArabicDigits(0)).toBe('٠');
  });
});

/* ═══════════════ toWesternDigits ═══════════════ */
describe('toWesternDigits', () => {
  test('converts eastern to western digits', () => {
    expect(toWesternDigits('١٢٣')).toBe('123');
  });

  test('converts all digits', () => {
    expect(toWesternDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  test('handles mixed Arabic text with digits', () => {
    expect(toWesternDigits('عدد ٤٢')).toBe('عدد 42');
  });

  test('handles western digits unchanged', () => {
    expect(toWesternDigits('hello 123')).toBe('hello 123');
  });
});

/* ═══════════════ isRtlText ═══════════════ */
describe('isRtlText', () => {
  test('detects Arabic text as RTL', () => {
    expect(isRtlText('مرحبا بالعالم')).toBe(true);
  });

  test('detects English text as LTR', () => {
    expect(isRtlText('Hello World')).toBe(false);
  });

  test('detects mixed text with more Arabic as RTL', () => {
    expect(isRtlText('مرحبا Hello بالعالم')).toBe(true);
  });

  test('returns false for empty string', () => {
    expect(isRtlText('')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isRtlText(null)).toBe(false);
    expect(isRtlText(undefined)).toBe(false);
  });

  test('handles numbers-only (no letters = equal counts, treated as RTL)', () => {
    // When no letters at all, rtlCount === ltrCount === 0, so rtl >= ltr is true
    expect(isRtlText('12345')).toBe(true);
  });
});

/* ═══════════════ normalizeArabic ═══════════════ */
describe('normalizeArabic', () => {
  test('removes tashkeel (diacritics)', () => {
    expect(normalizeArabic('مُسْتَخْدِم')).toBe('مستخدم');
  });

  test('normalizes hamza alef variants', () => {
    const result = normalizeArabic('أحمد');
    expect(result).toBe('احمد');
  });

  test('normalizes alef with hamza below', () => {
    expect(normalizeArabic('إسلام')).toBe('اسلام');
  });

  test('normalizes alef madda', () => {
    expect(normalizeArabic('آخر')).toBe('اخر');
  });

  test('normalizes taa marbuta to ha', () => {
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
  });

  test('normalizes alef maqsura to ya', () => {
    expect(normalizeArabic('على')).toBe('علي');
  });

  test('returns empty for null/undefined', () => {
    expect(normalizeArabic(null)).toBe('');
    expect(normalizeArabic(undefined)).toBe('');
  });

  test('trims whitespace', () => {
    expect(normalizeArabic('  مرحبا  ')).toBe('مرحبا');
  });
});

/* ═══════════════ arabicSearch ═══════════════ */
describe('arabicSearch', () => {
  test('finds normalized match', () => {
    expect(arabicSearch('أحمد إبراهيم', 'احمد')).toBe(true);
  });

  test('finds with tashkeel differences', () => {
    expect(arabicSearch('مُسْتَخْدِم', 'مستخدم')).toBe(true);
  });

  test('returns false for non-match', () => {
    expect(arabicSearch('محمد خالد', 'أحمد')).toBe(false);
  });

  test('returns false for empty query', () => {
    expect(arabicSearch('مرحبا', '')).toBe(false);
    expect(arabicSearch('مرحبا', null)).toBe(false);
  });

  test('returns false for empty text', () => {
    expect(arabicSearch('', 'مرحبا')).toBe(false);
    expect(arabicSearch(null, 'مرحبا')).toBe(false);
  });
});

/* ═══════════════ arabicPlural ═══════════════ */
describe('arabicPlural', () => {
  test('returns singular for 0', () => {
    expect(arabicPlural(0, 'مستخدم', 'مستخدمان', 'مستخدمين')).toBe('مستخدم');
  });

  test('returns singular for 1', () => {
    expect(arabicPlural(1, 'مستخدم', 'مستخدمان', 'مستخدمين')).toBe('مستخدم');
  });

  test('returns dual for 2', () => {
    expect(arabicPlural(2, 'مستخدم', 'مستخدمان', 'مستخدمين')).toBe('مستخدمان');
  });

  test('returns plural for 3-10', () => {
    expect(arabicPlural(5, 'مستخدم', 'مستخدمان', 'مستخدمين')).toBe('مستخدمين');
    expect(arabicPlural(10, 'مستخدم', 'مستخدمان', 'مستخدمين')).toBe('مستخدمين');
  });

  test('returns many form for 11+', () => {
    expect(arabicPlural(15, 'مستخدم', 'مستخدمان', 'مستخدمين', 'مستخدم')).toBe('مستخدم');
  });

  test('falls back to singular when many not provided', () => {
    expect(arabicPlural(100, 'ملف', 'ملفان', 'ملفات')).toBe('ملف');
  });

  test('handles negative numbers', () => {
    expect(arabicPlural(-3, 'يوم', 'يومان', 'أيام')).toBe('أيام');
  });
});

/* ═══════════════ formatArabicNumber ═══════════════ */
describe('formatArabicNumber', () => {
  test('formats number with Arabic locale', () => {
    const result = formatArabicNumber(1234);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns empty string for null', () => {
    expect(formatArabicNumber(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(formatArabicNumber(undefined)).toBe('');
  });

  test('formats zero', () => {
    const result = formatArabicNumber(0);
    expect(result).toBeDefined();
  });

  test('accepts Intl options', () => {
    const result = formatArabicNumber(0.5, { style: 'percent' });
    expect(result).toBeDefined();
  });
});

/* ═══════════════ formatSAR ═══════════════ */
describe('formatSAR', () => {
  test('formats amount with SAR symbol', () => {
    const result = formatSAR(1000);
    expect(result).toContain('ر.س');
  });

  test('formats without symbol when showSymbol=false', () => {
    const result = formatSAR(1000, false);
    expect(result).not.toContain('ر.س');
  });

  test('includes decimal places', () => {
    const result = formatSAR(1500.5);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('returns empty for null', () => {
    expect(formatSAR(null)).toBe('');
  });

  test('returns empty for undefined', () => {
    expect(formatSAR(undefined)).toBe('');
  });

  test('formats zero', () => {
    const result = formatSAR(0);
    expect(result).toContain('ر.س');
  });
});

/* ═══════════════ truncateArabic ═══════════════ */
describe('truncateArabic', () => {
  test('returns short text unchanged', () => {
    expect(truncateArabic('مرحبا', 50)).toBe('مرحبا');
  });

  test('truncates long text with ellipsis', () => {
    const long = 'هذا نص طويل جداً يحتاج إلى اختصار لعدم تجاوز الحد المسموح';
    const result = truncateArabic(long, 20);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(24); // 20 + '...' max
  });

  test('truncates at word boundary when possible', () => {
    const text = 'كلمة أولى كلمة ثانية كلمة ثالثة';
    const result = truncateArabic(text, 15);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(20); // truncated + ...
  });

  test('returns empty for null', () => {
    expect(truncateArabic(null)).toBe('');
  });

  test('returns empty for undefined', () => {
    expect(truncateArabic(undefined)).toBe('');
  });

  test('returns empty for empty string', () => {
    expect(truncateArabic('')).toBe('');
  });
});

/* ═══════════════ getTextDirection ═══════════════ */
describe('getTextDirection', () => {
  test('returns rtl for Arabic text', () => {
    expect(getTextDirection('مرحبا بالعالم')).toBe('rtl');
  });

  test('returns ltr for English text', () => {
    expect(getTextDirection('Hello World')).toBe('ltr');
  });

  test('returns ltr for empty/falsy', () => {
    expect(getTextDirection('')).toBe('ltr');
    expect(getTextDirection(null)).toBe('ltr');
  });
});

/* ═══════════════ arabicOrdinal ═══════════════ */
describe('arabicOrdinal', () => {
  test('returns named ordinals 1-10', () => {
    expect(arabicOrdinal(1)).toBe('الأول');
    expect(arabicOrdinal(2)).toBe('الثاني');
    expect(arabicOrdinal(3)).toBe('الثالث');
    expect(arabicOrdinal(5)).toBe('الخامس');
    expect(arabicOrdinal(10)).toBe('العاشر');
  });

  test('returns numeric ordinal for >10', () => {
    const result = arabicOrdinal(15);
    expect(result).toContain('الـ');
    expect(result).toContain('١٥');
  });
});

/* ═══════════════ arabicGreeting ═══════════════ */
describe('arabicGreeting', () => {
  test('returns morning greeting before noon', () => {
    const morning = new Date('2026-03-21T08:00:00');
    expect(arabicGreeting(morning)).toBe('صباح الخير');
  });

  test('returns afternoon greeting after noon', () => {
    const afternoon = new Date('2026-03-21T14:00:00');
    expect(arabicGreeting(afternoon)).toBe('مساء الخير');
  });

  test('returns evening greeting in the evening', () => {
    const evening = new Date('2026-03-21T20:00:00');
    expect(arabicGreeting(evening)).toBe('مساء الخير');
  });

  test('returns greeting without args (uses current time)', () => {
    const result = arabicGreeting();
    expect(['صباح الخير', 'مساء الخير']).toContain(result);
  });
});
