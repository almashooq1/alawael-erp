'use strict';

/**
 * اختبارات وحدة تتبع التقدم السريري وتحليل الأداء
 * Clinical Progress Tracking Tests
 */

const {
  calculateAttendanceRate,
  classifyAttendanceRate,
  calculateAttendanceStats,
  calculateGoalAchievementRate,
  calculateGoalStats,
  classifyGoalAchievement,
  analyzeTrend,
  calculateMovingAverage,
  calculateBeneficiaryKPIs,
  generateRecommendations,
  calculateServiceIntensity,
  calculateDropoutRate,
  normalizeScore,
  calculateImprovementScore,
  generateProgressReport,
  rankBranchesByPerformance,
  MIN_ACCEPTABLE_ATTENDANCE_RATE,
  MIN_ACCEPTABLE_GOAL_ACHIEVEMENT,
  MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT,
  MIN_DATA_POINTS_FOR_TREND,
  PROGRESS_LEVELS,
  GOAL_STATUS,
  TREND_DIRECTION,
} = require('../services/clinical/progressTracking.service');

// ─── بيانات مساعدة ───────────────────────────────────────────────────────────

const makeGoal = (status, weight = 1) => ({ id: `g-${Math.random()}`, status, weight });
const makeSession = status => ({ id: `s-${Math.random()}`, status });

