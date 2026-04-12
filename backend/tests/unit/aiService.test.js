/**
 * Unit Tests — aiService.js
 * Batch 39 · P#78
 *
 * Class export (module.exports = AIService). All async methods.
 * In-memory Maps (predictions, models, trainingData).
 */

function freshService() {
  let svc;
  jest.isolateModules(() => {
    const AIService = require('../../services/aiService');
    svc = new AIService();
  });
  return svc;
}

describe('AIService', () => {
  let service;

  beforeEach(() => {
    service = freshService();
  });

  // ═══════════════════════
  // Model Initialization
  // ═══════════════════════
  describe('initializeModels', () => {
    test('predictSales returns success with prediction', async () => {
      const result = await service.predictSales(6, {
        previousSales: 100000,
        marketingSpend: 15000,
      });
      expect(result.success).toBe(true);
      expect(result.prediction).toBeDefined();
      expect(result.prediction.type).toBe('sales-forecast');
      expect(result.prediction.predictedValue).toBeGreaterThan(0);
      expect(result.prediction.confidenceInterval).toHaveProperty('lower');
      expect(result.prediction.confidenceInterval).toHaveProperty('upper');
    });

    test('predictSales uses default values for missing data', async () => {
      const result = await service.predictSales(1);
      expect(result.success).toBe(true);
      expect(result.prediction.predictedValue).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════
  // Student Performance
  // ═══════════════════════
  describe('predictStudentPerformance', () => {
    test('returns prediction with performance level', async () => {
      const result = await service.predictStudentPerformance('stu-1', {
        attendance: 90,
        assignmentCompletion: 85,
        quizScores: 80,
        engagement: 75,
      });
      expect(result.success).toBe(true);
      expect(result.prediction.predictedScore).toBeGreaterThan(0);
      expect(result.prediction.performanceLevel).toBeDefined();
      expect(result.prediction.breakdown).toHaveProperty('attendance');
      expect(result.prediction.recommendations).toBeDefined();
    });

    test('uses defaults when studentData fields missing', async () => {
      const result = await service.predictStudentPerformance('stu-2', {});
      expect(result.success).toBe(true);
      expect(result.prediction.predictedScore).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════
  // Churn Prediction
  // ═══════════════════════
  describe('predictChurnRisk', () => {
    test('returns risk assessment', async () => {
      const result = await service.predictChurnRisk('cust-1', {
        tenure: 6,
        engagementScore: 30,
        supportTickets: 5,
        paymentHistory: 'poor',
      });
      expect(result.success).toBe(true);
      expect(result.prediction.churnRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.prediction.churnRiskScore).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low']).toContain(result.prediction.riskLevel);
    });

    test('low-risk customer scored appropriately', async () => {
      const result = await service.predictChurnRisk('cust-2', {
        tenure: 60,
        engagementScore: 90,
        supportTickets: 0,
        paymentHistory: 'good',
      });
      expect(result.success).toBe(true);
      expect(result.prediction.riskLevel).toBe('low');
    });

    test('recommendations match risk level', async () => {
      const result = await service.predictChurnRisk('cust-3', {
        tenure: 2,
        engagementScore: 20,
        supportTickets: 8,
        paymentHistory: 'poor',
      });
      expect(result.prediction.recommendations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════
  // Attendance Prediction
  // ═══════════════════════
  describe('predictAttendance', () => {
    test('returns attendance probability and prediction', async () => {
      const result = await service.predictAttendance('usr-1', {
        dayOfWeek: 'Wednesday',
        weather: 'good',
        previousAbsences: 0,
      });
      expect(result.success).toBe(true);
      expect(result.prediction.attendanceProbability).toBeGreaterThanOrEqual(0);
      expect(result.prediction.attendanceProbability).toBeLessThanOrEqual(100);
      expect(['likely', 'uncertain', 'unlikely']).toContain(result.prediction.prediction);
    });

    test('bad weather decreases probability', async () => {
      const good = await service.predictAttendance('usr-2', {
        dayOfWeek: 'Tuesday',
        weather: 'good',
        previousAbsences: 0,
      });
      const bad = await service.predictAttendance('usr-3', {
        dayOfWeek: 'Tuesday',
        weather: 'bad',
        previousAbsences: 0,
      });
      expect(good.prediction.attendanceProbability).toBeGreaterThanOrEqual(
        bad.prediction.attendanceProbability
      );
    });
  });

  // ═══════════════════════
  // Prediction History
  // ═══════════════════════
  describe('getPredictionHistory', () => {
    test('returns empty initially', async () => {
      const result = await service.getPredictionHistory();
      expect(result.success).toBe(true);
      expect(result.predictions).toEqual([]);
    });

    test('returns predictions after storing some', async () => {
      await service.predictSales(1);
      // small delay to avoid Date.now() ID collision
      await new Promise(r => setTimeout(r, 5));
      await service.predictSales(2);
      const result = await service.getPredictionHistory('sales-forecast');
      expect(result.success).toBe(true);
      expect(result.predictions.length).toBe(2);
    });

    test('respects limit parameter', async () => {
      await service.predictSales(1);
      await new Promise(r => setTimeout(r, 5));
      await service.predictSales(2);
      await new Promise(r => setTimeout(r, 5));
      await service.predictSales(3);
      const result = await service.getPredictionHistory('sales-forecast', 2);
      expect(result.predictions.length).toBe(2);
    });
  });

  // ═══════════════════════
  // Model Metrics
  // ═══════════════════════
  describe('getModelMetrics', () => {
    test('returns model info for valid id', async () => {
      const result = await service.getModelMetrics('sales-forecast');
      expect(result.success).toBe(true);
      expect(result.model.name).toBe('Sales Forecasting Model');
      expect(result.model.predictionsCount).toBe(0);
    });

    test('returns error for unknown model', async () => {
      const result = await service.getModelMetrics('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Model not found');
    });

    test('predictionsCount increments after predictions', async () => {
      await service.predictSales(4);
      const result = await service.getModelMetrics('sales-forecast');
      expect(result.model.predictionsCount).toBe(1);
    });
  });

  // ═══════════════════════
  // Train Model
  // ═══════════════════════
  describe('trainModel', () => {
    test('increases accuracy for valid model', async () => {
      const before = (await service.getModelMetrics('sales-forecast')).model.accuracy;
      const result = await service.trainModel('sales-forecast', []);
      expect(result.success).toBe(true);
      expect(result.newAccuracy).toBeGreaterThanOrEqual(Math.round(before * 100));
    });

    test('returns error for unknown model', async () => {
      const result = await service.trainModel('nonexistent', []);
      expect(result.success).toBe(false);
    });

    test('accuracy capped at 95%', async () => {
      // Train many times
      for (let i = 0; i < 20; i++) {
        await service.trainModel('sales-forecast', []);
      }
      const result = await service.getModelMetrics('sales-forecast');
      expect(result.model.accuracy).toBeLessThanOrEqual(0.95);
    });
  });

  // ═══════════════════════
  // Available Models
  // ═══════════════════════
  describe('getAvailableModels', () => {
    test('returns 4 models', async () => {
      const result = await service.getAvailableModels();
      expect(result.success).toBe(true);
      expect(result.models.length).toBe(4);
      expect(result.total).toBe(4);
    });
  });

  // ═══════════════════════
  // Helper Methods
  // ═══════════════════════
  describe('helper methods', () => {
    test('getSeasonalFactor returns correct factors', () => {
      expect(service.getSeasonalFactor(12)).toBe(1.4);
      expect(service.getSeasonalFactor(1)).toBe(0.85);
      expect(service.getSeasonalFactor(99)).toBe(1.0); // unknown month
    });

    test('getPerformanceLevel thresholds', () => {
      expect(service.getPerformanceLevel(95)).toBe('Excellent');
      expect(service.getPerformanceLevel(85)).toBe('Good');
      expect(service.getPerformanceLevel(75)).toBe('Satisfactory');
      expect(service.getPerformanceLevel(65)).toBe('Needs Improvement');
      expect(service.getPerformanceLevel(50)).toBe('At Risk');
    });

    test('getStudentRecommendations returns array', () => {
      expect(service.getStudentRecommendations('Excellent').length).toBeGreaterThanOrEqual(1);
      expect(service.getStudentRecommendations('Unknown')).toEqual([]);
    });

    test('getChurnPreventionActions returns array', () => {
      expect(service.getChurnPreventionActions('high').length).toBe(3);
      expect(service.getChurnPreventionActions('low').length).toBe(2);
      expect(service.getChurnPreventionActions('unknown')).toEqual([]);
    });

    test('getDayOfWeekFactor returns correct values', () => {
      expect(service.getDayOfWeekFactor('Wednesday')).toBe(1.0);
      expect(service.getDayOfWeekFactor('Sunday')).toBe(0.75);
      expect(service.getDayOfWeekFactor('Unknown')).toBe(1.0);
    });
  });
});
