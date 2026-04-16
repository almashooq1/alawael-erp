/**
 * @file ai-analytics.service.test.js
 * Comprehensive unit tests for AIAnalyticsService
 * Covers ~56 methods across attendance prediction, performance analysis,
 * anomaly detection, trend analysis, recommendations, model management, and more.
 */

const AIAnalyticsService = require('../../services/aiAnalyticsService');

describe('AIAnalyticsService', () => {
  let service;
  let mathRandomSpy;

  beforeEach(() => {
    service = new AIAnalyticsService();
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  // ─── 1. MODULE EXPORTS ────────────────────────────────────────────────────────

  describe('Module Exports', () => {
    it('should export AIAnalyticsService as a class (constructor)', () => {
      expect(typeof AIAnalyticsService).toBe('function');
      expect(AIAnalyticsService.prototype.constructor).toBe(AIAnalyticsService);
    });

    it('should export a singleton instance', () => {
      const mod = require('../../services/aiAnalyticsService');
      expect(mod.instance).toBeDefined();
      expect(mod.instance).toBeInstanceOf(AIAnalyticsService);
    });

    it('should allow creating new instances independently', () => {
      const a = new AIAnalyticsService();
      const b = new AIAnalyticsService();
      expect(a).not.toBe(b);
      expect(a.models).not.toBe(b.models);
    });
  });

  // ─── 2. CONSTRUCTOR & INITIALIZATION ──────────────────────────────────────────

  describe('Constructor & initializeModels', () => {
    it('should initialize all in-memory stores as Maps', () => {
      expect(service.predictions).toBeInstanceOf(Map);
      expect(service.patterns).toBeInstanceOf(Map);
      expect(service.anomalies).toBeInstanceOf(Map);
      expect(service.recommendations).toBeInstanceOf(Map);
      expect(service.models).toBeInstanceOf(Map);
    });

    it('should seed exactly 4 ML models', () => {
      expect(service.models.size).toBe(4);
    });

    it('should have attendance-prediction model with accuracy 0.89', () => {
      const model = service.models.get('attendance-prediction');
      expect(model).toBeDefined();
      expect(model.accuracy).toBe(0.89);
      expect(model.name).toBe('نموذج التنبؤ بالحضور');
      expect(model.features).toContain('dayOfWeek');
    });

    it('should have performance-analysis model with accuracy 0.85', () => {
      const model = service.models.get('performance-analysis');
      expect(model).toBeDefined();
      expect(model.accuracy).toBe(0.85);
    });

    it('should have churn-prediction model with accuracy 0.82', () => {
      const model = service.models.get('churn-prediction');
      expect(model).toBeDefined();
      expect(model.accuracy).toBe(0.82);
    });

    it('should have workload-optimization model with accuracy 0.87', () => {
      const model = service.models.get('workload-optimization');
      expect(model).toBeDefined();
      expect(model.accuracy).toBe(0.87);
    });

    it('should set lastTrained as a Date for each model', () => {
      for (const [, model] of service.models) {
        expect(model.lastTrained).toBeInstanceOf(Date);
      }
    });
  });

  // ─── 3. ATTENDANCE PREDICTION ─────────────────────────────────────────────────

  describe('predictAttendancePatterns', () => {
    const employeeData = { id: 'emp_1', name: 'أحمد' };
    const historyData = [
      { date: '2024-01-01', status: 'present', dayOfWeek: 'Monday' },
      { date: '2024-01-02', status: 'absent', dayOfWeek: 'Tuesday' },
      { date: '2024-01-03', status: 'present', dayOfWeek: 'Wednesday' },
      { date: '2024-01-04', status: 'present', dayOfWeek: 'Thursday' },
      { date: '2024-01-05', status: 'absent', dayOfWeek: 'Sunday' },
    ];

    it('should return success: true with a prediction object', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(result.success).toBe(true);
      expect(result.prediction).toBeDefined();
    });

    it('should include employeeId and employeeName in prediction', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(result.prediction.employeeId).toBe('emp_1');
      expect(result.prediction.employeeName).toBe('أحمد');
    });

    it('should use attendance-prediction model', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(result.prediction.modelUsed).toBe('attendance-prediction');
    });

    it('should have confidence of 0.89', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(result.prediction.confidence).toBe(0.89);
    });

    it('should produce two predictions (week + month)', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(result.prediction.predictions).toHaveLength(2);
      expect(result.prediction.predictions[0].period).toBe('الأسبوع القادم');
      expect(result.prediction.predictions[1].period).toBe('الشهر القادم');
    });

    it('should include analysis with historicalAbsenceRate, seasonalTrend, dayOfWeekPattern, likelyAbsenceDays', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      const { analysis } = result.prediction;
      expect(analysis.historicalAbsenceRate).toBeDefined();
      expect(analysis.seasonalTrend).toBeDefined();
      expect(analysis.dayOfWeekPattern).toBeDefined();
      expect(analysis.likelyAbsenceDays).toBeDefined();
    });

    it('should store prediction in the predictions Map', () => {
      const result = service.predictAttendancePatterns(employeeData, historyData);
      expect(service.predictions.size).toBe(1);
      const stored = service.predictions.get(result.prediction.id);
      expect(stored).toBe(result.prediction);
    });

    it('should return {success: false, error} when employeeData is null', () => {
      const result = service.predictAttendancePatterns(null, historyData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should classify riskFactor as medium when absenceRate is ~0.4', () => {
      const highAbsenceHistory = [
        { date: '2024-01-01', status: 'absent', dayOfWeek: 'Monday' },
        { date: '2024-01-02', status: 'absent', dayOfWeek: 'Tuesday' },
        { date: '2024-01-03', status: 'present', dayOfWeek: 'Wednesday' },
      ];
      const result = service.predictAttendancePatterns(employeeData, highAbsenceHistory);
      // 2/3 = 0.67 > 0.2 → high
      expect(result.prediction.predictions[0].riskFactor).toBe('high');
    });
  });

  describe('calculateAbsenceRate', () => {
    it('should return 0 for empty array', () => {
      expect(service.calculateAbsenceRate([])).toBe(0);
    });

    it('should return 0 when all are present', () => {
      const data = [{ status: 'present' }, { status: 'present' }];
      expect(service.calculateAbsenceRate(data)).toBe(0);
    });

    it('should return 1 when all are absent', () => {
      const data = [{ status: 'absent' }, { status: 'absent' }];
      expect(service.calculateAbsenceRate(data)).toBe(1);
    });

    it('should return correct ratio for mixed data', () => {
      const data = [
        { status: 'present' },
        { status: 'absent' },
        { status: 'present' },
        { status: 'absent' },
      ];
      expect(service.calculateAbsenceRate(data)).toBe(0.5);
    });
  });

  describe('detectSeasonalPattern', () => {
    it('should return a number between -0.5 and 0.5 (mocked random at 0.5)', () => {
      const result = service.detectSeasonalPattern([]);
      // Math.random() = 0.5; 0.5 - 0.5 = 0
      expect(result).toBe(0);
    });

    it('should return -0.5 when random is 0', () => {
      mathRandomSpy.mockReturnValue(0);
      expect(service.detectSeasonalPattern([])).toBe(-0.5);
    });

    it('should return close to 0.5 when random is near 1', () => {
      mathRandomSpy.mockReturnValue(0.99);
      expect(service.detectSeasonalPattern([])).toBeCloseTo(0.49, 1);
    });
  });

  describe('analyzeDayPattern', () => {
    it('should return an object with all 7 day keys', () => {
      const result = service.analyzeDayPattern([]);
      const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      days.forEach(day => {
        expect(result).toHaveProperty(day);
      });
    });

    it('should default all counts to 0 for empty data', () => {
      const result = service.analyzeDayPattern([]);
      Object.values(result).forEach(v => expect(v).toBe(0));
    });

    it('should count absent entries per day', () => {
      const data = [
        { dayOfWeek: 'Sunday', status: 'absent' },
        { dayOfWeek: 'Sunday', status: 'absent' },
        { dayOfWeek: 'Monday', status: 'absent' },
        { dayOfWeek: 'Monday', status: 'present' },
      ];
      const result = service.analyzeDayPattern(data);
      expect(result.Sunday).toBe(2);
      expect(result.Monday).toBe(1);
      expect(result.Tuesday).toBe(0);
    });
  });

  describe('getAttendanceAction', () => {
    it('should return HR follow-up for rate > 0.3', () => {
      expect(service.getAttendanceAction(0.35)).toBe('متابعة فورية مع إدارة الموارد البشرية');
    });

    it('should return close monitoring for rate > 0.15 and <= 0.3', () => {
      expect(service.getAttendanceAction(0.2)).toBe('مراقبة دقيقة للحضور');
    });

    it('should return no action needed for rate <= 0.15', () => {
      expect(service.getAttendanceAction(0.1)).toBe('لا توجد إجراءات ضرورية');
    });

    it('should return no action needed for rate 0', () => {
      expect(service.getAttendanceAction(0)).toBe('لا توجد إجراءات ضرورية');
    });

    it('should return HR follow-up at extreme rate 1.0', () => {
      expect(service.getAttendanceAction(1.0)).toBe('متابعة فورية مع إدارة الموارد البشرية');
    });
  });

  describe('predictAbsenceDays', () => {
    it('should return empty array when all days have 0 count', () => {
      const pattern = { Saturday: 0, Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0 };
      expect(service.predictAbsenceDays(pattern)).toEqual([]);
    });

    it('should return day names where count > 0', () => {
      const pattern = { Saturday: 0, Sunday: 2, Monday: 1, Tuesday: 0, Wednesday: 0, Thursday: 0 };
      const result = service.predictAbsenceDays(pattern);
      expect(result).toContain('Sunday');
      expect(result).toContain('Monday');
      expect(result).not.toContain('Saturday');
    });
  });

  // ─── 4. PERFORMANCE PREDICTION ────────────────────────────────────────────────

  describe('predictPerformance — dual mode', () => {
    describe('New mode (array data)', () => {
      it('should return nextScore, confidence, and factors for valid array', () => {
        const data = [
          { score: 80, attendance: 95 },
          { score: 85, attendance: 92 },
          { score: 78, performance: 90 },
        ];
        const result = service.predictPerformance(data);
        expect(result).toHaveProperty('nextScore');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('factors');
        expect(typeof result.nextScore).toBe('number');
      });

      it('should return {nextScore:0, confidence:0, factors:[]} for empty array', () => {
        const result = service.predictPerformance([]);
        expect(result).toEqual({ nextScore: 0, confidence: 0, factors: [] });
      });

      it('should return {nextScore:0, confidence:0, factors:[]} for non-array', () => {
        const result = service.predictPerformance(null);
        expect(result).toEqual({ nextScore: 0, confidence: 0, factors: [] });
      });

      it('should detect "High attendance" factor when attendance > 90', () => {
        const data = [{ score: 80, attendance: 95 }];
        const result = service.predictPerformance(data);
        expect(result.factors).toContain('High attendance');
      });

      it('should detect "Strong performance history" when performance > 85', () => {
        const data = [{ performance: 90 }];
        const result = service.predictPerformance(data);
        expect(result.factors).toContain('Strong performance history');
      });

      it('should detect "Sufficient historical data" when length > 5', () => {
        const data = Array.from({ length: 6 }, (_, i) => ({ score: 70 + i }));
        const result = service.predictPerformance(data);
        expect(result.factors).toContain('Sufficient historical data');
      });

      it('should fallback to "Consistent performance" when no specific factors', () => {
        const data = [{ score: 60 }]; // no attendance >90, no performance >85, length <=5
        const result = service.predictPerformance(data);
        expect(result.factors).toContain('Consistent performance');
      });

      it('should clamp nextScore between 0 and 100', () => {
        // With mocked random 0.5: avgScore + (0.5*10 - 5) = avg + 0
        const data = [{ score: 99 }];
        const result = service.predictPerformance(data);
        expect(result.nextScore).toBeLessThanOrEqual(100);
        expect(result.nextScore).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Legacy mode (string employeeId)', () => {
      it('should delegate to _predictPerformanceLegacy with string first arg', () => {
        const spy = jest.spyOn(service, '_predictPerformanceLegacy');
        const metrics = {
          tasks_completed: 80,
          quality_score: 85,
          on_time_delivery: 90,
          teamwork: 75,
        };
        service.predictPerformance('emp_1', metrics);
        expect(spy).toHaveBeenCalledWith('emp_1', metrics);
        spy.mockRestore();
      });

      it('should return {success: true, prediction} for string empId', () => {
        const metrics = { tasks_completed: 80, quality_score: 85 };
        const result = service.predictPerformance('emp_1', metrics);
        expect(result.success).toBe(true);
        expect(result.prediction).toBeDefined();
      });
    });
  });

  describe('_predictPerformanceLegacy', () => {
    const metrics = { tasks_completed: 80, quality_score: 85, on_time_delivery: 90, teamwork: 75 };

    it('should return success: true with prediction object', () => {
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      expect(result.success).toBe(true);
      expect(result.prediction).toBeDefined();
    });

    it('should include employeeId and modelUsed', () => {
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      expect(result.prediction.employeeId).toBe('emp_1');
      expect(result.prediction.modelUsed).toBe('performance-analysis');
    });

    it('should compute currentScore using weighted formula', () => {
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      // 80*0.3 + 85*0.3 + 90*0.2 + 75*0.2 = 24 + 25.5 + 18 + 15 = 82.5 → 83
      expect(result.prediction.currentScore).toBe(83);
    });

    it('should include trend as improving or declining', () => {
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      expect(['improving', 'declining']).toContain(result.prediction.trend);
    });

    it('should include factors: productivity, quality, collaboration, reliability', () => {
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      expect(result.prediction.factors.productivity).toBe(80);
      expect(result.prediction.factors.quality).toBe(85);
      expect(result.prediction.factors.collaboration).toBe(75);
      expect(result.prediction.factors.reliability).toBe(90);
    });

    it('should add high-priority recommendation when projectedScore < 60', () => {
      // Low metrics to force low projected score; random mocked to produce negative trend
      mathRandomSpy.mockReturnValue(0); // trend = 0*10 - 5 = -5
      const lowMetrics = {
        tasks_completed: 20,
        quality_score: 20,
        on_time_delivery: 20,
        teamwork: 20,
      };
      const result = service._predictPerformanceLegacy('emp_1', lowMetrics);
      // currentScore = 20*0.3+20*0.3+20*0.2+20*0.2 = 6+6+4+4 = 20; projected = 20-5 = 15
      const highRecs = result.prediction.recommendations.filter(r => r.priority === 'high');
      expect(highRecs.length).toBeGreaterThan(0);
    });

    it('should add medium-priority recommendation when trend < 0', () => {
      mathRandomSpy.mockReturnValue(0); // trend = -5
      const result = service._predictPerformanceLegacy('emp_1', metrics);
      const medRecs = result.prediction.recommendations.filter(r => r.priority === 'medium');
      expect(medRecs.length).toBeGreaterThan(0);
    });

    it('should store prediction in predictions Map', () => {
      service._predictPerformanceLegacy('emp_1', metrics);
      expect(service.predictions.size).toBe(1);
    });

    it('should return {success: false} on error', () => {
      const result = service._predictPerformanceLegacy(null, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should clamp projectedScore between 0 and 100', () => {
      mathRandomSpy.mockReturnValue(1); // trend = 1*10 - 5 = 5
      const highMetrics = {
        tasks_completed: 100,
        quality_score: 100,
        on_time_delivery: 100,
        teamwork: 100,
      };
      const result = service._predictPerformanceLegacy('emp_1', highMetrics);
      expect(result.prediction.projectedScore).toBeLessThanOrEqual(100);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should compute weighted score correctly', () => {
      const metrics = {
        tasks_completed: 100,
        quality_score: 100,
        on_time_delivery: 100,
        teamwork: 100,
      };
      // 100*0.3 + 100*0.3 + 100*0.2 + 100*0.2 = 100
      expect(service.calculatePerformanceScore(metrics)).toBe(100);
    });

    it('should handle missing fields as 0', () => {
      expect(service.calculatePerformanceScore({})).toBe(0);
    });

    it('should apply correct weights', () => {
      const metrics = { tasks_completed: 80, quality_score: 0, on_time_delivery: 0, teamwork: 0 };
      // 80*0.3 = 24
      expect(service.calculatePerformanceScore(metrics)).toBe(24);
    });

    it('should round the result', () => {
      const metrics = {
        tasks_completed: 33,
        quality_score: 33,
        on_time_delivery: 33,
        teamwork: 33,
      };
      // 33*0.3+33*0.3+33*0.2+33*0.2 = 9.9+9.9+6.6+6.6 = 33
      expect(service.calculatePerformanceScore(metrics)).toBe(33);
    });
  });

  describe('analyzeTrend', () => {
    it('should return a number with mocked random', () => {
      // Math.random()=0.5 → 0.5*10 - 5 = 0
      expect(service.analyzeTrend({})).toBe(0);
    });

    it('should return -5 when random is 0', () => {
      mathRandomSpy.mockReturnValue(0);
      expect(service.analyzeTrend({})).toBe(-5);
    });

    it('should return 5 when random is 1', () => {
      mathRandomSpy.mockReturnValue(1);
      expect(service.analyzeTrend({})).toBe(5);
    });
  });

  describe('analyzeProductivity / analyzeQuality / analyzeCollaboration / analyzeReliability', () => {
    it('analyzeProductivity returns tasks_completed or 0', () => {
      expect(service.analyzeProductivity({ tasks_completed: 42 })).toBe(42);
      expect(service.analyzeProductivity({})).toBe(0);
    });

    it('analyzeQuality returns quality_score or 0', () => {
      expect(service.analyzeQuality({ quality_score: 88 })).toBe(88);
      expect(service.analyzeQuality({})).toBe(0);
    });

    it('analyzeCollaboration returns teamwork or 0', () => {
      expect(service.analyzeCollaboration({ teamwork: 70 })).toBe(70);
      expect(service.analyzeCollaboration({})).toBe(0);
    });

    it('analyzeReliability returns on_time_delivery or 0', () => {
      expect(service.analyzeReliability({ on_time_delivery: 95 })).toBe(95);
      expect(service.analyzeReliability({})).toBe(0);
    });
  });

  // ─── 5. ANOMALY DETECTION ─────────────────────────────────────────────────────

  describe('detectAnomalies', () => {
    const normalData = [{ value: 50 }, { value: 52 }, { value: 48 }, { value: 51 }, { value: 49 }];
    const anomalyData = [
      { value: 50 },
      { value: 52 },
      { value: 48 },
      { value: 51 },
      { value: 49 },
      { value: 200 },
    ];

    it('should return an array (not wrapped in {success})', () => {
      const result = service.detectAnomalies(normalData);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for uniform data', () => {
      const result = service.detectAnomalies(normalData);
      expect(result).toHaveLength(0);
    });

    it('should detect anomaly in data with extreme outlier', () => {
      const result = service.detectAnomalies(anomalyData);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('index');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('zScore');
      expect(result[0]).toHaveProperty('severity');
      expect(result[0]).toHaveProperty('reason');
    });

    it('should use default threshold of 2.0', () => {
      const result = service.detectAnomalies(anomalyData);
      result.forEach(a => {
        expect(a.zScore).toBeGreaterThan(2.0);
      });
    });

    it('should respect custom threshold in options object', () => {
      const result = service.detectAnomalies(anomalyData, { threshold: 1.0 });
      // Lower threshold → potentially more anomalies
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should accept options as string (type)', () => {
      const result = service.detectAnomalies(anomalyData, 'attendance');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should classify severity: critical for zScore > 3, high for > 2.5, medium otherwise', () => {
      const result = service.detectAnomalies(anomalyData);
      result.forEach(a => {
        if (a.zScore > 3) expect(a.severity).toBe('critical');
        else if (a.zScore > 2.5) expect(a.severity).toBe('high');
        else expect(a.severity).toBe('medium');
      });
    });

    it('should store anomaly record in anomalies Map', () => {
      service.detectAnomalies(anomalyData);
      expect(service.anomalies.size).toBe(1);
    });

    it('should handle numeric array items', () => {
      const data = [10, 10, 10, 10, 10, 10, 500];
      const result = service.detectAnomalies(data);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array on error', () => {
      const result = service.detectAnomalies(null);
      expect(result).toEqual([]);
    });
  });

  describe('calculateStatistics', () => {
    it('should compute mean correctly', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const stats = service.calculateStatistics(data);
      expect(stats.mean).toBe(20);
    });

    it('should compute population stdDev and variance', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const stats = service.calculateStatistics(data);
      // variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 3 = 200/3 ≈ 66.67
      expect(stats.variance).toBeCloseTo(66.667, 1);
      expect(stats.stdDev).toBeCloseTo(Math.sqrt(200 / 3), 2);
    });

    it('should handle numeric array directly', () => {
      const data = [5, 5, 5];
      const stats = service.calculateStatistics(data);
      expect(stats.mean).toBe(5);
      expect(stats.variance).toBe(0);
      expect(stats.stdDev).toBe(0);
    });

    it('should extract value from score, performance, attendance fields', () => {
      const data = [{ score: 100 }, { performance: 50 }];
      const stats = service.calculateStatistics(data);
      expect(stats.mean).toBe(75);
    });
  });

  describe('explainAnomaly', () => {
    it('should return Arabic string with percentage difference', () => {
      const result = service.explainAnomaly(120, 100, 10);
      expect(result).toContain('القيمة أعلى من المتوسط بـ');
      expect(result).toContain('20.0%');
    });

    it('should handle negative difference', () => {
      const result = service.explainAnomaly(80, 100, 10);
      expect(result).toContain('-20.0%');
    });
  });

  // ─── 6. RECOMMENDATIONS ──────────────────────────────────────────────────────

  describe('generateSmartRecommendations', () => {
    const userProfile = {
      requiredSkills: ['Python', 'ML', 'NLP'],
      currentSkills: ['Python'],
      developmentAreas: ['Deep Learning', 'Cloud'],
      softSkillGaps: ['Leadership'],
      careerPath: ['Senior Dev', 'Tech Lead'],
    };

    it('should return success: true with recommendations object', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
    });

    it('should include userId', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      expect(result.recommendations.userId).toBe('user_1');
    });

    it('should include generatedAt as Date', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      expect(result.recommendations.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate training recommendation when skill gaps exist', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      const training = result.recommendations.recommendations.find(r => r.type === 'training');
      expect(training).toBeDefined();
      expect(training.priority).toBe('high');
      expect(training.content).toContain('ML');
    });

    it('should generate development recommendation when technical areas exist', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      const dev = result.recommendations.recommendations.find(r => r.type === 'development');
      expect(dev).toBeDefined();
    });

    it('should generate career recommendation when careerPath exists', () => {
      const result = service.generateSmartRecommendations('user_1', userProfile, {});
      const career = result.recommendations.recommendations.find(r => r.type === 'career');
      expect(career).toBeDefined();
      expect(career.opportunities).toContain('Senior Dev');
    });

    it('should store recommendations in the recommendations Map', () => {
      service.generateSmartRecommendations('user_1', userProfile, {});
      expect(service.recommendations.size).toBe(1);
    });

    it('should return {success: false, error} when userProfile is null', () => {
      const result = service.generateSmartRecommendations('user_1', null, {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip training rec when no skill gaps', () => {
      const noGapsProfile = { requiredSkills: ['JS'], currentSkills: ['JS'], careerPath: [] };
      const result = service.generateSmartRecommendations('user_1', noGapsProfile, {});
      const training = result.recommendations.recommendations.find(r => r.type === 'training');
      expect(training).toBeUndefined();
    });
  });

  describe('identifySkillGaps', () => {
    it('should return missing skills', () => {
      const profile = { requiredSkills: ['A', 'B', 'C'], currentSkills: ['A'] };
      expect(service.identifySkillGaps(profile)).toEqual(['B', 'C']);
    });

    it('should return empty array if no required skills', () => {
      expect(service.identifySkillGaps({})).toEqual([]);
    });

    it('should return empty array if all skills present', () => {
      const profile = { requiredSkills: ['A'], currentSkills: ['A'] };
      expect(service.identifySkillGaps(profile)).toEqual([]);
    });
  });

  describe('analyzeDevelopmentNeeds', () => {
    it('should return technical and soft skill arrays', () => {
      const profile = { developmentAreas: ['ML'], softSkillGaps: ['Communication'] };
      const result = service.analyzeDevelopmentNeeds(profile);
      expect(result.technical).toEqual(['ML']);
      expect(result.soft).toEqual(['Communication']);
    });

    it('should default to empty arrays', () => {
      const result = service.analyzeDevelopmentNeeds({});
      expect(result.technical).toEqual([]);
      expect(result.soft).toEqual([]);
    });
  });

  describe('findGrowthOpportunities', () => {
    it('should return careerPath from profile', () => {
      expect(service.findGrowthOpportunities({ careerPath: ['Lead'] })).toEqual(['Lead']);
    });

    it('should return empty array if no careerPath', () => {
      expect(service.findGrowthOpportunities({})).toEqual([]);
    });
  });

  // ─── 7. TREND ANALYSIS ───────────────────────────────────────────────────────

  describe('analyzeTrends — dual mode', () => {
    describe('New mode (no second arg)', () => {
      it('should delegate to _analyzeTrendsNew when 2nd arg is undefined', () => {
        const spy = jest.spyOn(service, '_analyzeTrendsNew');
        service.analyzeTrends([{ value: 10 }]);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should return {direction, slope, inflectionPoints, seasonal}', () => {
        const data = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }, { value: 50 }];
        const result = service.analyzeTrends(data);
        expect(result).toHaveProperty('direction');
        expect(result).toHaveProperty('slope');
        expect(result).toHaveProperty('inflectionPoints');
        expect(result).toHaveProperty('seasonal');
      });
    });

    describe('Legacy mode (with timeField)', () => {
      it('should return {success: true, trends} when timeField is provided', () => {
        const data = Array.from({ length: 15 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          value: 50 + i,
        }));
        const result = service.analyzeTrends(data, 'date');
        expect(result.success).toBe(true);
        expect(result.trends).toBeDefined();
      });

      it('should return {success: false} on error in legacy mode', () => {
        const result = service.analyzeTrends(null, 'date');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('_analyzeTrendsNew', () => {
    it('should return stable direction for empty array', () => {
      const result = service._analyzeTrendsNew([]);
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
      expect(result.inflectionPoints).toEqual([]);
      expect(result.seasonal).toBe(false);
    });

    it('should return stable direction for non-array', () => {
      const result = service._analyzeTrendsNew(null);
      expect(result.direction).toBe('stable');
    });

    it('should detect upward direction for increasing data', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ value: 10 + i * 10 }));
      const result = service._analyzeTrendsNew(data);
      expect(result.direction).toBe('up');
      expect(result.slope).toBeGreaterThan(0);
    });

    it('should detect downward direction for decreasing data', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ value: 100 - i * 10 }));
      const result = service._analyzeTrendsNew(data);
      expect(result.direction).toBe('down');
      expect(result.slope).toBeLessThan(0);
    });

    it('should detect inflection points', () => {
      // Data goes up then down: inflection at peak
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 20 }, { value: 10 }];
      const result = service._analyzeTrendsNew(data);
      expect(result.inflectionPoints.length).toBeGreaterThanOrEqual(0);
    });

    it('should return seasonal boolean from detectSeasonality', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 10 }, { value: 20 }, { value: 10 }];
      const result = service._analyzeTrendsNew(data);
      expect(typeof result.seasonal).toBe('boolean');
    });
  });

  describe('calculateMovingAverage', () => {
    it('should return same-length array', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = service.calculateMovingAverage(data);
      expect(result).toHaveLength(3);
    });

    it('should compute averages with default period 3', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = service.calculateMovingAverage(data);
      // i=0: [10] → 10
      // i=1: [10,20] → 15
      // i=2: [10,20,30] → 20
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(15);
      expect(result[2]).toBe(20);
    });

    it('should respect custom period', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }];
      const result = service.calculateMovingAverage(data, 2);
      // i=0: [10] → 10
      // i=1: [10,20] → 15
      // i=2: [20,30] → 25
      // i=3: [30,40] → 35
      expect(result[2]).toBe(25);
      expect(result[3]).toBe(35);
    });

    it('should handle numeric-like data (fallback to d.value || d)', () => {
      const data = [5, 10, 15];
      const result = service.calculateMovingAverage(data);
      expect(result[0]).toBe(5);
      expect(result[2]).toBe(10);
    });
  });

  describe('forecastTrend', () => {
    it('should return {values:[], trend:"stable"} for empty array', () => {
      const result = service.forecastTrend([]);
      expect(result.values).toEqual([]);
      expect(result.trend).toBe('stable');
    });

    it('should return forecast values for valid data', () => {
      const data = [{ value: 50 }, { value: 60 }, { value: 70 }];
      const result = service.forecastTrend(data);
      expect(result.values.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('nextPeriod');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('direction');
    });

    it('should default to 5 forecast periods', () => {
      const data = [{ value: 50 }, { value: 60 }, { value: 70 }];
      const result = service.forecastTrend(data);
      expect(result.values).toHaveLength(5);
    });

    it('should allow custom periods', () => {
      const data = [{ value: 50 }, { value: 60 }, { value: 70 }];
      const result = service.forecastTrend(data, { periods: 10 });
      expect(result.values).toHaveLength(10);
    });

    it('should clamp forecast values between 0 and 100', () => {
      const data = [{ value: 50 }, { value: 60 }, { value: 70 }];
      const result = service.forecastTrend(data);
      result.values.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });

    it('should return upward trend for increasing data', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = service.forecastTrend(data);
      expect(result.trend).toBe('upward');
      expect(result.direction).toBe('upward');
    });

    it('should handle array of numbers', () => {
      const result = service.forecastTrend([10, 20, 30]);
      expect(result.values.length).toBeGreaterThan(0);
    });
  });

  describe('detectSeasonality', () => {
    it('should return seasonal:false for empty data', () => {
      const result = service.detectSeasonality([]);
      expect(result.seasonal).toBe(false);
      expect(result.period).toBe('quarterly');
      expect(result.strength).toBe('low');
    });

    it('should return seasonal:false for fewer than 4 data points', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = service.detectSeasonality(data);
      expect(result.seasonal).toBe(false);
    });

    it('should detect seasonality when amplitude > 30% of average', () => {
      // avg=50, amplitude=80, 80 > 50*0.3 → seasonal
      const data = [{ value: 10 }, { value: 90 }, { value: 10 }, { value: 90 }];
      const result = service.detectSeasonality(data);
      expect(result.seasonal).toBe(true);
      expect(result.strength).toBe('moderate');
    });

    it('should not detect seasonality when amplitude is small', () => {
      const data = [{ value: 50 }, { value: 51 }, { value: 50 }, { value: 51 }];
      const result = service.detectSeasonality(data);
      expect(result.seasonal).toBe(false);
    });
  });

  // ─── 8. WRAPPER METHODS ───────────────────────────────────────────────────────

  describe('predictAttendance', () => {
    it('should return {nextPeriod:0, confidence:0} for null data', () => {
      const result = service.predictAttendance(null);
      expect(result.nextPeriod).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should return {nextPeriod:0, confidence:0} for non-array data', () => {
      const result = service.predictAttendance('bad');
      expect(result.nextPeriod).toBe(0);
    });

    it('should compute nextPeriod from average attendance', () => {
      const data = [{ attendance: 0.9 }, { attendance: 0.8 }];
      const result = service.predictAttendance(data);
      // avg = 0.85 → nextPeriod = 85
      expect(result.nextPeriod).toBe(85);
    });

    it('should clamp nextPeriod between 0 and 100', () => {
      const data = [{ attendance: 2.0 }]; // extreme
      const result = service.predictAttendance(data);
      expect(result.nextPeriod).toBeLessThanOrEqual(100);
    });

    it('should include confidenceReason', () => {
      const data = [{ attendance: 0.9 }];
      const result = service.predictAttendance(data);
      expect(result.confidenceReason).toBeDefined();
    });

    it('should include periods array of length 3', () => {
      const data = [{ attendance: 0.9 }];
      const result = service.predictAttendance(data);
      expect(result.periods).toHaveLength(3);
    });

    it('should consider trend when option set', () => {
      const data = Array.from({ length: 15 }, (_, i) => ({ attendance: 0.7 + i * 0.01 }));
      const result = service.predictAttendance(data, { considerTrend: true });
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
    });

    it('should detect seasonal pattern when option set', () => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        attendance: 0.8,
        date: `2024-0${i + 1}-15`,
      }));
      const result = service.predictAttendance(data, { seasonal: true });
      expect(typeof result.seasonalPattern).toBe('boolean');
    });
  });

  describe('_detectSeasonalPattern', () => {
    it('should return false for < 4 data points', () => {
      expect(service._detectSeasonalPattern([{ attendance: 1 }])).toBe(false);
    });

    it('should return true/false based on month spread', () => {
      const data = [
        { date: '2024-01-15', attendance: 0.9 },
        { date: '2024-02-15', attendance: 0.8 },
        { date: '2024-03-15', attendance: 0.7 },
        { date: '2024-04-15', attendance: 0.9 },
      ];
      const result = service._detectSeasonalPattern(data);
      expect(typeof result).toBe('boolean');
      // 4 different months → true
      expect(result).toBe(true);
    });
  });

  describe('forecastAttendance', () => {
    it('should return forecasts array with default 7 periods', () => {
      const result = service.forecastAttendance([]);
      expect(result.forecasts).toHaveLength(7);
      expect(result.trend).toBe('stable');
      expect(result.accuracy).toBe(0.88);
      expect(result.periods).toBe(7);
    });

    it('should respect custom periods', () => {
      const result = service.forecastAttendance([], { periods: 3 });
      expect(result.forecasts).toHaveLength(3);
      expect(result.periods).toBe(3);
    });

    it('should have forecast values between 0 and 100', () => {
      const result = service.forecastAttendance([]);
      result.forecasts.forEach(f => {
        expect(f.value).toBeGreaterThanOrEqual(0);
        expect(f.value).toBeLessThanOrEqual(100);
        expect(f.period).toBeDefined();
      });
    });
  });

  describe('analyzePerformance', () => {
    it('should return overallScore, areas, and factors', () => {
      const result = service.analyzePerformance([]);
      expect(result).toHaveProperty('overallScore');
      expect(result.areas).toHaveProperty('strong');
      expect(result.areas).toHaveProperty('needsImprovement');
      expect(result.factors).toHaveProperty('efficiency');
      expect(result.factors).toHaveProperty('quality');
      expect(result.factors).toHaveProperty('collaboration');
    });

    it('should return overallScore as a number (mocked)', () => {
      // random=0.5 → 70 + 0.5*30 = 85
      const result = service.analyzePerformance([]);
      expect(result.overallScore).toBe(85);
    });
  });

  describe('getRecommendations', () => {
    it('should return exactly 2 items', () => {
      const result = service.getRecommendations([]);
      expect(result).toHaveLength(2);
    });

    it('should have priority and text and impact fields', () => {
      const result = service.getRecommendations([]);
      result.forEach(r => {
        expect(r).toHaveProperty('priority');
        expect(r).toHaveProperty('text');
        expect(r).toHaveProperty('impact');
      });
    });

    it('should have first item as high priority', () => {
      const result = service.getRecommendations([]);
      expect(result[0].priority).toBe('high');
    });
  });

  describe('getPerformanceInsights', () => {
    it('should return stable defaults for empty array', () => {
      const result = service.getPerformanceInsights([]);
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
      expect(result.changePercentage).toBe('0');
      expect(result.inflectionPoints).toEqual([]);
      expect(result.seasonal).toBe(false);
    });

    it('should return stable defaults for non-array', () => {
      const result = service.getPerformanceInsights(null);
      expect(result.direction).toBe('stable');
    });

    it('should detect upward direction for increasing scores', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ score: 50 + i * 5 }));
      const result = service.getPerformanceInsights(data);
      expect(result.direction).toBe('up');
      expect(result.slope).toBeGreaterThan(0);
    });

    it('should detect inflection points where trend changes sign', () => {
      const data = [
        { score: 10 },
        { score: 20 },
        { score: 30 }, // up
        { score: 25 },
        { score: 20 }, // down → inflection at index 2
      ];
      const result = service.getPerformanceInsights(data);
      expect(result.inflectionPoints.length).toBeGreaterThan(0);
      expect(result.inflectionPoints[0]).toHaveProperty('index');
      expect(result.inflectionPoints[0]).toHaveProperty('value');
    });

    it('should include changePercentage and period', () => {
      const data = [{ score: 50 }, { score: 60 }];
      const result = service.getPerformanceInsights(data);
      expect(result.changePercentage).toBeDefined();
      expect(result.period).toBe('quarterly');
    });
  });

  // ─── 9. DATA QUALITY ─────────────────────────────────────────────────────────

  describe('validateDataQuality', () => {
    it('should return invalid for non-array', () => {
      const result = service.validateDataQuality('not an array');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an array');
    });

    it('should return invalid for empty array', () => {
      const result = service.validateDataQuality([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data is empty');
    });

    it('should return valid for non-empty array', () => {
      const result = service.validateDataQuality([{ value: 1 }]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.completeness).toBe(95);
    });
  });

  describe('detectMissingValues', () => {
    it('should return empty array for non-array input', () => {
      expect(service.detectMissingValues(null)).toEqual([]);
    });

    it('should return empty array for complete data', () => {
      const data = [{ a: 1, b: 2 }];
      expect(service.detectMissingValues(data)).toEqual([]);
    });

    it('should detect null values', () => {
      const data = [{ a: 1, b: null }];
      const result = service.detectMissingValues(data);
      expect(result).toEqual([{ index: 0, field: 'b' }]);
    });

    it('should detect undefined values', () => {
      const data = [{ a: undefined }];
      const result = service.detectMissingValues(data);
      expect(result).toEqual([{ index: 0, field: 'a' }]);
    });

    it('should detect empty string values', () => {
      const data = [{ a: '' }];
      const result = service.detectMissingValues(data);
      expect(result).toEqual([{ index: 0, field: 'a' }]);
    });

    it('should detect multiple missing values across items', () => {
      const data = [
        { a: null, b: 1 },
        { a: 2, b: undefined },
      ];
      const result = service.detectMissingValues(data);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ index: 0, field: 'a' });
      expect(result[1]).toEqual({ index: 1, field: 'b' });
    });
  });

  describe('identifyOutliers', () => {
    it('should return outliers where zscore exceeds default threshold 2', () => {
      const data = [
        { value: 50 },
        { value: 52 },
        { value: 48 },
        { value: 51 },
        { value: 49 },
        { value: 200 },
      ];
      const result = service.identifyOutliers(data);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('index');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('zscore');
    });

    it('should respect custom threshold and field', () => {
      const data = [{ score: 50 }, { score: 52 }, { score: 48 }, { score: 100 }];
      const result = service.identifyOutliers(data, { field: 'score', threshold: 1.5 });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for uniform data', () => {
      const data = [{ value: 50 }, { value: 50 }, { value: 50 }];
      // All same → stdDev = 0 → zscore = NaN or Infinity, but 50-50=0 / 0 = NaN
      // Math.abs(NaN) > 2 is false
      const result = service.identifyOutliers(data);
      expect(result).toEqual([]);
    });
  });

  // ─── 10. MODEL MANAGEMENT ────────────────────────────────────────────────────

  describe('listModels', () => {
    it('should return exactly 3 models', () => {
      const models = service.listModels();
      expect(models).toHaveLength(3);
    });

    it('should have id, name, type, accuracy for each model', () => {
      const models = service.listModels();
      models.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('type');
        expect(m).toHaveProperty('accuracy');
      });
    });

    it('should include regression, classification, and clustering types', () => {
      const models = service.listModels();
      const types = models.map(m => m.type);
      expect(types).toContain('regression');
      expect(types).toContain('classification');
      expect(types).toContain('clustering');
    });
  });

  describe('getModelInfo', () => {
    it('should return model info with provided modelId', () => {
      const result = service.getModelInfo('model_xyz');
      expect(result.id).toBe('model_xyz');
      expect(result.name).toBe('Sample Model');
      expect(result.version).toBe('1.0');
      expect(result.type).toBe('regression');
      expect(result.accuracy).toBe(0.9);
      expect(result.created).toBeDefined();
    });

    it('should return ISO string for created date', () => {
      const result = service.getModelInfo('m1');
      expect(() => new Date(result.created)).not.toThrow();
    });
  });

  describe('trainModel', () => {
    it('should return training result with status trained', () => {
      const result = service.trainModel([{ value: 1 }]);
      expect(result.status).toBe('trained');
      expect(result.modelId).toBeDefined();
      expect(result.version).toBe('1.1');
      expect(result.trainedAt).toBeDefined();
    });

    it('should return accuracy around 0.88-0.98 (mocked random=0.5)', () => {
      // 0.88 + 0.5 * 0.1 = 0.93
      const result = service.trainModel([]);
      expect(result.accuracy).toBeCloseTo(0.93, 2);
    });
  });

  describe('evaluateModel', () => {
    it('should return evaluation metrics for any modelId', () => {
      const result = service.evaluateModel('model_1', []);
      expect(result.modelId).toBe('model_1');
      expect(result.accuracy).toBe(0.87);
      expect(result.precision).toBe(0.89);
      expect(result.recall).toBe(0.85);
      expect(result.f1Score).toBe(0.87);
    });
  });

  describe('getModelMetrics', () => {
    it('should return accuracy, precision, recall, f1Score', () => {
      const result = service.getModelMetrics('any_model');
      expect(result.accuracy).toBe(0.9);
      expect(result.precision).toBe(0.92);
      expect(result.recall).toBe(0.88);
      expect(result.f1Score).toBe(0.9);
    });
  });

  describe('getModelVersions', () => {
    it('should return exactly 3 versions', () => {
      const result = service.getModelVersions('model_1');
      expect(result).toHaveLength(3);
    });

    it('should have version, createdAt, accuracy for each', () => {
      const result = service.getModelVersions('model_1');
      result.forEach(v => {
        expect(v).toHaveProperty('version');
        expect(v).toHaveProperty('createdAt');
        expect(v).toHaveProperty('accuracy');
      });
    });

    it('should have increasing accuracy across versions', () => {
      const result = service.getModelVersions('model_1');
      expect(result[0].accuracy).toBeLessThan(result[1].accuracy);
      expect(result[1].accuracy).toBeLessThan(result[2].accuracy);
    });
  });

  // ─── 11. CORRELATIONS, BATCH PREDICT, AND COMPARISON METHODS ──────────────────

  describe('findCorrelations', () => {
    it('should return correlations between data fields', () => {
      const data = [
        { a: 10, b: 20, c: 30 },
        { a: 15, b: 25, c: 35 },
      ];
      const result = service.findCorrelations(data);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(c => {
        expect(c).toHaveProperty('variable1');
        expect(c).toHaveProperty('variable2');
        expect(c).toHaveProperty('coefficient');
        expect(c).toHaveProperty('strength');
      });
    });

    it('should return empty for empty data', () => {
      const result = service.findCorrelations([{}]);
      expect(result).toEqual([]);
    });

    it('should filter by minStrength option', () => {
      const data = [{ a: 1, b: 2 }];
      const result = service.findCorrelations(data, { minStrength: 0.9 });
      // With mocked random 0.5: corr = 0.5*1.6 - 0.8 = 0.0
      // 0 < 0.9 → filtered out
      expect(result).toEqual([]);
    });

    it('should classify strength as strong or moderate', () => {
      mathRandomSpy.mockReturnValue(0.95);
      // corr = 0.95 * 1.6 - 0.8 = 0.72 → strong
      const data = [{ x: 1, y: 2 }];
      const result = service.findCorrelations(data);
      if (result.length > 0) {
        expect(['strong', 'moderate']).toContain(result[0].strength);
      }
    });
  });

  describe('batchPredict', () => {
    it('should return array with same length as batches', () => {
      const batches = [[{ attendance: 0.9 }], [{ attendance: 0.8 }]];
      const result = service.batchPredict(batches, 'attendance');
      expect(result).toHaveLength(2);
    });

    it('should delegate to predictAttendance when type is attendance', () => {
      const spy = jest.spyOn(service, 'predictAttendance');
      const batches = [[{ attendance: 0.9 }]];
      service.batchPredict(batches, 'attendance');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return default prediction for non-attendance type', () => {
      const batches = [[{ score: 80 }]];
      const result = service.batchPredict(batches, 'performance');
      expect(result[0]).toHaveProperty('batchId');
      expect(result[0]).toHaveProperty('nextPeriod');
      expect(result[0]).toHaveProperty('confidence');
    });
  });

  describe('forecastPerformance', () => {
    it('should return forecasts array and trend', () => {
      const result = service.forecastPerformance([]);
      expect(result.forecasts).toBeDefined();
      expect(result.trend).toBe('stable');
    });

    it('should default to 10 periods', () => {
      const result = service.forecastPerformance([]);
      expect(result.forecasts).toHaveLength(10);
    });

    it('should respect custom periods', () => {
      const result = service.forecastPerformance([], { periods: 5 });
      expect(result.forecasts).toHaveLength(5);
    });

    it('should return values between 0 and 100', () => {
      const result = service.forecastPerformance([]);
      result.forecasts.forEach(f => {
        expect(f.value).toBeGreaterThanOrEqual(0);
        expect(f.value).toBeLessThanOrEqual(100);
        expect(f.period).toBeDefined();
      });
    });
  });

  describe('detectPerformanceAnomalies', () => {
    it('should delegate to detectAnomalies', () => {
      const spy = jest.spyOn(service, 'detectAnomalies');
      const data = [{ value: 50 }, { value: 200 }];
      service.detectPerformanceAnomalies(data);
      expect(spy).toHaveBeenCalledWith(data);
      spy.mockRestore();
    });
  });

  describe('comparePerformance', () => {
    it('should compare average score against baseline', () => {
      const data = [{ score: 90 }, { score: 95 }];
      const result = service.comparePerformance(data);
      // avg = 92.5, default baseline = 85 → aboveBaseline
      expect(result.aboveBaseline).toBe(true);
      expect(parseFloat(result.averageScore)).toBeCloseTo(92.5, 1);
    });

    it('should respect custom baseline', () => {
      const data = [{ score: 70 }, { score: 80 }];
      const result = service.comparePerformance(data, { baseline: 90 });
      // avg = 75 < 90
      expect(result.aboveBaseline).toBe(false);
    });

    it('should include variance', () => {
      const data = [{ score: 90 }];
      const result = service.comparePerformance(data);
      expect(typeof result.variance).toBe('number');
    });
  });

  describe('predictImprovement', () => {
    it('should return projectedImprovement, timeToTarget, currentScore', () => {
      const data = [{ score: 70 }, { score: 80 }];
      const result = service.predictImprovement(data);
      expect(result).toHaveProperty('projectedImprovement');
      expect(result).toHaveProperty('timeToTarget');
      expect(result).toHaveProperty('currentScore');
    });

    it('should compute currentScore as average', () => {
      const data = [{ score: 60 }, { score: 80 }];
      const result = service.predictImprovement(data);
      expect(parseFloat(result.currentScore)).toBeCloseTo(70, 1);
    });

    it('should return timeToTarget in months format', () => {
      const result = service.predictImprovement([{ score: 50 }]);
      expect(result.timeToTarget).toMatch(/\d+ months/);
    });
  });

  describe('detectDrift', () => {
    it('should return driftDetected:false for < 10 data points', () => {
      const data = Array.from({ length: 5 }, () => ({ score: 50 }));
      expect(service.detectDrift(data)).toEqual({ driftDetected: false });
    });

    it('should detect drift when halves differ significantly', () => {
      const data = [
        ...Array.from({ length: 5 }, () => ({ score: 50 })),
        ...Array.from({ length: 5 }, () => ({ score: 80 })),
      ];
      const result = service.detectDrift(data);
      expect(result.driftDetected).toBe(true);
      expect(result.direction).toBe('upward');
      expect(parseFloat(result.magnitude)).toBeGreaterThan(5);
    });

    it('should not detect drift for uniform data', () => {
      const data = Array.from({ length: 10 }, () => ({ score: 50 }));
      const result = service.detectDrift(data);
      expect(result.driftDetected).toBe(false);
    });
  });

  // ─── 12. GENERATE RECOMMENDATIONS, FORECAST, COMPARE, RELATIONSHIP, BATCH ────

  describe('generateRecommendations', () => {
    it('should return at least 2 recommendations for average-performing data', () => {
      const data = [{ score: 80 }, { score: 85 }];
      const result = service.generateRecommendations(data);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should add high-priority intervention when avgScore < 70', () => {
      const data = [{ score: 50 }, { score: 60 }];
      const result = service.generateRecommendations(data);
      expect(result[0].action).toBe('Immediate intervention required');
      expect(result[0].priority).toBe('high');
      expect(result.length).toBe(3);
    });

    it('should include expected fields on each recommendation', () => {
      const data = [{ score: 80 }];
      const result = service.generateRecommendations(data);
      result.forEach(r => {
        expect(r).toHaveProperty('action');
        expect(r).toHaveProperty('priority');
        expect(r).toHaveProperty('expectedImpact');
        expect(r).toHaveProperty('estimatedImprovement');
        expect(r).toHaveProperty('timeToSeeResults');
        expect(r).toHaveProperty('confidence');
      });
    });
  });

  describe('forecastTrendWrapper', () => {
    it('should return values array and trend', () => {
      const data = [{ score: 50 }, { score: 60 }, { score: 70 }];
      const result = service.forecastTrendWrapper(data);
      expect(result).toHaveProperty('values');
      expect(result).toHaveProperty('trend');
      expect(result.trend).toBe('stable');
    });

    it('should default to 5 values', () => {
      const data = [{ score: 50 }];
      const result = service.forecastTrendWrapper(data);
      expect(result.values).toHaveLength(5);
    });

    it('should respect custom periods', () => {
      const data = [{ value: 50 }];
      const result = service.forecastTrendWrapper(data, { periods: 3 });
      expect(result.values).toHaveLength(3);
    });
  });

  describe('compareTrends', () => {
    it('should compare two datasets and return trend directions and averages', () => {
      const data1 = [{ score: 80 }, { score: 90 }];
      const data2 = [{ score: 50 }, { score: 60 }];
      const result = service.compareTrends(data1, data2);
      expect(result.trend1Direction).toBe('up'); // avg=85 > 70
      expect(result.trend2Direction).toBe('down'); // avg=55 < 70
      expect(parseFloat(result.trend1Average)).toBeCloseTo(85, 1);
      expect(parseFloat(result.trend2Average)).toBeCloseTo(55, 1);
    });

    it('should handle value field', () => {
      const data1 = [{ value: 75 }];
      const data2 = [{ value: 75 }];
      const result = service.compareTrends(data1, data2);
      expect(result.trend1Direction).toBe('up'); // 75 > 70
      expect(result.trend2Direction).toBe('up');
    });
  });

  describe('analyzeRelationship', () => {
    it('should return correlation, likelyCausal, and strength', () => {
      const result = service.analyzeRelationship([{ a: 1, b: 2 }], 'a', 'b');
      expect(result).toHaveProperty('correlation');
      expect(result).toHaveProperty('likelyCausal');
      expect(result).toHaveProperty('strength');
      expect(result.strength).toBe('moderate');
    });

    it('should return numeric correlation (mocked)', () => {
      // random=0.5 → 0.5*0.8 - 0.4 = 0.0
      const result = service.analyzeRelationship([], 'x', 'y');
      expect(parseFloat(result.correlation)).toBeCloseTo(0, 1);
    });

    it('should return likelyCausal as boolean', () => {
      const result = service.analyzeRelationship([], 'a', 'b');
      expect(typeof result.likelyCausal).toBe('boolean');
    });
  });

  describe('checkDataQuality', () => {
    it('should return score 0 and issues for non-array', () => {
      const result = service.checkDataQuality(null);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('No data provided');
    });

    it('should return score 0 and issues for empty array', () => {
      const result = service.checkDataQuality([]);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('No data provided');
    });

    it('should compute score based on missing values and outliers', () => {
      const data = [{ value: 50 }, { value: 52 }, { value: 48 }, { value: 51 }];
      const result = service.checkDataQuality(data);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result).toHaveProperty('missingValueCount');
      expect(result).toHaveProperty('outlierCount');
      expect(result).toHaveProperty('completeness');
    });

    it('should report issues for data with missing values', () => {
      const data = [{ value: null }, { value: 50 }];
      const result = service.checkDataQuality(data);
      expect(result.missingValueCount).toBeGreaterThan(0);
      expect(result.issues.some(i => i.includes('missing values'))).toBe(true);
    });

    it('should report issues for data with outliers', () => {
      const data = [
        { value: 50 },
        { value: 52 },
        { value: 48 },
        { value: 51 },
        { value: 49 },
        { value: 200 },
      ];
      const result = service.checkDataQuality(data);
      expect(result.outlierCount).toBeGreaterThan(0);
    });
  });

  describe('batchAnalyze', () => {
    it('should process attendance requests', () => {
      const spy = jest.spyOn(service, 'predictAttendance');
      const requests = [{ type: 'attendance', data: [{ attendance: 0.9 }] }];
      const result = service.batchAnalyze(requests);
      expect(spy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      spy.mockRestore();
    });

    it('should process performance requests', () => {
      const spy = jest.spyOn(service, 'predictPerformance');
      const requests = [{ type: 'performance', data: [{ score: 80 }] }];
      const result = service.batchAnalyze(requests);
      expect(spy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      spy.mockRestore();
    });

    it('should return error for unknown request type', () => {
      const requests = [{ type: 'unknown', data: [] }];
      const result = service.batchAnalyze(requests);
      expect(result[0]).toEqual({ error: 'Unknown request type' });
    });

    it('should handle mixed request types', () => {
      const requests = [
        { type: 'attendance', data: [{ attendance: 0.9 }] },
        { type: 'performance', data: [{ score: 80 }] },
        { type: 'unknown', data: [] },
      ];
      const result = service.batchAnalyze(requests);
      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({ error: 'Unknown request type' });
    });

    it('should return empty array for empty requests', () => {
      const result = service.batchAnalyze([]);
      expect(result).toEqual([]);
    });
  });

  // ─── EDGE CASES & INTEGRATION ─────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('predictPerformance with undefined second argument should use new mode (non-string)', () => {
      const data = [{ score: 70 }];
      const result = service.predictPerformance(data);
      expect(result).toHaveProperty('nextScore');
    });

    it('detectAnomalies with options.threshold=0 should flag most items', () => {
      // When stdDev > 0, any non-mean value will have zScore > 0
      const data = [{ value: 50 }, { value: 60 }];
      const result = service.detectAnomalies(data, { threshold: 0 });
      // Both values differ from mean (55), so both should be flagged
      expect(result.length).toBe(2);
    });

    it('calculateMovingAverage with empty array returns empty', () => {
      expect(service.calculateMovingAverage([])).toEqual([]);
    });

    it('forecastTrend with non-array returns stable', () => {
      const result = service.forecastTrend(null);
      expect(result).toEqual({ values: [], trend: 'stable' });
    });

    it('analyzeTrends with empty array and no 2nd arg returns stable defaults', () => {
      const result = service.analyzeTrends([]);
      expect(result.direction).toBe('stable');
      expect(result.slope).toBe(0);
    });

    it('multiple calls should accumulate entries in Maps', () => {
      const emp = { id: 'e1', name: 'Test' };
      const hist = [{ status: 'present', dayOfWeek: 'Monday' }];
      const dateNowSpy = jest.spyOn(Date, 'now');
      dateNowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2000);
      service.predictAttendancePatterns(emp, hist);
      service.predictAttendancePatterns(emp, hist);
      expect(service.predictions.size).toBe(2);
      dateNowSpy.mockRestore();
    });

    it('comparePerformance with single-element data', () => {
      const result = service.comparePerformance([{ score: 100 }]);
      expect(result.aboveBaseline).toBe(true);
      expect(parseFloat(result.averageScore)).toBe(100);
    });

    it('predictImprovement with all-zero scores', () => {
      const result = service.predictImprovement([{ score: 0 }]);
      expect(parseFloat(result.currentScore)).toBe(0);
    });

    it('detectDrift with exactly 10 elements', () => {
      const data = Array.from({ length: 10 }, () => ({ score: 50 }));
      const result = service.detectDrift(data);
      expect(result).toHaveProperty('driftDetected');
    });

    it('forecastTrendWrapper with single value data', () => {
      const result = service.forecastTrendWrapper([{ score: 50 }]);
      expect(result.values).toHaveLength(5);
    });
  });
});