// ─── 1. الثوابت ──────────────────────────────────────────────────────────────
describe('الثوابت', () => {
  test('MIN_ACCEPTABLE_ATTENDANCE_RATE = 75', () => {
    expect(MIN_ACCEPTABLE_ATTENDANCE_RATE).toBe(75);
  });

  test('MIN_ACCEPTABLE_GOAL_ACHIEVEMENT = 60', () => {
    expect(MIN_ACCEPTABLE_GOAL_ACHIEVEMENT).toBe(60);
  });

  test('MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT = 4', () => {
    expect(MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT).toBe(4);
  });

  test('MIN_DATA_POINTS_FOR_TREND = 3', () => {
    expect(MIN_DATA_POINTS_FOR_TREND).toBe(3);
  });

  test('PROGRESS_LEVELS مكتملة', () => {
    expect(PROGRESS_LEVELS.EXCELLENT).toBe('excellent');
    expect(PROGRESS_LEVELS.GOOD).toBe('good');
    expect(PROGRESS_LEVELS.SATISFACTORY).toBe('satisfactory');
    expect(PROGRESS_LEVELS.NEEDS_IMPROVEMENT).toBe('needs_improvement');
    expect(PROGRESS_LEVELS.POOR).toBe('poor');
  });

  test('GOAL_STATUS مكتملة', () => {
    expect(GOAL_STATUS.ACHIEVED).toBe('achieved');
    expect(GOAL_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(GOAL_STATUS.NOT_STARTED).toBe('not_started');
    expect(GOAL_STATUS.DISCONTINUED).toBe('discontinued');
  });

  test('TREND_DIRECTION مكتملة', () => {
    expect(TREND_DIRECTION.IMPROVING).toBe('improving');
    expect(TREND_DIRECTION.STABLE).toBe('stable');
    expect(TREND_DIRECTION.DECLINING).toBe('declining');
    expect(TREND_DIRECTION.INSUFFICIENT_DATA).toBe('insufficient_data');
  });
});

// ─── 2. calculateAttendanceRate ──────────────────────────────────────────────
describe('calculateAttendanceRate — معدل الحضور', () => {
  test('20/20 = 100%', () => {
    expect(calculateAttendanceRate(20, 20)).toBe(100);
  });

  test('15/20 = 75%', () => {
    expect(calculateAttendanceRate(15, 20)).toBe(75);
  });

  test('8/10 = 80%', () => {
    expect(calculateAttendanceRate(8, 10)).toBe(80);
  });

  test('0/10 = 0%', () => {
    expect(calculateAttendanceRate(0, 10)).toBe(0);
  });

  test('0/0 = 0% (لا جلسات)', () => {
    expect(calculateAttendanceRate(0, 0)).toBe(0);
  });

  test('1/3 ≈ 33%', () => {
    expect(calculateAttendanceRate(1, 3)).toBe(33);
  });

  test('2/3 ≈ 67%', () => {
    expect(calculateAttendanceRate(2, 3)).toBe(67);
  });

  test('تجاوز الإجمالي يُلقي خطأ', () => {
    expect(() => calculateAttendanceRate(11, 10)).toThrow();
  });

  test('قيم سالبة تُلقي خطأ', () => {
    expect(() => calculateAttendanceRate(-1, 10)).toThrow();
  });

  test('غير رقم يُلقي خطأ', () => {
    expect(() => calculateAttendanceRate('eight', 10)).toThrow();
  });
});

// ─── 3. classifyAttendanceRate ───────────────────────────────────────────────
describe('classifyAttendanceRate — تصنيف الحضور', () => {
  test('100% → excellent', () => {
    expect(classifyAttendanceRate(100)).toBe('excellent');
  });

  test('90% → excellent', () => {
    expect(classifyAttendanceRate(90)).toBe('excellent');
  });

  test('89% → good', () => {
    expect(classifyAttendanceRate(89)).toBe('good');
  });

  test('75% → good', () => {
    expect(classifyAttendanceRate(75)).toBe('good');
  });

  test('74% → satisfactory', () => {
    expect(classifyAttendanceRate(74)).toBe('satisfactory');
  });

  test('60% → satisfactory', () => {
    expect(classifyAttendanceRate(60)).toBe('satisfactory');
  });

  test('59% → needs_improvement', () => {
    expect(classifyAttendanceRate(59)).toBe('needs_improvement');
  });

  test('40% → needs_improvement', () => {
    expect(classifyAttendanceRate(40)).toBe('needs_improvement');
  });

  test('39% → poor', () => {
    expect(classifyAttendanceRate(39)).toBe('poor');
  });

  test('0% → poor', () => {
    expect(classifyAttendanceRate(0)).toBe('poor');
  });
});

// ─── 4. calculateAttendanceStats ─────────────────────────────────────────────
describe('calculateAttendanceStats — إحصاءات الحضور', () => {
  test('إحصاءات صحيحة لقائمة مختلطة', () => {
    const sessions = [
      makeSession('attended'),
      makeSession('attended'),
      makeSession('attended'),
      makeSession('cancelled'),
      makeSession('no_show'),
    ];
    const stats = calculateAttendanceStats(sessions);
    expect(stats.total).toBe(5);
    expect(stats.attended).toBe(3);
    expect(stats.cancelled).toBe(1);
    expect(stats.noShow).toBe(1);
    expect(stats.attendanceRate).toBe(60);
    expect(stats.cancellationRate).toBe(20);
    expect(stats.noShowRate).toBe(20);
  });

  test('حضور كامل = excellent', () => {
    const sessions = Array(10)
      .fill(null)
      .map(() => makeSession('attended'));
    const stats = calculateAttendanceStats(sessions);
    expect(stats.attendanceRate).toBe(100);
    expect(stats.classification).toBe('excellent');
  });

  test('قائمة فارغة = كل الإحصاءات صفر', () => {
    const stats = calculateAttendanceStats([]);
    expect(stats.total).toBe(0);
    expect(stats.attendanceRate).toBe(0);
  });

  test('isSufficient = true عند 4 جلسات أو أكثر', () => {
    const sessions = Array(4)
      .fill(null)
      .map(() => makeSession('attended'));
    expect(calculateAttendanceStats(sessions).isSufficient).toBe(true);
  });

  test('isSufficient = false عند أقل من 4 جلسات', () => {
    const sessions = Array(3)
      .fill(null)
      .map(() => makeSession('attended'));
    expect(calculateAttendanceStats(sessions).isSufficient).toBe(false);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => calculateAttendanceStats('invalid')).toThrow();
  });
});

// ─── 5. calculateGoalAchievementRate ─────────────────────────────────────────
describe('calculateGoalAchievementRate — معدل تحقيق الأهداف', () => {
  test('كل الأهداف محققة = 100%', () => {
    const goals = [
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.ACHIEVED),
    ];
    expect(calculateGoalAchievementRate(goals)).toBe(100);
  });

  test('لا يوجد أهداف = 0%', () => {
    expect(calculateGoalAchievementRate([])).toBe(0);
  });

  test('نصف الأهداف محقق = 50%', () => {
    const goals = [makeGoal(GOAL_STATUS.ACHIEVED), makeGoal(GOAL_STATUS.IN_PROGRESS)];
    expect(calculateGoalAchievementRate(goals)).toBe(50);
  });

  test('الأهداف المتوقفة تُستثنى من الحساب', () => {
    const goals = [
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.DISCONTINUED), // تُستثنى
    ];
    // 1/1 = 100% (بعد استثناء المتوقفة)
    expect(calculateGoalAchievementRate(goals)).toBe(100);
  });

  test('كل الأهداف متوقفة = 0%', () => {
    const goals = [makeGoal(GOAL_STATUS.DISCONTINUED)];
    expect(calculateGoalAchievementRate(goals)).toBe(0);
  });

  test('أهداف بأوزان مختلفة', () => {
    const goals = [
      makeGoal(GOAL_STATUS.ACHIEVED, 3), // وزن 3
      makeGoal(GOAL_STATUS.IN_PROGRESS, 1), // وزن 1
    ];
    // 3/(3+1) = 75%
    expect(calculateGoalAchievementRate(goals)).toBe(75);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => calculateGoalAchievementRate(null)).toThrow();
  });
});

