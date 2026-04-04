'use strict';

/**
 * خدمة تتبع التقدم السريري وتحليل الأداء
 * Clinical Progress Tracking & Performance Analytics Service
 *
 * يغطي:
 *  - حساب معدل حضور الجلسات (Attendance Rate)
 *  - حساب معدل تحقيق الأهداف السريرية (Goal Achievement Rate)
 *  - مؤشرات الأداء الرئيسية (KPIs) لكل تخصص
 *  - تحليل اتجاهات التقدم (Trend Analysis)
 *  - حساب درجات المقاييس السريرية الموحدة
 *  - تقييم كثافة الخدمة (Service Intensity)
 *  - حساب نسب التسرب (Dropout Rate)
 */

// ─── ثوابت ───────────────────────────────────────────────────────────────────

/** الحد الأدنى لمعدل الحضور المقبول (%) */
const MIN_ACCEPTABLE_ATTENDANCE_RATE = 75;

/** الحد الأدنى لمعدل تحقيق الأهداف المقبول (%) */
const MIN_ACCEPTABLE_GOAL_ACHIEVEMENT = 60;

/** عدد الجلسات الأدنى للحصول على تقييم موثوق */
const MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT = 4;

/** عدد الأسابيع للتقييم الدوري القياسي */
const STANDARD_REVIEW_PERIOD_WEEKS = 12;

/** مستويات التقدم */
const PROGRESS_LEVELS = {
  EXCELLENT: 'excellent', // 90-100%
  GOOD: 'good', // 75-89%
  SATISFACTORY: 'satisfactory', // 60-74%
  NEEDS_IMPROVEMENT: 'needs_improvement', // 40-59%
  POOR: 'poor', // < 40%
};

/** حالات الأهداف السريرية */
const GOAL_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  ACHIEVED: 'achieved',
  DISCONTINUED: 'discontinued',
  MODIFIED: 'modified',
};

/** أنواع الاتجاه */
const TREND_DIRECTION = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining',
  INSUFFICIENT_DATA: 'insufficient_data',
};

/** الحد الأدنى لعدد نقاط البيانات لتحليل الاتجاه */
const MIN_DATA_POINTS_FOR_TREND = 3;

/** معدل التحسن الأسبوعي المستهدف (%) */
const TARGET_WEEKLY_IMPROVEMENT_RATE = 2;

// ─── حساب معدل الحضور ────────────────────────────────────────────────────────

/**
 * حساب معدل حضور المستفيد لجلساته
 *
 * @param {number} attendedSessions - عدد الجلسات المحضورة
 * @param {number} totalScheduledSessions - إجمالي الجلسات المجدولة
 * @returns {number} معدل الحضور (0-100)
 */
function calculateAttendanceRate(attendedSessions, totalScheduledSessions) {
  if (
    typeof attendedSessions !== 'number' ||
    typeof totalScheduledSessions !== 'number' ||
    attendedSessions < 0 ||
    totalScheduledSessions < 0
  ) {
    throw new Error('عدد الجلسات يجب أن يكون رقماً موجباً');
  }
  if (totalScheduledSessions === 0) return 0;
  if (attendedSessions > totalScheduledSessions) {
    throw new Error('عدد الجلسات المحضورة لا يمكن أن يتجاوز الإجمالي المجدول');
  }
  return Math.round((attendedSessions / totalScheduledSessions) * 100);
}

/**
 * تصنيف معدل الحضور
 * @param {number} rate - معدل الحضور (0-100)
 * @returns {string} مستوى الحضور
 */
function classifyAttendanceRate(rate) {
  if (rate >= 90) return PROGRESS_LEVELS.EXCELLENT;
  if (rate >= 75) return PROGRESS_LEVELS.GOOD;
  if (rate >= 60) return PROGRESS_LEVELS.SATISFACTORY;
  if (rate >= 40) return PROGRESS_LEVELS.NEEDS_IMPROVEMENT;
  return PROGRESS_LEVELS.POOR;
}

