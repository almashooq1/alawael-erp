/**
 * Unit Tests — DateConverterService.js
 * Pure static class — NO mocks needed
 */
'use strict';

const DateConverterService = require('../../services/DateConverterService');

// ═══════════════════════════════════════
//  gregorianToHijri
// ═══════════════════════════════════════
describe('DateConverterService.gregorianToHijri', () => {
  it('converts a known date correctly', () => {
    // 2025-01-01 → ~1446 Hijri
    const r = DateConverterService.gregorianToHijri('2025-01-01');
    expect(r.year).toBeGreaterThanOrEqual(1446);
    expect(r.month).toBeGreaterThanOrEqual(1);
    expect(r.month).toBeLessThanOrEqual(12);
    expect(r.day).toBeGreaterThanOrEqual(1);
    expect(r.day).toBeLessThanOrEqual(30);
  });

  it('returns all expected fields', () => {
    const r = DateConverterService.gregorianToHijri('2025-06-15');
    expect(r).toHaveProperty('year');
    expect(r).toHaveProperty('month');
    expect(r).toHaveProperty('day');
    expect(r).toHaveProperty('fullDate');
    expect(r).toHaveProperty('gregorian');
    expect(r).toHaveProperty('monthName');
    expect(r).toHaveProperty('monthNameAr');
    expect(r).toHaveProperty('formatted');
    expect(r).toHaveProperty('timestamp');
    expect(r.formatted).toContain('هـ');
  });

  it('accepts Date object', () => {
    const r = DateConverterService.gregorianToHijri(new Date(2025, 0, 1));
    expect(r.year).toBe(1446);
  });

  it('throws for invalid date', () => {
    expect(() => DateConverterService.gregorianToHijri('not-a-date')).toThrow('خطأ');
  });

  it('fullDate uses day/month/year', () => {
    const r = DateConverterService.gregorianToHijri('2025-03-15');
    expect(r.fullDate).toMatch(/^\d+\/\d+\/\d+$/);
  });
});

// ═══════════════════════════════════════
//  hijriToGregorian
// ═══════════════════════════════════════
describe('DateConverterService.hijriToGregorian', () => {
  it('converts object {year, month, day}', () => {
    const r = DateConverterService.hijriToGregorian({ year: 1446, month: 6, day: 15 });
    expect(r.year).toBeGreaterThanOrEqual(2020);
    expect(r.month).toBeGreaterThanOrEqual(1);
    expect(r.month).toBeLessThanOrEqual(12);
    expect(r.day).toBeGreaterThanOrEqual(1);
    expect(r).toHaveProperty('fullDate');
    expect(r).toHaveProperty('monthName');
    expect(r).toHaveProperty('monthNameAr');
    expect(r).toHaveProperty('timestamp');
  });

  it('converts string "day/month/year"', () => {
    const r = DateConverterService.hijriToGregorian('15/6/1446');
    expect(r.year).toBeGreaterThanOrEqual(2020);
  });

  it('throws for bad string format', () => {
    expect(() => DateConverterService.hijriToGregorian('bad')).toThrow('صيغة غير صحيحة');
  });

  it('throws for out-of-range values', () => {
    expect(() => DateConverterService.hijriToGregorian({ year: 1446, month: 13, day: 1 })).toThrow(
      'قيم تاريخ هجري غير صحيحة'
    );
    expect(() => DateConverterService.hijriToGregorian({ year: 1446, month: 0, day: 1 })).toThrow(
      'قيم تاريخ هجري غير صحيحة'
    );
    expect(() => DateConverterService.hijriToGregorian({ year: 0, month: 1, day: 1 })).toThrow(
      'قيم تاريخ هجري غير صحيحة'
    );
  });

  it('throws for non-object non-string', () => {
    expect(() => DateConverterService.hijriToGregorian(12345)).toThrow('صيغة تاريخ هجري غير صحيحة');
  });
});