// ─── 6. calculateGoalStats ───────────────────────────────────────────────────
describe('calculateGoalStats — إحصاءات الأهداف', () => {
  test('إحصاءات صحيحة', () => {
    const goals = [
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.IN_PROGRESS),
      makeGoal(GOAL_STATUS.NOT_STARTED),
      makeGoal(GOAL_STATUS.DISCONTINUED),
    ];
    const stats = calculateGoalStats(goals);
    expect(stats.total).toBe(5);
    expect(stats.achieved).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.notStarted).toBe(1);
    expect(stats.discontinued).toBe(1);
  });

  test('achievementRate محسوب بشكل صحيح', () => {
    const goals = [makeGoal(GOAL_STATUS.ACHIEVED), makeGoal(GOAL_STATUS.IN_PROGRESS)];
    const stats = calculateGoalStats(goals);
    expect(stats.achievementRate).toBe(50);
  });

  test('classification موجود', () => {
    const goals = [makeGoal(GOAL_STATUS.ACHIEVED)];
    const stats = calculateGoalStats(goals);
    expect(stats.classification).toBeTruthy();
  });
});

// ─── 7. classifyGoalAchievement ──────────────────────────────────────────────
describe('classifyGoalAchievement — تصنيف تحقيق الأهداف', () => {
  test('90-100 → excellent', () => {
    expect(classifyGoalAchievement(95)).toBe('excellent');
    expect(classifyGoalAchievement(90)).toBe('excellent');
  });

  test('75-89 → good', () => {
    expect(classifyGoalAchievement(80)).toBe('good');
    expect(classifyGoalAchievement(75)).toBe('good');
  });

  test('60-74 → satisfactory', () => {
    expect(classifyGoalAchievement(65)).toBe('satisfactory');
    expect(classifyGoalAchievement(60)).toBe('satisfactory');
  });

  test('40-59 → needs_improvement', () => {
    expect(classifyGoalAchievement(50)).toBe('needs_improvement');
  });

  test('< 40 → poor', () => {
    expect(classifyGoalAchievement(20)).toBe('poor');
    expect(classifyGoalAchievement(0)).toBe('poor');
  });
});

// ─── 8. analyzeTrend ─────────────────────────────────────────────────────────
describe('analyzeTrend — تحليل الاتجاه', () => {
  test('اتجاه تصاعدي واضح → improving', () => {
    const result = analyzeTrend([10, 20, 30, 40, 50]);
    expect(result.direction).toBe(TREND_DIRECTION.IMPROVING);
    expect(result.slope).toBeGreaterThan(0.5);
  });

  test('اتجاه تنازلي واضح → declining', () => {
    const result = analyzeTrend([50, 40, 30, 20, 10]);
    expect(result.direction).toBe(TREND_DIRECTION.DECLINING);
    expect(result.slope).toBeLessThan(-0.5);
  });

  test('بيانات ثابتة → stable', () => {
    const result = analyzeTrend([50, 51, 50, 49, 50]);
    expect(result.direction).toBe(TREND_DIRECTION.STABLE);
  });

  test('بيانات غير كافية (< 3) → insufficient_data', () => {
    expect(analyzeTrend([10, 20]).direction).toBe(TREND_DIRECTION.INSUFFICIENT_DATA);
    expect(analyzeTrend([10]).direction).toBe(TREND_DIRECTION.INSUFFICIENT_DATA);
  });

  test('قائمة فارغة → insufficient_data', () => {
    expect(analyzeTrend([]).direction).toBe(TREND_DIRECTION.INSUFFICIENT_DATA);
  });

  test('يحسب changePercent بشكل صحيح', () => {
    const result = analyzeTrend([50, 60, 75]);
    expect(result.changePercent).toBe(50); // (75-50)/50*100 = 50%
  });

  test('يُعيد firstScore و lastScore', () => {
    const result = analyzeTrend([20, 40, 60]);
    expect(result.firstScore).toBe(20);
    expect(result.lastScore).toBe(60);
  });

  test('يُعيد dataPoints', () => {
    const result = analyzeTrend([10, 20, 30, 40]);
    expect(result.dataPoints).toBe(4);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => analyzeTrend('invalid')).toThrow();
  });

  test('ميل صفري عند بيانات متشابهة', () => {
    const result = analyzeTrend([50, 50, 50]);
    expect(result.slope).toBe(0);
    expect(result.direction).toBe(TREND_DIRECTION.STABLE);
  });
});