/**
 * حساب إحصاءات الحضور الشاملة
 *
 * @param {Array<object>} sessions - مصفوفة الجلسات
 * @param {string} sessions[].status - حالة الجلسة (attended, cancelled, no_show)
 * @returns {object} إحصاءات الحضور
 */
function calculateAttendanceStats(sessions) {
  if (!Array.isArray(sessions)) {
    throw new Error('الجلسات يجب أن تكون مصفوفة');
  }

  const total = sessions.length;
  const attended = sessions.filter(s => s.status === 'attended').length;
  const cancelled = sessions.filter(s => s.status === 'cancelled').length;
  const noShow = sessions.filter(s => s.status === 'no_show').length;

  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

  return {
    total,
    attended,
    cancelled,
    noShow,
    attendanceRate,
    cancellationRate,
    noShowRate,
    classification: classifyAttendanceRate(attendanceRate),
    isSufficient: total >= MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT,
  };
}

// ─── حساب معدل تحقيق الأهداف ─────────────────────────────────────────────────

/**
 * حساب معدل تحقيق الأهداف السريرية
 *
 * @param {Array<object>} goals - مصفوفة الأهداف
 * @param {string} goals[].status - حالة الهدف
 * @param {number} [goals[].weight] - وزن الهدف (افتراضي: 1)
 * @returns {number} معدل التحقيق (0-100)
 */
function calculateGoalAchievementRate(goals) {
  if (!Array.isArray(goals)) {
    throw new Error('الأهداف يجب أن تكون مصفوفة');
  }
  if (goals.length === 0) return 0;

  // استثناء الأهداف المتوقفة
  const activeGoals = goals.filter(g => g.status !== GOAL_STATUS.DISCONTINUED);
  if (activeGoals.length === 0) return 0;

  const totalWeight = activeGoals.reduce((sum, g) => sum + (g.weight || 1), 0);
  const achievedWeight = activeGoals
    .filter(g => g.status === GOAL_STATUS.ACHIEVED)
    .reduce((sum, g) => sum + (g.weight || 1), 0);

  return Math.round((achievedWeight / totalWeight) * 100);
}

/**
 * حساب إحصاءات الأهداف السريرية
 *
 * @param {Array<object>} goals
 * @returns {object}
 */
function calculateGoalStats(goals) {
  if (!Array.isArray(goals)) {
    throw new Error('الأهداف يجب أن تكون مصفوفة');
  }

  const total = goals.length;
  const achieved = goals.filter(g => g.status === GOAL_STATUS.ACHIEVED).length;
  const inProgress = goals.filter(g => g.status === GOAL_STATUS.IN_PROGRESS).length;
  const notStarted = goals.filter(g => g.status === GOAL_STATUS.NOT_STARTED).length;
  const discontinued = goals.filter(g => g.status === GOAL_STATUS.DISCONTINUED).length;

  const achievementRate = calculateGoalAchievementRate(goals);

  return {
    total,
    achieved,
    inProgress,
    notStarted,
    discontinued,
    achievementRate,
    classification: classifyGoalAchievement(achievementRate),
  };
}

/**
 * تصنيف معدل تحقيق الأهداف
 * @param {number} rate
 * @returns {string}
 */
function classifyGoalAchievement(rate) {
  if (rate >= 90) return PROGRESS_LEVELS.EXCELLENT;
  if (rate >= 75) return PROGRESS_LEVELS.GOOD;
  if (rate >= 60) return PROGRESS_LEVELS.SATISFACTORY;
  if (rate >= 40) return PROGRESS_LEVELS.NEEDS_IMPROVEMENT;
  return PROGRESS_LEVELS.POOR;
}

// ─── تحليل الاتجاهات ─────────────────────────────────────────────────────────

/**
 * حساب الاتجاه العام للتقدم عبر الزمن
 * يستخدم الانحدار الخطي البسيط (Linear Regression)
 *
 * @param {Array<number>} scores - نقاط التقييم المتتالية (الأحدث أخيراً)
 * @returns {object} نتيجة تحليل الاتجاه
 */
