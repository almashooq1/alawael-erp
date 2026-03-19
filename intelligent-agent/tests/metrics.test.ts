import { describe, it, expect, beforeEach } from 'vitest';
import { Metrics } from '../src/modules/metrics';

describe('Metrics', () => {
  let metrics: Metrics;

  beforeEach(() => {
    metrics = new Metrics();
  });

  describe('Initialization & Configuration', () => {
    it('should create instance with default configuration', () => {
      expect(metrics).toBeDefined();
      expect(metrics instanceof Metrics).toBe(true);
    });

    it('should accept enableTimeSeries configuration', () => {
      const customMetrics = new Metrics({ enableTimeSeries: true });
      expect(customMetrics).toBeDefined();
    });

    it('should accept maxDataPoints configuration', () => {
      const customMetrics = new Metrics({ maxDataPoints: 5000 });
      expect(customMetrics).toBeDefined();
    });

    it('should accept enableEvents configuration', () => {
      const customMetrics = new Metrics({ enableEvents: false });
      expect(customMetrics).toBeDefined();
    });

    it('should initialize with no metrics', () => {
      expect(metrics.getMetrics().length).toBe(0);
    });
  });

  describe('Increment Operation', () => {
    it('should increment metric by 1', () => {
      metrics.increment('requests');
      expect(metrics.get('requests')).toBe(1);
    });

    it('should increment multiple times', () => {
      metrics.increment('requests');
      metrics.increment('requests');
      metrics.increment('requests');
      expect(metrics.get('requests')).toBe(3);
    });

    it('should increment by custom value', () => {
      metrics.increment('users', 5);
      expect(metrics.get('users')).toBe(5);
    });

    it('should handle multiple metrics', () => {
      metrics.increment('requests', 2);
      metrics.increment('errors', 1);
      
      expect(metrics.get('requests')).toBe(2);
      expect(metrics.get('errors')).toBe(1);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.increment('')).toThrow('Metric name is required');
    });

    it('should throw error for negative increment', () => {
      expect(() => metrics.increment('metric', -1)).toThrow('Increment value must be non-negative');
    });

    it('should return updated value', () => {
      const result = metrics.increment('metric', 5);
      expect(result).toBe(5);
    });
  });

  describe('Decrement Operation', () => {
    it('should decrement metric by 1', () => {
      metrics.set('counter', 5);
      metrics.decrement('counter');
      expect(metrics.get('counter')).toBe(4);
    });

    it('should decrement by custom value', () => {
      metrics.set('counter', 10);
      metrics.decrement('counter', 3);
      expect(metrics.get('counter')).toBe(7);
    });

    it('should not go below zero', () => {
      metrics.set('counter', 2);
      metrics.decrement('counter', 5);
      expect(metrics.get('counter')).toBe(0);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.decrement('')).toThrow('Metric name is required');
    });

    it('should throw error for negative decrement', () => {
      expect(() => metrics.decrement('metric', -1)).toThrow('Decrement value must be non-negative');
    });

    it('should return updated value', () => {
      metrics.set('counter', 10);
      const result = metrics.decrement('counter', 2);
      expect(result).toBe(8);
    });
  });

  describe('Set Operation', () => {
    it('should set metric value', () => {
      metrics.set('response_time', 123);
      expect(metrics.get('response_time')).toBe(123);
    });

    it('should overwrite existing value', () => {
      metrics.set('metric', 10);
      metrics.set('metric', 20);
      expect(metrics.get('metric')).toBe(20);
    });

    it('should handle zero value', () => {
      metrics.set('metric', 0);
      expect(metrics.get('metric')).toBe(0);
    });

    it('should handle large numbers', () => {
      metrics.set('large', 1000000000);
      expect(metrics.get('large')).toBe(1000000000);
    });

    it('should handle decimal numbers', () => {
      metrics.set('latency', 123.456);
      expect(metrics.get('latency')).toBe(123.456);
    });

    it('should throw error for non-numeric values', () => {
      expect(() => metrics.set('metric', NaN)).toThrow('Metric value must be a valid number');
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.set('', 100)).toThrow('Metric name is required');
    });

    it('should return set value', () => {
      const result = metrics.set('metric', 42);
      expect(result).toBe(42);
    });
  });

  describe('Get Operation', () => {
    it('should return metric value', () => {
      metrics.set('metric', 100);
      expect(metrics.get('metric')).toBe(100);
    });

    it('should return 0 for non-existent metric', () => {
      expect(metrics.get('nonexistent')).toBe(0);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.get('')).toThrow('Metric name is required');
    });
  });

  describe('GetAll Operation', () => {
    it('should return all metrics', () => {
      metrics.set('metric1', 10);
      metrics.set('metric2', 20);
      metrics.set('metric3', 30);
      
      const all = metrics.getAll();
      expect(all).toEqual({
        metric1: 10,
        metric2: 20,
        metric3: 30
      });
    });

    it('should return empty object when no metrics', () => {
      const all = metrics.getAll();
      expect(all).toEqual({});
    });
  });

  describe('Summary Statistics', () => {
    it('should return summary for single value', () => {
      metrics.set('metric', 50);
      const summary = metrics.getSummary('metric');
      
      expect(summary.total).toBe(50);
      expect(summary.count).toBe(1);
      expect(summary.average).toBe(50);
      expect(summary.min).toBe(50);
      expect(summary.max).toBe(50);
      expect(summary.lastValue).toBe(50);
    });

    it('should calculate statistics from time series', async () => {
      metrics.set('metric', 10);
      await new Promise(resolve => setTimeout(resolve, 10));
      metrics.set('metric', 20);
      await new Promise(resolve => setTimeout(resolve, 10));
      metrics.set('metric', 30);
      
      const summary = metrics.getSummary('metric');
      
      expect(summary.total).toBe(60);
      expect(summary.count).toBe(3);
      expect(summary.average).toBe(20);
      expect(summary.min).toBe(10);
      expect(summary.max).toBe(30);
      expect(summary.lastValue).toBe(30);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.getSummary('')).toThrow('Metric name is required');
    });
  });

  describe('Time Series Data', () => {
    it('should record data points with timestamps', async () => {
      metrics.set('metric', 10);
      await new Promise(resolve => setTimeout(resolve, 10));
      metrics.set('metric', 20);
      
      const series = metrics.getTimeSeries('metric');
      expect(series.length).toBe(2);
      expect(series[0].value).toBe(10);
      expect(series[1].value).toBe(20);
      expect(series[0].timestamp).toBeLessThan(series[1].timestamp);
    });

    it('should return empty series for non-existent metric', () => {
      const series = metrics.getTimeSeries('nonexistent');
      expect(series).toEqual([]);
    });

    it('should enforce max data points limit', () => {
      const limitedMetrics = new Metrics({ maxDataPoints: 5 });
      
      for (let i = 1; i <= 10; i++) {
        limitedMetrics.set('metric', i);
      }
      
      const series = limitedMetrics.getTimeSeries('metric');
      expect(series.length).toBeLessThanOrEqual(5);
      expect(series[series.length - 1].value).toBe(10);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.getTimeSeries('')).toThrow('Metric name is required');
    });

    it('should track data point count', async () => {
      metrics.set('metric', 10);
      expect(metrics.getDataPointCount('metric')).toBe(1);
      
      metrics.set('metric', 20);
      expect(metrics.getDataPointCount('metric')).toBe(2);
    });
  });

  describe('Reset Operations', () => {
    it('should reset single metric', () => {
      metrics.set('metric1', 100);
      metrics.set('metric2', 200);
      
      metrics.reset('metric1');
      
      expect(metrics.get('metric1')).toBe(0);
      expect(metrics.get('metric2')).toBe(200);
      expect(metrics.hasMetric('metric1')).toBe(false);
    });

    it('should reset all metrics', () => {
      metrics.set('metric1', 100);
      metrics.set('metric2', 200);
      metrics.set('metric3', 300);
      
      metrics.resetAll();
      
      expect(metrics.getMetrics().length).toBe(0);
      expect(metrics.get('metric1')).toBe(0);
    });

    it('should throw error for missing metric name on reset', () => {
      expect(() => metrics.reset('')).toThrow('Metric name is required');
    });
  });

  describe('Metrics List & Existence', () => {
    it('should list all active metrics', () => {
      metrics.set('requests', 10);
      metrics.set('errors', 5);
      metrics.set('latency', 123);
      
      const list = metrics.getMetrics();
      expect(list.length).toBe(3);
      expect(list).toContain('requests');
      expect(list).toContain('errors');
      expect(list).toContain('latency');
    });

    it('should check metric existence', () => {
      metrics.set('exists', 100);
      
      expect(metrics.hasMetric('exists')).toBe(true);
      expect(metrics.hasMetric('notexist')).toBe(false);
    });

    it('should return false for null metric name', () => {
      const result = metrics.hasMetric(null as any);
      expect(result).toBe(false);
    });
  });

  describe('Aggregation', () => {
    it('should calculate sum of metrics', () => {
      metrics.set('cpu_process1', 25);
      metrics.set('cpu_process2', 30);
      metrics.set('cpu_process3', 45);
      
      const sum = metrics.aggregateMetrics(
        ['cpu_process1', 'cpu_process2', 'cpu_process3'],
        'sum'
      );
      expect(sum).toBe(100);
    });

    it('should calculate average of metrics', () => {
      metrics.set('latency1', 100);
      metrics.set('latency2', 200);
      metrics.set('latency3', 300);
      
      const avg = metrics.aggregateMetrics(
        ['latency1', 'latency2', 'latency3'],
        'avg'
      );
      expect(avg).toBe(200);
    });

    it('should find minimum of metrics', () => {
      metrics.set('value1', 50);
      metrics.set('value2', 10);
      metrics.set('value3', 100);
      
      const min = metrics.aggregateMetrics(
        ['value1', 'value2', 'value3'],
        'min'
      );
      expect(min).toBe(10);
    });

    it('should find maximum of metrics', () => {
      metrics.set('value1', 50);
      metrics.set('value2', 10);
      metrics.set('value3', 100);
      
      const max = metrics.aggregateMetrics(
        ['value1', 'value2', 'value3'],
        'max'
      );
      expect(max).toBe(100);
    });

    it('should return 0 for empty metric list', () => {
      const result = metrics.aggregateMetrics([], 'sum');
      expect(result).toBe(0);
    });

    it('should handle non-existent metrics in aggregation', () => {
      metrics.set('metric1', 100);
      
      const sum = metrics.aggregateMetrics(
        ['metric1', 'nonexistent', 'alsonothere'],
        'sum'
      );
      expect(sum).toBe(100);
    });
  });

  describe('Percentile Calculation', () => {
    it('should calculate 50th percentile (median)', () => {
      for (let i = 1; i <= 5; i++) {
        metrics.set('latency', i * 10);
      }
      
      const p50 = metrics.getPercentile('latency', 50);
      expect(p50).toBeGreaterThan(0);
    });

    it('should calculate 95th percentile', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.set('latency', i);
      }
      
      const p95 = metrics.getPercentile('latency', 95);
      expect(p95).toBeGreaterThan(50);
    });

    it('should calculate 99th percentile', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.set('response_time', i);
      }
      
      const p99 = metrics.getPercentile('response_time', 99);
      expect(p99).toBeGreaterThan(90);
    });

    it('should throw error for invalid percentile', () => {
      metrics.set('metric', 100);
      
      expect(() => metrics.getPercentile('metric', 101)).toThrow('Percentile must be between 0 and 100');
      expect(() => metrics.getPercentile('metric', -1)).toThrow('Percentile must be between 0 and 100');
    });

    it('should return 0 for non-existent metric', () => {
      const p50 = metrics.getPercentile('nonexistent', 50);
      expect(p50).toBe(0);
    });

    it('should throw error for missing metric name', () => {
      expect(() => metrics.getPercentile('', 50)).toThrow('Metric name is required');
    });
  });

  describe('Event Emission', () => {
    it('should emit increment event', () => {
      return new Promise<void>((resolve) => {
        metrics.once('increment', (data) => {
          expect(data).toHaveProperty('metric');
          expect(data).toHaveProperty('value');
          expect(data).toHaveProperty('current');
          resolve();
        });
        metrics.increment('requests', 5);
      });
    });

    it('should emit set event', () => {
      return new Promise<void>((resolve) => {
        metrics.once('set', (data) => {
          expect(data).toHaveProperty('metric');
          expect(data).toHaveProperty('value');
          resolve();
        });
        metrics.set('metric', 100);
      });
    });

    it('should emit decrement event', () => {
      return new Promise<void>((resolve) => {
        metrics.set('counter', 10);
        metrics.once('decrement', (data) => {
          expect(data).toHaveProperty('metric');
          expect(data).toHaveProperty('value');
          resolve();
        });
        metrics.decrement('counter', 3);
      });
    });

    it('should emit reset event', () => {
      return new Promise<void>((resolve) => {
        metrics.set('metric', 100);
        metrics.once('reset', (data) => {
          expect(data).toHaveProperty('metric');
          resolve();
        });
        metrics.reset('metric');
      });
    });

    it('should not emit events when disabled', () => {
      const noEventMetrics = new Metrics({ enableEvents: false });
      let eventFired = false;
      
      noEventMetrics.once('increment', () => {
        eventFired = true;
      });
      
      noEventMetrics.increment('metric', 5);
      expect(eventFired).toBe(false);
    });
  });

  describe('Instance Isolation', () => {
    it('should not share metrics between instances', () => {
      const metrics1 = new Metrics();
      const metrics2 = new Metrics();
      
      metrics1.set('shared', 100);
      metrics2.set('shared', 200);
      
      expect(metrics1.get('shared')).toBe(100);
      expect(metrics2.get('shared')).toBe(200);
    });

    it('should not share time series data between instances', () => {
      const metrics1 = new Metrics({ enableTimeSeries: true });
      const metrics2 = new Metrics({ enableTimeSeries: true });
      
      metrics1.set('metric', 10);
      metrics2.set('metric', 20);
      
      const series1 = metrics1.getTimeSeries('metric');
      const series2 = metrics2.getTimeSeries('metric');
      
      expect(series1.length).toBe(1);
      expect(series2.length).toBe(1);
      expect(series1[0].value).toBe(10);
      expect(series2[0].value).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large metric values', () => {
      metrics.set('large', Number.MAX_SAFE_INTEGER);
      expect(metrics.get('large')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small decimal values', () => {
      metrics.set('small', 0.00001);
      expect(metrics.get('small')).toBeCloseTo(0.00001, 5);
    });

    it('should handle metrics with special characters in names', () => {
      metrics.set('metric:with:colons', 100);
      metrics.set('metric-with-dashes', 200);
      metrics.set('metric_with_underscores', 300);
      
      expect(metrics.get('metric:with:colons')).toBe(100);
      expect(metrics.get('metric-with-dashes')).toBe(200);
      expect(metrics.get('metric_with_underscores')).toBe(300);
    });

    it('should handle synchronous increment operations', () => {
      for (let i = 0; i < 100; i++) {
        metrics.increment('concurrent');
      }
      
      expect(metrics.get('concurrent')).toBe(100);
    });
  });
});