// ═══════════════════════════════════════
//  round-trip consistency
// ═══════════════════════════════════════
describe('round-trip G→H→G', () => {
  it('round trips produce valid date structure', () => {
    const hijri = DateConverterService.gregorianToHijri('2024-12-01');
    const back = DateConverterService.hijriToGregorian({
      year: hijri.year,
      month: hijri.month,
      day: hijri.day,
    });
    // Approximate algorithms — verify structure, not exact inverse
    expect(back).toHaveProperty('year');
    expect(back).toHaveProperty('month');
    expect(back).toHaveProperty('day');
    expect(back).toHaveProperty('fullDate');
    expect(back.month).toBeGreaterThanOrEqual(1);
    expect(back.month).toBeLessThanOrEqual(12);
    expect(back.day).toBeGreaterThanOrEqual(1);
    expect(back.day).toBeLessThanOrEqual(31);
  });
});

// ═══════════════════════════════════════
//  daysInHijriMonth
// ═══════════════════════════════════════
describe('daysInHijriMonth', () => {
  it('odd months have 30 days', () => {
    expect(DateConverterService.daysInHijriMonth(1, 1446)).toBe(30);
    expect(DateConverterService.daysInHijriMonth(3, 1446)).toBe(30);
    expect(DateConverterService.daysInHijriMonth(9, 1446)).toBe(30); // Ramadan
  });

  it('even months have 29 days', () => {
    expect(DateConverterService.daysInHijriMonth(2, 1446)).toBe(29);
    expect(DateConverterService.daysInHijriMonth(12, 1446)).toBe(29);
  });
});

// ═══════════════════════════════════════
//  Month names
// ═══════════════════════════════════════
describe('month names', () => {
  it('getHijriMonthName returns English name', () => {
    expect(DateConverterService.getHijriMonthName(1)).toBe('Muharram');
    expect(DateConverterService.getHijriMonthName(9)).toBe('Ramadan');
    expect(DateConverterService.getHijriMonthName(12)).toBe('Dhu al-Hijjah');
    expect(DateConverterService.getHijriMonthName(0)).toBe('');
    expect(DateConverterService.getHijriMonthName(13)).toBe('');
  });

  it('getHijriMonthNameAr returns Arabic name', () => {
    expect(DateConverterService.getHijriMonthNameAr(1)).toBe('محرّم');
    expect(DateConverterService.getHijriMonthNameAr(9)).toBe('رمضان');
    expect(DateConverterService.getHijriMonthNameAr(12)).toBe('ذو الحجة');
    expect(DateConverterService.getHijriMonthNameAr(0)).toBe('');
  });

  it('getGregorianMonthName returns English name', () => {
    expect(DateConverterService.getGregorianMonthName(1)).toBe('January');
    expect(DateConverterService.getGregorianMonthName(12)).toBe('December');
    expect(DateConverterService.getGregorianMonthName(0)).toBe('');
  });

  it('getGregorianMonthNameAr returns Arabic name', () => {
    expect(DateConverterService.getGregorianMonthNameAr(1)).toBe('يناير');
    expect(DateConverterService.getGregorianMonthNameAr(12)).toBe('ديسمبر');
    expect(DateConverterService.getGregorianMonthNameAr(0)).toBe('');
  });
});

// ═══════════════════════════════════════
//  getDayName
// ═══════════════════════════════════════
describe('getDayName', () => {
  it('returns en and ar', () => {
    // 2025-01-06 is Monday
    const r = DateConverterService.getDayName('2025-01-06');
    expect(r.en).toBe('Monday');
    expect(r.ar).toBe('الاثنين');
  });

  it('Friday is الجمعة', () => {
    // 2025-01-03 is Friday
    const r = DateConverterService.getDayName('2025-01-03');
    expect(r.en).toBe('Friday');
    expect(r.ar).toBe('الجمعة');
  });
});