function analyzeTrend(scores) {
  if (!Array.isArray(scores)) {
    throw new Error('النقاط يجب أن تكون مصفوفة');
  }
  if (scores.length < MIN_DATA_POINTS_FOR_TREND) {
    return {
      direction: TREND_DIRECTION.INSUFFICIENT_DATA,
      slope: 0,
      changePercent: 0,
      description: `يحتاج على الأقل ${MIN_DATA_POINTS_FOR_TREND} نقاط بيانات`,
    };
  }

  const n = scores.length;
  // حساب ميل الانحدار الخطي
  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // نسبة التغيير من البداية إلى النهاية
  const firstScore = scores[0];
  const lastScore = scores[n - 1];
  const changePercent =
    firstScore !== 0 ? Math.round(((lastScore - firstScore) / firstScore) * 100) : 0;

  let direction;
  if (slope > 0.5) direction = TREND_DIRECTION.IMPROVING;
  else if (slope < -0.5) direction = TREND_DIRECTION.DECLINING;
  else direction = TREND_DIRECTION.STABLE;

  return {
    direction,
    slope: Math.round(slope * 100) / 100,
    changePercent,
    firstScore,
    lastScore,
    dataPoints: n,
  };
}

/**
 * حساب متوسط متحرك للتخفيف من التذبذبات
 *
 * @param {Array<number>} scores - النقاط
 * @param {number} [windowSize=3] - حجم النافذة
 * @returns {Array<number>} المتوسط المتحرك
 */
function calculateMovingAverage(scores, windowSize = 3) {
  if (!Array.isArray(scores)) {
    throw new Error('النقاط يجب أن تكون مصفوفة');
  }
  if (typeof windowSize !== 'number' || windowSize < 1) {
    throw new Error('حجم النافذة يجب أن يكون رقماً موجباً');
  }
  if (scores.length < windowSize) return [...scores];

  const result = [];
  for (let i = 0; i <= scores.length - windowSize; i++) {
    const window = scores.slice(i, i + windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / windowSize;
    result.push(Math.round(avg * 100) / 100);
  }
  return result;
}

// ─── مؤشرات الأداء الرئيسية ──────────────────────────────────────────────────

/**
 * حساب مؤشرات KPI الرئيسية للمستفيد
 *
 * @param {object} data - بيانات المستفيد
 * @param {number} data.attendedSessions
 * @param {number} data.totalSessions
 * @param {Array<object>} data.goals
 * @param {Array<number>} [data.progressScores] - نقاط التقييم الدوري
 * @param {number} [data.weeksInProgram] - عدد الأسابيع في البرنامج
 * @returns {object} مؤشرات الأداء
 */
function calculateBeneficiaryKPIs(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات المستفيد مطلوبة');
  }

  const {
    attendedSessions = 0,
    totalSessions = 0,
    goals = [],
    progressScores = [],
    weeksInProgram = 0,
  } = data;

  const attendanceRate = calculateAttendanceRate(attendedSessions, totalSessions);
  const goalAchievementRate = calculateGoalAchievementRate(goals);
  const trend = analyzeTrend(progressScores);

  // معدل الجلسات الأسبوعية
  const weeklySessionRate =
    weeksInProgram > 0 ? Math.round((attendedSessions / weeksInProgram) * 10) / 10 : 0;

  // درجة الأداء المركّبة (weighted composite)
  const compositeScore = Math.round(attendanceRate * 0.4 + goalAchievementRate * 0.6);

  return {
    attendanceRate,
    goalAchievementRate,
    compositeScore,
    progressTrend: trend.direction,
    weeklySessionRate,
    totalSessions,
    attendedSessions,
    isOnTrack:
      attendanceRate >= MIN_ACCEPTABLE_ATTENDANCE_RATE &&
      goalAchievementRate >= MIN_ACCEPTABLE_GOAL_ACHIEVEMENT,
    recommendations: generateRecommendations(attendanceRate, goalAchievementRate, trend.direction),
  };
}

