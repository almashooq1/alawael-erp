/**
 * Unit tests — aiAnalyticsService.js
 * Class + singleton instance export.  All in-memory, no model deps.
 * module.exports = AIAnalyticsService; module.exports.instance = new AIAnalyticsService()
 */
'use strict';

const AIAnalyticsService = require('../../services/aiAnalyticsService');

let svc;

beforeEach(() => {
  svc = new AIAnalyticsService();
});

/* ================================================================ */
describe('AIAnalyticsService', () => {
  /* ── constructor / initializeModels ──────────────────────────── */
  describe('constructor', () => {
    it('initializes maps and models', () => {
      expect(svc.predictions).toBeInstanceOf(Map);
      expect(svc.patterns).toBeInstanceOf(Map);
      expect(svc.anomalies).toBeInstanceOf(Map);
      expect(svc.models).toBeInstanceOf(Map);
      expect(svc.models.size).toBe(4);
    });

    it('exports singleton instance', () => {
      const { instance } = require('../../services/aiAnalyticsService');
      expect(instance).toBeInstanceOf(AIAnalyticsService);
    });
  });

  /* ── predictAttendancePatterns ───────────────────────────────── */
  describe('predictAttendancePatterns', () => {
    it('predicts from employee history', () => {
      const employee = { id: 'E1', name: 'أحمد' };
      const history = [
        { date: '2025-01-01', present: true },
        { date: '2025-01-02', present: false },
        { date: '2025-01-03', present: true },
        { date: '2025-01-04', present: true },
        { date: '2025-01-05', present: true },
      ];
      const res = svc.predictAttendancePatterns(employee, history);
      expect(res.success).toBe(true);
      expect(res.prediction).toBeDefined();
    });

    it('handles empty history', () => {
      const res = svc.predictAttendancePatterns({ name: 'test' }, []);
      expect(res).toBeDefined();
    });
  });

  /* ── predictPerformance ──────────────────────────────────────── */
  describe('predictPerformance', () => {
    it('predicts from array data', () => {
      const data = [
        { score: 70, month: 1 },
        { score: 75, month: 2 },
        { score: 80, month: 3 },
      ];
      const res = svc.predictPerformance(data);
      expect(res.nextScore).toBeDefined();
      expect(res.confidence).toBeDefined();
    });

    it('predicts from string (legacy)', () => {
      const res = svc.predictPerformance('EMP1', { scores: [70, 80, 90] });
      expect(res).toBeDefined();
    });
  });

  /* ── detectAnomalies ─────────────────────────────────────────── */
  describe('detectAnomalies', () => {
    it('detects outliers via z-score', () => {
      const data = [10, 10, 10, 10, 100, 10, 10, 10, 10, 10]; // 100 is outlier
      const anomalies = svc.detectAnomalies(data);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(a => a.value === 100)).toBe(true);
    });

    it('returns empty for uniform data', () => {
      const data = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
      const anomalies = svc.detectAnomalies(data);
      expect(anomalies).toHaveLength(0);
    });

    it('handles empty array', () => {
      expect(svc.detectAnomalies([])).toEqual([]);
    });
  });

  /* ── generateSmartRecommendations ────────────────────────────── */
  describe('generateSmartRecommendations', () => {
    it('generates recommendations', () => {
      const userProfile = {
        name: 'أحمد',
        skills: ['JavaScript'],
        department: 'IT',
      };
      const res = svc.generateSmartRecommendations('U1', userProfile, {});
      expect(res.success).toBe(true);
      expect(res.recommendations).toBeDefined();
      expect(res.recommendations.recommendations).toBeDefined();
    });
  });

  /* ── analyzeTrends ───────────────────────────────────────────── */
  describe('analyzeTrends', () => {
    it('analyzes with data array (new-style)', () => {
      const data = [
        { score: 60, month: '2025-01' },
        { score: 70, month: '2025-02' },
        { score: 80, month: '2025-03' },
      ];
      const res = svc.analyzeTrends(data);
      expect(res.direction).toBeDefined();
      expect(res.slope).toBeDefined();
    });
  });

  /* ── calculateStatistics ─────────────────────────────────────── */
  describe('calculateStatistics', () => {
    it('computes mean/stdDev/variance', () => {
      const s = svc.calculateStatistics([10, 20, 30, 40, 50]);
      expect(s.mean).toBe(30);
      expect(s.stdDev).toBeGreaterThan(0);
      expect(s.variance).toBeGreaterThan(0);
    });
  });

  /* ── predictAttendance ───────────────────────────────────────── */
  describe('predictAttendance', () => {
    it('returns nextPeriod and confidence', () => {
      const data = [{ attendance: 0.9 }, { attendance: 0.85 }, { attendance: 0.88 }];
      const res = svc.predictAttendance(data);
      expect(res.nextPeriod).toBeGreaterThanOrEqual(0);
      expect(res.nextPeriod).toBeLessThanOrEqual(100);
      expect(res.confidence).toBeGreaterThanOrEqual(50);
    });

    it('considers trend when requested', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({ attendance: 0.7 + i * 0.02 }));
      const res = svc.predictAttendance(data, { considerTrend: true });
      expect(res.trend).toBeDefined();
    });

    it('returns zero for null', () => {
      const res = svc.predictAttendance(null);
      expect(res.nextPeriod).toBe(0);
    });

    it('includes seasonal pattern when requested', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({
        attendance: 0.8,
        date: `2025-${String(i + 1).padStart(2, '0')}-15`,
      }));
      const res = svc.predictAttendance(data, { seasonal: true });
      expect(res.seasonalPattern).toBeDefined();
    });
  });

  /* ── forecastAttendance ──────────────────────────────────────── */
  describe('forecastAttendance', () => {
    it('returns forecast array', () => {
      const data = [{ attendance: 0.9 }];
      const res = svc.forecastAttendance(data, { periods: 5 });
      expect(res.forecasts).toHaveLength(5);
      expect(res.trend).toBe('stable');
      expect(res.periods).toBe(5);
    });
  });

  /* ── analyzePerformance ──────────────────────────────────────── */
  describe('analyzePerformance', () => {
    it('returns overall score and areas', () => {
      const res = svc.analyzePerformance([{ score: 80 }]);
      expect(res.overallScore).toBeGreaterThanOrEqual(70);
      expect(res.areas.strong).toBeDefined();
      expect(res.areas.needsImprovement).toBeDefined();
    });
  });

  /* ── validateDataQuality ─────────────────────────────────────── */
  describe('validateDataQuality', () => {
    it('valid for non-empty array', () => {
      const res = svc.validateDataQuality([{ a: 1 }]);
      expect(res.valid).toBe(true);
    });

    it('invalid for non-array', () => {
      expect(svc.validateDataQuality('bad').valid).toBe(false);
    });

    it('invalid for empty', () => {
      expect(svc.validateDataQuality([]).valid).toBe(false);
    });
  });

  /* ── detectMissingValues ─────────────────────────────────────── */
  describe('detectMissingValues', () => {
    it('detects nulls and empty strings', () => {
      const data = [
        { a: null, b: 'ok' },
        { a: '', b: undefined },
      ];
      const missing = svc.detectMissingValues(data);
      expect(missing.length).toBeGreaterThanOrEqual(3);
    });

    it('returns empty for non-array', () => {
      expect(svc.detectMissingValues('bad')).toEqual([]);
    });
  });

  /* ── identifyOutliers ────────────────────────────────────────── */
  describe('identifyOutliers', () => {
    it('finds outliers in value field', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({ value: 50 }));
      data.push({ value: 200 });
      const outliers = svc.identifyOutliers(data, { field: 'value' });
      expect(outliers.length).toBeGreaterThan(0);
    });
  });

  /* ── model management ────────────────────────────────────────── */
  describe('model management', () => {
    it('listModels returns 3', () => {
      expect(svc.listModels()).toHaveLength(3);
    });

    it('getModelInfo returns model data', () => {
      const info = svc.getModelInfo('model_1');
      expect(info.id).toBe('model_1');
    });

    it('trainModel returns new model', () => {
      const res = svc.trainModel([{ a: 1 }]);
      expect(res.status).toBe('trained');
      expect(res.accuracy).toBeGreaterThan(0.8);
    });

    it('evaluateModel returns metrics', () => {
      const res = svc.evaluateModel('m1', [{ a: 1 }]);
      expect(res.accuracy).toBeGreaterThan(0);
      expect(res.f1Score).toBeGreaterThan(0);
    });

    it('getModelMetrics', () => {
      expect(svc.getModelMetrics('m1').accuracy).toBe(0.9);
    });

    it('getModelVersions', () => {
      expect(svc.getModelVersions('m1')).toHaveLength(3);
    });
  });

  /* ── findCorrelations ────────────────────────────────────────── */
  describe('findCorrelations', () => {
    it('returns correlation pairs', () => {
      const data = [{ a: 10, b: 20, c: 30 }];
      const corrs = svc.findCorrelations(data);
      expect(corrs.length).toBeGreaterThan(0);
      expect(corrs[0].variable1).toBeDefined();
      expect(corrs[0].coefficient).toBeDefined();
    });
  });

  /* ── batchPredict ────────────────────────────────────────────── */
  describe('batchPredict', () => {
    it('processes attendance batches', () => {
      const batches = [[{ attendance: 0.9 }, { attendance: 0.8 }], [{ attendance: 0.7 }]];
      const res = svc.batchPredict(batches, 'attendance');
      expect(res).toHaveLength(2);
      expect(res[0].nextPeriod).toBeDefined();
    });
  });

  /* ── forecastPerformance ─────────────────────────────────────── */
  describe('forecastPerformance', () => {
    it('returns forecasts and trend', () => {
      const data = [{ score: 70 }];
      const res = svc.forecastPerformance(data, { periods: 5 });
      expect(res.forecasts).toHaveLength(5);
      expect(res.trend).toBe('stable');
    });
  });

  /* ── comparePerformance ──────────────────────────────────────── */
  describe('comparePerformance', () => {
    it('compares against baseline', () => {
      const data = [{ score: 90 }, { score: 80 }];
      const res = svc.comparePerformance(data, { baseline: 80 });
      expect(res.aboveBaseline).toBe(true);
      expect(res.averageScore).toBe('85.00');
    });
  });

  /* ── predictImprovement ──────────────────────────────────────── */
  describe('predictImprovement', () => {
    it('returns projected improvement', () => {
      const data = [{ score: 70 }, { score: 80 }];
      const res = svc.predictImprovement(data);
      expect(res.currentScore).toBeDefined();
      expect(res.projectedImprovement).toBeDefined();
    });
  });

  /* ── detectDrift ─────────────────────────────────────────────── */
  describe('detectDrift', () => {
    it('detects no drift for short data', () => {
      expect(svc.detectDrift([{ score: 50 }]).driftDetected).toBe(false);
    });

    it('detects drift for significant change', () => {
      const data = [
        ...Array.from({ length: 10 }, () => ({ score: 50 })),
        ...Array.from({ length: 10 }, () => ({ score: 90 })),
      ];
      const res = svc.detectDrift(data);
      expect(res.driftDetected).toBe(true);
      expect(res.direction).toBe('upward');
    });
  });

  /* ── generateRecommendations ─────────────────────────────────── */
  describe('generateRecommendations', () => {
    it('adds intervention for low score', () => {
      const data = [{ score: 40 }, { score: 50 }];
      const recs = svc.generateRecommendations(data);
      expect(recs.some(r => r.priority === 'high' && r.action.includes('Immediate'))).toBe(true);
    });

    it('returns standard recs for good score', () => {
      const data = [{ score: 80 }, { score: 90 }];
      const recs = svc.generateRecommendations(data);
      expect(recs.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ── getPerformanceInsights ──────────────────────────────────── */
  describe('getPerformanceInsights', () => {
    it('returns stable for empty data', () => {
      const res = svc.getPerformanceInsights([]);
      expect(res.direction).toBe('stable');
      expect(res.slope).toBe(0);
    });

    it('detects upward trend', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ score: 50 + i * 5 }));
      const res = svc.getPerformanceInsights(data);
      expect(res.direction).toBe('up');
      expect(res.slope).toBeGreaterThan(0);
    });

    it('detects inflection points', () => {
      const data = [
        { score: 50 },
        { score: 60 },
        { score: 70 },
        { score: 60 },
        { score: 50 },
        { score: 60 },
      ];
      const res = svc.getPerformanceInsights(data);
      expect(res.inflectionPoints.length).toBeGreaterThan(0);
    });
  });

  /* ── checkDataQuality ────────────────────────────────────────── */
  describe('checkDataQuality', () => {
    it('returns 0 for empty', () => {
      expect(svc.checkDataQuality([]).score).toBe(0);
    });

    it('scores good clean data', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const res = svc.checkDataQuality(data);
      expect(res.score).toBeGreaterThan(0);
    });
  });

  /* ── getRecommendations ──────────────────────────────────────── */
  describe('getRecommendations', () => {
    it('returns priority recommendations', () => {
      const recs = svc.getRecommendations([]);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].priority).toBeDefined();
    });
  });

  /* ── analyzeRelationship ─────────────────────────────────────── */
  describe('analyzeRelationship', () => {
    it('returns correlation and strength', () => {
      const res = svc.analyzeRelationship([{ a: 1, b: 2 }], 'a', 'b');
      expect(res.strength).toBe('moderate');
      expect(res.correlation).toBeDefined();
    });
  });

  /* ── batchAnalyze ────────────────────────────────────────────── */
  describe('batchAnalyze', () => {
    it('handles attendance type', () => {
      const res = svc.batchAnalyze([{ type: 'attendance', data: [{ attendance: 0.9 }] }]);
      expect(res).toHaveLength(1);
      expect(res[0].nextPeriod).toBeDefined();
    });

    it('handles unknown type', () => {
      const res = svc.batchAnalyze([{ type: 'unknown', data: [] }]);
      expect(res[0].error).toBeDefined();
    });
  });

  /* ── compareTrends ───────────────────────────────────────────── */
  describe('compareTrends', () => {
    it('compares two datasets', () => {
      const d1 = [{ score: 80 }];
      const d2 = [{ score: 50 }];
      const res = svc.compareTrends(d1, d2);
      expect(res.trend1Direction).toBe('up');
      expect(res.trend2Direction).toBe('down');
    });
  });
});
