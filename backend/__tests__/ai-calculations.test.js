/**
 * AI & Predictive Analytics Calculations Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
 */

'use strict';

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
} = require('../services/ai/aiCalculations.service');

// ========================================
// AI_CONSTANTS
// ========================================
describe('AI_CONSTANTS', () => {
  test('مستويات الخطر موجودة', () => {
    expect(AI_CONSTANTS.DROPOUT_RISK_LEVELS.LOW).toBe('low');
    expect(AI_CONSTANTS.DROPOUT_RISK_LEVELS.CRITICAL).toBe('critical');
  });

  test('حدود الثقة صحيحة', () => {
    expect(AI_CONSTANTS.CONFIDENCE_LEVELS.HIGH).toBeGreaterThan(
      AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM
    );
    expect(AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM).toBeGreaterThan(
      AI_CONSTANTS.CONFIDENCE_LEVELS.LOW
    );
  });

  test('عوامل التسرب مجموعها 1', () => {
    const total = Object.values(AI_CONSTANTS.DROPOUT_FACTORS).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  test('فترات التنبؤ تصاعدية', () => {
    expect(AI_CONSTANTS.PREDICTION_HORIZONS.SHORT).toBeLessThan(
      AI_CONSTANTS.PREDICTION_HORIZONS.MEDIUM
    );
    expect(AI_CONSTANTS.PREDICTION_HORIZONS.MEDIUM).toBeLessThan(
      AI_CONSTANTS.PREDICTION_HORIZONS.LONG
    );
  });
});

// ========================================
// predictDropoutRisk
// ========================================
describe('predictDropoutRisk', () => {
  test('حضور مرتفع وتقدم جيد → خطر منخفض', () => {
    const result = predictDropoutRisk({
      attendanceRate: 95,
      progressRate: 30,
      familyEngagement: 80,
      satisfactionScore: 85,
    });
    expect(result.riskScore).toBeLessThan(30);
    expect(result.riskLevel).toBe('low');
  });

  test('حضور منخفض جداً → خطر حرج', () => {
    const result = predictDropoutRisk({
      attendanceRate: 40,
      progressRate: 5,
      familyEngagement: 20,
      hasPaymentDelay: true,
      hasTransportIssues: true,
      satisfactionScore: 30,
      consecutiveCancellations: 4,
    });
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.riskLevel).toBe('critical');
  });

  test('توصية تدخل عاجل عند خطر حرج', () => {
    const result = predictDropoutRisk({
      attendanceRate: 30,
      progressRate: 2,
      familyEngagement: 10,
    });
    const criticalRec = result.recommendations.find(r => r.type === 'urgent_intervention');
    expect(criticalRec).toBeDefined();
  });

  test('null → خطر منخفض افتراضي', () => {
    const result = predictDropoutRisk(null);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  test('تأخر دفع يضيف للخطر', () => {
    const without = predictDropoutRisk({ attendanceRate: 80, progressRate: 20 });
    const withDelay = predictDropoutRisk({
      attendanceRate: 80,
      progressRate: 20,
      hasPaymentDelay: true,
    });
    expect(withDelay.riskScore).toBeGreaterThan(without.riskScore);
  });

  test('توصية مشاركة الأسرة عند ضعفها', () => {
    const result = predictDropoutRisk({ attendanceRate: 70, familyEngagement: 20 });
    const familyRec = result.recommendations.find(r => r.type === 'family_counseling');
    expect(familyRec).toBeDefined();
  });

  test('العوامل مرتبة تنازلياً حسب الوزن', () => {
    const result = predictDropoutRisk({
      attendanceRate: 30,
      progressRate: 5,
      familyEngagement: 10,
    });
    for (let i = 1; i < result.factors.length; i++) {
      expect(result.factors[i - 1].weight).toBeGreaterThanOrEqual(result.factors[i].weight);
    }
  });

  test('رضا منخفض يضيف للخطر', () => {
    const result = predictDropoutRisk({ satisfactionScore: 30 });
    expect(result.riskScore).toBeGreaterThan(0);
  });
});

// ========================================
// predictProgressTrajectory
// ========================================
describe('predictProgressTrajectory', () => {
  test('بيانات غير كافية → insufficient_data', () => {
    const result = predictProgressTrajectory([{ date: '2026-01-01', score: 50, maxScore: 100 }]);
    expect(result.trajectory).toBe('insufficient_data');
    expect(result.predictedScore).toBeNull();
  });

  test('تحسن مستمر → steady_improvement', () => {
    const scores = [
      { date: '2025-01-01', score: 30, maxScore: 100 },
      { date: '2025-07-01', score: 50, maxScore: 100 },
      { date: '2026-01-01', score: 70, maxScore: 100 },
    ];
    const result = predictProgressTrajectory(scores, 12);
    expect(['steady_improvement', 'accelerating']).toContain(result.trajectory);
    expect(result.predictedScore).toBeGreaterThan(70);
  });

  test('تراجع → declining', () => {
    const scores = [
      { date: '2025-01-01', score: 80, maxScore: 100 },
      { date: '2025-07-01', score: 60, maxScore: 100 },
      { date: '2026-01-01', score: 40, maxScore: 100 },
    ];
    const result = predictProgressTrajectory(scores, 12);
    expect(result.trajectory).toBe('declining');
  });

  test('استقرار → plateau', () => {
    const scores = [
      { date: '2025-01-01', score: 60, maxScore: 100 },
      { date: '2025-07-01', score: 61, maxScore: 100 },
      { date: '2026-01-01', score: 62, maxScore: 100 },
    ];
    const result = predictProgressTrajectory(scores, 12);
    expect(result.trajectory).toBe('plateau');
  });

  test('الثقة تزيد مع عدد النقاط', () => {
    const makeScores = n =>
      Array.from({ length: n }, (_, i) => ({
        date: `2025-${String(i + 1).padStart(2, '0')}-01`,
        score: 30 + i * 5,
        maxScore: 100,
      }));
    const few = predictProgressTrajectory(makeScores(3), 4);
    const many = predictProgressTrajectory(makeScores(8), 4);
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  test('null → insufficient_data', () => {
    const result = predictProgressTrajectory(null);
    expect(result.trajectory).toBe('insufficient_data');
  });

  test('expectedLevel محسوب', () => {
    const scores = [
      { date: '2025-01-01', score: 70, maxScore: 100 },
      { date: '2026-01-01', score: 85, maxScore: 100 },
    ];
    const result = predictProgressTrajectory(scores, 4);
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.expectedLevel);
  });
});

// ========================================
// calculateTherapistCompatibility
// ========================================
describe('calculateTherapistCompatibility', () => {
  test('تطابق تخصص ABA مع توحد → درجة عالية', () => {
    const therapist = {
      specialization: 'aba',
      experienceWithSimilarCases: 40,
      successRateWithDiagnosis: 90,
    };
    const beneficiary = { diagnosisType: 'autism', age: 5 };
    const result = calculateTherapistCompatibility(therapist, beneficiary);
    expect(result.compatibilityScore).toBeGreaterThan(50);
    expect(result.isRecommended).toBe(true);
  });

  test('تخصص غير مناسب → درجة منخفضة', () => {
    const therapist = { specialization: 'pt', successRateWithDiagnosis: 50 };
    const beneficiary = { diagnosisType: 'autism' };
    const result = calculateTherapistCompatibility(therapist, beneficiary);
    // pt لديه تطابق جزئي مع autism
    expect(result.compatibilityScore).toBeLessThan(70);
  });

  test('null → درجة 0', () => {
    const result = calculateTherapistCompatibility(null, null);
    expect(result.compatibilityScore).toBe(0);
    expect(result.isRecommended).toBe(false);
  });

  test('معالجة أنثى لطفل < 6 سنوات → نقاط إضافية', () => {
    const female = { specialization: 'speech', gender: 'female', successRateWithDiagnosis: 70 };
    const male = { specialization: 'speech', gender: 'male', successRateWithDiagnosis: 70 };
    const child = { diagnosisType: 'autism', age: 4 };
    const femaleResult = calculateTherapistCompatibility(female, child);
    const maleResult = calculateTherapistCompatibility(male, child);
    expect(femaleResult.compatibilityScore).toBeGreaterThan(maleResult.compatibilityScore);
  });

  test('خبرة عالية تزيد الدرجة', () => {
    const lowExp = { specialization: 'aba', experienceWithSimilarCases: 10 };
    const highExp = { specialization: 'aba', experienceWithSimilarCases: 50 };
    const beneficiary = { diagnosisType: 'autism' };
    expect(
      calculateTherapistCompatibility(highExp, beneficiary).compatibilityScore
    ).toBeGreaterThan(calculateTherapistCompatibility(lowExp, beneficiary).compatibilityScore);
  });

  test('matchLevel محدد', () => {
    const therapist = {
      specialization: 'aba',
      experienceWithSimilarCases: 50,
      successRateWithDiagnosis: 95,
    };
    const beneficiary = { diagnosisType: 'autism', age: 4 };
    const result = calculateTherapistCompatibility(therapist, beneficiary);
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.matchLevel);
  });
});

// ========================================
// rankTherapistsForBeneficiary
// ========================================
describe('rankTherapistsForBeneficiary', () => {
  test('ترتيب معالجين حسب التوافق', () => {
    const therapists = [
      { id: 't1', specialization: 'pt', successRateWithDiagnosis: 50 },
      {
        id: 't2',
        specialization: 'aba',
        experienceWithSimilarCases: 40,
        successRateWithDiagnosis: 90,
      },
    ];
    const beneficiary = { diagnosisType: 'autism', age: 4 };
    const result = rankTherapistsForBeneficiary(therapists, beneficiary);
    expect(result[0].id).toBe('t2');
  });

  test('مصفوفة فارغة → فارغة', () => {
    expect(rankTherapistsForBeneficiary([], { diagnosisType: 'autism' })).toHaveLength(0);
  });

  test('كل معالج له compatibility', () => {
    const therapists = [{ id: 't1', specialization: 'speech' }];
    const result = rankTherapistsForBeneficiary(therapists, { diagnosisType: 'autism' });
    expect(result[0].compatibility).toBeDefined();
    expect(result[0].compatibility.compatibilityScore).toBeGreaterThanOrEqual(0);
  });
});

// ========================================
// forecastResourceDemand
// ========================================
describe('forecastResourceDemand', () => {
  test('بيانات أقل من 3 → لا توقعات', () => {
    const result = forecastResourceDemand([
      { month: '2025-01', sessions: 100, beneficiaries: 20 },
      { month: '2025-02', sessions: 110, beneficiaries: 22 },
    ]);
    expect(result.forecast).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  test('توقع 3 أشهر مستقبلية', () => {
    const data = [
      { month: '2025-01', sessions: 100, beneficiaries: 20 },
      { month: '2025-02', sessions: 110, beneficiaries: 22 },
      { month: '2025-03', sessions: 120, beneficiaries: 24 },
    ];
    const result = forecastResourceDemand(data, 3);
    expect(result.forecast).toHaveLength(3);
    expect(result.forecast[0].projectedSessions).toBeGreaterThan(0);
  });

  test('نمو موجب → توقع تصاعدي', () => {
    const data = [
      { sessions: 100, beneficiaries: 20 },
      { sessions: 120, beneficiaries: 24 },
      { sessions: 140, beneficiaries: 28 },
      { sessions: 160, beneficiaries: 32 },
    ];
    const result = forecastResourceDemand(data, 3);
    expect(result.growthRate).toBeGreaterThan(0);
    expect(result.forecast[2].projectedSessions).toBeGreaterThan(
      result.forecast[0].projectedSessions
    );
  });

  test('معالجون مطلوبون محسوب', () => {
    const data = [
      { sessions: 300, beneficiaries: 60 },
      { sessions: 310, beneficiaries: 62 },
      { sessions: 320, beneficiaries: 64 },
    ];
    const result = forecastResourceDemand(data, 1);
    expect(result.forecast[0].requiredTherapists).toBeGreaterThan(0);
  });

  test('peakMonth محدد', () => {
    const data = [
      { sessions: 100, beneficiaries: 20 },
      { sessions: 120, beneficiaries: 24 },
      { sessions: 140, beneficiaries: 28 },
    ];
    const result = forecastResourceDemand(data, 3);
    expect(result.peakMonth).not.toBeNull();
    expect(result.peakMonth.monthOffset).toBeGreaterThan(0);
  });
});

// ========================================
// detectAnomalies
// ========================================
describe('detectAnomalies', () => {
  test('بيانات أقل من 5 → لا شذوذ', () => {
    const result = detectAnomalies([{ value: 50 }, { value: 55 }, { value: 52 }]);
    expect(result.anomalies).toHaveLength(0);
    expect(result.hasAnomalies).toBe(false);
  });

  test('قيمة شاذة واضحة → مكتشفة', () => {
    const normal = Array(8)
      .fill(null)
      .map((_, i) => ({ value: 50 + i, date: `2025-${i + 1}-01` }));
    const withSpike = [...normal, { value: 200, date: '2025-09-01' }];
    const result = detectAnomalies(withSpike);
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies[0].type).toBe('unusually_high');
  });

  test('قيمة منخفضة شاذة', () => {
    const data = [
      { value: 80 },
      { value: 82 },
      { value: 79 },
      { value: 81 },
      { value: 80 },
      { value: 5 }, // شاذ
    ];
    const result = detectAnomalies(data);
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies[0].type).toBe('unusually_low');
  });

  test('إحصاءات محسوبة', () => {
    const data = Array(10)
      .fill(null)
      .map((_, i) => ({ value: 50 + i }));
    const result = detectAnomalies(data);
    expect(result.stats).not.toBeNull();
    expect(result.stats.mean).toBeDefined();
    expect(result.stats.stdDev).toBeDefined();
  });

  test('لا شذوذ في بيانات متجانسة', () => {
    const data = Array(10).fill({ value: 50 });
    const result = detectAnomalies(data);
    expect(result.hasAnomalies).toBe(false);
  });
});

// ========================================
// recommendOptimalSchedule
// ========================================
describe('recommendOptimalSchedule', () => {
  test('يوم الاثنين الأفضل → في النتائج', () => {
    const data = {
      byDay: { sunday: 60, monday: 90, tuesday: 75, wednesday: 65 },
      byTime: { '09:00': 85, '14:00': 70 },
      currentAvgScore: 70,
    };
    const result = recommendOptimalSchedule(data);
    expect(result.optimalDays[0].day).toBe('monday');
    expect(result.optimalTimes.length).toBeLessThanOrEqual(2);
  });

  test('تحسن متوقع > 5 → توصية بإعادة الجدولة', () => {
    const data = {
      byDay: { monday: 90 },
      currentAvgScore: 60,
    };
    const result = recommendOptimalSchedule(data);
    expect(result.expectedImprovement).toBeGreaterThan(5);
    expect(result.recommendation).toContain('إعادة جدولة');
  });

  test('لا فرق في الأداء → الجدول مناسب', () => {
    const data = {
      byDay: { sunday: 60, monday: 62 },
      currentAvgScore: 60,
    };
    const result = recommendOptimalSchedule(data);
    expect(result.recommendation).toContain('مناسب');
  });

  test('null → قيم افتراضية', () => {
    const result = recommendOptimalSchedule(null);
    expect(result.optimalDays).toHaveLength(0);
    expect(result.expectedImprovement).toBe(0);
  });
});

// ========================================
// predictOutcome
// ========================================
describe('predictOutcome', () => {
  test('تدخل مبكر + خفيف + مكثف → excellent', () => {
    const result = predictOutcome(
      { age: 2, severity: 'mild', familyCommitmentLevel: 90 },
      { weeklyHours: 25, servicesCount: 4 }
    );
    expect(result.predictedOutcome).toBe('excellent');
    expect(result.probability).toBeGreaterThanOrEqual(80);
  });

  test('تأخر في التدخل + شديد + التزام منخفض → limited/fair', () => {
    const result = predictOutcome(
      { age: 15, severity: 'severe', familyCommitmentLevel: 20 },
      { weeklyHours: 3, servicesCount: 1 }
    );
    expect(['limited', 'fair']).toContain(result.predictedOutcome);
  });

  test('null → unknown', () => {
    const result = predictOutcome(null, null);
    expect(result.predictedOutcome).toBe('unknown');
    expect(result.probability).toBe(0);
  });

  test('العوامل الرئيسية مرتبة بالتأثير', () => {
    const result = predictOutcome(
      { age: 3, severity: 'severe', familyCommitmentLevel: 90 },
      { weeklyHours: 20, servicesCount: 3 }
    );
    for (let i = 1; i < result.keyFactors.length; i++) {
      expect(Math.abs(result.keyFactors[i - 1].impact)).toBeGreaterThanOrEqual(
        Math.abs(result.keyFactors[i].impact)
      );
    }
  });

  test('توصية إيجابية عند نتيجة جيدة', () => {
    const result = predictOutcome(
      { age: 3, severity: 'mild', familyCommitmentLevel: 90 },
      { weeklyHours: 25, servicesCount: 4 }
    );
    expect(result.recommendation).toContain('استمر');
  });
});

// ========================================
// analyzeCohort
// ========================================
describe('analyzeCohort', () => {
  test('مجموعة متنوعة → شرائح صحيحة', () => {
    const cohort = [
      { id: 'b1', progressRate: 25, attendanceRate: 90, dropoutRisk: 10 },
      { id: 'b2', progressRate: 15, attendanceRate: 80, dropoutRisk: 30 },
      { id: 'b3', progressRate: 5, attendanceRate: 60, dropoutRisk: 60 },
      { id: 'b4', progressRate: -5, attendanceRate: 40, dropoutRisk: 80 },
    ];
    const result = analyzeCohort(cohort);
    expect(result.segments.highProgress).toBe(1);
    expect(result.segments.declining).toBe(1);
    expect(result.segments.atRisk).toBe(2);
  });

  test('تنبيه عند وجود متراجعين', () => {
    const cohort = [
      { progressRate: -10, attendanceRate: 50, dropoutRisk: 20 },
      { progressRate: 20, attendanceRate: 90, dropoutRisk: 10 },
    ];
    const result = analyzeCohort(cohort);
    const alert = result.insights.find(i => i.type === 'alert');
    expect(alert).toBeDefined();
  });

  test('رؤية إيجابية عند 50% أو أكثر بتقدم عالٍ', () => {
    const cohort = [
      { progressRate: 25, attendanceRate: 90, dropoutRisk: 10 },
      { progressRate: 30, attendanceRate: 95, dropoutRisk: 5 },
      { progressRate: 10, attendanceRate: 70, dropoutRisk: 20 },
    ];
    const result = analyzeCohort(cohort);
    const positive = result.insights.find(i => i.type === 'positive');
    expect(positive).toBeDefined();
  });

  test('مصفوفة فارغة → افتراضي', () => {
    const result = analyzeCohort([]);
    expect(result.segments).toHaveLength(0);
    expect(result.insights).toHaveLength(0);
  });

  test('إحصاءات محسوبة', () => {
    const cohort = [
      { progressRate: 20, attendanceRate: 80 },
      { progressRate: 40, attendanceRate: 90 },
    ];
    const result = analyzeCohort(cohort);
    expect(result.stats.avgProgress).toBe(30);
    expect(result.stats.avgAttendance).toBe(85);
  });
});

// ========================================
// generateSmartAlerts
// ========================================
describe('generateSmartAlerts', () => {
  test('لا بيانات → لا تنبيهات', () => {
    expect(generateSmartAlerts({})).toHaveLength(0);
    expect(generateSmartAlerts(null)).toHaveLength(0);
  });

  test('مستفيدون في خطر → تنبيه critical', () => {
    const alerts = generateSmartAlerts({ beneficiariesAtRisk: 10 });
    const alert = alerts.find(a => a.type === 'beneficiary_risk');
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('critical');
  });

  test('حضور منخفض → تنبيه', () => {
    const alerts = generateSmartAlerts({ overallAttendanceRate: 55 });
    const alert = alerts.find(a => a.type === 'attendance_drop');
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('critical');
  });

  test('التنبيهات مرتبة حسب الخطورة', () => {
    const alerts = generateSmartAlerts({
      beneficiariesAtRisk: 10,
      overallAttendanceRate: 55,
      overloadedTherapists: 2,
      waitlistSize: 25,
    });
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    for (let i = 1; i < alerts.length; i++) {
      expect(severityOrder[alerts[i - 1].severity] || 0).toBeGreaterThanOrEqual(
        severityOrder[alerts[i].severity] || 0
      );
    }
  });

  test('قائمة انتظار طويلة جداً → تنبيه high', () => {
    const alerts = generateSmartAlerts({ waitlistSize: 60 });
    const alert = alerts.find(a => a.type === 'long_waitlist');
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('high');
  });

  test('معدل غياب مرتفع → تنبيه', () => {
    const alerts = generateSmartAlerts({ noShowRate: 25 });
    const alert = alerts.find(a => a.type === 'high_no_show');
    expect(alert).toBeDefined();
  });
});

// ========================================
// calculateSmartKPIs
// ========================================
describe('calculateSmartKPIs', () => {
  test('كل المؤشرات ممتازة → تقدير A', () => {
    const result = calculateSmartKPIs({
      goalAchievementRate: 95,
      retentionRate: 95,
      therapistUtilization: 85,
      collectionRate: 97,
      familySatisfactionScore: 95,
    });
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe('A');
  });

  test('كل المؤشرات صفر → تقدير F', () => {
    const result = calculateSmartKPIs({
      goalAchievementRate: 0,
      retentionRate: 0,
      therapistUtilization: 0,
      collectionRate: 0,
      familySatisfactionScore: 0,
    });
    expect(result.grade).toBe('F');
  });

  test('رؤى للمؤشرات دون الهدف', () => {
    const result = calculateSmartKPIs({
      goalAchievementRate: 50, // أقل من 70
      retentionRate: 90,
      collectionRate: 95,
    });
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights[0].area).toBe('clinicalOutcomes');
  });

  test('null → F', () => {
    const result = calculateSmartKPIs(null);
    expect(result.grade).toBe('F');
    expect(result.overallScore).toBe(0);
  });

  test('عدد المعايير المحققة محسوب', () => {
    const result = calculateSmartKPIs({
      goalAchievementRate: 80,
      retentionRate: 90,
      therapistUtilization: 80,
      collectionRate: 95,
      familySatisfactionScore: 85,
    });
    expect(result.benchmarksMet).toBe(5);
    expect(result.totalBenchmarks).toBe(5);
  });
});

// ========================================
// calculateMovingAverage
// ========================================
describe('calculateMovingAverage', () => {
  test('متوسط متحرك لمصفوفة بسيطة', () => {
    const result = calculateMovingAverage([10, 20, 30, 40, 50], 3);
    expect(result).toHaveLength(5);
    expect(result[2]).toBe(20); // (10+20+30)/3
    expect(result[4]).toBe(40); // (30+40+50)/3
  });

  test('نافذة = 1 → نفس القيم', () => {
    const values = [10, 20, 30];
    const result = calculateMovingAverage(values, 1);
    expect(result).toEqual([10, 20, 30]);
  });

  test('مصفوفة فارغة → فارغة', () => {
    expect(calculateMovingAverage([])).toHaveLength(0);
  });

  test('null → فارغ', () => {
    expect(calculateMovingAverage(null)).toHaveLength(0);
  });
});

// ========================================
// normalizeMetric
// ========================================
describe('normalizeMetric', () => {
  test('50 بين 0 و100 → 50%', () => {
    expect(normalizeMetric(50, 0, 100)).toBe(50);
  });

  test('قيمة أعلى من max → 100', () => {
    expect(normalizeMetric(120, 0, 100)).toBe(100);
  });

  test('قيمة أقل من min → 0', () => {
    expect(normalizeMetric(-10, 0, 100)).toBe(0);
  });

  test('max = min → 0', () => {
    expect(normalizeMetric(50, 50, 50)).toBe(0);
  });

  test('نطاق مخصص', () => {
    expect(normalizeMetric(30, 20, 40)).toBe(50);
  });
});

// ========================================
// calculateCorrelation
// ========================================
describe('calculateCorrelation', () => {
  test('ارتباط موجب تام → 1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(calculateCorrelation(x, y)).toBe(1);
  });

  test('ارتباط سالب تام → -1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    expect(calculateCorrelation(x, y)).toBe(-1);
  });

  test('لا ارتباط → قريب من 0', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 1, 4, 2, 3];
    const r = calculateCorrelation(x, y);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  test('طول مختلف → 0', () => {
    expect(calculateCorrelation([1, 2, 3], [1, 2])).toBe(0);
  });

  test('مصفوفة فارغة → 0', () => {
    expect(calculateCorrelation([], [])).toBe(0);
  });

  test('عنصر واحد → 0', () => {
    expect(calculateCorrelation([5], [5])).toBe(0);
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: نظام تنبيه ذكي شامل', () => {
    // 1. تقييم خطر التسرب
    const riskResult = predictDropoutRisk({
      attendanceRate: 55,
      progressRate: 8,
      familyEngagement: 25,
      satisfactionScore: 45,
      consecutiveCancellations: 2,
    });
    expect(['high', 'critical']).toContain(riskResult.riskLevel);

    // 2. توليد تنبيهات النظام
    const alerts = generateSmartAlerts({
      beneficiariesAtRisk: 5,
      overallAttendanceRate: 70,
      overloadedTherapists: 2,
    });
    expect(alerts.length).toBeGreaterThan(0);
    const firstAlert = alerts[0];
    expect(['critical', 'high']).toContain(firstAlert.severity);
  });

  test('سيناريو: مطابقة معالج ومستفيد وتوقع النتيجة', () => {
    const therapists = [
      {
        id: 't1',
        specialization: 'aba',
        experienceWithSimilarCases: 50,
        successRateWithDiagnosis: 90,
        gender: 'female',
      },
      {
        id: 't2',
        specialization: 'pt',
        experienceWithSimilarCases: 20,
        successRateWithDiagnosis: 60,
        gender: 'male',
      },
    ];
    const beneficiary = { diagnosisType: 'autism', age: 4 };

    const ranked = rankTherapistsForBeneficiary(therapists, beneficiary);
    expect(ranked[0].id).toBe('t1');

    // توقع النتيجة
    const outcome = predictOutcome(
      { age: 4, severity: 'moderate', familyCommitmentLevel: 75 },
      { weeklyHours: 15, servicesCount: 3 }
    );
    expect(['excellent', 'good', 'fair']).toContain(outcome.predictedOutcome);
  });

  test('سيناريو: تحليل مسار تقدم وكشف شذوذ', () => {
    const scores = [
      { date: '2025-01-01', score: 20, maxScore: 100 },
      { date: '2025-04-01', score: 35, maxScore: 100 },
      { date: '2025-07-01', score: 50, maxScore: 100 },
      { date: '2026-01-01', score: 65, maxScore: 100 },
    ];
    const trajectory = predictProgressTrajectory(scores, 12);
    expect(trajectory.trajectory).not.toBe('declining');
    expect(trajectory.predictedScore).toBeGreaterThan(65);

    // كشف شذوذ في بيانات الجلسات
    const sessionData = [
      ...Array(8)
        .fill(null)
        .map((_, i) => ({ value: 70 + i, date: `2025-${i + 1}-01` })),
      { value: 10, date: '2025-10-01' }, // شاذ
    ];
    const anomalies = detectAnomalies(sessionData);
    expect(anomalies.hasAnomalies).toBe(true);
  });

  test('سيناريو: توقع الطلب على الموارد وKPIs', () => {
    const demandData = [
      { sessions: 200, beneficiaries: 40 },
      { sessions: 220, beneficiaries: 44 },
      { sessions: 240, beneficiaries: 48 },
      { sessions: 260, beneficiaries: 52 },
      { sessions: 280, beneficiaries: 56 },
      { sessions: 300, beneficiaries: 60 },
    ];
    const forecast = forecastResourceDemand(demandData, 3);
    expect(forecast.forecast).toHaveLength(3);
    expect(forecast.confidence).toBe(0.85); // HIGH confidence for 6+ data points

    // KPIs
    const kpis = calculateSmartKPIs({
      goalAchievementRate: 75,
      retentionRate: 88,
      therapistUtilization: 82,
      collectionRate: 92,
      familySatisfactionScore: 85,
    });
    expect(['A', 'B', 'C']).toContain(kpis.grade);
    expect(kpis.benchmarksMet).toBeGreaterThan(0);
  });

  test('سيناريو: تحليل مجموعة ومتوسط متحرك', () => {
    const cohort = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `b${i}`,
        progressRate: i * 3,
        attendanceRate: 70 + i,
        dropoutRisk: i < 5 ? 60 : 20,
      }));

    const analysis = analyzeCohort(cohort);
    expect(analysis.stats.total).toBe(10);
    expect(analysis.segments.atRisk).toBeGreaterThan(0);

    // حساب الارتباط بين الحضور والتقدم
    const attendance = cohort.map(b => b.attendanceRate);
    const progress = cohort.map(b => b.progressRate);
    const correlation = calculateCorrelation(attendance, progress);
    expect(correlation).toBeGreaterThan(0.5); // ارتباط إيجابي قوي
  });
});