/**
 * توليد توصيات سريرية بناءً على مؤشرات الأداء
 *
 * @param {number} attendanceRate
 * @param {number} goalAchievementRate
 * @param {string} trendDirection
 * @returns {Array<string>}
 */
function generateRecommendations(attendanceRate, goalAchievementRate, trendDirection) {
  const recommendations = [];

  if (attendanceRate < MIN_ACCEPTABLE_ATTENDANCE_RATE) {
    recommendations.push('مراجعة عوائق الحضور والتنسيق مع أسرة المستفيد');
  }
  if (attendanceRate < 50) {
    recommendations.push('تقييم إمكانية تغيير أوقات الجلسات أو الانتقال لخدمات منزلية');
  }
  if (goalAchievementRate < MIN_ACCEPTABLE_GOAL_ACHIEVEMENT) {
    recommendations.push('إعادة تقييم أهداف الخطة الفردية وتعديلها لتكون أكثر واقعية');
  }
  if (trendDirection === TREND_DIRECTION.DECLINING) {
    recommendations.push('عقد اجتماع مراجعة عاجل مع الفريق المتعدد التخصصات');
  }
  if (trendDirection === TREND_DIRECTION.IMPROVING) {
    recommendations.push('الاستمرار في المنهج الحالي مع تصعيد مستوى التحدي');
  }

  return recommendations;
}

// ─── حساب كثافة الخدمة ───────────────────────────────────────────────────────

/**
 * حساب كثافة الخدمة المُقدَّمة
 *
 * @param {number} totalMinutes - إجمالي دقائق الجلسات
 * @param {number} totalWeeks - إجمالي الأسابيع
 * @returns {object} مؤشرات الكثافة
 */
function calculateServiceIntensity(totalMinutes, totalWeeks) {
  if (typeof totalMinutes !== 'number' || totalMinutes < 0) {
    throw new Error('إجمالي الدقائق يجب أن يكون رقماً موجباً');
  }
  if (typeof totalWeeks !== 'number' || totalWeeks <= 0) {
    throw new Error('عدد الأسابيع يجب أن يكون رقماً موجباً');
  }

  const minutesPerWeek = totalMinutes / totalWeeks;
  const hoursPerWeek = minutesPerWeek / 60;
  const hoursPerMonth = hoursPerWeek * 4;

  let intensityLevel;
  if (hoursPerWeek >= 20)
    intensityLevel = 'intensive'; // مكثف (Early Intervention)
  else if (hoursPerWeek >= 10) intensityLevel = 'high';
  else if (hoursPerWeek >= 5) intensityLevel = 'moderate';
  else if (hoursPerWeek >= 2) intensityLevel = 'low';
  else intensityLevel = 'minimal';

  return {
    totalMinutes,
    totalWeeks,
    minutesPerWeek: Math.round(minutesPerWeek),
    hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
    hoursPerMonth: Math.round(hoursPerMonth * 10) / 10,
    intensityLevel,
  };
}

// ─── حساب نسبة التسرب (Dropout Rate) ───────────────────────────────────────

/**
 * حساب معدل التسرب للبرنامج أو الفرع
 *
 * @param {number} enrolledCount - عدد المستفيدين المسجلين
 * @param {number} dropoutCount - عدد المتسربين
 * @param {number} [periodMonths=12] - فترة الحساب بالأشهر
 * @returns {object}
 */
