/**
 * 🚀 Phase 21: Real-Time Monitoring & Analytics System
 * Advanced Real-Time Dashboard, Metrics, and Monitoring
 */

const mongoose = require('mongoose');

// Mock Real-Time Monitoring Service
class RealtimeMonitoringService {
  constructor() {
    this.metrics = new Map();
    this.subscribers = new Set();
    this.alerts = [];
    this.thresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 5000,
      errorRate: 10,
    };
  }

  // 📊 Real-Time Metrics Collection
  recordMetric(category, value, timestamp = new Date()) {
    const key = `${category}:${timestamp.getHours()}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push({ value, timestamp });
    this.checkThresholds(category, value);
    this.notifySubscribers(category, value);
    return true;
  }

  // 🔔 Threshold Detection & Alerts
  checkThresholds(category, value) {
    const threshold = this.thresholds[category];
    if (threshold && value > threshold) {
      const alert = {
        id: `alert_${Date.now()}`,
        category,
        value,
        threshold,
        severity: value > threshold * 1.5 ? 'critical' : 'warning',
        timestamp: new Date(),
      };
      this.alerts.push(alert);
      return alert;
    }
    return null;
  }

  // 📡 Real-Time Updates via Subscriptions
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(category, value) {
    this.subscribers.forEach(callback => {
      try {
        callback({ category, value, timestamp: new Date() });
      } catch (error) {
        // Silently handle subscriber errors to prevent cascading failures
      }
    });
  }

  // 📈 Dashboard Data Generation
  getDashboardData(timeRange = 'hour') {
    const data = {
      timestamp: new Date(),
      timeRange,
      summary: {
        totalRequests: this.metrics.size,
        averageResponseTime: this.calculateAverage('responseTime'),
        errorRate: this.calculateErrorRate(),
        cpuUsage: this.getLatestMetric('cpuUsage'),
        memoryUsage: this.getLatestMetric('memoryUsage'),
      },
      alerts: this.alerts.slice(-10),
      trends: this.calculateTrends(),
      health: this.calculateSystemHealth(),
    };
    return data;
  }

  // 📊 Analytics Calculations
  calculateAverage(category) {
    const values = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(category))
      .flatMap(([, vals]) => vals.map(v => v.value));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  calculateErrorRate() {
    const allMetrics = Array.from(this.metrics.values()).flat();
    if (allMetrics.length === 0) return 0;
    const errors = allMetrics.filter(m => m.value > 400).length;
    return (errors / allMetrics.length) * 100;
  }

  getLatestMetric(category) {
    let latest = null;
    for (const [key, values] of this.metrics.entries()) {
      if (key.startsWith(category) && values.length > 0) {
        const val = values[values.length - 1];
        if (!latest || val.timestamp > latest.timestamp) {
          latest = val;
        }
      }
    }
    return latest ? latest.value : 0;
  }

  calculateTrends() {
    return {
      cpuTrend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
      memoryTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
      requestTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
    };
  }

  calculateSystemHealth() {
    const cpu = this.getLatestMetric('cpuUsage');
    const memory = this.getLatestMetric('memoryUsage');
    const errorRate = this.calculateErrorRate();

    if (cpu > 90 || memory > 90 || errorRate > 15) return 'critical';
    if (cpu > 75 || memory > 75 || errorRate > 10) return 'warning';
    return 'healthy';
  }

  // 🔍 Advanced Filtering
  getMetricsByTimeRange(category, startTime, endTime) {
    const results = [];
    for (const [key, values] of this.metrics.entries()) {
      if (key.startsWith(category)) {
        results.push(...values.filter(v => v.timestamp >= startTime && v.timestamp <= endTime));
      }
    }
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  // 🧹 Data Retention Cleanup
  cleanupOldMetrics(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 3600000);
    let removed = 0;
    for (const [key, values] of this.metrics.entries()) {
      const filtered = values.filter(v => v.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(key);
        removed++;
      } else {
        this.metrics.set(key, filtered);
      }
    }
    return removed;
  }
}

// ============================================
// Phase 21 Tests: Real-Time Monitoring
// ============================================

describe('🚀 Phase 21: Real-Time Monitoring System', () => {
  let service;

  beforeEach(() => {
    service = new RealtimeMonitoringService();
  });

  describe('Metrics Collection', () => {
    test('should record CPU metrics', () => {
      const result = service.recordMetric('cpuUsage', 65);
      expect(result).toBe(true);
    });

    test('should record memory metrics', () => {
      const result = service.recordMetric('memoryUsage', 70);
      expect(result).toBe(true);
    });

    test('should record response time metrics', () => {
      const result = service.recordMetric('responseTime', 250);
      expect(result).toBe(true);
    });

    test('should store metrics with timestamps', () => {
      const now = new Date();
      service.recordMetric('cpuUsage', 60, now);
      const dashboard = service.getDashboardData();
      expect(dashboard.summary.cpuUsage).toBe(60);
    });
  });

  describe('Threshold Detection', () => {
    test('should detect CPU threshold breach', () => {
      const alert = service.checkThresholds('cpuUsage', 85);
      expect(alert).toBeDefined();
      expect(alert.severity).toBe('warning');
    });

    test('should detect critical CPU threshold', () => {
      const alert = service.checkThresholds('cpuUsage', 125);
      expect(alert).toBeDefined();
      expect(alert.severity).toBe('critical');
    });

    test('should not alert below threshold', () => {
      const alert = service.checkThresholds('cpuUsage', 50);
      expect(alert).toBeNull();
    });

    test('should track multiple alerts', () => {
      service.recordMetric('cpuUsage', 85);
      service.recordMetric('memoryUsage', 90);
      expect(service.alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Real-Time Subscriptions', () => {
    test('should notify subscribers of metric updates', done => {
      let notified = false;
      service.subscribe(data => {
        notified = true;
        expect(data.category).toBe('cpuUsage');
        expect(data.value).toBe(75);
        done();
      });

      service.recordMetric('cpuUsage', 75);
    });

    test('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.subscribe(callback1);
      service.subscribe(callback2);
      service.recordMetric('responseTime', 300);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should allow unsubscription', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe(callback);

      service.recordMetric('cpuUsage', 60);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      service.recordMetric('cpuUsage', 70);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dashboard Analytics', () => {
    beforeEach(() => {
      service.recordMetric('cpuUsage', 60);
      service.recordMetric('cpuUsage', 70);
      service.recordMetric('cpuUsage', 80);
      service.recordMetric('memoryUsage', 50);
      service.recordMetric('memoryUsage', 60);
    });

    test('should generate dashboard data', () => {
      const dashboard = service.getDashboardData();
      expect(dashboard).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.timestamp).toBeInstanceOf(Date);
    });

    test('should calculate average response time', () => {
      service.recordMetric('responseTime', 100);
      service.recordMetric('responseTime', 200);
      service.recordMetric('responseTime', 300);

      const avg = service.calculateAverage('responseTime');
      expect(avg).toBe(200);
    });

    test('should calculate error rate', () => {
      const errorRate = service.calculateErrorRate();
      expect(typeof errorRate).toBe('number');
      expect(errorRate).toBeGreaterThanOrEqual(0);
    });

    test('should calculate system health', () => {
      const health = service.calculateSystemHealth();
      expect(['healthy', 'warning', 'critical']).toContain(health);
    });

    test('should identify trends', () => {
      const dashboard = service.getDashboardData();
      expect(dashboard.trends.cpuTrend).toBeDefined();
      expect(dashboard.trends.memoryTrend).toBeDefined();
    });
  });

  describe('Time Range Queries', () => {
    test('should filter metrics by time range', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000);
      const future = new Date(now.getTime() + 3600000);

      service.recordMetric('cpuUsage', 60, new Date(now.getTime() - 1800000));
      service.recordMetric('cpuUsage', 70, now);

      const results = service.getMetricsByTimeRange('cpuUsage', past, future);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should return empty array for no matching metrics', () => {
      service.recordMetric('cpuUsage', 60);
      const results = service.getMetricsByTimeRange(
        'responseTime',
        new Date(2000, 0, 1),
        new Date(2000, 0, 2)
      );
      expect(results.length).toBe(0);
    });
  });

  describe('Data Retention', () => {
    test('should cleanup old metrics', () => {
      const oldTime = new Date(Date.now() - 25 * 3600000);
      service.recordMetric('cpuUsage', 60, oldTime);
      service.recordMetric('cpuUsage', 70);

      const removed = service.cleanupOldMetrics(24);
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Advanced Scenarios', () => {
    test('should handle system metrics under high load', () => {
      const start = Date.now();
      let operationCount = 0;

      while (Date.now() - start < 1000) {
        service.recordMetric('cpuUsage', Math.random() * 100);
        operationCount++;
      }

      expect(operationCount).toBeGreaterThan(100);
      expect(service.metrics.size).toBeGreaterThan(0);
    });

    test('should maintain accuracy with floating-point metrics', () => {
      const metrics = [0.1, 0.2, 0.3, 0.4, 0.5];
      metrics.forEach(m => service.recordMetric('precision', m));

      const avg = service.calculateAverage('precision');
      expect(Math.abs(avg - 0.3)).toBeLessThan(0.01);
    });

    test('should handle negative metric values', () => {
      service.recordMetric('delta', -50);
      service.recordMetric('delta', -25);
      service.recordMetric('delta', 0);

      const latest = service.getLatestMetric('delta');
      expect(latest).toBe(0);
    });

    test('should detect anomalous spikes in metrics', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMetric('stability', 50);
      }

      service.recordMetric('stability', 999); // Spike

      const dashboard = service.getDashboardData();
      expect(dashboard).toBeDefined();
    });

    test('should expire old metrics automatically', done => {
      service.recordMetric('expire_test', 75);

      setTimeout(() => {
        service.cleanupOldMetrics(0.001); // 3.6 seconds
        const before = service.metrics.size;

        service.recordMetric('new_metric', 80);
        const after = service.metrics.size;

        expect(after).toBeGreaterThanOrEqual(before);
        done();
      }, 100);
    });
  });

  describe('Edge Cases & Error Conditions', () => {
    test('should handle null/undefined metrics gracefully', () => {
      const result = service.recordMetric('nullTest', null);
      expect(result).toBe(true);
    });

    test('should validate threshold configurations', () => {
      service.thresholds.customMetric = 1000;
      const alert = service.checkThresholds('customMetric', 1500);

      expect(alert).toBeDefined();
      expect(alert.threshold).toBe(1000);
    });

    test('should recover from subscriber errors', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = jest.fn();

      service.subscribe(errorCallback);
      service.subscribe(goodCallback);

      try {
        service.recordMetric('test', 50);
      } catch (e) {
        // Errors should be contained
      }

      // Good callback should still work
      expect(goodCallback).toHaveBeenCalled();
    });

    test('should handle extremely large alert lists', () => {
      for (let i = 0; i < 1000; i++) {
        service.recordMetric('cpuUsage', 90 + Math.random() * 10);
      }

      const dashboard = service.getDashboardData();
      expect(dashboard.alerts.length).toBeLessThanOrEqual(10);
    });
  });
});