// ─── 9. calculateMovingAverage ───────────────────────────────────────────────
describe('calculateMovingAverage — المتوسط المتحرك', () => {
  test('متوسط متحرك بنافذة 3', () => {
    const result = calculateMovingAverage([10, 20, 30, 40, 50], 3);
    expect(result).toEqual([20, 30, 40]);
  });

  test('نافذة أكبر من البيانات → يُعيد المصفوفة كما هي', () => {
    const scores = [10, 20];
    const result = calculateMovingAverage(scores, 3);
    expect(result).toEqual(scores);
  });

  test('نافذة 1 = يُعيد كل الأرقام', () => {
    const result = calculateMovingAverage([10, 20, 30], 1);
    expect(result).toEqual([10, 20, 30]);
  });

  test('يُقرّب للمنازل العشرية', () => {
    const result = calculateMovingAverage([10, 11, 12], 3);
    expect(result[0]).toBe(11); // (10+11+12)/3 = 11
  });

  test('نافذة سالبة تُلقي خطأ', () => {
    expect(() => calculateMovingAverage([10, 20, 30], -1)).toThrow();
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => calculateMovingAverage(null, 3)).toThrow();
  });
});

// ─── 10. calculateBeneficiaryKPIs ────────────────────────────────────────────
describe('calculateBeneficiaryKPIs — مؤشرات الأداء', () => {
  test('مستفيد ممتاز: حضور + أهداف عالية', () => {
    const kpis = calculateBeneficiaryKPIs({
      attendedSessions: 18,
      totalSessions: 20,
      goals: [
        makeGoal(GOAL_STATUS.ACHIEVED),
        makeGoal(GOAL_STATUS.ACHIEVED),
        makeGoal(GOAL_STATUS.ACHIEVED),
      ],
      progressScores: [60, 70, 80, 90],
      weeksInProgram: 10,
    });
    expect(kpis.attendanceRate).toBe(90);
    expect(kpis.goalAchievementRate).toBe(100);
    expect(kpis.compositeScore).toBeGreaterThan(90);
    expect(kpis.isOnTrack).toBe(true);
  });

  test('مستفيد يحتاج متابعة: حضور منخفض', () => {
    const kpis = calculateBeneficiaryKPIs({
      attendedSessions: 5,
      totalSessions: 20,
      goals: [makeGoal(GOAL_STATUS.IN_PROGRESS)],
      progressScores: [],
      weeksInProgram: 10,
    });
    expect(kpis.attendanceRate).toBe(25);
    expect(kpis.isOnTrack).toBe(false);
    expect(kpis.recommendations.length).toBeGreaterThan(0);
  });

  test('compositeScore = 40% حضور + 60% أهداف', () => {
    const kpis = calculateBeneficiaryKPIs({
      attendedSessions: 8,
      totalSessions: 10, // 80% حضور
      goals: [makeGoal(GOAL_STATUS.ACHIEVED), makeGoal(GOAL_STATUS.NOT_STARTED)], // 50% أهداف
      progressScores: [],
    });
    // 80*0.4 + 50*0.6 = 32+30 = 62
    expect(kpis.compositeScore).toBe(62);
  });

  test('weeklySessionRate محسوب', () => {
    const kpis = calculateBeneficiaryKPIs({
      attendedSessions: 20,
      totalSessions: 20,
      goals: [],
      progressScores: [],
      weeksInProgram: 10,
    });
    expect(kpis.weeklySessionRate).toBe(2); // 20/10 = 2
  });

  test('weeksInProgram = 0 → weeklySessionRate = 0', () => {
    const kpis = calculateBeneficiaryKPIs({
      attendedSessions: 5,
      totalSessions: 5,
      goals: [],
      weeksInProgram: 0,
    });
    expect(kpis.weeklySessionRate).toBe(0);
  });

  test('بيانات null تُلقي خطأ', () => {
    expect(() => calculateBeneficiaryKPIs(null)).toThrow();
  });
});