function calculateDropoutRate(enrolledCount, dropoutCount, periodMonths = 12) {
  if (typeof enrolledCount !== 'number' || enrolledCount < 0) {
    throw new Error('عدد المسجلين يجب أن يكون رقماً موجباً');
  }
  if (typeof dropoutCount !== 'number' || dropoutCount < 0) {
    throw new Error('عدد المتسربين يجب أن يكون رقماً موجباً');
  }
  if (dropoutCount > enrolledCount) {
    throw new Error('عدد المتسربين لا يمكن أن يتجاوز عدد المسجلين');
  }

  const dropoutRate = enrolledCount > 0 ? Math.round((dropoutCount / enrolledCount) * 100) : 0;
  const annualizedRate =
    periodMonths > 0 ? Math.round((dropoutRate / periodMonths) * 12 * 10) / 10 : 0;

  return {
    enrolledCount,
    dropoutCount,
    retainedCount: enrolledCount - dropoutCount,
    dropoutRate,
    retentionRate: 100 - dropoutRate,
    annualizedDropoutRate: annualizedRate,
    periodMonths,
  };
}

// ─── حساب درجات المقاييس السريرية ──────────────────────────────────────────

/**
 * تطبيع درجات المقاييس المختلفة لمقياس موحد (0-100)
 *
 * @param {number} rawScore - الدرجة الخام
 * @param {number} minPossible - الحد الأدنى للمقياس
 * @param {number} maxPossible - الحد الأقصى للمقياس
 * @param {boolean} [higherIsBetter=true] - هل الأعلى أفضل؟
 * @returns {number} الدرجة المعيارية (0-100)
 */
function normalizeScore(rawScore, minPossible, maxPossible, higherIsBetter = true) {
  if (typeof rawScore !== 'number') {
    throw new Error('الدرجة الخام يجب أن تكون رقماً');
  }
  if (maxPossible <= minPossible) {
    throw new Error('الحد الأقصى يجب أن يكون أكبر من الحد الأدنى');
  }

  const clampedScore = Math.min(maxPossible, Math.max(minPossible, rawScore));
  const normalized = ((clampedScore - minPossible) / (maxPossible - minPossible)) * 100;

  return Math.round(higherIsBetter ? normalized : 100 - normalized);
}

/**
 * حساب نقاط التحسن بين تقييمين
 *
 * @param {number} baselineScore - الدرجة الأساسية
 * @param {number} currentScore - الدرجة الحالية
 * @returns {object}
 */
function calculateImprovementScore(baselineScore, currentScore) {
  if (typeof baselineScore !== 'number' || typeof currentScore !== 'number') {
    throw new Error('الدرجات يجب أن تكون أرقاماً');
  }

  const absoluteChange = currentScore - baselineScore;
  const percentChange =
    baselineScore !== 0 ? Math.round((absoluteChange / baselineScore) * 100) : 0;

  return {
    baseline: baselineScore,
    current: currentScore,
    absoluteChange: Math.round(absoluteChange * 100) / 100,
    percentChange,
    direction:
      absoluteChange > 0
        ? TREND_DIRECTION.IMPROVING
        : absoluteChange < 0
          ? TREND_DIRECTION.DECLINING
          : TREND_DIRECTION.STABLE,
  };
}

// ─── تقرير شامل للمستفيد ─────────────────────────────────────────────────────

/**
 * توليد تقرير تقدم شامل للمستفيد
 *
 * @param {object} beneficiaryData
 * @param {string} beneficiaryData.id
 * @param {string} beneficiaryData.name
 * @param {number} beneficiaryData.attendedSessions
 * @param {number} beneficiaryData.totalSessions
 * @param {Array<object>} beneficiaryData.goals
 * @param {Array<number>} [beneficiaryData.progressScores]
 * @param {number} [beneficiaryData.weeksInProgram]
 * @param {number} [beneficiaryData.totalServiceMinutes]
 * @returns {object} تقرير شامل
 */
