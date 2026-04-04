/**
 * Clinical Progress & Quality Indicators Service
 * خدمة حسابات تقدم المستفيد ومؤشرات الجودة السريرية
 *
 * Pure Business Logic - No HTTP, No DB
 * مخصص لمراكز تأهيل ذوي الإعاقة - المملكة العربية السعودية
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════════

// تصنيفات مستوى الإعاقة
const DISABILITY_SEVERITY = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  PROFOUND: 'profound',
};

// أنواع التخصصات العلاجية
const SPECIALIZATIONS = {
  PT: 'pt', // علاج طبيعي
  OT: 'ot', // علاج وظيفي
  SPEECH: 'speech', // علاج نطق
  ABA: 'aba', // تحليل سلوك تطبيقي
  PSYCHOLOGY: 'psychology', // علم نفس
  SPECIAL_EDUCATION: 'special_education', // تربية خاصة
  VOCATIONAL: 'vocational', // تأهيل مهني
};

// حالات أهداف الخطة الفردية (IEP)
const GOAL_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  ACHIEVED: 'achieved',
  DISCONTINUED: 'discontinued',
  ON_HOLD: 'on_hold',
};

// حالات نتيجة الجلسة
const SESSION_OUTCOME = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  NO_SHOW: 'no_show',
};

// عتبات مؤشرات الجودة
const QUALITY_THRESHOLDS = {
  ATTENDANCE_EXCELLENT: 90, // %
  ATTENDANCE_GOOD: 75,
  ATTENDANCE_ACCEPTABLE: 60,
  GOAL_ACHIEVEMENT_EXCELLENT: 80, // %
  GOAL_ACHIEVEMENT_GOOD: 60,
  GOAL_ACHIEVEMENT_ACCEPTABLE: 40,
};

// معايير تقييم المقاييس السريرية
const SCALE_RANGES = {
  PEDI_CAM: { min: 0, max: 100, name: 'Pediatric Evaluation of Disability Inventory-CAT' },
  GMFCS: { min: 1, max: 5, name: 'Gross Motor Function Classification System' },
  MACS: { min: 1, max: 5, name: 'Manual Ability Classification System' },
  CFCS: { min: 1, max: 5, name: 'Communication Function Classification System' },
  BERG_BALANCE: { min: 0, max: 56, name: 'Berg Balance Scale' },
  FIM: { min: 18, max: 126, name: 'Functional Independence Measure' },
  VINELAND: { min: 20, max: 160, name: 'Vineland Adaptive Behavior Scales' },
};

// معاملات حساب نقاط التقدم
const PROGRESS_WEIGHTS = {
  goal_achievement: 0.35,
  attendance_rate: 0.25,
  session_quality: 0.25,
  functional_improvement: 0.15,
};

// ═══════════════════════════════════════════════════════════════
// دوال التحقق
// ═══════════════════════════════════════════════════════════════

function validatePercentage(value, fieldName = 'القيمة') {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} يجب أن تكون رقماً`);
  }
  if (value < 0 || value > 100) {
    throw new Error(`${fieldName} يجب أن تكون بين 0 و 100`);
  }
  return true;
}

function validatePositiveInteger(value, fieldName = 'العدد') {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} يجب أن يكون عدداً صحيحاً غير سالب`);
  }
  return true;
}

function validateScaleScore(score, scaleName) {
  const scale = SCALE_RANGES[scaleName];
  if (!scale) {
    throw new Error(`مقياس غير معروف: ${scaleName}`);
  }
  if (typeof score !== 'number' || isNaN(score)) {
    throw new Error(`درجة المقياس يجب أن تكون رقماً`);
  }
  if (score < scale.min || score > scale.max) {
    throw new Error(`درجة ${scale.name} يجب أن تكون بين ${scale.min} و ${scale.max}`);
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// حساب معدل الحضور
// ═══════════════════════════════════════════════════════════════

/**
 * حساب معدل حضور المستفيد
 * @param {number} attendedSessions - عدد الجلسات المحضورة
 * @param {number} totalScheduledSessions - إجمالي الجلسات المجدولة
 * @param {number} cancelledByCenter - الجلسات المُلغاة من المركز (لا تُحسب)
 * @returns {{ rate, attended, scheduled, effective, rating }}
 */