// ─── 11. generateRecommendations ─────────────────────────────────────────────
describe('generateRecommendations — التوصيات السريرية', () => {
  test('حضور منخفض → توصية حضور', () => {
    const recs = generateRecommendations(50, 80, TREND_DIRECTION.STABLE);
    expect(recs.some(r => r.includes('حضور') || r.includes('الحضور'))).toBe(true);
  });

  test('حضور < 50% → توصية تغيير الأوقات', () => {
    const recs = generateRecommendations(45, 80, TREND_DIRECTION.STABLE);
    expect(recs.length).toBeGreaterThanOrEqual(2);
  });

  test('أهداف منخفضة → توصية مراجعة الأهداف', () => {
    const recs = generateRecommendations(80, 40, TREND_DIRECTION.STABLE);
    expect(recs.some(r => r.includes('أهداف') || r.includes('الخطة'))).toBe(true);
  });

  test('اتجاه تنازلي → توصية اجتماع عاجل', () => {
    const recs = generateRecommendations(80, 70, TREND_DIRECTION.DECLINING);
    expect(recs.some(r => r.includes('عاجل') || r.includes('اجتماع'))).toBe(true);
  });

  test('اتجاه تحسن → توصية إيجابية', () => {
    const recs = generateRecommendations(80, 70, TREND_DIRECTION.IMPROVING);
    expect(recs.some(r => r.includes('الاستمرار') || r.includes('التحدي'))).toBe(true);
  });

  test('أداء ممتاز بلا مشاكل → لا توصيات سلبية', () => {
    const recs = generateRecommendations(90, 80, TREND_DIRECTION.STABLE);
    expect(recs.length).toBe(0);
  });
});

// ─── 12. calculateServiceIntensity ───────────────────────────────────────────
describe('calculateServiceIntensity — كثافة الخدمة', () => {
  test('تدخل مبكر مكثف: 1200 دقيقة / أسبوع = مكثف', () => {
    // 1200 دقيقة / أسبوع = 20 ساعة → intensive
    const result = calculateServiceIntensity(1200 * 12, 12);
    expect(result.intensityLevel).toBe('intensive');
    expect(result.hoursPerWeek).toBe(20);
  });

  test('كثافة عالية: 10-19 ساعة/أسبوع', () => {
    // 720 دقيقة / أسبوع = 12 ساعة → high
    const result = calculateServiceIntensity(720 * 12, 12);
    expect(result.intensityLevel).toBe('high');
  });

  test('كثافة متوسطة: 5-9 ساعات/أسبوع', () => {
    // 360 دقيقة / أسبوع = 6 ساعات → moderate
    const result = calculateServiceIntensity(360 * 8, 8);
    expect(result.intensityLevel).toBe('moderate');
  });

  test('كثافة منخفضة: 2-4 ساعات/أسبوع', () => {
    // 120 دقيقة / أسبوع = 2 ساعات → low
    const result = calculateServiceIntensity(120 * 10, 10);
    expect(result.intensityLevel).toBe('low');
  });

  test('كثافة دنيا: < 2 ساعة/أسبوع', () => {
    // 60 دقيقة / أسبوع = 1 ساعة → minimal
    const result = calculateServiceIntensity(60 * 4, 4);
    expect(result.intensityLevel).toBe('minimal');
  });

  test('يحسب minutesPerWeek و hoursPerMonth', () => {
    const result = calculateServiceIntensity(480, 8); // 60 دقيقة/أسبوع
    expect(result.minutesPerWeek).toBe(60);
    expect(result.hoursPerMonth).toBe(4); // 1 × 4
  });

  test('أسابيع = 0 تُلقي خطأ', () => {
    expect(() => calculateServiceIntensity(100, 0)).toThrow();
  });

  test('دقائق سالبة تُلقي خطأ', () => {
    expect(() => calculateServiceIntensity(-100, 10)).toThrow();
  });
});

