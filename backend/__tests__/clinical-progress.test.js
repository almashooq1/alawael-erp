/**
 * اختبارات وحدة Clinical Progress & Quality Indicators
 * Pure Unit Tests - No HTTP, No DB
 */

'use strict';

const {
  DISABILITY_SEVERITY,
  SPECIALIZATIONS,
  GOAL_STATUS,
  SESSION_OUTCOME,
  QUALITY_THRESHOLDS,
  SCALE_RANGES,
  PROGRESS_WEIGHTS,
  validatePercentage,
  validatePositiveInteger,
  validateScaleScore,
  calculateAttendanceRate,
  calculateGoalAchievementRate,
  calculateTrialBasedProgress,
  calculateSessionQualityScore,
  calculateFunctionalImprovement,
  calculateOverallProgressIndex,
  calculateCenterKPIs,
  calculateTherapistOccupancy,
  stratifyBeneficiaries,
  generateProgressReport,
  getProgressRecommendation,
} = require('../services/clinical/clinicalProgress.service');

// ═══════════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════════
describe('الثوابت', () => {
  test('DISABILITY_SEVERITY يحتوي المستويات الصحيحة', () => {
    expect(DISABILITY_SEVERITY.MILD).toBe('mild');
    expect(DISABILITY_SEVERITY.MODERATE).toBe('moderate');
    expect(DISABILITY_SEVERITY.SEVERE).toBe('severe');
    expect(DISABILITY_SEVERITY.PROFOUND).toBe('profound');
  });
  test('GOAL_STATUS يحتوي الحالات الصحيحة', () => {
    expect(GOAL_STATUS.ACHIEVED).toBe('achieved');
    expect(GOAL_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(GOAL_STATUS.NOT_STARTED).toBe('not_started');
    expect(GOAL_STATUS.DISCONTINUED).toBe('discontinued');
  });
  test('SESSION_OUTCOME يحتوي النتائج الصحيحة', () => {
    expect(SESSION_OUTCOME.EXCELLENT).toBe('excellent');
    expect(SESSION_OUTCOME.NO_SHOW).toBe('no_show');
  });
  test('QUALITY_THRESHOLDS صحيحة', () => {
    expect(QUALITY_THRESHOLDS.ATTENDANCE_EXCELLENT).toBe(90);
    expect(QUALITY_THRESHOLDS.ATTENDANCE_GOOD).toBe(75);
    expect(QUALITY_THRESHOLDS.GOAL_ACHIEVEMENT_EXCELLENT).toBe(80);
  });
  test('SCALE_RANGES يحتوي المقاييس', () => {
    expect(SCALE_RANGES.BERG_BALANCE.min).toBe(0);
    expect(SCALE_RANGES.BERG_BALANCE.max).toBe(56);
    expect(SCALE_RANGES.FIM.min).toBe(18);
    expect(SCALE_RANGES.FIM.max).toBe(126);
  });
  test('PROGRESS_WEIGHTS مجموعها = 1', () => {
    const total = Object.values(PROGRESS_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(Math.abs(total - 1)).toBeLessThan(0.001);
  });
  test('SPECIALIZATIONS يحتوي الأنواع الصحيحة', () => {
    expect(SPECIALIZATIONS.PT).toBe('pt');
    expect(SPECIALIZATIONS.ABA).toBe('aba');
    expect(SPECIALIZATIONS.SPEECH).toBe('speech');
  });
});

// ═══════════════════════════════════════════════════════════════
// validatePercentage
// ═══════════════════════════════════════════════════════════════
describe('validatePercentage', () => {
  test('0 صحيح', () => expect(() => validatePercentage(0)).not.toThrow());
  test('100 صحيح', () => expect(() => validatePercentage(100)).not.toThrow());
  test('50.5 صحيح', () => expect(() => validatePercentage(50.5)).not.toThrow());
  test('-1 يُطلق خطأ', () => expect(() => validatePercentage(-1)).toThrow('0 و 100'));
  test('101 يُطلق خطأ', () => expect(() => validatePercentage(101)).toThrow('0 و 100'));
  test('NaN يُطلق خطأ', () => expect(() => validatePercentage(NaN)).toThrow('رقماً'));
  test('نص يُطلق خطأ', () => expect(() => validatePercentage('50')).toThrow('رقماً'));
});

// ═══════════════════════════════════════════════════════════════
// validatePositiveInteger
// ═══════════════════════════════════════════════════════════════
describe('validatePositiveInteger', () => {
  test('0 صحيح', () => expect(() => validatePositiveInteger(0)).not.toThrow());
  test('5 صحيح', () => expect(() => validatePositiveInteger(5)).not.toThrow());
  test('-1 يُطلق خطأ', () => expect(() => validatePositiveInteger(-1)).toThrow('صحيحاً غير سالب'));
  test('1.5 يُطلق خطأ', () =>
    expect(() => validatePositiveInteger(1.5)).toThrow('صحيحاً غير سالب'));
});

// ═══════════════════════════════════════════════════════════════
// validateScaleScore
// ═══════════════════════════════════════════════════════════════
describe('validateScaleScore', () => {
  test('BERG_BALANCE درجة 30 صحيحة', () => {
    expect(() => validateScaleScore(30, 'BERG_BALANCE')).not.toThrow();
  });
  test('BERG_BALANCE 0 (الحد الأدنى) صحيح', () => {
    expect(() => validateScaleScore(0, 'BERG_BALANCE')).not.toThrow();
  });
  test('BERG_BALANCE 56 (الحد الأقصى) صحيح', () => {
    expect(() => validateScaleScore(56, 'BERG_BALANCE')).not.toThrow();
  });
  test('BERG_BALANCE 57 يُطلق خطأ', () => {
    expect(() => validateScaleScore(57, 'BERG_BALANCE')).toThrow('بين 0 و 56');
  });
  test('مقياس غير معروف يُطلق خطأ', () => {
    expect(() => validateScaleScore(50, 'UNKNOWN')).toThrow('غير معروف');
  });
  test('نص يُطلق خطأ', () => {
    expect(() => validateScaleScore('30', 'BERG_BALANCE')).toThrow('رقماً');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateAttendanceRate
// ═══════════════════════════════════════════════════════════════
describe('calculateAttendanceRate - معدل الحضور', () => {
  test('18/20 = 90%', () => {
    const r = calculateAttendanceRate(18, 20);
    expect(r.rate).toBe(90);
    expect(r.rating).toBe('ممتاز');
  });
  test('15/20 = 75% جيد', () => {
    const r = calculateAttendanceRate(15, 20);
    expect(r.rate).toBe(75);
    expect(r.rating).toBe('جيد');
  });
  test('12/20 = 60% مقبول', () => {
    const r = calculateAttendanceRate(12, 20);
    expect(r.rate).toBe(60);
    expect(r.rating).toBe('مقبول');
  });
  test('10/20 = 50% يحتاج متابعة', () => {
    const r = calculateAttendanceRate(10, 20);
    expect(r.rate).toBe(50);
    expect(r.rating).toBe('يحتاج متابعة');
  });
  test('مع إلغاء من المركز: 18/(20-2) = 100%', () => {
    const r = calculateAttendanceRate(18, 20, 2);
    expect(r.rate).toBe(100);
    expect(r.effective).toBe(18);
  });
  test('جلسات فعلية = 0: rate = 0', () => {
    const r = calculateAttendanceRate(0, 5, 5);
    expect(r.rate).toBe(0);
    expect(r.rating).toBe('N/A');
  });
  test('جلسات محضورة > الفعلية يُطلق خطأ', () => {
    expect(() => calculateAttendanceRate(20, 18)).toThrow('لا يمكن أن يتجاوز');
  });
  test('إلغاء > إجمالي يُطلق خطأ', () => {
    expect(() => calculateAttendanceRate(5, 10, 15)).toThrow('لا يمكن أن يتجاوز');
  });
  test('قيمة سالبة تُطلق خطأ', () => {
    expect(() => calculateAttendanceRate(-1, 20)).toThrow('صحيحاً غير سالب');
  });
  test('result يحتوي جميع الحقول', () => {
    const r = calculateAttendanceRate(15, 20);
    expect(r).toHaveProperty('rate');
    expect(r).toHaveProperty('attended');
    expect(r).toHaveProperty('scheduled');
    expect(r).toHaveProperty('effective');
    expect(r).toHaveProperty('rating');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateGoalAchievementRate
// ═══════════════════════════════════════════════════════════════
describe('calculateGoalAchievementRate - تحقق الأهداف', () => {
  test('مصفوفة فارغة: achievementRate = 0', () => {
    const r = calculateGoalAchievementRate([]);
    expect(r.achievementRate).toBe(0);
    expect(r.rating).toBe('N/A');
  });
  test('4 أهداف محققة من 5 = 80% ممتاز', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'in_progress' },
    ];
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(80);
    expect(r.achievedGoals).toBe(4);
    expect(r.rating).toBe('ممتاز');
  });
  test('3/5 = 60% جيد', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'not_started' },
      { status: 'not_started' },
    ];
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(60);
    expect(r.rating).toBe('جيد');
  });
  test('الأهداف الموقوفة لا تُحسب في المقام', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'discontinued' },
      { status: 'discontinued' },
    ];
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(100); // 2/2 نشط
    expect(r.discontinuedGoals).toBe(2);
  });
  test('byStatus يجمع بشكل صحيح', () => {
    const goals = [{ status: 'achieved' }, { status: 'in_progress' }, { status: 'not_started' }];
    const r = calculateGoalAchievementRate(goals);
    expect(r.byStatus['achieved']).toBe(1);
    expect(r.byStatus['in_progress']).toBe(1);
    expect(r.byStatus['not_started']).toBe(1);
  });
  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => calculateGoalAchievementRate(null)).toThrow('مصفوفة');
  });
  test('2/10 = 20% يحتاج مراجعة', () => {
    const goals = Array(10)
      .fill(null)
      .map((_, i) => ({
        status: i < 2 ? 'achieved' : 'not_started',
      }));
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(20);
    expect(r.rating).toBe('يحتاج مراجعة');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateTrialBasedProgress
// ═══════════════════════════════════════════════════════════════
describe('calculateTrialBasedProgress - محاولات DTT', () => {
  test('8/10 صحيح = 80% = إتقان عند عتبة 80%', () => {
    const trials = [true, true, true, true, true, true, true, true, false, false];
    const r = calculateTrialBasedProgress(trials, 80);
    expect(r.successRate).toBe(80);
    expect(r.isMastered).toBe(true);
    expect(r.correctTrials).toBe(8);
    expect(r.errorTrials).toBe(2);
  });
  test('6/10 = 60% لم يُتقَن عند عتبة 80%', () => {
    const trials = [true, true, true, true, true, true, false, false, false, false];
    const r = calculateTrialBasedProgress(trials, 80);
    expect(r.successRate).toBe(60);
    expect(r.isMastered).toBe(false);
    expect(r.percentToMastery).toBe(75); // 60/80 = 75%
  });
  test('محاولات بإشارة P (مساعدة)', () => {
    const trials = [true, false, 'P', 'p', true];
    const r = calculateTrialBasedProgress(trials);
    expect(r.promptedTrials).toBe(2);
    expect(r.correctTrials).toBe(2);
    expect(r.errorTrials).toBe(1);
  });
  test('محاولات بالأرقام 1 و 0', () => {
    const trials = [1, 1, 1, 0, 0];
    const r = calculateTrialBasedProgress(trials, 60);
    expect(r.successRate).toBe(60);
    expect(r.isMastered).toBe(true);
  });
  test('100% = إتقان', () => {
    const trials = [true, true, true];
    const r = calculateTrialBasedProgress(trials);
    expect(r.isMastered).toBe(true);
    expect(r.percentToMastery).toBe(100);
  });
  test('مصفوفة فارغة تُطلق خطأ', () => {
    expect(() => calculateTrialBasedProgress([])).toThrow('غير فارغة');
  });
  test('عتبة > 100 تُطلق خطأ', () => {
    expect(() => calculateTrialBasedProgress([true], 110)).toThrow('0 و 100');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateSessionQualityScore
// ═══════════════════════════════════════════════════════════════
describe('calculateSessionQualityScore - جودة الجلسات', () => {
  test('مصفوفة فارغة: averageScore = 0', () => {
    const r = calculateSessionQualityScore([]);
    expect(r.averageScore).toBe(0);
    expect(r.overallRating).toBe('N/A');
  });
  test('جلسة واحدة ممتازة = 100', () => {
    const r = calculateSessionQualityScore([{ outcome: 'excellent' }]);
    expect(r.averageScore).toBe(100);
    expect(r.overallRating).toBe('ممتاز');
  });
  test('جلستان: excellent(100) + good(75) = 87.5', () => {
    const r = calculateSessionQualityScore([{ outcome: 'excellent' }, { outcome: 'good' }]);
    expect(r.averageScore).toBe(87.5);
  });
  test('no_show لا تُحسب في المتوسط', () => {
    const r = calculateSessionQualityScore([
      { outcome: 'excellent' }, // 100
      { outcome: 'no_show' }, // 0 ولا تُحسب
    ]);
    expect(r.completedSessions).toBe(1);
    expect(r.noShowSessions).toBe(1);
    expect(r.averageScore).toBe(100);
  });
  test('distribution يحسب التوزيع الصحيح', () => {
    const sessions = [{ outcome: 'excellent' }, { outcome: 'good' }, { outcome: 'excellent' }];
    const r = calculateSessionQualityScore(sessions);
    expect(r.distribution['excellent']).toBe(2);
    expect(r.distribution['good']).toBe(1);
  });
  test('متوسط منخفض = يحتاج تحسين', () => {
    const r = calculateSessionQualityScore([{ outcome: 'poor' }, { outcome: 'poor' }]);
    expect(r.averageScore).toBe(25);
    expect(r.overallRating).toBe('يحتاج تحسين');
  });
  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => calculateSessionQualityScore(null)).toThrow('مصفوفة');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateFunctionalImprovement
// ═══════════════════════════════════════════════════════════════
describe('calculateFunctionalImprovement - التحسن الوظيفي', () => {
  test('BERG: من 20 إلى 40 = تحسن 20 نقطة', () => {
    const r = calculateFunctionalImprovement(20, 40, 'BERG_BALANCE');
    expect(r.improvementPoints).toBe(20);
    expect(r.isImproved).toBe(true);
    expect(r.isDeterioration).toBe(false);
  });
  test('BERG: من 40 إلى 40 = ثبات', () => {
    const r = calculateFunctionalImprovement(40, 40, 'BERG_BALANCE');
    expect(r.isUnchanged).toBe(true);
    expect(r.improvementPoints).toBe(0);
  });
  test('BERG: من 40 إلى 30 = تراجع', () => {
    const r = calculateFunctionalImprovement(40, 30, 'BERG_BALANCE');
    expect(r.isDeterioration).toBe(true);
    expect(r.improvementPoints).toBe(-10);
  });
  test('improvementPercentage = 20/56 = 35.71%', () => {
    const r = calculateFunctionalImprovement(20, 40, 'BERG_BALANCE');
    expect(r.improvementPercentage).toBeCloseTo(35.71, 1);
  });
  test('normalizedBaseline صحيح: 20/56 ≈ 35.71%', () => {
    const r = calculateFunctionalImprovement(20, 40, 'BERG_BALANCE');
    expect(r.normalizedBaseline).toBeCloseTo(35.71, 1);
  });
  test('FIM: higherIsBetter = true (افتراضي)', () => {
    const r = calculateFunctionalImprovement(50, 80, 'FIM');
    expect(r.isImproved).toBe(true);
  });
  test('GMFCS: higherIsBetter = false (أقل = أفضل)', () => {
    const r = calculateFunctionalImprovement(4, 2, 'GMFCS', false);
    expect(r.isImproved).toBe(true);
    expect(r.improvementPoints).toBe(2);
  });
  test('درجة خارج النطاق تُطلق خطأ', () => {
    expect(() => calculateFunctionalImprovement(60, 40, 'BERG_BALANCE')).toThrow('بين 0 و 56');
  });
  test('result يحتوي scaleName وscaleFullName', () => {
    const r = calculateFunctionalImprovement(20, 30, 'BERG_BALANCE');
    expect(r.scaleName).toBe('BERG_BALANCE');
    expect(r.scaleFullName).toBe(SCALE_RANGES.BERG_BALANCE.name);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateOverallProgressIndex
// ═══════════════════════════════════════════════════════════════
describe('calculateOverallProgressIndex - المؤشر الشامل', () => {
  test('مؤشر ممتاز: 100% لكل المكونات = 100', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 100,
      attendanceRate: 100,
      sessionQualityScore: 100,
      functionalImprovementScore: 100,
    });
    expect(r.overallIndex).toBe(100);
    expect(r.progressCategory).toBe('تقدم ممتاز');
  });
  test('مؤشر صفر: 0% لكل المكونات = 0', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 0,
      attendanceRate: 0,
      sessionQualityScore: 0,
      functionalImprovementScore: 0,
    });
    expect(r.overallIndex).toBe(0);
    expect(r.progressCategory).toBe('يحتاج مراجعة شاملة');
  });
  test('حساب صحيح: goal=80, attendance=75, quality=70, func=60', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 80,
      attendanceRate: 75,
      sessionQualityScore: 70,
      functionalImprovementScore: 60,
    });
    // 80*0.35 + 75*0.25 + 70*0.25 + 60*0.15 = 28+18.75+17.5+9 = 73.25
    expect(r.overallIndex).toBeCloseTo(73.25, 1);
    expect(r.progressCategory).toBe('تقدم جيد');
  });
  test('تصنيف تقدم متوسط عند 50-65', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 55,
      attendanceRate: 55,
      sessionQualityScore: 55,
      functionalImprovementScore: 55,
    });
    expect(r.progressCategory).toBe('تقدم متوسط');
  });
  test('تصنيف تقدم محدود عند 35-50', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 40,
      attendanceRate: 40,
      sessionQualityScore: 40,
      functionalImprovementScore: 40,
    });
    expect(r.progressCategory).toBe('تقدم محدود');
  });
  test('components يحتوي جميع المكونات', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 70,
      attendanceRate: 80,
      sessionQualityScore: 75,
      functionalImprovementScore: 60,
    });
    expect(r.components).toHaveProperty('goalAchievement');
    expect(r.components).toHaveProperty('attendance');
    expect(r.components).toHaveProperty('sessionQuality');
    expect(r.components).toHaveProperty('functionalImprovement');
  });
  test('معاملات مخصصة صحيحة', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 100,
      attendanceRate: 0,
      sessionQualityScore: 0,
      functionalImprovementScore: 0,
      customWeights: {
        goal_achievement: 1,
        attendance_rate: 0,
        session_quality: 0,
        functional_improvement: 0,
      },
    });
    expect(r.overallIndex).toBe(100);
  });
  test('معاملات مخصصة مجموعها != 1 يُطلق خطأ', () => {
    expect(() =>
      calculateOverallProgressIndex({
        goalAchievementRate: 70,
        attendanceRate: 80,
        sessionQualityScore: 75,
        functionalImprovementScore: 60,
        customWeights: {
          goal_achievement: 0.5,
          attendance_rate: 0.5,
          session_quality: 0.5,
          functional_improvement: 0,
        },
      })
    ).toThrow('يساوي 1');
  });
  test('قيمة خارج 0-100 تُطلق خطأ', () => {
    expect(() =>
      calculateOverallProgressIndex({
        goalAchievementRate: 110,
        attendanceRate: 80,
        sessionQualityScore: 75,
        functionalImprovementScore: 60,
      })
    ).toThrow('0 و 100');
  });
  test('null يُطلق خطأ', () => {
    expect(() => calculateOverallProgressIndex(null)).toThrow('مطلوبة');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateTherapistOccupancy
// ═══════════════════════════════════════════════════════════════
describe('calculateTherapistOccupancy - إشغال المعالج', () => {
  test('8/10 = 80% إشغال', () => {
    const r = calculateTherapistOccupancy(8, 10, 10);
    expect(r.occupancyRate).toBe(80);
    expect(r.remainingCapacity).toBe(2);
  });
  test('10/10 = 100% - لا يُطلق خطأ', () => {
    const r = calculateTherapistOccupancy(10, 10, 10);
    expect(r.occupancyRate).toBe(100);
  });
  test('إشغال > 90% = isOverloaded', () => {
    const r = calculateTherapistOccupancy(10, 10, 10);
    expect(r.isOverloaded).toBe(true);
  });
  test('إشغال < 50% = isUnderUtilized', () => {
    const r = calculateTherapistOccupancy(4, 10, 10);
    expect(r.isUnderUtilized).toBe(true);
  });
  test('maxCapacity = 0 يُطلق خطأ', () => {
    expect(() => calculateTherapistOccupancy(0, 0, 0)).toThrow('صفراً');
  });
  test('جلسات > طاقة قصوى يُطلق خطأ', () => {
    expect(() => calculateTherapistOccupancy(15, 10, 10)).toThrow('لا يمكن أن تتجاوز');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateCenterKPIs
// ═══════════════════════════════════════════════════════════════
describe('calculateCenterKPIs - مؤشرات المركز', () => {
  const beneficiaries = [
    { attendanceRate: 90, goalAchievementRate: 85, overallProgressIndex: 80 },
    { attendanceRate: 70, goalAchievementRate: 60, overallProgressIndex: 60 },
    { attendanceRate: 50, goalAchievementRate: 30, overallProgressIndex: 25 },
  ];

  test('مصفوفة فارغة: جميع القيم 0', () => {
    const r = calculateCenterKPIs([]);
    expect(r.totalBeneficiaries).toBe(0);
    expect(r.averageAttendanceRate).toBe(0);
  });
  test('totalBeneficiaries صحيح', () => {
    const r = calculateCenterKPIs(beneficiaries);
    expect(r.totalBeneficiaries).toBe(3);
  });
  test('averageAttendanceRate = (90+70+50)/3 ≈ 70', () => {
    const r = calculateCenterKPIs(beneficiaries);
    expect(r.averageAttendanceRate).toBeCloseTo(70, 0);
  });
  test('dischargeReadyCount: من goalRate>=80 AND attendance>=75', () => {
    const r = calculateCenterKPIs(beneficiaries);
    expect(r.dischargeReadyCount).toBe(1); // المستفيد الأول فقط
  });
  test('needsReviewCount: من overallProgressIndex < 35', () => {
    const r = calculateCenterKPIs(beneficiaries);
    expect(r.needsReviewCount).toBe(1); // المستفيد الثالث (25)
  });
  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => calculateCenterKPIs(null)).toThrow('مصفوفة');
  });
  test('period يُمرَّر للنتيجة', () => {
    const r = calculateCenterKPIs(beneficiaries, '2025-Q1');
    expect(r.period).toBe('2025-Q1');
  });
});

// ═══════════════════════════════════════════════════════════════
// stratifyBeneficiaries
// ═══════════════════════════════════════════════════════════════
describe('stratifyBeneficiaries - تصنيف المستفيدين', () => {
  test('مستفيد ممتاز → ready_for_discharge', () => {
    const b = [{ overallProgressIndex: 80, attendanceRate: 85, goalAchievementRate: 85 }];
    const r = stratifyBeneficiaries(b);
    expect(r.summary.ready_for_discharge).toBe(1);
    expect(r.summary.high_intensity).toBe(0);
  });
  test('مستفيد ضعيف → high_intensity', () => {
    const b = [{ overallProgressIndex: 20, attendanceRate: 40, goalAchievementRate: 20 }];
    const r = stratifyBeneficiaries(b);
    expect(r.summary.high_intensity).toBe(1);
  });
  test('مستفيد متوسط → standard', () => {
    const b = [{ overallProgressIndex: 45, attendanceRate: 65, goalAchievementRate: 40 }];
    const r = stratifyBeneficiaries(b);
    expect(r.summary.standard).toBe(1);
  });
  test('مستفيد صيانة → maintenance', () => {
    const b = [{ overallProgressIndex: 55, attendanceRate: 72, goalAchievementRate: 55 }];
    const r = stratifyBeneficiaries(b);
    expect(r.summary.maintenance).toBe(1);
  });
  test('summary.total صحيح', () => {
    const b = [
      { overallProgressIndex: 80, attendanceRate: 85, goalAchievementRate: 85 },
      { overallProgressIndex: 20, attendanceRate: 30, goalAchievementRate: 15 },
    ];
    const r = stratifyBeneficiaries(b);
    expect(r.summary.total).toBe(2);
  });
  test('ليست مصفوفة يُطلق خطأ', () => {
    expect(() => stratifyBeneficiaries(null)).toThrow('مصفوفة');
  });
});

// ═══════════════════════════════════════════════════════════════
// generateProgressReport
// ═══════════════════════════════════════════════════════════════
describe('generateProgressReport - تقرير التقدم', () => {
  const beneficiary = {
    id: 'B001',
    name: 'أحمد محمد',
    attendanceRate: 80,
    goalAchievementRate: 70,
    sessionQualityScore: 75,
    overallProgressIndex: 72,
  };

  test('يُرجع تقريراً كاملاً', () => {
    const r = generateProgressReport(beneficiary);
    expect(r.beneficiaryId).toBe('B001');
    expect(r.beneficiaryName).toBe('أحمد محمد');
    expect(r).toHaveProperty('reportDate');
    expect(r).toHaveProperty('currentMetrics');
    expect(r).toHaveProperty('recommendation');
  });
  test('currentMetrics صحيحة', () => {
    const r = generateProgressReport(beneficiary);
    expect(r.currentMetrics.overallProgressIndex).toBe(72);
    expect(r.currentMetrics.attendanceRate).toBe(80);
  });
  test('بدون تقارير سابقة: trend = null', () => {
    const r = generateProgressReport(beneficiary);
    expect(r.trend).toBeNull();
    expect(r.changeFromLastReport).toBeNull();
  });
  test('مقارنة مع تقرير سابق: تحسن', () => {
    const prev = [{ overallProgressIndex: 60 }];
    const r = generateProgressReport(beneficiary, prev);
    expect(r.trend).toBe('تحسن'); // 72-60 = 12 > 5
    expect(r.changeFromLastReport).toBe(12);
  });
  test('مقارنة مع تقرير سابق: تراجع', () => {
    const prev = [{ overallProgressIndex: 85 }];
    const r = generateProgressReport(beneficiary, prev);
    expect(r.trend).toBe('تراجع');
  });
  test('مقارنة مع تقرير سابق: ثبات', () => {
    const prev = [{ overallProgressIndex: 71 }];
    const r = generateProgressReport(beneficiary, prev);
    expect(r.trend).toBe('ثبات'); // 72-71=1 < 5
  });
  test('null يُطلق خطأ', () => {
    expect(() => generateProgressReport(null)).toThrow('مطلوبة');
  });
  test('تقارير سابقة ليست مصفوفة تُطلق خطأ', () => {
    expect(() => generateProgressReport(beneficiary, 'not array')).toThrow('مصفوفة');
  });
});

// ═══════════════════════════════════════════════════════════════
// getProgressRecommendation
// ═══════════════════════════════════════════════════════════════
describe('getProgressRecommendation - التوصيات', () => {
  test('ممتاز: goal>=80 AND attendance>=80', () => {
    const r = getProgressRecommendation(85, 82, 85);
    expect(r).toContain('ممتاز');
  });
  test('حضور منخفض < 60', () => {
    const r = getProgressRecommendation(50, 55, 60);
    expect(r).toContain('الحضور منخفض');
  });
  test('أهداف منخفضة < 30', () => {
    const r = getProgressRecommendation(40, 65, 25);
    expect(r).toContain('الأهداف');
  });
  test('تقدم محدود < 35', () => {
    const r = getProgressRecommendation(30, 65, 40);
    expect(r).toContain('اجتماع');
  });
  test('تقدم جيد >= 65', () => {
    const r = getProgressRecommendation(70, 75, 55);
    expect(r).toContain('جيد');
  });
  test('تقدم متوسط 35-65', () => {
    const r = getProgressRecommendation(50, 65, 45);
    expect(r).toContain('متوسط');
  });
  test('قيمة غير رقمية تُطلق خطأ', () => {
    expect(() => getProgressRecommendation('50', 65, 45)).toThrow('أرقاماً');
  });
});

// ═══════════════════════════════════════════════════════════════
// سيناريوهات متكاملة - مركز تأهيل
// ═══════════════════════════════════════════════════════════════
describe('سيناريوهات متكاملة - مركز تأهيل ذوي الإعاقة', () => {
  test('دورة كاملة لمستفيد: من البيانات الخام إلى التقرير', () => {
    // 1. حساب معدل الحضور
    const attendance = calculateAttendanceRate(16, 20, 2); // 16/18 = 88.9%
    expect(attendance.rate).toBeCloseTo(88.89, 1);

    // 2. حساب تحقق الأهداف
    const goals = [
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'in_progress', progressPercentage: 60 },
      { status: 'not_started' },
    ];
    const goalResult = calculateGoalAchievementRate(goals);
    expect(goalResult.achievedGoals).toBe(3);

    // 3. جودة الجلسات
    const sessions = [
      { outcome: 'excellent' },
      { outcome: 'good' },
      { outcome: 'excellent' },
      { outcome: 'good' },
      { outcome: 'fair' },
    ];
    const quality = calculateSessionQualityScore(sessions);
    expect(quality.averageScore).toBeGreaterThan(70);

    // 4. المؤشر الشامل
    const overallResult = calculateOverallProgressIndex({
      goalAchievementRate: goalResult.achievementRate,
      attendanceRate: attendance.rate,
      sessionQualityScore: quality.averageScore,
      functionalImprovementScore: 70,
    });
    expect(overallResult.overallIndex).toBeGreaterThan(50);
    expect(overallResult.progressCategory).toBeTruthy();
  });

  test('تقييم مستفيد بمقياس Berg Balance', () => {
    const improvement = calculateFunctionalImprovement(15, 38, 'BERG_BALANCE');
    expect(improvement.isImproved).toBe(true);
    expect(improvement.improvementPoints).toBe(23);
  });

  test('DTT لطفل ABA: 8/10 محاولات صحيحة', () => {
    const trials = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
    const result = calculateTrialBasedProgress(trials, 80);
    expect(result.isMastered).toBe(true);
  });

  test('KPIs لفرع يحتوي 10 مستفيدين', () => {
    const bens = Array(10)
      .fill(null)
      .map((_, i) => ({
        attendanceRate: 60 + i * 4,
        goalAchievementRate: 50 + i * 5,
        overallProgressIndex: 40 + i * 6,
      }));
    const kpis = calculateCenterKPIs(bens);
    expect(kpis.totalBeneficiaries).toBe(10);
    expect(kpis.averageAttendanceRate).toBeGreaterThan(60);
  });

  test('تصنيف 5 مستفيدين مختلفين', () => {
    const bens = [
      { overallProgressIndex: 85, attendanceRate: 90, goalAchievementRate: 85 }, // discharge
      { overallProgressIndex: 60, attendanceRate: 75, goalAchievementRate: 60 }, // maintenance
      { overallProgressIndex: 45, attendanceRate: 65, goalAchievementRate: 35 }, // standard
      { overallProgressIndex: 20, attendanceRate: 35, goalAchievementRate: 15 }, // high_intensity
      { overallProgressIndex: 30, attendanceRate: 50, goalAchievementRate: 25 }, // high_intensity
    ];
    const result = stratifyBeneficiaries(bens);
    expect(result.summary.total).toBe(5);
    expect(result.summary.ready_for_discharge).toBe(1);
    expect(result.summary.high_intensity).toBe(2);
  });
});