function calculateAttendanceRate(attendedSessions, totalScheduledSessions, cancelledByCenter = 0) {
  validatePositiveInteger(attendedSessions, 'الجلسات المحضورة');
  validatePositiveInteger(totalScheduledSessions, 'إجمالي الجلسات');
  validatePositiveInteger(cancelledByCenter, 'الجلسات الملغاة');

  if (cancelledByCenter > totalScheduledSessions) {
    throw new Error('عدد الجلسات الملغاة لا يمكن أن يتجاوز إجمالي الجلسات');
  }

  const effectiveSessions = totalScheduledSessions - cancelledByCenter;

  if (effectiveSessions === 0) {
    return {
      rate: 0,
      attended: attendedSessions,
      scheduled: totalScheduledSessions,
      effective: 0,
      cancelledByCenter,
      rating: 'N/A',
    };
  }

  if (attendedSessions > effectiveSessions) {
    throw new Error('عدد الجلسات المحضورة لا يمكن أن يتجاوز الجلسات الفعلية');
  }

  const rate = Math.round((attendedSessions / effectiveSessions) * 10000) / 100;

  let rating;
  if (rate >= QUALITY_THRESHOLDS.ATTENDANCE_EXCELLENT) rating = 'ممتاز';
  else if (rate >= QUALITY_THRESHOLDS.ATTENDANCE_GOOD) rating = 'جيد';
  else if (rate >= QUALITY_THRESHOLDS.ATTENDANCE_ACCEPTABLE) rating = 'مقبول';
  else rating = 'يحتاج متابعة';

  return {
    rate,
    attended: attendedSessions,
    scheduled: totalScheduledSessions,
    effective: effectiveSessions,
    cancelledByCenter,
    rating,
  };
}

// ═══════════════════════════════════════════════════════════════
// حساب تقدم الأهداف
// ═══════════════════════════════════════════════════════════════

/**
 * حساب نسبة تحقق أهداف خطة التأهيل الفردية (IEP)
 * @param {Array} goals - قائمة الأهداف
 * @returns {{ achievementRate, totalGoals, achievedGoals, inProgressGoals, byStatus }}
 */