function generateProgressReport(beneficiaryData) {
  if (!beneficiaryData || typeof beneficiaryData !== 'object') {
    throw new Error('بيانات المستفيد مطلوبة');
  }

  const {
    id,
    name,
    attendedSessions = 0,
    totalSessions = 0,
    goals = [],
    progressScores = [],
    weeksInProgram = 0,
    totalServiceMinutes = 0,
  } = beneficiaryData;

  const kpis = calculateBeneficiaryKPIs({
    attendedSessions,
    totalSessions,
    goals,
    progressScores,
    weeksInProgram,
  });

  const goalStats = calculateGoalStats(goals);
  const attendanceStats = calculateAttendanceStats(
    Array.from({ length: totalSessions }, (_, i) => ({
      status: i < attendedSessions ? 'attended' : 'no_show',
    }))
  );

  const serviceIntensity =
    weeksInProgram > 0 && totalServiceMinutes > 0
      ? calculateServiceIntensity(totalServiceMinutes, weeksInProgram)
      : null;

  const trend = analyzeTrend(progressScores);

  return {
    beneficiaryId: id,
    beneficiaryName: name,
    reportDate: new Date().toISOString().split('T')[0],
    summary: {
      overallStatus: kpis.isOnTrack ? 'on_track' : 'needs_attention',
      compositeScore: kpis.compositeScore,
      progressLevel: classifyGoalAchievement(kpis.compositeScore),
    },
    attendance: {
      rate: kpis.attendanceRate,
      classification: attendanceStats.classification,
      total: totalSessions,
      attended: attendedSessions,
    },
    goals: goalStats,
    trend: {
      direction: trend.direction,
      changePercent: trend.changePercent,
      dataPoints: progressScores.length,
    },
    serviceIntensity,
    recommendations: kpis.recommendations,
    kpis,
  };
}

// ─── مقارنة أداء الفروع ──────────────────────────────────────────────────────

/**
 * تصنيف وترتيب الفروع حسب الأداء
 *
 * @param {Array<object>} branchesData - بيانات الفروع
 * @param {string} branchesData[].branchId
 * @param {number} branchesData[].averageAttendanceRate
 * @param {number} branchesData[].averageGoalAchievementRate
 * @param {number} [branchesData[].dropoutRate]
 * @returns {Array<object>} الفروع مرتبة حسب الأداء
 */
function rankBranchesByPerformance(branchesData) {
  if (!Array.isArray(branchesData)) {
    throw new Error('بيانات الفروع يجب أن تكون مصفوفة');
  }
  if (branchesData.length === 0) return [];

  return branchesData
    .map(branch => {
      const compositeScore = Math.round(
        branch.averageAttendanceRate * 0.3 +
          branch.averageGoalAchievementRate * 0.5 +
          (100 - (branch.dropoutRate || 0)) * 0.2
      );

      return {
        ...branch,
        compositeScore,
        performanceLevel: classifyGoalAchievement(compositeScore),
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((branch, index) => ({ ...branch, rank: index + 1 }));
}

// ─── الصادرات ─────────────────────────────────────────────────────────────────

module.exports = {
  // معدل الحضور
  calculateAttendanceRate,
  classifyAttendanceRate,
  calculateAttendanceStats,

  // الأهداف السريرية
  calculateGoalAchievementRate,
  calculateGoalStats,
  classifyGoalAchievement,

  // تحليل الاتجاهات
  analyzeTrend,
  calculateMovingAverage,

  // مؤشرات KPI
  calculateBeneficiaryKPIs,
  generateRecommendations,

  // كثافة الخدمة
  calculateServiceIntensity,

  // معدل التسرب
  calculateDropoutRate,

  // درجات المقاييس
  normalizeScore,
  calculateImprovementScore,

  // التقارير
  generateProgressReport,
  rankBranchesByPerformance,

  // الثوابت
  MIN_ACCEPTABLE_ATTENDANCE_RATE,
  MIN_ACCEPTABLE_GOAL_ACHIEVEMENT,
  MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT,
  STANDARD_REVIEW_PERIOD_WEEKS,
  TARGET_WEEKLY_IMPROVEMENT_RATE,
  MIN_DATA_POINTS_FOR_TREND,
  PROGRESS_LEVELS,
  GOAL_STATUS,
  TREND_DIRECTION,
};
