/**
 * dateUtils.js — Unit Tests
 * اختبارات وحدة لأدوات التاريخ
 */
import {
  formatDate,
  formatHijri,
  formatDateTime,
  formatTime,
  timeAgo,
  getDayRange,
  daysBetween,
  isToday,
  isPast,
  isFuture,
} from 'utils/dateUtils';

// ═══════════════════════════════════════════════════════════════════
// formatDate
// ═══════════════════════════════════════════════════════════════════
describe('formatDate', () => {
  test('formats a valid date string', () => {
    const result = formatDate('2025-06-15');
    expect(result).not.toBe('—');
    expect(typeof result).toBe('string');
  });

  test('formats a Date object', () => {
    const result = formatDate(new Date(2025, 0, 1));
    expect(result).not.toBe('—');
  });

  test('returns — for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns — for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  test('accepts custom options', () => {
    const result = formatDate('2025-03-15', { month: 'long' });
    expect(result).not.toBe('—');
  });
});

// ═══════════════════════════════════════════════════════════════════
// formatHijri
// ═══════════════════════════════════════════════════════════════════
describe('formatHijri', () => {
  test('formats a date in Hijri calendar', () => {
    const result = formatHijri('2025-06-15');
    expect(result).not.toBe('—');
    expect(typeof result).toBe('string');
  });

  test('returns — for null', () => {
    expect(formatHijri(null)).toBe('—');
  });

  test('returns — for invalid date', () => {
    expect(formatHijri('invalid')).toBe('—');
  });
});

// ═══════════════════════════════════════════════════════════════════
// formatDateTime
// ═══════════════════════════════════════════════════════════════════
describe('formatDateTime', () => {
  test('formats date with time', () => {
    const result = formatDateTime('2025-06-15T14:30:00');
    expect(result).not.toBe('—');
  });

  test('returns — for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  test('returns — for invalid date', () => {
    expect(formatDateTime('garbage')).toBe('—');
  });
});

// ═══════════════════════════════════════════════════════════════════
// formatTime
// ═══════════════════════════════════════════════════════════════════
describe('formatTime', () => {
  test('formats time component', () => {
    const result = formatTime('2025-06-15T14:30:00');
    expect(result).not.toBe('—');
  });

  test('returns — for null', () => {
    expect(formatTime(null)).toBe('—');
  });
});

// ═══════════════════════════════════════════════════════════════════
// timeAgo
// ═══════════════════════════════════════════════════════════════════
describe('timeAgo', () => {
  test('returns "الآن" for dates less than 60 seconds ago', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe('الآن');
  });

  test('returns minutes ago for recent dates', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = timeAgo(fiveMinAgo);
    expect(result).toContain('منذ');
    expect(result).toContain('دقائق');
  });

  test('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = timeAgo(threeHoursAgo);
    expect(result).toContain('منذ');
    expect(result).toContain('ساعات');
  });

  test('returns empty string for null', () => {
    expect(timeAgo(null)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════
// getDayRange
// ═══════════════════════════════════════════════════════════════════
describe('getDayRange', () => {
  test('returns start at midnight and end at 23:59:59', () => {
    const { start, end } = getDayRange(new Date(2025, 5, 15, 12, 30));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  test('preserves the same date', () => {
    const { start, end } = getDayRange(new Date(2025, 0, 1));
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// daysBetween
// ═══════════════════════════════════════════════════════════════════
describe('daysBetween', () => {
  test('calculates days correctly', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10);
  });

  test('returns 0 for same date', () => {
    expect(daysBetween('2025-06-15', '2025-06-15')).toBe(0);
  });

  test('order does not matter (absolute difference)', () => {
    expect(daysBetween('2025-01-10', '2025-01-01')).toBe(9);
  });
});

// ═══════════════════════════════════════════════════════════════════
// isToday / isPast / isFuture
// ═══════════════════════════════════════════════════════════════════
describe('isToday', () => {
  test('returns true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  test('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe('isPast', () => {
  test('returns true for past date', () => {
    expect(isPast('2020-01-01')).toBe(true);
  });

  test('returns false for future date', () => {
    expect(isPast('2099-01-01')).toBe(false);
  });
});

describe('isFuture', () => {
  test('returns true for future date', () => {
    expect(isFuture('2099-01-01')).toBe(true);
  });

  test('returns false for past date', () => {
    expect(isFuture('2020-01-01')).toBe(false);
  });
});
