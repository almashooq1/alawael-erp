/**
 * Tests for Performance Monitoring Utility
 */

import {
  getMetricRating,
  getRatingColor,
  getMetricThresholds,
  logPerformanceMetrics,
} from './performanceMonitor';

describe('performanceMonitor', () => {
  describe('getMetricRating', () => {
    it('returns good for LCP below good threshold', () => {
      expect(getMetricRating('LCP', 2000)).toBe('good');
    });

    it('returns needs-improvement for LCP between thresholds', () => {
      expect(getMetricRating('LCP', 3000)).toBe('needs-improvement');
    });

    it('returns poor for LCP above poor threshold', () => {
      expect(getMetricRating('LCP', 4500)).toBe('poor');
    });

    it('returns unknown for unsupported metric', () => {
      expect(getMetricRating('UNKNOWN', 100)).toBe('unknown');
    });

    it('returns unknown for null/undefined value', () => {
      expect(getMetricRating('LCP', null)).toBe('unknown');
      expect(getMetricRating('LCP', undefined)).toBe('unknown');
    });
  });

  describe('getRatingColor', () => {
    it('returns correct colors', () => {
      expect(getRatingColor('good')).toBe('#10b981');
      expect(getRatingColor('needs-improvement')).toBe('#f59e0b');
      expect(getRatingColor('poor')).toBe('#ef4444');
      expect(getRatingColor('unknown')).toBe('#9ca3af');
    });
  });

  describe('getMetricThresholds', () => {
    it('returns thresholds for known metrics', () => {
      expect(getMetricThresholds('CLS')).toEqual({ good: 0.1, poor: 0.25 });
      expect(getMetricThresholds('LCP')).toEqual({ good: 2500, poor: 4000 });
    });

    it('returns undefined for unknown metrics', () => {
      expect(getMetricThresholds('UNKNOWN')).toBeUndefined();
    });
  });

  describe('logPerformanceMetrics', () => {
    it('does not throw when performance entries are available', () => {
      // jsdom does not provide navigation entries by default
      expect(() => logPerformanceMetrics()).not.toThrow();
    });
  });
});
