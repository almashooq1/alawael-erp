/**
 * ============================================
 * PERFORMANCE MONITORING MODULE
 * وحدة مراقبة الأداء
 * ============================================
 */

import { EventEmitter } from 'events';

/**
 * Performance Metrics
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();
  private aggregates: Map<string, any> = new Map();
  private thresholds: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeThresholds();
  }

  /**
   * Initialize default thresholds
   */
  private initializeThresholds() {
    // API Response thresholds (ms)
    this.thresholds.set('api_response', 200);
    this.thresholds.set('database_query', 500);
    this.thresholds.set('cache_lookup', 50);
    this.thresholds.set('external_api_call', 3000);
    this.thresholds.set('file_operation', 1000);
  }

  /**
   * Set custom threshold
   */
  setThreshold(name: string, milliseconds: number) {
    this.thresholds.set(name, milliseconds);
  }

  /**
   * Start measuring performance
   */
  startMeasure(name: string) {
    this.activeTimers.set(name, Date.now());
  }

  /**
   * End measuring and record metric
   */
  endMeasure(name: string, status: 'success' | 'failure' = 'success', metadata?: Record<string, any>) {
    const startTime = this.activeTimers.get(name);

    if (!startTime) {
      console.warn(`⚠️  Metric '${name}' was not started`);
      return;
    }

    const duration = Date.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      status,
      metadata,
    };

    this.metrics.push(metric);
    this.activeTimers.delete(name);

    // Check threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      this.emit('threshold_exceeded', {
        metric: name,
        duration,
        threshold,
        percentage: ((duration / threshold - 1) * 100).toFixed(2),
      });
    }

    // Update aggregates
    this.updateAggregate(name, duration);

    return metric;
  }

  /**
   * Measure function execution
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      this.endMeasure(name, 'success', metadata);
      return result;
    } catch (error) {
      this.endMeasure(name, 'failure', { error: (error as Error).message, ...metadata });
      throw error;
    }
  }

  /**
   * Measure sync function execution
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startMeasure(name);
    try {
      const result = fn();
      this.endMeasure(name, 'success', metadata);
      return result;
    } catch (error) {
      this.endMeasure(name, 'failure', { error: (error as Error).message, ...metadata });
      throw error;
    }
  }

  /**
   * Update aggregate statistics
   */
  private updateAggregate(name: string, duration: number) {
    if (!this.aggregates.has(name)) {
      this.aggregates.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      });
    }

    const stats = this.aggregates.get(name);
    stats.count++;
    stats.total += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    stats.avg = stats.total / stats.count;

    // Calculate percentiles (simplified)
    const metricsByName = this.metrics
      .filter(m => m.name === name)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (metricsByName.length > 0) {
      stats.p50 = metricsByName[Math.floor(metricsByName.length * 0.5)];
      stats.p95 = metricsByName[Math.floor(metricsByName.length * 0.95)];
      stats.p99 = metricsByName[Math.floor(metricsByName.length * 0.99)];
    }
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get aggregate statistics
   */
  getAggregates(name?: string) {
    if (name) {
      return this.aggregates.get(name);
    }
    return Object.fromEntries(this.aggregates);
  }

  /**
   * Get performance report
   */
  getReport(options: { limit?: number; sortBy?: string } = {}) {
    const { limit = 100, sortBy = 'duration' } = options;

    const report = {
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      uniqueMetrics: new Set(this.metrics.map(m => m.name)).size,
      metrics: {
        success: this.metrics.filter(m => m.status === 'success').length,
        failure: this.metrics.filter(m => m.status === 'failure').length,
      },
      aggregates: Object.fromEntries(
        Array.from(this.aggregates.entries())
          .map(([name, stats]) => [
            name,
            {
              count: stats.count,
              avg: stats.avg.toFixed(2),
              min: stats.min,
              max: stats.max,
              p50: stats.p50,
              p95: stats.p95,
              p99: stats.p99,
            },
          ])
          .sort((a, b) => {
            if (sortBy === 'count') return b[1].count - a[1].count;
            if (sortBy === 'avg') return parseFloat(b[1].avg) - parseFloat(a[1].avg);
            return 0;
          })
          .slice(0, limit)
      ),
      slowestOperations: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(m => ({
          name: m.name,
          duration: m.duration,
          timestamp: m.timestamp,
        })),
    };

    return report;
  }

  /**
   * Clear metrics (for periodic reset)
   */
  clear() {
    this.metrics = [];
    this.aggregates.clear();
  }

  /**
   * Export metrics to JSON
   */
  exportToJSON() {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Export metrics to CSV
   */
  exportToCSV() {
    const csv = [
      'name,duration,status,timestamp',
      ...this.metrics.map(m =>
        `${m.name},${m.duration},${m.status},${m.timestamp.toISOString()}`
      ),
    ].join('\n');

    return csv;
  }
}

/**
 * Create global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function performance
 */
export function Measure(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return globalPerformanceMonitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export default PerformanceMonitor;
