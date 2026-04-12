/**
 * Unit tests for ai-predictions.service.js — AI Predictions Service
 * Dual export: class + singleton instance. Uses Prediction, Analytics, User models.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__aipQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

jest.mock('../../models/prediction.model', () => ({
  create: jest.fn(async data => ({ _id: 'pred-1', ...data })),
  find: jest.fn(() => global.__aipQ([])),
  findById: jest.fn(() => global.__aipQ(null)),
}));

jest.mock('../../models/analytics.model', () => ({
  find: jest.fn(() => global.__aipQ([])),
}));

jest.mock('../../models/user.model', () => ({
  findById: jest.fn(() => global.__aipQ(null)),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const AIPredictionsService = require('../../services/ai-predictions.service');
const Prediction = require('../../models/prediction.model');
const Analytics = require('../../models/analytics.model');
const User = require('../../models/user.model');
const Q = global.__aipQ;
const svc = new AIPredictionsService();

beforeEach(() => {
  jest.clearAllMocks();
  Prediction.create.mockImplementation(async data => ({ _id: 'pred-1', ...data }));
  Prediction.find.mockImplementation(() => Q([]));
  Prediction.findById.mockImplementation(() => Q(null));
  Analytics.find.mockImplementation(() => Q([]));
  User.findById.mockImplementation(() => Q(null));
  svc._cache = undefined; // reset cache
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('AIPredictionsService', () => {
  /* ── Pure Math Helpers ───────────────────────────────────────────── */
  describe('Pure math helpers', () => {
    test('calculateMean — with data', () => {
      const data = [{ metricValue: 10 }, { metricValue: 20 }, { metricValue: 30 }];
      expect(svc.calculateMean(data)).toBe(20);
    });

    test('calculateMean — empty', () => {
      expect(svc.calculateMean([])).toBe(0);
      expect(svc.calculateMean(null)).toBe(0);
    });

    test('calculateStdDev — with data', () => {
      const data = [{ metricValue: 10 }, { metricValue: 10 }, { metricValue: 10 }];
      expect(svc.calculateStdDev(data)).toBe(0);
    });

    test('calculateStdDev — empty', () => {
      expect(svc.calculateStdDev([])).toBe(0);
    });

    test('calculateTrend — with enough data', () => {
      const data = [
        { metricValue: 80 },
        { metricValue: 70 },
        { metricValue: 30 },
        { metricValue: 20 },
      ];
      const trend = svc.calculateTrend(data);
      expect(typeof trend).toBe('number');
    });

    test('calculateTrend — insufficient data', () => {
      expect(svc.calculateTrend([{ metricValue: 5 }])).toBe(50);
      expect(svc.calculateTrend([])).toBe(50);
    });

    test('detectSeasonality — returns 0.2', () => {
      expect(svc.detectSeasonality([])).toBe(0.2);
    });

    test('detectAnomalies — returns anomalous points', () => {
      const data = [
        { metricValue: 10 },
        { metricValue: 11 },
        { metricValue: 10 },
        { metricValue: 12 },
        { metricValue: 10 },
        { metricValue: 11 },
        { metricValue: 10 },
        { metricValue: 11 },
        { metricValue: 10 },
        { metricValue: 10 },
        { metricValue: 500 }, // extreme outlier
      ];
      const anomalies = svc.detectAnomalies(data);
      expect(anomalies.length).toBeGreaterThanOrEqual(1);
    });

    test('detectAnomalies — empty', () => {
      expect(svc.detectAnomalies([])).toEqual([]);
    });

    test('calculateEngagementScore — with data', () => {
      const score = svc.calculateEngagementScore({
        loginCount: 30,
        activeMinutes: 720,
        interactions: 50,
      });
      expect(score).toBeGreaterThan(0);
    });

    test('calculateEngagementScore — null', () => {
      expect(svc.calculateEngagementScore(null)).toBe(0.5);
    });

    test('analyzeActivityTrend — increasing', () => {
      expect(svc.analyzeActivityTrend({ recentActivity: 20, averageActivity: 10 })).toBe(
        'increasing'
      );
    });

    test('analyzeActivityTrend — decreasing', () => {
      expect(svc.analyzeActivityTrend({ recentActivity: 5, averageActivity: 10 })).toBe(
        'decreasing'
      );
    });

    test('analyzeActivityTrend — null', () => {
      expect(svc.analyzeActivityTrend(null)).toBe('unknown');
    });

    test('calculateChurnProbability — clamped 0-1', () => {
      expect(svc.calculateChurnProbability(0.9, 'increasing')).toBeGreaterThanOrEqual(0);
      expect(svc.calculateChurnProbability(0.1, 'decreasing')).toBeLessThanOrEqual(1);
    });
  });

  /* ── processData ─────────────────────────────────────────────────── */
  describe('processData', () => {
    test('with historical data', () => {
      const hist = [{ metricValue: 10 }, { metricValue: 20 }];
      const result = svc.processData(hist, { extra: true });
      expect(result).toHaveProperty('mean');
      expect(result).toHaveProperty('standardDeviation');
      expect(result.extra).toBe(true);
    });

    test('without historical data', () => {
      const result = svc.processData([], { extra: true });
      expect(result.trend).toBe(50);
      expect(result.extra).toBe(true);
    });
  });

  /* ── runPredictionModel ──────────────────────────────────────────── */
  describe('runPredictionModel', () => {
    test('returns value clamped 0-100', async () => {
      const result = await svc.runPredictionModel({ trend: 80, seasonality: 0.5 });
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(100);
      expect(result.confidence).toBe(0.85);
    });
  });

  /* ── extractFactors ──────────────────────────────────────────────── */
  describe('extractFactors', () => {
    test('returns array of factors', async () => {
      const factors = await svc.extractFactors({});
      expect(factors).toHaveLength(4);
      expect(factors[0]).toHaveProperty('factor');
      expect(factors[0]).toHaveProperty('weight');
    });
  });

  /* ── generateRecommendations ─────────────────────────────────────── */
  describe('generateRecommendations', () => {
    test('high performance', async () => {
      const recs = await svc.generateRecommendations({ value: 90 }, []);
      expect(recs[0].priority).toBe('low');
    });

    test('medium performance', async () => {
      const recs = await svc.generateRecommendations({ value: 70 }, []);
      expect(recs[0].priority).toBe('medium');
    });

    test('low performance', async () => {
      const recs = await svc.generateRecommendations({ value: 40 }, []);
      expect(recs[0].priority).toBe('high');
    });
  });

  /* ── predictPerformance ──────────────────────────────────────────── */
  describe('predictPerformance', () => {
    test('creates prediction record', async () => {
      Analytics.find.mockImplementation(() => Q([]));
      const result = await svc.predictPerformance('u1', {});
      expect(Prediction.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('throws on error', async () => {
      Prediction.create.mockRejectedValueOnce(new Error('DB'));
      await expect(svc.predictPerformance('u1')).rejects.toThrow('DB');
    });
  });

  /* ── predictChurn ────────────────────────────────────────────────── */
  describe('predictChurn', () => {
    test('returns prediction with riskLevel', async () => {
      const result = await svc.predictChurn('u1');
      expect(result).toHaveProperty('prediction');
      expect(result.prediction).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('recommendation');
    });
  });

  /* ── predictBehavior ─────────────────────────────────────────────── */
  describe('predictBehavior', () => {
    test('returns patterns and predictions', async () => {
      const result = await svc.predictBehavior('u1');
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('predictions');
      expect(result.prediction.peakDays).toBeDefined();
    });
  });

  /* ── predictTrends ───────────────────────────────────────────────── */
  describe('predictTrends', () => {
    test('returns trend info', async () => {
      const result = await svc.predictTrends('engagement', 30);
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('timeline');
    });
  });

  /* ── predictRevenue ──────────────────────────────────────────────── */
  describe('predictRevenue', () => {
    test('creates revenue prediction', async () => {
      Analytics.find.mockImplementation(() => Q([]));
      const result = await svc.predictRevenue('u1');
      expect(Prediction.create).toHaveBeenCalledWith(
        expect.objectContaining({ predictionType: 'revenue' })
      );
    });
  });

  /* ── detectAnomaly ───────────────────────────────────────────────── */
  describe('detectAnomaly', () => {
    test('creates anomaly prediction', async () => {
      Analytics.find.mockImplementation(() => Q([]));
      const result = await svc.detectAnomaly('u1');
      expect(result.predictionType).toBe('anomaly');
    });
  });

  /* ── predictBatchWithSegmentation ────────────────────────────────── */
  describe('predictBatchWithSegmentation', () => {
    test('single user returns single result', async () => {
      const result = await svc.predictBatchWithSegmentation(['u1']);
      expect(Prediction.create).toHaveBeenCalledTimes(1);
    });

    test('multiple users returns array', async () => {
      const result = await svc.predictBatchWithSegmentation(['u1', 'u2']);
      expect(Prediction.create).toHaveBeenCalledTimes(2);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  /* ── retrainModel ────────────────────────────────────────────────── */
  describe('retrainModel', () => {
    test('creates training record', async () => {
      Analytics.find.mockImplementation(() => Q([]));
      const result = await svc.retrainModel('performance');
      expect(result.predictionType).toBe('model_training');
    });
  });

  /* ── validateModel ───────────────────────────────────────────────── */
  describe('validateModel', () => {
    test('returns validation metrics with no data', async () => {
      Prediction.find.mockImplementation(() => Q([]));
      const result = await svc.validateModel('performance');
      expect(result.validation).toBeDefined();
      expect(result.validation.rmse).toBe(1.5);
    });

    test('returns validation with predictions', async () => {
      Prediction.find.mockImplementation(() => Q([{ prediction: { value: 50 }, actual: 48 }]));
      const result = await svc.validateModel('performance');
      expect(result.validation.sampleSize).toBeGreaterThanOrEqual(0);
    });
  });

  /* ── detectModelDrift ────────────────────────────────────────────── */
  describe('detectModelDrift', () => {
    test('creates drift detection record', async () => {
      const result = await svc.detectModelDrift('performance');
      expect(Prediction.create).toHaveBeenCalledWith(
        expect.objectContaining({ predictionType: 'model_drift' })
      );
    });
  });

  /* ── recommendModelUpdate ────────────────────────────────────────── */
  describe('recommendModelUpdate', () => {
    test('recommends update when many predictions', async () => {
      const many = Array.from({ length: 25 }, (_, i) => ({ _id: `p${i}` }));
      Prediction.find.mockImplementation(() => Q(many));
      const result = await svc.recommendModelUpdate();
      expect(result.urgency).toBe('high');
    });

    test('no update needed when few predictions', async () => {
      Prediction.find.mockImplementation(() => Q([{ _id: 'p1' }]));
      const result = await svc.recommendModelUpdate();
      expect(result.urgency).toBe('low');
    });
  });

  /* ── getFeatureImportance / explainPrediction / getExplanation ──── */
  describe('Explainability', () => {
    test('getFeatureImportance — found', async () => {
      Prediction.findById.mockImplementation(() => Q({ _id: 'p1', features: { a: 0.5 } }));
      const result = await svc.getFeatureImportance('p1');
      expect(result.features.a).toBe(0.5);
    });

    test('getFeatureImportance — not found returns default', async () => {
      const result = await svc.getFeatureImportance('nope');
      expect(result).toHaveProperty('features');
    });

    test('explainPrediction — not found returns default', async () => {
      const result = await svc.explainPrediction('nope');
      expect(result).toHaveProperty('shapValues');
    });

    test('getExplanation — not found returns default', async () => {
      const result = await svc.getExplanation('nope');
      expect(result.explanation).toBeDefined();
    });
  });

  /* ── validateUserId ──────────────────────────────────────────────── */
  describe('validateUserId', () => {
    test('null throws', () => {
      expect(() => svc.validateUserId(null)).toThrow('مطلوب');
    });
    test('undefined throws', () => {
      expect(() => svc.validateUserId(undefined)).toThrow('مطلوب');
    });
    test('object throws', () => {
      expect(() => svc.validateUserId({})).toThrow('غير صالح');
    });
    test('empty string throws', () => {
      expect(() => svc.validateUserId('')).toThrow('فارغاً');
    });
    test('negative number throws', () => {
      expect(() => svc.validateUserId(-1)).toThrow('سالباً');
    });
    test('valid string returns true', () => {
      expect(svc.validateUserId('user123')).toBe(true);
    });
  });

  /* ── getPredictionSafe ───────────────────────────────────────────── */
  describe('getPredictionSafe', () => {
    test('found returns prediction', async () => {
      Prediction.findById.mockImplementation(() => Q({ _id: 'p1' }));
      const result = await svc.getPredictionSafe('p1', 'u1');
      expect(result._id).toBe('p1');
    });

    test('not found throws', async () => {
      await expect(svc.getPredictionSafe('nope', 'u1')).rejects.toThrow('غير موجود');
    });
  });

  /* ── generateChurnRecommendations ────────────────────────────────── */
  describe('generateChurnRecommendations', () => {
    test('high probability — 3 recs', () => {
      const recs = svc.generateChurnRecommendations(0.8, 'high');
      expect(recs.length).toBe(3);
    });

    test('medium probability — 2 recs', () => {
      const recs = svc.generateChurnRecommendations(0.5, 'medium');
      expect(recs.length).toBe(2);
    });

    test('low probability — 2 recs', () => {
      const recs = svc.generateChurnRecommendations(0.2, 'low');
      expect(recs.length).toBe(2);
    });
  });

  /* ── getChurnMitigationStrategy ──────────────────────────────────── */
  describe('getChurnMitigationStrategy', () => {
    test('high risk — immediate contact', () => {
      const strat = svc.getChurnMitigationStrategy({ riskLevel: 'high' });
      expect(strat.action).toContain('فوري');
    });

    test('low risk — monitoring', () => {
      const strat = svc.getChurnMitigationStrategy({ riskLevel: 'low' });
      expect(strat.action).toBe('monitoring');
    });
  });

  /* ── getPredictionCached ─────────────────────────────────────────── */
  describe('getPredictionCached', () => {
    test('populates cache and returns', async () => {
      const result = await svc.getPredictionCached('u1');
      expect(result).toBeDefined();
      expect(svc._cache['u1']).toBeDefined();
    });

    test('returns cached on second call', async () => {
      svc._cache = { u1: { _id: 'cached' } };
      const result = await svc.getPredictionCached('u1');
      expect(result._id).toBe('cached');
      expect(Prediction.create).not.toHaveBeenCalled();
    });
  });

  /* ── predictWithAlerts ───────────────────────────────────────────── */
  describe('predictWithAlerts', () => {
    test('creates prediction with alert info', async () => {
      const result = await svc.predictWithAlerts('u1');
      expect(Prediction.create).toHaveBeenCalledWith(
        expect.objectContaining({ predictionType: 'prediction_with_alerts' })
      );
    });
  });
});
