/**
 * Unit tests for aiCalculations.service.js — AI & Predictive Analytics
 * Pure business logic — NO DB, NO side effects, NO mocks needed.
 */
const {
  AI_CONSTANTS,
  predictDropoutRisk,
  predictProgressTrajectory,
  calculateTherapistCompatibility,
  rankTherapistsForBeneficiary,
  forecastResourceDemand,
  detectAnomalies,
  recommendOptimalSchedule,
  predictOutcome,
  analyzeCohort,
  generateSmartAlerts,
  calculateSmartKPIs,
  calculateMovingAverage,
  normalizeMetric,
  calculateCorrelation,
} = require('../../services/ai/aiCalculations.service');

describe('aiCalculations.service', () => {
  /* ── AI_CONSTANTS ──────────────────────────────────────────────── */
  describe('AI_CONSTANTS', () => {
    test('exports dropout risk levels', () => {
      expect(AI_CONSTANTS.DROPOUT_RISK_LEVELS.LOW).toBe('low');
      expect(AI_CONSTANTS.DROPOUT_RISK_LEVELS.CRITICAL).toBe('critical');
    });

    test('exports confidence levels', () => {
      expect(AI_CONSTANTS.CONFIDENCE_LEVELS.HIGH).toBe(0.85);
      expect(AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM).toBe(0.7);
      expect(AI_CONSTANTS.CONFIDENCE_LEVELS.LOW).toBe(0.55);
    });

    test('exports recommendation types', () => {
      expect(AI_CONSTANTS.RECOMMENDATION_TYPES.REASSESSMENT).toBe('reassessment');
    });
  });

  /* ── predictDropoutRisk ────────────────────────────────────────── */
  describe('predictDropoutRisk', () => {
    test('returns low risk for healthy metrics', () => {
      const result = predictDropoutRisk({
        attendanceRate: 95,
        progressRate: 60,
        familyEngagement: 80,
        satisfactionScore: 90,
      });
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(30);
    });

    test('returns critical risk for bad metrics', () => {
      const result = predictDropoutRisk({
        attendanceRate: 30,
        progressRate: 5,
        familyEngagement: 10,
        hasPaymentDelay: true,
        hasTransportIssues: true,
        satisfactionScore: 20,
        consecutiveCancellations: 4,
      });
      expect(result.riskLevel).toBe('critical');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Critical should have urgent intervention
      expect(result.recommendations[0].type).toBe('urgent_intervention');
    });

    test('returns medium risk for moderate metrics', () => {
      const result = predictDropoutRisk({
        attendanceRate: 65,
        progressRate: 20,
        familyEngagement: 55,
      });
      expect(result.riskLevel).toBe('medium');
    });

    test('handles null/undefined input gracefully', () => {
      const result = predictDropoutRisk(null);
      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe('low');
    });

    test('factors are sorted by weight descending', () => {
      const result = predictDropoutRisk({ attendanceRate: 30, progressRate: 5 });
      for (let i = 1; i < result.factors.length; i++) {
        expect(result.factors[i - 1].weight).toBeGreaterThanOrEqual(result.factors[i].weight);
      }
    });

    test('caps risk score at 100', () => {
      const result = predictDropoutRisk({
        attendanceRate: 10,
        progressRate: 1,
        familyEngagement: 5,
        hasPaymentDelay: true,
        hasTransportIssues: true,
        satisfactionScore: 10,
        consecutiveCancellations: 5,
      });
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('includes confidence score', () => {
      const result = predictDropoutRisk({ attendanceRate: 60 });
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  /* ── predictProgressTrajectory ─────────────────────────────────── */
  describe('predictProgressTrajectory', () => {
    test('returns insufficient_data for < 2 points', () => {
      const result = predictProgressTrajectory([{ date: '2024-01-01', score: 50, maxScore: 100 }]);
      expect(result.trajectory).toBe('insufficient_data');
      expect(result.predictedScore).toBeNull();
    });

    test('predicts steady improvement', () => {
      const scores = [
        { date: '2024-01-01', score: 40, maxScore: 100 },
        { date: '2024-02-01', score: 50, maxScore: 100 },
        { date: '2024-03-01', score: 60, maxScore: 100 },
      ];
      const result = predictProgressTrajectory(scores, 4);
      expect(result.predictedScore).toBeGreaterThan(60);
      expect(result.trajectory).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.dataPoints).toBe(3);
    });

    test('detects declining trajectory', () => {
      const scores = [
        { date: '2024-01-01', score: 80, maxScore: 100 },
        { date: '2024-02-01', score: 60, maxScore: 100 },
        { date: '2024-03-01', score: 40, maxScore: 100 },
      ];
      const result = predictProgressTrajectory(scores, 4);
      expect(result.trajectory).toBe('declining');
    });

    test('clamps predicted score to 0-100', () => {
      const scores = [
        { date: '2024-01-01', score: 90, maxScore: 100 },
        { date: '2024-02-01', score: 95, maxScore: 100 },
        { date: '2024-03-01', score: 99, maxScore: 100 },
      ];
      const result = predictProgressTrajectory(scores, 52);
      expect(result.predictedScore).toBeLessThanOrEqual(100);
    });

    test('handles null input', () => {
      expect(predictProgressTrajectory(null).trajectory).toBe('insufficient_data');
    });

    test('includes expectedLevel classification', () => {
      const scores = [
        { date: '2024-01-01', score: 50, maxScore: 100 },
        { date: '2024-02-01', score: 55, maxScore: 100 },
      ];
      const result = predictProgressTrajectory(scores, 4);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.expectedLevel);
    });
  });

  /* ── calculateTherapistCompatibility ───────────────────────────── */
  describe('calculateTherapistCompatibility', () => {
    test('returns high compatibility for matching specialization', () => {
      const therapist = {
        specialization: 'speech',
        experienceWithSimilarCases: 50,
        successRateWithDiagnosis: 80,
        availableSlots: ['sun_am'],
      };
      const beneficiary = { diagnosisType: 'speech_language', preferredSlots: ['sun_am'] };
      const result = calculateTherapistCompatibility(therapist, beneficiary);
      expect(result.compatibilityScore).toBeGreaterThanOrEqual(60);
      expect(result.isRecommended).toBe(true);
    });

    test('returns low compatibility for mismatched specialization', () => {
      const therapist = {
        specialization: 'pt',
        experienceWithSimilarCases: 0,
        successRateWithDiagnosis: 20,
        availableSlots: [],
      };
      const beneficiary = { diagnosisType: 'autism', preferredSlots: ['thu_pm'] };
      const result = calculateTherapistCompatibility(therapist, beneficiary);
      expect(result.compatibilityScore).toBeLessThan(60);
    });

    test('handles null therapist', () => {
      expect(calculateTherapistCompatibility(null, {}).compatibilityScore).toBe(0);
    });

    test('handles null beneficiary', () => {
      expect(calculateTherapistCompatibility({}, null).compatibilityScore).toBe(0);
    });

    test('prefers female therapist for young children', () => {
      const female = {
        specialization: 'aba',
        gender: 'female',
        experienceWithSimilarCases: 0,
        successRateWithDiagnosis: 50,
      };
      const male = {
        specialization: 'aba',
        gender: 'male',
        experienceWithSimilarCases: 0,
        successRateWithDiagnosis: 50,
      };
      const child = { diagnosisType: 'autism', age: 4 };
      const fScore = calculateTherapistCompatibility(female, child).compatibilityScore;
      const mScore = calculateTherapistCompatibility(male, child).compatibilityScore;
      expect(fScore).toBeGreaterThan(mScore);
    });

    test('matchLevel reflects score range', () => {
      const t = {
        specialization: 'aba',
        experienceWithSimilarCases: 80,
        successRateWithDiagnosis: 90,
        availableSlots: ['sun_am'],
      };
      const b = { diagnosisType: 'autism', preferredSlots: ['sun_am'], age: 4 };
      const result = calculateTherapistCompatibility(t, b);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.matchLevel);
    });
  });

  /* ── rankTherapistsForBeneficiary ──────────────────────────────── */
  describe('rankTherapistsForBeneficiary', () => {
    test('sorts therapists by compatibility descending', () => {
      const therapists = [
        { specialization: 'pt', experienceWithSimilarCases: 10, successRateWithDiagnosis: 30 },
        { specialization: 'aba', experienceWithSimilarCases: 50, successRateWithDiagnosis: 80 },
      ];
      const beneficiary = { diagnosisType: 'autism' };
      const ranked = rankTherapistsForBeneficiary(therapists, beneficiary);
      expect(ranked[0].compatibility.compatibilityScore).toBeGreaterThanOrEqual(
        ranked[1].compatibility.compatibilityScore
      );
    });

    test('returns empty array for empty input', () => {
      expect(rankTherapistsForBeneficiary([], {})).toEqual([]);
    });
  });

  /* ── forecastResourceDemand ────────────────────────────────────── */
  describe('forecastResourceDemand', () => {
    test('returns forecast for sufficient data', () => {
      const historical = [
        { month: '2024-01', sessions: 100, beneficiaries: 20 },
        { month: '2024-02', sessions: 110, beneficiaries: 22 },
        { month: '2024-03', sessions: 120, beneficiaries: 24 },
      ];
      const result = forecastResourceDemand(historical, 3);
      expect(result.forecast).toHaveLength(3);
      expect(result.totalProjected).toBeGreaterThan(0);
      expect(result.peakMonth).toBeDefined();
    });

    test('returns empty forecast for insufficient data', () => {
      const result = forecastResourceDemand([{ month: '2024-01', sessions: 100 }]);
      expect(result.forecast).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    test('each forecast month has required fields', () => {
      const historical = [
        { month: '2024-01', sessions: 100, beneficiaries: 20 },
        { month: '2024-02', sessions: 110, beneficiaries: 22 },
        { month: '2024-03', sessions: 120, beneficiaries: 24 },
      ];
      const result = forecastResourceDemand(historical, 1);
      const m = result.forecast[0];
      expect(m.monthOffset).toBe(1);
      expect(m.projectedSessions).toBeGreaterThan(0);
      expect(m.projectedBeneficiaries).toBeGreaterThan(0);
      expect(m.requiredTherapists).toBeGreaterThan(0);
      expect(m.requiredRooms).toBeGreaterThan(0);
    });
  });

  /* ── detectAnomalies ───────────────────────────────────────────── */
  describe('detectAnomalies', () => {
    test('returns no anomalies for uniform data', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ value: 50, date: `2024-01-${i + 1}` }));
      const result = detectAnomalies(data);
      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies).toHaveLength(0);
    });

    test('detects outlier value', () => {
      const data = [
        { value: 50 },
        { value: 52 },
        { value: 48 },
        { value: 51 },
        { value: 49 },
        { value: 150 }, // outlier
      ];
      const result = detectAnomalies(data);
      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies[0].type).toBe('unusually_high');
    });

    test('returns empty for insufficient data', () => {
      const result = detectAnomalies([{ value: 1 }, { value: 2 }]);
      expect(result.anomalies).toHaveLength(0);
    });

    test('includes stats', () => {
      const data = Array.from({ length: 6 }, (_, i) => ({ value: 10 + i }));
      const result = detectAnomalies(data);
      expect(result.stats.mean).toBeDefined();
      expect(result.stats.stdDev).toBeDefined();
      expect(result.stats.count).toBe(6);
    });
  });

  /* ── recommendOptimalSchedule ──────────────────────────────────── */
  describe('recommendOptimalSchedule', () => {
    test('returns optimal days and times', () => {
      const perfData = {
        byDay: { Sun: 85, Mon: 70, Tue: 90, Wed: 60, Thu: 75 },
        byTime: { '09:00': 88, '11:00': 72, '14:00': 65 },
        currentAvgScore: 70,
      };
      const result = recommendOptimalSchedule(perfData);
      expect(result.optimalDays.length).toBeGreaterThan(0);
      expect(result.optimalDays.length).toBeLessThanOrEqual(3);
      expect(result.optimalTimes.length).toBeLessThanOrEqual(2);
      expect(result.expectedImprovement).toBeGreaterThanOrEqual(0);
    });

    test('handles null input', () => {
      const result = recommendOptimalSchedule(null);
      expect(result.optimalDays).toHaveLength(0);
      expect(result.expectedImprovement).toBe(0);
    });
  });

  /* ── predictOutcome ────────────────────────────────────────────── */
  describe('predictOutcome', () => {
    test('predicts excellent for ideal conditions', () => {
      const result = predictOutcome(
        { age: 2, severity: 'mild', familyCommitmentLevel: 90 },
        { weeklyHours: 25, servicesCount: 4 }
      );
      expect(result.predictedOutcome).toBe('excellent');
      expect(result.probability).toBeGreaterThanOrEqual(80);
    });

    test('predicts limited for poor conditions', () => {
      const result = predictOutcome(
        { age: 15, severity: 'severe', familyCommitmentLevel: 20 },
        { weeklyHours: 3, servicesCount: 1 }
      );
      expect(result.predictedOutcome).toBe('limited');
    });

    test('handles null inputs', () => {
      expect(predictOutcome(null, null).predictedOutcome).toBe('unknown');
    });

    test('includes key factors sorted by impact', () => {
      const result = predictOutcome({ age: 2, severity: 'mild' }, { weeklyHours: 25 });
      for (let i = 1; i < result.keyFactors.length; i++) {
        expect(Math.abs(result.keyFactors[i - 1].impact)).toBeGreaterThanOrEqual(
          Math.abs(result.keyFactors[i].impact)
        );
      }
    });
  });

  /* ── analyzeCohort ─────────────────────────────────────────────── */
  describe('analyzeCohort', () => {
    test('segments cohort correctly', () => {
      const cohort = [
        { progressRate: 25, attendanceRate: 90, dropoutRisk: 10 },
        { progressRate: 15, attendanceRate: 80, dropoutRisk: 20 },
        { progressRate: 5, attendanceRate: 60, dropoutRisk: 30 },
        { progressRate: -2, attendanceRate: 40, dropoutRisk: 70 },
      ];
      const result = analyzeCohort(cohort);
      expect(result.segments.highProgress).toBe(1);
      expect(result.segments.moderateProgress).toBe(1);
      expect(result.segments.lowProgress).toBe(1);
      expect(result.segments.declining).toBe(1);
      expect(result.segments.atRisk).toBe(1);
      expect(result.stats.total).toBe(4);
    });

    test('returns empty for empty array', () => {
      const result = analyzeCohort([]);
      expect(result.segments).toEqual([]);
    });

    test('generates insights for at-risk beneficiaries', () => {
      const cohort = [
        { progressRate: 25, attendanceRate: 90, dropoutRisk: 60 },
        { progressRate: -5, attendanceRate: 40, dropoutRisk: 80 },
      ];
      const result = analyzeCohort(cohort);
      const warnings = result.insights.filter(i => i.type === 'warning' || i.type === 'alert');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  /* ── generateSmartAlerts ───────────────────────────────────────── */
  describe('generateSmartAlerts', () => {
    test('generates alerts for concerning data', () => {
      const alerts = generateSmartAlerts({
        beneficiariesAtRisk: 8,
        overallAttendanceRate: 55,
        overloadedTherapists: 3,
        noShowRate: 25,
        waitlistSize: 60,
      });
      expect(alerts.length).toBeGreaterThan(0);
      // Should be sorted by severity
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      for (let i = 1; i < alerts.length; i++) {
        expect(severityOrder[alerts[i - 1].severity]).toBeGreaterThanOrEqual(
          severityOrder[alerts[i].severity]
        );
      }
    });

    test('returns empty for null input', () => {
      expect(generateSmartAlerts(null)).toEqual([]);
    });

    test('returns empty for healthy data', () => {
      const alerts = generateSmartAlerts({
        beneficiariesAtRisk: 0,
        overallAttendanceRate: 95,
        overloadedTherapists: 0,
        noShowRate: 5,
        waitlistSize: 5,
      });
      expect(alerts).toHaveLength(0);
    });
  });

  /* ── calculateSmartKPIs ────────────────────────────────────────── */
  describe('calculateSmartKPIs', () => {
    test('calculates grade A for excellent metrics', () => {
      const result = calculateSmartKPIs({
        goalAchievementRate: 95,
        retentionRate: 95,
        therapistUtilization: 85,
        collectionRate: 95,
        familySatisfactionScore: 95,
      });
      expect(result.grade).toBe('A');
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
    });

    test('calculates grade F for poor metrics', () => {
      const result = calculateSmartKPIs({
        goalAchievementRate: 10,
        retentionRate: 20,
        therapistUtilization: 10,
        collectionRate: 15,
        familySatisfactionScore: 10,
      });
      expect(result.grade).toBe('F');
    });

    test('handles null input', () => {
      const result = calculateSmartKPIs(null);
      expect(result.grade).toBe('F');
      expect(result.overallScore).toBe(0);
    });

    test('identifies below-target KPIs in insights', () => {
      const result = calculateSmartKPIs({
        goalAchievementRate: 40,
        retentionRate: 60,
        therapistUtilization: 85,
        collectionRate: 95,
        familySatisfactionScore: 50,
      });
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.benchmarksMet).toBeLessThan(result.totalBenchmarks);
    });
  });

  /* ── calculateMovingAverage ────────────────────────────────────── */
  describe('calculateMovingAverage', () => {
    test('calculates moving average correctly', () => {
      const result = calculateMovingAverage([10, 20, 30, 40], 3);
      expect(result).toHaveLength(4);
      expect(result[0]).toBe(10);
      expect(result[2]).toBe(20); // avg(10,20,30)
    });

    test('returns empty for empty input', () => {
      expect(calculateMovingAverage([])).toEqual([]);
    });
  });

  /* ── normalizeMetric ───────────────────────────────────────────── */
  describe('normalizeMetric', () => {
    test('normalizes to 0-100 range', () => {
      expect(normalizeMetric(50, 0, 100)).toBe(50);
      expect(normalizeMetric(0, 0, 100)).toBe(0);
      expect(normalizeMetric(100, 0, 100)).toBe(100);
    });

    test('clamps values outside range', () => {
      expect(normalizeMetric(-10, 0, 100)).toBe(0);
      expect(normalizeMetric(200, 0, 100)).toBe(100);
    });

    test('returns 0 for invalid range (max <= min)', () => {
      expect(normalizeMetric(50, 100, 100)).toBe(0);
    });
  });

  /* ── calculateCorrelation ──────────────────────────────────────── */
  describe('calculateCorrelation', () => {
    test('returns ~1 for perfect positive correlation', () => {
      const r = calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      expect(r).toBeCloseTo(1, 2);
    });

    test('returns ~-1 for perfect negative correlation', () => {
      const r = calculateCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
      expect(r).toBeCloseTo(-1, 2);
    });

    test('returns 0 for unrelated data', () => {
      // Use orthogonal data
      const r = calculateCorrelation([1, -1, 1, -1], [-1, 1, 1, -1]);
      expect(Math.abs(r)).toBeLessThan(0.5);
    });

    test('returns 0 for insufficient data', () => {
      expect(calculateCorrelation([1], [2])).toBe(0);
      expect(calculateCorrelation(null, null)).toBe(0);
    });

    test('returns 0 for different length arrays', () => {
      expect(calculateCorrelation([1, 2], [1, 2, 3])).toBe(0);
    });
  });
});
