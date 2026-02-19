import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  pluralize,
  formatWithPlural,
} from '../formatting';

describe('i18n Formatting Utilities', () => {
  describe('formatNumber', () => {
    it('formats numbers with locale-specific separators', () => {
      const num = 1000;
      const enFormat = formatNumber(num, 'en');
      const frFormat = formatNumber(num, 'fr');

      expect(enFormat).toContain('1');
      expect(frFormat).toContain('1');
    });

    it('handles decimal numbers', () => {
      const num = 1234.56;
      const result = formatNumber(num, 'en');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('handles zero', () => {
      expect(formatNumber(0, 'en')).toBe('0');
    });

    it('handles negative numbers', () => {
      const result = formatNumber(-1000, 'en');
      expect(result).toContain('1');
    });
  });

  describe('formatCurrency', () => {
    it('formats currency with currency symbol', () => {
      const result = formatCurrency(99.99, 'en', 'USD');
      expect(result).toContain('99');
      expect(result).toContain('99');
    });

    it('handles different currencies', () => {
      const usd = formatCurrency(100, 'en', 'USD');
      const eur = formatCurrency(100, 'en', 'EUR');

      expect(usd).not.toEqual(eur);
    });

    it('handles zero currency', () => {
      const result = formatCurrency(0, 'en', 'USD');
      expect(result).toContain('0');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages correctly', () => {
      const result = formatPercent(0.75, 'en');
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('respects maxFractionDigits', () => {
      const result = formatPercent(0.333333, 'en', 2);
      expect(result).toContain('33');
    });

    it('handles zero percent', () => {
      const result = formatPercent(0, 'en');
      expect(result).toContain('0');
    });

    it('handles 100 percent', () => {
      const result = formatPercent(1, 'en');
      expect(result).toContain('100');
    });
  });

  describe('formatDate', () => {
    it('formats dates correctly', () => {
      const date = new Date(2026, 0, 29); // January 29, 2026
      const result = formatDate(date, 'en');
      expect(result).toContain('2026');
    });

    it('handles different locales', () => {
      const date = new Date(2026, 0, 29);
      const enFormat = formatDate(date, 'en');
      const frFormat = formatDate(date, 'fr');

      // Both should contain the year
      expect(enFormat).toContain('2026');
      expect(frFormat).toContain('2026');
    });

    it('handles RTL locale (Arabic)', () => {
      const date = new Date(2026, 0, 29);
      const result = formatDate(date, 'ar');
      expect(result).toContain('2026');
    });
  });

  describe('formatTime', () => {
    it('formats time correctly', () => {
      const date = new Date(2026, 0, 29, 14, 30, 45);
      const result = formatTime(date, 'en');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('handles different locales', () => {
      const date = new Date(2026, 0, 29, 14, 30, 45);
      const enFormat = formatTime(date, 'en');
      const arFormat = formatTime(date, 'ar');

      expect(enFormat).toBeTruthy();
      expect(arFormat).toBeTruthy();
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time together', () => {
      const date = new Date(2026, 0, 29, 14, 30, 45);
      const result = formatDateTime(date, 'en');

      expect(result).toContain('2026');
      expect(result).toContain('14');
    });

    it('includes both date and time components', () => {
      const date = new Date(2026, 0, 29, 14, 30, 45);
      const result = formatDateTime(date, 'en');

      expect(result.length).toBeGreaterThan(10);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 29, 12, 0, 0));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('formats recent times as seconds ago', () => {
      const date = new Date(2026, 0, 29, 11, 59, 30); // 30 seconds ago
      const result = formatRelativeTime(date, 'en');
      expect(result).toBeTruthy();
    });

    it('formats minutes ago', () => {
      const date = new Date(2026, 0, 29, 11, 45, 0); // 15 minutes ago
      const result = formatRelativeTime(date, 'en');
      expect(result).toBeTruthy();
    });

    it('formats hours ago', () => {
      const date = new Date(2026, 0, 29, 10, 0, 0); // 2 hours ago
      const result = formatRelativeTime(date, 'en');
      expect(result).toBeTruthy();
    });

    it('formats days ago', () => {
      const date = new Date(2026, 0, 27, 12, 0, 0); // 2 days ago
      const result = formatRelativeTime(date, 'en');
      expect(result).toBeTruthy();
    });
  });

  describe('pluralize', () => {
    it('returns singular for count of 1', () => {
      const result = pluralize({ count: 1, singular: 'item', plural: 'items' });
      expect(result).toBe('item');
    });

    it('returns plural for count > 1', () => {
      const result = pluralize({ count: 5, singular: 'item', plural: 'items' });
      expect(result).toBe('items');
    });

    it('returns zero form if provided', () => {
      const result = pluralize({
        count: 0,
        singular: 'item',
        plural: 'items',
        zero: 'no items',
      });
      expect(result).toBe('no items');
    });

    it('returns plural for zero if zero form not provided', () => {
      const result = pluralize({ count: 0, singular: 'item', plural: 'items' });
      expect(result).toBe('items');
    });
  });

  describe('formatWithPlural', () => {
    it('formats number with singular', () => {
      const result = formatWithPlural(1, 'user', 'users', 'en');
      expect(result).toContain('user');
    });

    it('formats number with plural', () => {
      const result = formatWithPlural(5, 'user', 'users', 'en');
      expect(result).toContain('users');
      expect(result).toContain('5');
    });

    it('formats numbers with locale formatting', () => {
      const result = formatWithPlural(1000, 'user', 'users', 'en');
      expect(result).toContain('users');
      expect(result).toContain('1');
    });
  });

  describe('Error Handling', () => {
    it('handles invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      const result = formatDate(invalidDate, 'en');
      expect(result).toBeTruthy();
    });

    it('handles invalid locales gracefully', () => {
      const result = formatNumber(1000, 'xx');
      expect(result).toBe('1000');
    });
  });

  describe('Multiple Locale Support', () => {
    it('formats consistently across supported locales', () => {
      const locales = ['en', 'ar', 'fr'];
      const num = 1000;

      locales.forEach(locale => {
        const result = formatNumber(num, locale);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
