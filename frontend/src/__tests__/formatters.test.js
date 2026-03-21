/**
 * formatters.js — Unit Tests
 * اختبارات وحدة لتنسيق العملة والأرقام
 */
import { formatCurrency, formatNumber } from 'utils/formatters';

describe('formatCurrency', () => {
  test('formats positive amount as SAR', () => {
    const result = formatCurrency(1000);
    // Should contain the amount and SAR symbol in Arabic
    expect(result).toMatch(/١[,٬]٠٠٠/); // 1,000 in Arabic digits
    expect(result).toContain('ر.س');
  });

  test('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('٠');
  });

  test('formats null/undefined as 0', () => {
    const result = formatCurrency(null);
    expect(result).toBeDefined();
    expect(result).toContain('٠');
  });

  test('formats decimal amount', () => {
    const result = formatCurrency(1500.75);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('formats negative amount', () => {
    const result = formatCurrency(-500);
    expect(result).toBeDefined();
  });
});

describe('formatNumber', () => {
  test('formats a finite number', () => {
    const result = formatNumber(12345);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).not.toBe('—');
  });

  test('formats zero', () => {
    expect(formatNumber(0)).not.toBe('—');
  });

  test('returns — for non-number input', () => {
    expect(formatNumber('abc')).toBe('—');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });

  test('returns — for NaN', () => {
    expect(formatNumber(NaN)).toBe('—');
  });

  test('returns — for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(-Infinity)).toBe('—');
  });
});