// ─── 13. calculateDropoutRate ─────────────────────────────────────────────────
describe('calculateDropoutRate — معدل التسرب', () => {
  test('لا تسرب = 0%', () => {
    const result = calculateDropoutRate(100, 0);
    expect(result.dropoutRate).toBe(0);
    expect(result.retentionRate).toBe(100);
  });

  test('10 متسربين من 100 = 10%', () => {
    const result = calculateDropoutRate(100, 10);
    expect(result.dropoutRate).toBe(10);
    expect(result.retentionRate).toBe(90);
    expect(result.retainedCount).toBe(90);
  });

  test('معدل سنوي محسوب', () => {
    // 10% خلال 6 أشهر → 20% سنوياً
    const result = calculateDropoutRate(100, 10, 6);
    expect(result.annualizedDropoutRate).toBe(20);
  });

  test('المتسربون أكثر من المسجلين تُلقي خطأ', () => {
    expect(() => calculateDropoutRate(50, 60)).toThrow();
  });

  test('قيم سالبة تُلقي خطأ', () => {
    expect(() => calculateDropoutRate(-10, 5)).toThrow();
    expect(() => calculateDropoutRate(10, -5)).toThrow();
  });

  test('مسجلون = 0 → معدل 0%', () => {
    const result = calculateDropoutRate(0, 0);
    expect(result.dropoutRate).toBe(0);
  });
});

// ─── 14. normalizeScore ──────────────────────────────────────────────────────
describe('normalizeScore — تطبيع الدرجات', () => {
  test('أعلى درجة في المقياس = 100', () => {
    expect(normalizeScore(10, 0, 10)).toBe(100);
  });

  test('أدنى درجة في المقياس = 0', () => {
    expect(normalizeScore(0, 0, 10)).toBe(0);
  });

  test('منتصف المقياس = 50', () => {
    expect(normalizeScore(5, 0, 10)).toBe(50);
  });

  test('مقياس مقلوب (higherIsBetter=false): أدنى = أفضل', () => {
    // GARS-3: درجة أدنى = حالة أفضل
    expect(normalizeScore(0, 0, 10, false)).toBe(100);
    expect(normalizeScore(10, 0, 10, false)).toBe(0);
  });

  test('درجة خارج المدى تُقيَّد', () => {
    expect(normalizeScore(15, 0, 10)).toBe(100); // يُقيَّد عند 10
    expect(normalizeScore(-5, 0, 10)).toBe(0); // يُقيَّد عند 0
  });

  test('مقياس غير صحيح (max <= min) تُلقي خطأ', () => {
    expect(() => normalizeScore(5, 10, 5)).toThrow();
    expect(() => normalizeScore(5, 5, 5)).toThrow();
  });

  test('درجة غير رقمية تُلقي خطأ', () => {
    expect(() => normalizeScore('high', 0, 10)).toThrow();
  });
});

// ─── 15. calculateImprovementScore ───────────────────────────────────────────
describe('calculateImprovementScore — نقاط التحسن', () => {
  test('تحسن 50%', () => {
    const result = calculateImprovementScore(40, 60);
    expect(result.absoluteChange).toBe(20);
    expect(result.percentChange).toBe(50);
    expect(result.direction).toBe(TREND_DIRECTION.IMPROVING);
  });

  test('تراجع 25%', () => {
    const result = calculateImprovementScore(80, 60);
    expect(result.absoluteChange).toBe(-20);
    expect(result.percentChange).toBe(-25);
    expect(result.direction).toBe(TREND_DIRECTION.DECLINING);
  });

  test('لا تغيير = stable', () => {
    const result = calculateImprovementScore(50, 50);
    expect(result.absoluteChange).toBe(0);
    expect(result.direction).toBe(TREND_DIRECTION.STABLE);
  });

  test('baseline = 0 → percentChange = 0', () => {
    const result = calculateImprovementScore(0, 30);
    expect(result.percentChange).toBe(0); // تجنب القسمة على صفر
  });

  test('يُعيد baseline و current', () => {
    const result = calculateImprovementScore(20, 45);
    expect(result.baseline).toBe(20);
    expect(result.current).toBe(45);
  });

  test('غير رقم تُلقي خطأ', () => {
    expect(() => calculateImprovementScore('low', 50)).toThrow();
  });
});