function calculateGoalAchievementRate(goals) {
  if (!Array.isArray(goals)) {
    throw new Error('الأهداف يجب أن تكون مصفوفة');
  }
  if (goals.length === 0) {
    return {
      achievementRate: 0,
      totalGoals: 0,
      achievedGoals: 0,
      inProgressGoals: 0,
      notStartedGoals: 0,
      discontinuedGoals: 0,
      byStatus: {},
      rating: 'N/A',
    };
  }

  const byStatus = {};
  goals.forEach(goal => {
    const status = goal.status || GOAL_STATUS.NOT_STARTED;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  const achievedGoals = byStatus[GOAL_STATUS.ACHIEVED] || 0;
  const inProgressGoals = byStatus[GOAL_STATUS.IN_PROGRESS] || 0;
  const notStartedGoals = byStatus[GOAL_STATUS.NOT_STARTED] || 0;
  const discontinuedGoals = byStatus[GOAL_STATUS.DISCONTINUED] || 0;

  // الأهداف الفعلية (بدون الموقوفة والمتوقفة)
  const activeGoals = goals.length - discontinuedGoals - (byStatus[GOAL_STATUS.ON_HOLD] || 0);

  const achievementRate =
    activeGoals > 0 ? Math.round((achievedGoals / activeGoals) * 10000) / 100 : 0;

  // تقييم جزئي: الهدف المكتمل 50% يُحسب نصف نقطة
  const partialCredit = goals.reduce((sum, goal) => {
    if (goal.status === GOAL_STATUS.IN_PROGRESS && typeof goal.progressPercentage === 'number') {
      return sum + goal.progressPercentage / 100 / activeGoals;
    }
    return sum;
  }, 0);

  const weightedRate = Math.round((achievementRate / 100 + partialCredit * 0.5) * 10000) / 100;

  let rating;
  if (achievementRate >= QUALITY_THRESHOLDS.GOAL_ACHIEVEMENT_EXCELLENT) rating = 'ممتاز';
  else if (achievementRate >= QUALITY_THRESHOLDS.GOAL_ACHIEVEMENT_GOOD) rating = 'جيد';
  else if (achievementRate >= QUALITY_THRESHOLDS.GOAL_ACHIEVEMENT_ACCEPTABLE) rating = 'مقبول';
  else rating = 'يحتاج مراجعة';

  return {
    achievementRate,
    weightedRate: Math.min(weightedRate, 100),
    totalGoals: goals.length,
    activeGoals,
    achievedGoals,
    inProgressGoals,
    notStartedGoals,
    discontinuedGoals,
    byStatus,
    rating,
  };
}

/**
 * حساب نسبة التقدم في هدف واحد بناءً على جلسات التدريب
 * @param {Array} trialResults - نتائج المحاولات (true/false)
 * @param {number} masteryThreshold - عتبة الإتقان (مثلاً 80%)
 */
function calculateTrialBasedProgress(trialResults, masteryThreshold = 80) {
  if (!Array.isArray(trialResults) || trialResults.length === 0) {
    throw new Error('نتائج المحاولات يجب أن تكون مصفوفة غير فارغة');
  }
  validatePercentage(masteryThreshold, 'عتبة الإتقان');

  const totalTrials = trialResults.length;
  const correctTrials = trialResults.filter(r => r === true || r === 1).length;
  const errorTrials = trialResults.filter(r => r === false || r === 0).length;
  const promptedTrials = trialResults.filter(
    r => typeof r === 'string' && r.toLowerCase() === 'p'
  ).length;

  const successRate = Math.round((correctTrials / totalTrials) * 10000) / 100;
  const isMastered = successRate >= masteryThreshold;

  return {
    totalTrials,
    correctTrials,
    errorTrials,
    promptedTrials,
    successRate,
    masteryThreshold,
    isMastered,
    percentToMastery: isMastered ? 100 : Math.round((successRate / masteryThreshold) * 10000) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════
// حساب جودة الجلسات
// ═══════════════════════════════════════════════════════════════

/**
 * حساب متوسط جودة الجلسات
 * @param {Array} sessions - قائمة الجلسات مع نتائجها
 * @returns {{ averageScore, distribution, overallRating }}
 */
function calculateSessionQualityScore(sessions) {
  if (!Array.isArray(sessions)) {
    throw new Error('الجلسات يجب أن تكون مصفوفة');
  }
  if (sessions.length === 0) {
    return {
      averageScore: 0,
      totalSessions: 0,
      completedSessions: 0,
      distribution: {},
      overallRating: 'N/A',
    };
  }

  const outcomeScores = {
    [SESSION_OUTCOME.EXCELLENT]: 100,
    [SESSION_OUTCOME.GOOD]: 75,
    [SESSION_OUTCOME.FAIR]: 50,
    [SESSION_OUTCOME.POOR]: 25,
    [SESSION_OUTCOME.NO_SHOW]: 0,
  };

  const distribution = {};
  let totalScore = 0;
  let completedCount = 0;

  sessions.forEach(session => {
    const outcome = session.outcome || SESSION_OUTCOME.FAIR;
    distribution[outcome] = (distribution[outcome] || 0) + 1;

    if (outcome !== SESSION_OUTCOME.NO_SHOW) {
      totalScore += outcomeScores[outcome] || 50;
      completedCount++;
    }
  });

  const averageScore =
    completedCount > 0 ? Math.round((totalScore / completedCount) * 100) / 100 : 0;

  let overallRating;
  if (averageScore >= 85) overallRating = 'ممتاز';
  else if (averageScore >= 70) overallRating = 'جيد';
  else if (averageScore >= 55) overallRating = 'مقبول';
  else overallRating = 'يحتاج تحسين';

  return {
    averageScore,
    totalSessions: sessions.length,
    completedSessions: completedCount,
    noShowSessions: sessions.length - completedCount,
    distribution,
    overallRating,
  };
}

// ═══════════════════════════════════════════════════════════════
// حساب التحسن الوظيفي (Functional Improvement)
// ═══════════════════════════════════════════════════════════════

/**
 * حساب نسبة التحسن بناءً على قياسين (baseline و current)
 * @param {number} baselineScore - الدرجة الأساسية (عند البدء)
 * @param {number} currentScore - الدرجة الحالية
 * @param {string} scaleName - اسم المقياس
 * @param {boolean} higherIsBetter - هل درجة أعلى = تحسن؟ (افتراضي: true)
 */
function calculateFunctionalImprovement(
  baselineScore,
  currentScore,
  scaleName,
  higherIsBetter = true
) {
  validateScaleScore(baselineScore, scaleName);
  validateScaleScore(currentScore, scaleName);

  const scale = SCALE_RANGES[scaleName];
  const range = scale.max - scale.min;

  const rawDiff = higherIsBetter ? currentScore - baselineScore : baselineScore - currentScore;
  const improvementPoints = rawDiff;
  const improvementPercentage = Math.round((rawDiff / range) * 10000) / 100;
  const normalizedBaseline = Math.round(((baselineScore - scale.min) / range) * 10000) / 100;
  const normalizedCurrent = Math.round(((currentScore - scale.min) / range) * 10000) / 100;

  // نسبة التحسن من الوضع الأساسي
  const changeFromBaseline =
    baselineScore !== scale.min
      ? Math.round(((currentScore - baselineScore) / Math.abs(baselineScore - scale.min)) * 10000) /
        100
      : null;

  return {
    scaleName,
    scaleFullName: scale.name,
    baselineScore,
    currentScore,
    improvementPoints,
    improvementPercentage,
    normalizedBaseline,
    normalizedCurrent,
    changeFromBaseline,
    isImproved: improvementPoints > 0,
    isDeterioration: improvementPoints < 0,
    isUnchanged: improvementPoints === 0,
    minScore: scale.min,
    maxScore: scale.max,
  };
}

// ═══════════════════════════════════════════════════════════════
// حساب مؤشر التقدم الشامل
// ═══════════════════════════════════════════════════════════════

/**
 * حساب مؤشر التقدم الشامل للمستفيد (0-100)
 * يجمع: تحقق الأهداف + الحضور + جودة الجلسات + التحسن الوظيفي
 * @param {Object} data
 */
function calculateOverallProgressIndex(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات التقدم مطلوبة');
  }

  const {
    goalAchievementRate = 0,
    attendanceRate = 0,
    sessionQualityScore = 0,
    functionalImprovementScore = 0,
    customWeights = null,
  } = data;

  validatePercentage(goalAchievementRate, 'معدل تحقق الأهداف');
  validatePercentage(attendanceRate, 'معدل الحضور');
  validatePercentage(sessionQualityScore, 'درجة جودة الجلسات');
  validatePercentage(functionalImprovementScore, 'درجة التحسن الوظيفي');

  // التحقق من المعاملات المخصصة
  let weights = PROGRESS_WEIGHTS;
  if (customWeights) {
    const total = Object.values(customWeights).reduce((s, v) => s + v, 0);
    if (Math.abs(total - 1) > 0.001) {
      throw new Error('مجموع المعاملات المخصصة يجب أن يساوي 1');
    }
    weights = customWeights;
  }

  const overallIndex =
    Math.round(
      (goalAchievementRate * weights.goal_achievement +
        attendanceRate * weights.attendance_rate +
        sessionQualityScore * weights.session_quality +
        functionalImprovementScore * weights.functional_improvement) *
        100
    ) / 100;

  let progressCategory;
  if (overallIndex >= 80) progressCategory = 'تقدم ممتاز';
  else if (overallIndex >= 65) progressCategory = 'تقدم جيد';
  else if (overallIndex >= 50) progressCategory = 'تقدم متوسط';
  else if (overallIndex >= 35) progressCategory = 'تقدم محدود';
  else progressCategory = 'يحتاج مراجعة شاملة';

  return {
    overallIndex,
    progressCategory,
    components: {
      goalAchievement: {
        score: goalAchievementRate,
        weight: weights.goal_achievement,
        contribution: Math.round(goalAchievementRate * weights.goal_achievement * 100) / 100,
      },
      attendance: {
        score: attendanceRate,
        weight: weights.attendance_rate,
        contribution: Math.round(attendanceRate * weights.attendance_rate * 100) / 100,
      },
      sessionQuality: {
        score: sessionQualityScore,
        weight: weights.session_quality,
        contribution: Math.round(sessionQualityScore * weights.session_quality * 100) / 100,
      },
      functionalImprovement: {
        score: functionalImprovementScore,
        weight: weights.functional_improvement,
        contribution:
          Math.round(functionalImprovementScore * weights.functional_improvement * 100) / 100,
      },
    },
    weights,
  };
}

// ═══════════════════════════════════════════════════════════════
// مؤشرات جودة المركز (KPIs)
// ═══════════════════════════════════════════════════════════════

/**
 * حساب مؤشرات الأداء الرئيسية للمركز أو الفرع
 * @param {Array} beneficiaries - بيانات المستفيدين
 * @param {Object} period - فترة التقرير
 */
function calculateCenterKPIs(beneficiaries, period = null) {
  if (!Array.isArray(beneficiaries)) {
    throw new Error('بيانات المستفيدين يجب أن تكون مصفوفة');
  }

  if (beneficiaries.length === 0) {
    return {
      totalBeneficiaries: 0,
      averageAttendanceRate: 0,
      averageGoalAchievementRate: 0,
      averageProgressIndex: 0,
      dischargeReadyCount: 0,
      needsReviewCount: 0,
      period,
    };
  }

  let totalAttendance = 0;
  let totalGoalAchievement = 0;
  let totalProgressIndex = 0;
  let dischargeReadyCount = 0;
  let needsReviewCount = 0;

  beneficiaries.forEach(b => {
    totalAttendance += b.attendanceRate || 0;
    totalGoalAchievement += b.goalAchievementRate || 0;
    totalProgressIndex += b.overallProgressIndex || 0;

    if ((b.goalAchievementRate || 0) >= 80 && (b.attendanceRate || 0) >= 75) {
      dischargeReadyCount++;
    }
    if ((b.overallProgressIndex || 0) < 35) {
      needsReviewCount++;
    }
  });

  const count = beneficiaries.length;

  return {
    totalBeneficiaries: count,
    averageAttendanceRate: Math.round((totalAttendance / count) * 100) / 100,
    averageGoalAchievementRate: Math.round((totalGoalAchievement / count) * 100) / 100,
    averageProgressIndex: Math.round((totalProgressIndex / count) * 100) / 100,
    dischargeReadyCount,
    dischargeReadyPercentage: Math.round((dischargeReadyCount / count) * 10000) / 100,
    needsReviewCount,
    needsReviewPercentage: Math.round((needsReviewCount / count) * 10000) / 100,
    period,
  };
}

/**
 * حساب معدل الإشغال (Occupancy Rate) للمعالج
 * @param {number} scheduledSessions - الجلسات المجدولة
 * @param {number} availableSlots - الخانات المتاحة
 * @param {number} maxCapacity - الطاقة القصوى
 */
function calculateTherapistOccupancy(scheduledSessions, availableSlots, maxCapacity) {
  validatePositiveInteger(scheduledSessions, 'الجلسات المجدولة');
  validatePositiveInteger(availableSlots, 'الخانات المتاحة');
  validatePositiveInteger(maxCapacity, 'الطاقة القصوى');

  if (maxCapacity === 0) {
    throw new Error('الطاقة القصوى لا يمكن أن تكون صفراً');
  }
  if (scheduledSessions > maxCapacity) {
    throw new Error('الجلسات المجدولة لا يمكن أن تتجاوز الطاقة القصوى');
  }

  const occupancyRate = Math.round((scheduledSessions / maxCapacity) * 10000) / 100;
  const utilizationRate =
    availableSlots > 0 ? Math.round((scheduledSessions / availableSlots) * 10000) / 100 : 0;
  const remainingCapacity = maxCapacity - scheduledSessions;

  return {
    scheduledSessions,
    availableSlots,
    maxCapacity,
    remainingCapacity,
    occupancyRate,
    utilizationRate,
    isOverloaded: scheduledSessions > maxCapacity * 0.9,
    isUnderUtilized: occupancyRate < 50,
  };
}

// ═══════════════════════════════════════════════════════════════
// تصنيف وتحليل المستفيدين
// ═══════════════════════════════════════════════════════════════

/**
 * تصنيف المستفيدين حسب مستوى الاحتياج للتدخل
 * @param {Array} beneficiaries
 */
function stratifyBeneficiaries(beneficiaries) {
  if (!Array.isArray(beneficiaries)) {
    throw new Error('بيانات المستفيدين يجب أن تكون مصفوفة');
  }

  const strata = {
    high_intensity: [], // يحتاج تدخل مكثف
    standard: [], // تدخل معتاد
    maintenance: [], // مرحلة صيانة
    ready_for_discharge: [], // جاهز للتخريج
  };

  beneficiaries.forEach(b => {
    const progress = b.overallProgressIndex || 0;
    const attendance = b.attendanceRate || 0;
    const goalRate = b.goalAchievementRate || 0;

    if (goalRate >= 80 && attendance >= 80 && progress >= 75) {
      strata.ready_for_discharge.push(b);
    } else if (goalRate >= 50 && attendance >= 70 && progress >= 50) {
      strata.maintenance.push(b);
    } else if (progress >= 35 || attendance >= 60) {
      strata.standard.push(b);
    } else {
      strata.high_intensity.push(b);
    }
  });

  return {
    strata,
    summary: {
      high_intensity: strata.high_intensity.length,
      standard: strata.standard.length,
      maintenance: strata.maintenance.length,
      ready_for_discharge: strata.ready_for_discharge.length,
      total: beneficiaries.length,
    },
  };
}

/**
 * حساب تقرير التقدم الدوري (شهري/ربعي/سنوي)
 * @param {Object} beneficiary - بيانات المستفيد
 * @param {Array} previousReports - تقارير سابقة للمقارنة
 */
function generateProgressReport(beneficiary, previousReports = []) {
  if (!beneficiary || typeof beneficiary !== 'object') {
    throw new Error('بيانات المستفيد مطلوبة');
  }
  if (!Array.isArray(previousReports)) {
    throw new Error('التقارير السابقة يجب أن تكون مصفوفة');
  }

  const currentIndex = beneficiary.overallProgressIndex || 0;

  // المقارنة مع التقرير السابق
  let trend = null;
  let changeFromLastReport = null;
  if (previousReports.length > 0) {
    const lastReport = previousReports[previousReports.length - 1];
    const lastIndex = lastReport.overallProgressIndex || 0;
    changeFromLastReport = Math.round((currentIndex - lastIndex) * 100) / 100;
    if (changeFromLastReport > 5) trend = 'تحسن';
    else if (changeFromLastReport < -5) trend = 'تراجع';
    else trend = 'ثبات';
  }

  return {
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    reportDate: new Date().toISOString().split('T')[0],
    currentMetrics: {
      attendanceRate: beneficiary.attendanceRate || 0,
      goalAchievementRate: beneficiary.goalAchievementRate || 0,
      sessionQualityScore: beneficiary.sessionQualityScore || 0,
      overallProgressIndex: currentIndex,
    },
    trend,
    changeFromLastReport,
    previousReportsCount: previousReports.length,
    recommendation: getProgressRecommendation(
      currentIndex,
      beneficiary.attendanceRate || 0,
      beneficiary.goalAchievementRate || 0
    ),
  };
}

/**
 * اقتراح توصية بناءً على مؤشرات التقدم
 */
function getProgressRecommendation(progressIndex, attendanceRate, goalAchievementRate) {
  if (typeof progressIndex !== 'number' || typeof attendanceRate !== 'number') {
    throw new Error('مؤشرات التقدم يجب أن تكون أرقاماً');
  }

  if (goalAchievementRate >= 80 && attendanceRate >= 80) {
    return 'مستوى ممتاز - النظر في تخفيف التدخل أو الإحالة لمرحلة الصيانة';
  }
  if (attendanceRate < 60) {
    return 'معدل الحضور منخفض - التواصل مع ولي الأمر لمعرفة الأسباب وتذليل العقبات';
  }
  if (goalAchievementRate < 30) {
    return 'نسبة تحقق الأهداف منخفضة - مراجعة الأهداف وملاءمتها للمستفيد';
  }
  if (progressIndex < 35) {
    return 'تقدم محدود - اجتماع فريق متعدد التخصصات لمراجعة الخطة';
  }
  if (progressIndex >= 65) {
    return 'تقدم جيد - الاستمرار بالخطة الحالية مع مراجعة دورية';
  }
  return 'تقدم متوسط - تعزيز نقاط القوة ومعالجة جوانب الضعف';
}

// ═══════════════════════════════════════════════════════════════
// الصادرات
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // الثوابت
  DISABILITY_SEVERITY,
  SPECIALIZATIONS,
  GOAL_STATUS,
  SESSION_OUTCOME,
  QUALITY_THRESHOLDS,
  SCALE_RANGES,
  PROGRESS_WEIGHTS,

  // التحقق
  validatePercentage,
  validatePositiveInteger,
  validateScaleScore,

  // حساب الحضور
  calculateAttendanceRate,

  // حساب الأهداف
  calculateGoalAchievementRate,
  calculateTrialBasedProgress,

  // جودة الجلسات
  calculateSessionQualityScore,

  // التحسن الوظيفي
  calculateFunctionalImprovement,

  // المؤشر الشامل
  calculateOverallProgressIndex,

  // مؤشرات المركز
  calculateCenterKPIs,
  calculateTherapistOccupancy,

  // التحليل والتقارير
  stratifyBeneficiaries,
  generateProgressReport,
  getProgressRecommendation,
};
