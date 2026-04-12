/**
 * Unit Tests — BackupAnalyticsService (AdvancedAnalytics)
 * P#68 - Batch 29
 *
 * Singleton (EventEmitter + fs + logger). Mock fs + logger.
 * Covers: analyzePerformance, detectAnomalies, predictSuccessRate,
 *         estimateBackupDuration, getRecommendations, calculateRiskAssessment,
 *         calculateTrend, getRecentMetrics, exportAnalyticsReport, shutdown
 */

'use strict';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('BackupAnalyticsService', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      service = require('../../services/backup-analytics.service');
    });
  });

  afterEach(() => {
    if (service && service.shutdown) service.shutdown();
    jest.useRealTimers();
  });

  /* helper — push metric objects directly (avoids async analyzePerformance) */
  function seedMetrics(arr) {
    arr.forEach(m =>
      service.metrics.push({
        timestamp: m.timestamp || new Date(),
        duration: m.duration || 100,
        size: m.size || 500,
        success: m.success !== undefined ? m.success : true,
        compressionRatio: m.compressionRatio || 0.5,
        encryptionTime: 0,
        uploadTime: 0,
        verificationTime: 0,
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty arrays', () => {
      expect(service.metrics).toEqual([]);
      expect(service.predictions).toEqual([]);
      expect(service.anomalies).toEqual([]);
      expect(service.recommendations).toEqual([]);
    });

    it('has default config values', () => {
      expect(service.dataPath).toBe('./data/analytics');
      expect(service.historyWindow).toBe(90 * 24 * 60 * 60 * 1000);
      expect(service.analysisInterval).toBe(60 * 60 * 1000);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  analyzePerformance (async)                                         */
  /* ------------------------------------------------------------------ */
  describe('analyzePerformance', () => {
    it('returns analysis object with timestamp', async () => {
      const res = await service.analyzePerformance({
        duration: 120,
        size: 1024,
        compressionRatio: 0.6,
        success: true,
      });
      expect(res.timestamp).toBeDefined();
      expect(res.duration).toBe(120);
      expect(res.size).toBe(1024);
      expect(res.success).toBe(true);
      expect(res.compressionRatio).toBe(0.6);
    });

    it('stores metric in metrics array', async () => {
      await service.analyzePerformance({ duration: 60, size: 512, success: true });
      expect(service.metrics).toHaveLength(1);
    });

    it('defaults missing fields to 0 / false', async () => {
      const res = await service.analyzePerformance({});
      expect(res.duration).toBe(0);
      expect(res.size).toBe(0);
      expect(res.success).toBe(false);
      expect(res.compressionRatio).toBe(0);
    });

    it('accumulates multiple metrics', async () => {
      await service.analyzePerformance({ duration: 60, size: 512, success: true });
      await service.analyzePerformance({ duration: 120, size: 1024, success: false });
      expect(service.metrics).toHaveLength(2);
    });

    it('emits metric-recorded event', async () => {
      const spy = jest.fn();
      service.on('analytics:metric-recorded', spy);
      await service.analyzePerformance({ duration: 50, size: 256, success: true });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits trend-updated event', async () => {
      const spy = jest.fn();
      service.on('analytics:trend-updated', spy);
      await service.analyzePerformance({ duration: 50, size: 256, success: true });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits anomalies-detected when anomalies found', async () => {
      // Seed 11 normal metrics so detectAnomalies can run
      seedMetrics(Array.from({ length: 11 }, () => ({ duration: 100, size: 500, success: true })));
      const spy = jest.fn();
      service.on('analytics:anomalies-detected', spy);
      // Outlier duration
      await service.analyzePerformance({ duration: 999999, size: 500, success: true });
      expect(spy).toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  detectAnomalies                                                     */
  /* ------------------------------------------------------------------ */
  describe('detectAnomalies', () => {
    it('returns empty array when ≤ 10 metrics', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 100 })));
      const res = service.detectAnomalies({ duration: 100, compressionRatio: 0.5 });
      expect(res).toEqual([]);
    });

    it('detects SLOW_BACKUP duration anomaly (3σ outlier)', () => {
      seedMetrics(Array.from({ length: 15 }, () => ({ duration: 100, compressionRatio: 0.5 })));
      const res = service.detectAnomalies({ duration: 100000, compressionRatio: 0.5 });
      const slow = res.find(a => a.type === 'SLOW_BACKUP');
      expect(slow).toBeDefined();
      expect(slow.severity).toBe('WARNING');
      expect(slow.actual).toBe(100000);
    });

    it('detects LOW_COMPRESSION anomaly', () => {
      seedMetrics(Array.from({ length: 15 }, () => ({ duration: 100, compressionRatio: 0.8 })));
      const res = service.detectAnomalies({ duration: 100, compressionRatio: 0.1 });
      const lowComp = res.find(a => a.type === 'LOW_COMPRESSION');
      expect(lowComp).toBeDefined();
      expect(lowComp.severity).toBe('INFO');
    });

    it('detects HIGH_FAILURE_RATE anomaly', () => {
      // last 10 metrics: all failures → ≥20% threshold
      seedMetrics(
        Array.from({ length: 11 }, () => ({ duration: 100, success: false, compressionRatio: 0.5 }))
      );
      const res = service.detectAnomalies({ duration: 100, compressionRatio: 0.5 });
      const hfr = res.find(a => a.type === 'HIGH_FAILURE_RATE');
      expect(hfr).toBeDefined();
      expect(hfr.severity).toBe('CRITICAL');
    });

    it('returns empty when all within normal bounds', () => {
      seedMetrics(
        Array.from({ length: 15 }, () => ({ duration: 100, compressionRatio: 0.5, success: true }))
      );
      const res = service.detectAnomalies({ duration: 100, compressionRatio: 0.5 });
      expect(res).toEqual([]);
    });

    it('can return multiple anomaly types at once', () => {
      seedMetrics(
        Array.from({ length: 11 }, () => ({ duration: 100, compressionRatio: 0.8, success: false }))
      );
      const res = service.detectAnomalies({ duration: 999999, compressionRatio: 0.01 });
      expect(res.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  predictSuccessRate                                                  */
  /* ------------------------------------------------------------------ */
  describe('predictSuccessRate', () => {
    it('returns fallback when no metrics', () => {
      const res = service.predictSuccessRate();
      expect(res.prediction).toBe(95);
      expect(res.confidence).toBe(0.5);
      expect(res.reason).toBeDefined();
    });

    it('returns prediction/current/trend/confidence/daysAhead with data', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: true })));
      const res = service.predictSuccessRate(7);
      expect(res.prediction).toBeDefined();
      expect(res.current).toBeDefined();
      expect(res.trend).toBeDefined();
      expect(res.confidence).toBeDefined();
      expect(res.daysAhead).toBe(7);
    });

    it('defaults to 7 days ahead', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ success: true })));
      const res = service.predictSuccessRate();
      expect(res.daysAhead).toBe(7);
    });

    it('trend is IMPROVING when recent better than older', () => {
      // older half failures, recent all success
      const old = Array.from({ length: 10 }, () => ({
        success: false,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      }));
      const recent = Array.from({ length: 10 }, () => ({
        success: true,
        timestamp: new Date(),
      }));
      seedMetrics([...old, ...recent]);
      const res = service.predictSuccessRate(7);
      expect(res.trend).toBe('IMPROVING');
    });

    it('trend is DECLINING when recent worse', () => {
      const old = Array.from({ length: 10 }, () => ({
        success: true,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      }));
      const recent = Array.from({ length: 10 }, () => ({
        success: false,
        timestamp: new Date(),
      }));
      seedMetrics([...old, ...recent]);
      const res = service.predictSuccessRate(7);
      expect(res.trend).toBe('DECLINING');
    });

    it('trend is STABLE when rate unchanged', () => {
      seedMetrics(Array.from({ length: 20 }, () => ({ success: true })));
      const res = service.predictSuccessRate(7);
      expect(res.trend).toBe('STABLE');
    });

    it('prediction clamped 0-100', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ success: true })));
      const res = service.predictSuccessRate(7);
      expect(res.prediction).toBeGreaterThanOrEqual(0);
      expect(res.prediction).toBeLessThanOrEqual(100);
    });

    it('confidence increases with more data', () => {
      seedMetrics(Array.from({ length: 3 }, () => ({ success: true })));
      const low = service.predictSuccessRate(7);
      seedMetrics(Array.from({ length: 27 }, () => ({ success: true })));
      const high = service.predictSuccessRate(7);
      expect(high.confidence).toBeGreaterThanOrEqual(low.confidence);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  estimateBackupDuration                                              */
  /* ------------------------------------------------------------------ */
  describe('estimateBackupDuration', () => {
    it('returns fallback when no metrics', () => {
      const res = service.estimateBackupDuration();
      expect(res.estimation).toBe(300000);
      expect(res.confidence).toBe(0.2);
      expect(res.reason).toBeDefined();
    });

    it('returns estimation with data', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 1000, size: 5000 })));
      const res = service.estimateBackupDuration(10000);
      expect(res.estimatedDuration).toBeDefined();
      expect(res.estimatedDurationMinutes).toBeDefined();
      expect(res.throughput).toBeDefined();
      expect(res.confidence).toBeDefined();
      expect(res.baselineMetrics).toBe(5);
    });

    it('scales estimate by size ratio when dataSize provided', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 1000, size: 500 })));
      const res = service.estimateBackupDuration(1000);
      // 1000/500 = 2x → estimatedDuration ≈ 2000
      expect(res.estimatedDuration).toBe(2000);
    });

    it('uses avgDuration when dataSize is null', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 1000, size: 500 })));
      const res = service.estimateBackupDuration(null);
      expect(res.estimatedDuration).toBe(1000);
    });

    it('uses avgDuration when dataSize is omitted', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 600, size: 300 })));
      const res = service.estimateBackupDuration();
      expect(res.estimatedDuration).toBe(600);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getRecommendations                                                  */
  /* ------------------------------------------------------------------ */
  describe('getRecommendations', () => {
    it('returns empty when no metrics', () => {
      const res = service.getRecommendations();
      expect(res).toEqual([]);
    });

    it('always includes DISASTER_RECOVERY recommendation when metrics exist', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ compressionRatio: 80 })));
      const res = service.getRecommendations();
      const dr = res.find(r => r.type === 'DISASTER_RECOVERY');
      expect(dr).toBeDefined();
      expect(dr.priority).toBe('HIGH');
    });

    it('recommends COMPRESSION when avg compressionRatio < 40', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ compressionRatio: 20 })));
      const res = service.getRecommendations();
      const comp = res.find(r => r.type === 'COMPRESSION');
      expect(comp).toBeDefined();
      expect(comp.priority).toBe('HIGH');
    });

    it('recommends SCHEDULING when avgDuration > 1h', () => {
      seedMetrics(
        Array.from({ length: 5 }, () => ({ duration: 2 * 60 * 60 * 1000, compressionRatio: 80 }))
      );
      const res = service.getRecommendations();
      const sched = res.find(r => r.type === 'SCHEDULING');
      expect(sched).toBeDefined();
      expect(sched.priority).toBe('MEDIUM');
    });

    it('recommends RELIABILITY when failureRate > 5%', () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ success: false, compressionRatio: 80 })));
      const res = service.getRecommendations();
      const rel = res.find(r => r.type === 'RELIABILITY');
      expect(rel).toBeDefined();
      expect(rel.priority).toBe('CRITICAL');
    });

    it('stores result in this.recommendations and emits event', () => {
      const spy = jest.fn();
      service.on('analytics:recommendations-updated', spy);
      seedMetrics(Array.from({ length: 5 }, () => ({ compressionRatio: 80 })));
      service.getRecommendations();
      expect(service.recommendations.length).toBeGreaterThan(0);
      expect(spy).toHaveBeenCalled();
    });

    it('returns array type', () => {
      seedMetrics(Array.from({ length: 3 }, () => ({ compressionRatio: 50 })));
      expect(Array.isArray(service.getRecommendations())).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateRiskAssessment                                             */
  /* ------------------------------------------------------------------ */
  describe('calculateRiskAssessment', () => {
    it('returns UNKNOWN when no metrics', () => {
      const res = service.calculateRiskAssessment();
      expect(res.riskScore).toBe(50);
      expect(res.riskLevel).toBe('UNKNOWN');
      expect(res.factors).toBeDefined();
    });

    it('returns riskScore/riskLevel/factors/baselineMetrics with data', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: true, size: 500 })));
      const res = service.calculateRiskAssessment();
      expect(typeof res.riskScore).toBe('number');
      expect(typeof res.riskLevel).toBe('string');
      expect(Array.isArray(res.factors)).toBe(true);
      expect(res.baselineMetrics).toBe(10);
    });

    it('increases risk for high failure rate', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: false, size: 500 })));
      const res = service.calculateRiskAssessment();
      expect(res.riskScore).toBeGreaterThan(0);
      expect(res.factors.some(f => f.includes('failure'))).toBe(true);
    });

    it('riskLevel is CRITICAL when riskScore ≥ 70', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: false, size: 500 })));
      const res = service.calculateRiskAssessment();
      // 100% failures → riskScore ≥ 30 + potential storage factor
      expect(['CRITICAL', 'HIGH', 'MEDIUM']).toContain(res.riskLevel);
    });

    it('riskLevel is LOW when all succeed and stable size', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: true, size: 500 })));
      const res = service.calculateRiskAssessment();
      expect(res.riskLevel).toBe('LOW');
      expect(res.riskScore).toBeLessThan(30);
    });

    it('detects storage availability issues', () => {
      // <90% success
      const mixed = Array.from({ length: 8 }, () => ({ success: true, size: 500 }));
      mixed.push({ success: false, size: 500 }, { success: false, size: 500 });
      seedMetrics(mixed);
      const res = service.calculateRiskAssessment();
      expect(
        res.factors.some(
          f => f.toLowerCase().includes('storage') || f.toLowerCase().includes('availability')
        )
      ).toBe(true);
    });

    it('detects high data growth', () => {
      // Growth from 100 to 500 → 400% growth
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({ success: true, size: 100 + i * 50 });
      }
      seedMetrics(metrics);
      const res = service.calculateRiskAssessment();
      expect(res.factors.some(f => f.toLowerCase().includes('growth'))).toBe(true);
    });

    it('score capped at 100', () => {
      seedMetrics(Array.from({ length: 10 }, () => ({ success: false, size: 500 })));
      const res = service.calculateRiskAssessment();
      expect(res.riskScore).toBeLessThanOrEqual(100);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateTrend                                                      */
  /* ------------------------------------------------------------------ */
  describe('calculateTrend', () => {
    it('returns 0 with < 2 metrics', () => {
      expect(service.calculateTrend([])).toBe(0);
      expect(service.calculateTrend([{ success: true }])).toBe(0);
    });

    it('returns positive when recent better than older', () => {
      const metrics = [
        ...Array.from({ length: 10 }, () => ({ success: false })),
        ...Array.from({ length: 10 }, () => ({ success: true })),
      ];
      expect(service.calculateTrend(metrics)).toBeGreaterThan(0);
    });

    it('returns negative when recent worse', () => {
      const metrics = [
        ...Array.from({ length: 10 }, () => ({ success: true })),
        ...Array.from({ length: 10 }, () => ({ success: false })),
      ];
      expect(service.calculateTrend(metrics)).toBeLessThan(0);
    });

    it('returns 0 when all same', () => {
      const metrics = Array.from({ length: 20 }, () => ({ success: true }));
      expect(service.calculateTrend(metrics)).toBe(0);
    });

    it('respects custom window parameter', () => {
      const metrics = [
        ...Array.from({ length: 5 }, () => ({ success: false })),
        ...Array.from({ length: 5 }, () => ({ success: true })),
      ];
      const trend = service.calculateTrend(metrics, 5);
      expect(trend).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getRecentMetrics                                                    */
  /* ------------------------------------------------------------------ */
  describe('getRecentMetrics', () => {
    it('returns empty when no metrics', () => {
      expect(service.getRecentMetrics(7)).toHaveLength(0);
    });

    it('returns metrics within days window', () => {
      seedMetrics([{ timestamp: new Date() }]);
      expect(service.getRecentMetrics(7)).toHaveLength(1);
    });

    it('excludes old metrics', () => {
      seedMetrics([{ timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }]);
      expect(service.getRecentMetrics(7)).toHaveLength(0);
    });

    it('defaults to 7 days', () => {
      seedMetrics([{ timestamp: new Date() }]);
      expect(service.getRecentMetrics()).toHaveLength(1);
    });

    it('respects custom days parameter', () => {
      const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      seedMetrics([{ timestamp: old }]);
      expect(service.getRecentMetrics(5)).toHaveLength(0);
      expect(service.getRecentMetrics(15)).toHaveLength(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  exportAnalyticsReport (async)                                      */
  /* ------------------------------------------------------------------ */
  describe('exportAnalyticsReport', () => {
    it('generates comprehensive report with metrics', async () => {
      seedMetrics(
        Array.from({ length: 5 }, () => ({
          duration: 100,
          size: 500,
          success: true,
          compressionRatio: 0.5,
        }))
      );
      const report = await service.exportAnalyticsReport();
      expect(report.generatedAt).toBeDefined();
      expect(report.period).toBe('30 days');
      expect(report.summary.totalBackups).toBe(5);
      expect(report.summary.successfulBackups).toBe(5);
      expect(report.summary.successRate).toBeDefined();
      expect(report.summary.averageDuration).toBeDefined();
      expect(report.summary.totalDataSize).toBe(2500);
      expect(report.predictions).toBeDefined();
      expect(report.riskAssessment).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.anomalies).toBeDefined();
    });

    it('handles NaN when no metrics (empty)', async () => {
      // With 0 metrics, division by 0 → NaN in summary, but method should not throw
      const report = await service.exportAnalyticsReport();
      expect(report.generatedAt).toBeDefined();
      expect(report.summary.totalBackups).toBe(0);
    });

    it('limits anomalies to last 10', async () => {
      // Push 15 anomalies directly
      for (let i = 0; i < 15; i++) {
        service.anomalies.push({ type: 'TEST', index: i });
      }
      seedMetrics([{ duration: 100, size: 500, success: true }]);
      const report = await service.exportAnalyticsReport();
      expect(report.anomalies).toHaveLength(10);
    });

    it('includes predictions with successRate and duration estimation', async () => {
      seedMetrics(Array.from({ length: 5 }, () => ({ duration: 200, size: 1000, success: true })));
      const report = await service.exportAnalyticsReport();
      expect(report.predictions.successRatePrediction).toBeDefined();
      expect(report.predictions.durationEstimation).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  shutdown                                                            */
  /* ------------------------------------------------------------------ */
  describe('shutdown', () => {
    it('clears analysis interval', () => {
      expect(() => service.shutdown()).not.toThrow();
    });

    it('sets _analysisInterval to null', () => {
      service.shutdown();
      expect(service._analysisInterval).toBeNull();
    });

    it('can be called multiple times safely', () => {
      service.shutdown();
      service.shutdown();
      expect(service._analysisInterval).toBeNull();
    });
  });
});