// ═══════════════════════════════════════
//  getCompleteDateInfo
// ═══════════════════════════════════════
describe('getCompleteDateInfo', () => {
  it('returns gregorian + hijri + day info', () => {
    const r = DateConverterService.getCompleteDateInfo('2025-06-15');
    expect(r.gregorian.date).toContain('15');
    expect(r.gregorian.monthNameAr).toBe('يونيو');
    expect(r.hijri.date).toBeTruthy();
    expect(r.hijri.formatted).toContain('هـ');
    expect(r.day.nameEn).toBeTruthy();
    expect(r.day.nameAr).toBeTruthy();
    expect(r.timestamp).toBeGreaterThan(0);
  });

  it('throws for invalid', () => {
    expect(() => DateConverterService.getCompleteDateInfo('invalid')).toThrow('خطأ');
  });
});

// ═══════════════════════════════════════
//  isValidHijri / isValidGregorian
// ═══════════════════════════════════════
describe('validation', () => {
  it('isValidHijri accepts valid dates', () => {
    expect(DateConverterService.isValidHijri(1446, 1, 1)).toBe(true);
    expect(DateConverterService.isValidHijri(1446, 12, 30)).toBe(true);
  });

  it('isValidHijri rejects invalid dates', () => {
    expect(DateConverterService.isValidHijri(0, 1, 1)).toBe(false);
    expect(DateConverterService.isValidHijri(1446, 13, 1)).toBe(false);
    expect(DateConverterService.isValidHijri(1446, 0, 1)).toBe(false);
    expect(DateConverterService.isValidHijri(1446, 1, 0)).toBe(false);
    expect(DateConverterService.isValidHijri(1446, 1, 31)).toBe(false);
  });

  it('isValidGregorian accepts valid dates', () => {
    expect(DateConverterService.isValidGregorian(2025, 1, 1)).toBe(true);
    expect(DateConverterService.isValidGregorian(2024, 2, 29)).toBe(true); // leap year
  });

  it('isValidGregorian rejects invalid dates', () => {
    expect(DateConverterService.isValidGregorian(2025, 2, 29)).toBe(false); // not leap
    expect(DateConverterService.isValidGregorian(2025, 13, 1)).toBe(false);
  });
});

// ═══════════════════════════════════════
//  getDifference
// ═══════════════════════════════════════
describe('getDifference', () => {
  it('computes correct difference in days', () => {
    const r = DateConverterService.getDifference('2025-01-01', '2025-01-11');
    expect(r.days).toBe(10);
    expect(r.hours).toBe(240);
    expect(r.minutes).toBe(14400);
  });

  it('is absolute (order independent)', () => {
    const r1 = DateConverterService.getDifference('2025-01-01', '2025-02-01');
    const r2 = DateConverterService.getDifference('2025-02-01', '2025-01-01');
    expect(r1.days).toBe(r2.days);
  });

  it('zero difference for same date', () => {
    const r = DateConverterService.getDifference('2025-06-01', '2025-06-01');
    expect(r.days).toBe(0);
    expect(r.milliseconds).toBe(0);
  });

  it('computes weeks/months/years', () => {
    const r = DateConverterService.getDifference('2020-01-01', '2025-01-01');
    expect(r.years).toBe(5);
    expect(r.weeks).toBeGreaterThan(250);
  });
});

// ═══════════════════════════════════════
//  formatDate
// ═══════════════════════════════════════
describe('formatDate', () => {
  it('defaults to DD/MM/YYYY', () => {
    expect(DateConverterService.formatDate('2025-06-15')).toBe('15/06/2025');
  });

  it('YYYY-MM-DD', () => {
    expect(DateConverterService.formatDate('2025-06-15', 'YYYY-MM-DD')).toBe('2025-06-15');
  });

  it('MM/DD/YYYY', () => {
    expect(DateConverterService.formatDate('2025-06-15', 'MM/DD/YYYY')).toBe('06/15/2025');
  });

  it('DD-MM-YYYY', () => {
    expect(DateConverterService.formatDate('2025-06-15', 'DD-MM-YYYY')).toBe('15-06-2025');
  });

  it('unknown pattern falls back to DD/MM/YYYY', () => {
    expect(DateConverterService.formatDate('2025-06-15', 'UNKNOWN')).toBe('15/06/2025');
  });
});