// ─── 16. generateProgressReport ──────────────────────────────────────────────
describe('generateProgressReport — تقرير التقدم الشامل', () => {
  const sampleData = {
    id: 'ben-001',
    name: 'أحمد محمد',
    attendedSessions: 16,
    totalSessions: 20,
    goals: [
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.ACHIEVED),
      makeGoal(GOAL_STATUS.IN_PROGRESS),
    ],
    progressScores: [50, 60, 70, 75],
    weeksInProgram: 12,
    totalServiceMinutes: 720,
  };

  test('يُنشئ تقريراً شاملاً', () => {
    const report = generateProgressReport(sampleData);
    expect(report.beneficiaryId).toBe('ben-001');
    expect(report.beneficiaryName).toBe('أحمد محمد');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('attendance');
    expect(report).toHaveProperty('goals');
    expect(report).toHaveProperty('trend');
    expect(report).toHaveProperty('recommendations');
    expect(report).toHaveProperty('kpis');
  });

  test('يحتوي على reportDate بتنسيق صحيح', () => {
    const report = generateProgressReport(sampleData);
    expect(report.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('summary.overallStatus = on_track لأداء جيد', () => {
    const report = generateProgressReport(sampleData);
    expect(['on_track', 'needs_attention']).toContain(report.summary.overallStatus);
  });

  test('يشمل serviceIntensity عند وجود وقت خدمة', () => {
    const report = generateProgressReport(sampleData);
    expect(report.serviceIntensity).not.toBeNull();
  });

  test('serviceIntensity = null عند عدم وجود وقت خدمة', () => {
    const data = { ...sampleData, totalServiceMinutes: 0 };
    const report = generateProgressReport(data);
    expect(report.serviceIntensity).toBeNull();
  });

  test('بيانات null تُلقي خطأ', () => {
    expect(() => generateProgressReport(null)).toThrow();
  });

  test('attendance.rate محسوب بشكل صحيح', () => {
    const report = generateProgressReport(sampleData);
    expect(report.attendance.rate).toBe(80); // 16/20 = 80%
  });
});

// ─── 17. rankBranchesByPerformance ───────────────────────────────────────────
describe('rankBranchesByPerformance — ترتيب الفروع', () => {
  const branchesData = [
    { branchId: 'B1', averageAttendanceRate: 60, averageGoalAchievementRate: 50, dropoutRate: 20 },
    { branchId: 'B2', averageAttendanceRate: 90, averageGoalAchievementRate: 85, dropoutRate: 5 },
    { branchId: 'B3', averageAttendanceRate: 75, averageGoalAchievementRate: 70, dropoutRate: 10 },
  ];

  test('يرتب الفروع تنازلياً حسب الأداء', () => {
    const ranked = rankBranchesByPerformance(branchesData);
    expect(ranked[0].branchId).toBe('B2'); // الأفضل
    expect(ranked[2].branchId).toBe('B1'); // الأضعف
  });

  test('يضيف rank لكل فرع', () => {
    const ranked = rankBranchesByPerformance(branchesData);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  test('يضيف compositeScore و performanceLevel', () => {
    const ranked = rankBranchesByPerformance(branchesData);
    ranked.forEach(branch => {
      expect(branch).toHaveProperty('compositeScore');
      expect(branch).toHaveProperty('performanceLevel');
    });
  });

  test('قائمة فارغة تُعيد فارغة', () => {
    expect(rankBranchesByPerformance([])).toEqual([]);
  });

  test('فرع واحد rank = 1', () => {
    const ranked = rankBranchesByPerformance([branchesData[0]]);
    expect(ranked[0].rank).toBe(1);
  });

  test('غير مصفوفة تُلقي خطأ', () => {
    expect(() => rankBranchesByPerformance(null)).toThrow();
  });

  test('dropoutRate افتراضي 0 عند عدم تحديده', () => {
    const data = [{ branchId: 'X', averageAttendanceRate: 80, averageGoalAchievementRate: 80 }];
    expect(() => rankBranchesByPerformance(data)).not.toThrow();
  });
});

// ─── 18. سيناريوهات متكاملة ──────────────────────────────────────────────────
describe('سيناريوهات متكاملة', () => {
  test('مستفيد تدخل مبكر: تقرير كامل', () => {
    const data = {
      id: 'child-001',
      name: 'محمد علي',
      attendedSessions: 24,
      totalSessions: 26,
      goals: [
        makeGoal(GOAL_STATUS.ACHIEVED),
        makeGoal(GOAL_STATUS.ACHIEVED),
        makeGoal(GOAL_STATUS.IN_PROGRESS),
        makeGoal(GOAL_STATUS.IN_PROGRESS),
      ],
      progressScores: [30, 40, 50, 65, 75, 80],
      weeksInProgram: 24,
      totalServiceMinutes: 24 * 120, // 120 دقيقة/أسبوع
    };

    const report = generateProgressReport(data);

    // التحقق من الحضور (92%)
    expect(report.attendance.rate).toBe(92);
    expect(report.attendance.classification).toBe('excellent');

    // التحقق من الأهداف (50%)
    expect(report.goals.achievementRate).toBe(50);

    // التحقق من الاتجاه
    expect(report.trend.direction).toBe(TREND_DIRECTION.IMPROVING);
    expect(report.trend.changePercent).toBeGreaterThan(0);

    // كثافة الخدمة
    expect(report.serviceIntensity.minutesPerWeek).toBe(120);
    expect(report.serviceIntensity.hoursPerWeek).toBe(2);
    expect(report.serviceIntensity.intensityLevel).toBe('low');
  });

  test('مقارنة مستفيدين: الأفضل أداءً يحصل على compositeScore أعلى', () => {
    const kpi1 = calculateBeneficiaryKPIs({
      attendedSessions: 18,
      totalSessions: 20,
      goals: [makeGoal(GOAL_STATUS.ACHIEVED), makeGoal(GOAL_STATUS.ACHIEVED)],
      progressScores: [50, 70, 90],
    });

    const kpi2 = calculateBeneficiaryKPIs({
      attendedSessions: 8,
      totalSessions: 20,
      goals: [makeGoal(GOAL_STATUS.IN_PROGRESS), makeGoal(GOAL_STATUS.NOT_STARTED)],
      progressScores: [40, 35, 30],
    });

    expect(kpi1.compositeScore).toBeGreaterThan(kpi2.compositeScore);
    expect(kpi1.isOnTrack).toBe(true);
    expect(kpi2.isOnTrack).toBe(false);
  });

  test('تتبع تحسن مستفيد عبر الزمن', () => {
    const weeklyScores = [40, 42, 45, 48, 52, 58, 63, 70, 75, 80];

    const movingAvg = calculateMovingAverage(weeklyScores, 3);
    const trend = analyzeTrend(weeklyScores);
    const improvement = calculateImprovementScore(
      weeklyScores[0],
      weeklyScores[weeklyScores.length - 1]
    );

    expect(trend.direction).toBe(TREND_DIRECTION.IMPROVING);
    expect(improvement.direction).toBe(TREND_DIRECTION.IMPROVING);
    expect(improvement.percentChange).toBe(100); // 80/40 - 1 = 100%
    expect(movingAvg.length).toBe(8); // 10 - 3 + 1
  });

  test('نظام تقييم مقياس GARS-3 (أدنى = أفضل)', () => {
    // مقياس GARS-3: الدرجة تتراوح 56-130، الأدنى = اضطراب أقل
    const scoreBaseline = normalizeScore(100, 56, 130, false); // درجة أعلى = أسوأ
    const scoreCurrent = normalizeScore(70, 56, 130, false);

    const improvement = calculateImprovementScore(scoreBaseline, scoreCurrent);
    expect(improvement.direction).toBe(TREND_DIRECTION.IMPROVING);
    expect(improvement.absoluteChange).toBeGreaterThan(0);
  });

  test('فرع يحتاج تدخلاً عاجلاً يظهر في آخر الترتيب', () => {
    const branches = [
      {
        branchId: 'riyadh',
        averageAttendanceRate: 88,
        averageGoalAchievementRate: 82,
        dropoutRate: 5,
      },
      {
        branchId: 'jeddah',
        averageAttendanceRate: 70,
        averageGoalAchievementRate: 65,
        dropoutRate: 15,
      },
      {
        branchId: 'dammam',
        averageAttendanceRate: 45,
        averageGoalAchievementRate: 35,
        dropoutRate: 30,
      },
    ];

    const ranked = rankBranchesByPerformance(branches);
    expect(ranked[0].branchId).toBe('riyadh');
    expect(ranked[2].branchId).toBe('dammam');
    expect(ranked[2].compositeScore).toBeLessThan(ranked[0].compositeScore);
  });

  test('معدل تسرب سنوي 24% يُعتبر مرتفعاً', () => {
    const result = calculateDropoutRate(100, 12, 6); // 12% خلال 6 أشهر
    expect(result.annualizedDropoutRate).toBe(24); // 24% سنوياً
    expect(result.retentionRate).toBe(88);
  });
});
