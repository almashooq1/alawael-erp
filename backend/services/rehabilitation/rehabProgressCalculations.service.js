/**
 * Rehabilitation Progress & Clinical Analytics Service
 * خدمة تحليل تقدم التأهيل والبيانات السريرية
 * IEP Goals + Session Analytics + Outcome Measures + Clinical KPIs
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const REHAB_CONSTANTS = {
  SPECIALIZATIONS: {
    PT: 'pt', // علاج طبيعي
    OT: 'ot', // علاج وظيفي
    SPEECH: 'speech', // علاج نطق ولغة
    ABA: 'aba', // تحليل السلوك التطبيقي
    PSYCHOLOGY: 'psychology', // علم النفس
    SPECIAL_ED: 'special_education', // تربية خاصة
    VOCATIONAL: 'vocational', // تأهيل مهني
  },
  GOAL_STATUS: {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    ACHIEVED: 'achieved',
    PARTIALLY_ACHIEVED: 'partially_achieved',
    DISCONTINUED: 'discontinued',
    ON_HOLD: 'on_hold',
  },
  SESSION_STATUS: {
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
    CANCELLED: 'cancelled',
    LATE_CANCEL: 'late_cancel',
  },
  PROGRESS_LEVELS: {
    SIGNIFICANT_PROGRESS: 'significant_progress', // > 75% تحسن
    MODERATE_PROGRESS: 'moderate_progress', // 50-75%
    MINIMAL_PROGRESS: 'minimal_progress', // 25-50%
    NO_PROGRESS: 'no_progress', // < 25%
    REGRESSION: 'regression', // تراجع
  },
  DISABILITY_SEVERITY: {
    MILD: 'mild',
    MODERATE: 'moderate',
    SEVERE: 'severe',
    PROFOUND: 'profound',
  },
  MEASUREMENT_SCALES: {
    FUNCTIONAL_INDEPENDENCE: 'fim', // FIM Scale 1-7
    BARTHEL: 'barthel', // 0-100
    PEABODY: 'peabody', // Peabody Motor Scales
    GOAL_ATTAINMENT: 'gas', // Goal Attainment Scaling -2 to +2
    VINELAND: 'vineland', // Vineland Adaptive Behavior
  },
  THRESHOLDS: {
    ATTENDANCE_WARNING: 70, // % حضور - تحذير
    ATTENDANCE_CRITICAL: 50, // % حضور - حرج
    GOAL_ACHIEVEMENT_TARGET: 80, // % هدف الإنجاز المستهدف
    SESSION_DURATION_MIN: 30, // دقيقة - حد أدنى
    SESSION_DURATION_MAX: 120, // دقيقة - حد أقصى
    MAX_CASELOAD_PT: 15,
    MAX_CASELOAD_ABA: 8,
    MAX_CASELOAD_OTHER: 12,
  },
};

// ========================================
// IEP GOAL PROGRESS CALCULATION
// ========================================

/**
 * حساب تقدم أهداف الخطة الفردية (IEP)
 * @param {Array} goals - أهداف IEP مع البيانات المرحلية
 * @returns {object} - ملخص التقدم
 */
function calculateIEPProgress(goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return {
      totalGoals: 0,
      achievedGoals: 0,
      achievementRate: 0,
      overallProgress: 0,
      goalsByStatus: {},
      recommendations: [],
    };
  }

  const statusCounts = {};
  for (const status of Object.values(REHAB_CONSTANTS.GOAL_STATUS)) {
    statusCounts[status] = 0;
  }

  let totalProgressSum = 0;
  let achievedCount = 0;

  const goalDetails = goals.map(goal => {
    const progress = _calculateSingleGoalProgress(goal);
    statusCounts[progress.status] = (statusCounts[progress.status] || 0) + 1;
    totalProgressSum += progress.progressPercentage;
    if (progress.status === REHAB_CONSTANTS.GOAL_STATUS.ACHIEVED) achievedCount++;

    return {
      goalId: goal.id,
      description: goal.description,
      status: progress.status,
      progressPercentage: progress.progressPercentage,
      trend: progress.trend,
      daysRemaining: progress.daysRemaining,
    };
  });

  const overallProgress = goals.length > 0 ? Math.round(totalProgressSum / goals.length) : 0;
  const achievementRate = goals.length > 0 ? Math.round((achievedCount / goals.length) * 100) : 0;

  const recommendations = _generateGoalRecommendations(goalDetails, achievementRate);

  return {
    totalGoals: goals.length,
    achievedGoals: achievedCount,
    achievementRate,
    overallProgress,
    goalsByStatus: statusCounts,
    goalDetails,
    recommendations,
  };
}

function _calculateSingleGoalProgress(goal) {
  if (!goal) return { status: 'not_started', progressPercentage: 0, trend: 'stable' };

  const baseline = goal.baseline || 0;
  const target = goal.target || 100;
  const current = goal.currentValue || goal.current || baseline;
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

  // حساب نسبة التقدم
  let progressPercentage = 0;
  if (target !== baseline) {
    progressPercentage = Math.round(((current - baseline) / (target - baseline)) * 100);
    progressPercentage = Math.max(0, Math.min(100, progressPercentage));
  }

  // تحديد الحالة
  let status;
  if (goal.status === REHAB_CONSTANTS.GOAL_STATUS.DISCONTINUED) {
    status = REHAB_CONSTANTS.GOAL_STATUS.DISCONTINUED;
  } else if (goal.status === REHAB_CONSTANTS.GOAL_STATUS.ON_HOLD) {
    status = REHAB_CONSTANTS.GOAL_STATUS.ON_HOLD;
  } else if (progressPercentage >= 100) {
    status = REHAB_CONSTANTS.GOAL_STATUS.ACHIEVED;
  } else if (progressPercentage >= 50) {
    status = REHAB_CONSTANTS.GOAL_STATUS.IN_PROGRESS;
  } else if (progressPercentage > 0) {
    status = REHAB_CONSTANTS.GOAL_STATUS.PARTIALLY_ACHIEVED;
  } else {
    status = REHAB_CONSTANTS.GOAL_STATUS.NOT_STARTED;
  }

  // حساب الاتجاه من آخر قياسين
  let trend = 'stable';
  if (Array.isArray(goal.measurements) && goal.measurements.length >= 2) {
    const sorted = [...goal.measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1].value;
    const prev = sorted[sorted.length - 2].value;
    if (last > prev) trend = 'improving';
    else if (last < prev) trend = 'declining';
  }

  // الأيام المتبقية
  const daysRemaining = targetDate
    ? Math.max(0, Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return { status, progressPercentage, trend, daysRemaining };
}

function _generateGoalRecommendations(goalDetails, achievementRate) {
  const recs = [];

  const decliningGoals = goalDetails.filter(g => g.trend === 'declining');
  if (decliningGoals.length > 0) {
    recs.push({
      type: 'warning',
      message: `${decliningGoals.length} هدف يُظهر تراجعاً - يُوصى بمراجعة خطة التدخل`,
      goals: decliningGoals.map(g => g.goalId),
    });
  }

  if (achievementRate < REHAB_CONSTANTS.THRESHOLDS.GOAL_ACHIEVEMENT_TARGET) {
    recs.push({
      type: 'attention',
      message: `معدل إنجاز الأهداف ${achievementRate}% أقل من المستهدف ${REHAB_CONSTANTS.THRESHOLDS.GOAL_ACHIEVEMENT_TARGET}%`,
    });
  }

  const urgentGoals = goalDetails.filter(
    g => g.daysRemaining !== null && g.daysRemaining <= 14 && g.progressPercentage < 80
  );
  if (urgentGoals.length > 0) {
    recs.push({
      type: 'urgent',
      message: `${urgentGoals.length} هدف يقترب من الموعد النهائي مع تقدم غير كافٍ`,
      goals: urgentGoals.map(g => g.goalId),
    });
  }

  return recs;
}

// ========================================
// SESSION ANALYTICS
// ========================================

/**
 * تحليل جلسات المستفيد
 * @param {Array} sessions - جلسات المستفيد
 * @param {object} options - خيارات التحليل {period}
 * @returns {object} - إحصائيات الجلسات
 */
function analyzeSessionMetrics(sessions, options = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      total: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      attendanceRate: 0,
      totalHours: 0,
      averageDuration: 0,
      bySpecialization: {},
    };
  }

  // فلترة بالفترة الزمنية
  let filtered = sessions;
  if (options.startDate || options.endDate) {
    filtered = sessions.filter(s => {
      const date = new Date(s.date || s.appointmentDate || 0);
      if (options.startDate && date < new Date(options.startDate)) return false;
      if (options.endDate && date > new Date(options.endDate)) return false;
      return true;
    });
  }

  const completed = filtered.filter(
    s => s.status === REHAB_CONSTANTS.SESSION_STATUS.COMPLETED
  ).length;
  const noShow = filtered.filter(s => s.status === REHAB_CONSTANTS.SESSION_STATUS.NO_SHOW).length;
  const cancelled = filtered.filter(s =>
    [REHAB_CONSTANTS.SESSION_STATUS.CANCELLED, REHAB_CONSTANTS.SESSION_STATUS.LATE_CANCEL].includes(
      s.status
    )
  ).length;

  const scheduledAndCompleted = completed + noShow;
  const attendanceRate =
    scheduledAndCompleted > 0 ? Math.round((completed / scheduledAndCompleted) * 100) : 0;

  // إجمالي الساعات
  const completedSessions = filtered.filter(
    s => s.status === REHAB_CONSTANTS.SESSION_STATUS.COMPLETED
  );
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.durationMinutes || s.duration || 45),
    0
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const averageDuration =
    completedSessions.length > 0 ? Math.round(totalMinutes / completedSessions.length) : 0;

  // تحليل حسب التخصص
  const bySpecialization = {};
  for (const session of filtered) {
    const spec = session.specialization || session.serviceType || 'unknown';
    if (!bySpecialization[spec]) {
      bySpecialization[spec] = { total: 0, completed: 0, noShow: 0, hours: 0 };
    }
    bySpecialization[spec].total++;
    if (session.status === REHAB_CONSTANTS.SESSION_STATUS.COMPLETED) {
      bySpecialization[spec].completed++;
      bySpecialization[spec].hours += (session.durationMinutes || 45) / 60;
    }
    if (session.status === REHAB_CONSTANTS.SESSION_STATUS.NO_SHOW) {
      bySpecialization[spec].noShow++;
    }
  }

  // جودة الحضور
  const attendanceStatus =
    attendanceRate >= REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_WARNING
      ? 'good'
      : attendanceRate >= REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_CRITICAL
        ? 'warning'
        : 'critical';

  return {
    total: filtered.length,
    completed,
    noShow,
    cancelled,
    attendanceRate,
    attendanceStatus,
    totalHours,
    averageDuration,
    bySpecialization,
    consecutiveNoShows: _countConsecutiveNoShows(filtered),
  };
}

function _countConsecutiveNoShows(sessions) {
  if (!sessions.length) return 0;
  const sorted = [...sessions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  let count = 0;
  for (const session of sorted) {
    if (session.status === REHAB_CONSTANTS.SESSION_STATUS.NO_SHOW) count++;
    else break;
  }
  return count;
}

// ========================================
// CLINICAL OUTCOME MEASURES
// ========================================

/**
 * حساب مقاييس النتائج السريرية
 * @param {object} assessmentData - {scale, initialScore, currentScore, maxScore, minScore}
 * @returns {object} - نتائج التحليل
 */
function calculateOutcomeMeasure(assessmentData) {
  if (!assessmentData || assessmentData.currentScore === undefined) {
    return { isValid: false, change: 0, percentageChange: 0, interpretation: 'no_data' };
  }

  const { scale, initialScore = 0, currentScore, maxScore, minScore = 0 } = assessmentData;

  const change = currentScore - initialScore;
  const possibleChange = (maxScore || 100) - initialScore;
  const percentageChange =
    possibleChange !== 0 ? Math.round((change / Math.abs(possibleChange)) * 100) : 0;

  // حساب نسبة تحقق الهدف (من الحد الأدنى للأقصى)
  const range = (maxScore || 100) - minScore;
  const currentFromMin = currentScore - minScore;
  const normalizedScore = range > 0 ? Math.round((currentFromMin / range) * 100) : 0;

  // تفسير حسب المقياس
  const interpretation = _interpretScore(scale, currentScore, maxScore, percentageChange);

  // مستوى التقدم
  let progressLevel;
  if (percentageChange < -10) progressLevel = REHAB_CONSTANTS.PROGRESS_LEVELS.REGRESSION;
  else if (percentageChange < 25) progressLevel = REHAB_CONSTANTS.PROGRESS_LEVELS.NO_PROGRESS;
  else if (percentageChange < 50) progressLevel = REHAB_CONSTANTS.PROGRESS_LEVELS.MINIMAL_PROGRESS;
  else if (percentageChange < 75) progressLevel = REHAB_CONSTANTS.PROGRESS_LEVELS.MODERATE_PROGRESS;
  else progressLevel = REHAB_CONSTANTS.PROGRESS_LEVELS.SIGNIFICANT_PROGRESS;

  return {
    isValid: true,
    scale,
    initialScore,
    currentScore,
    change,
    percentageChange,
    normalizedScore,
    progressLevel,
    interpretation,
    mcid: _checkMCID(scale, change), // Minimal Clinically Important Difference
  };
}

function _interpretScore(scale, score, maxScore, percentChange) {
  if (scale === REHAB_CONSTANTS.MEASUREMENT_SCALES.FUNCTIONAL_INDEPENDENCE) {
    // FIM: 1-7 لكل عنصر، 18-126 إجمالي
    if (score >= 108) return 'complete_independence';
    if (score >= 90) return 'modified_independence';
    if (score >= 72) return 'supervision_needed';
    if (score >= 54) return 'minimal_assistance';
    if (score >= 36) return 'moderate_assistance';
    if (score >= 18) return 'maximal_assistance';
    return 'total_assistance';
  }

  if (scale === REHAB_CONSTANTS.MEASUREMENT_SCALES.GOAL_ATTAINMENT) {
    // GAS: -2 إلى +2
    if (score >= 2) return 'exceeds_expectations';
    if (score >= 1) return 'achieved_above_goal';
    if (score === 0) return 'goal_achieved';
    if (score >= -1) return 'partial_achievement';
    return 'below_baseline';
  }

  if (scale === REHAB_CONSTANTS.MEASUREMENT_SCALES.BARTHEL) {
    if (score >= 90) return 'minimal_disability';
    if (score >= 75) return 'moderate_disability';
    if (score >= 50) return 'moderately_severe';
    if (score >= 25) return 'severe_disability';
    return 'very_severe_disability';
  }

  // تفسير عام
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return 'excellent';
  if (pct >= 60) return 'good';
  if (pct >= 40) return 'fair';
  return 'poor';
}

function _checkMCID(scale, change) {
  // الحد الأدنى للتغيير المهم سريرياً
  const mcidValues = {
    [REHAB_CONSTANTS.MEASUREMENT_SCALES.FUNCTIONAL_INDEPENDENCE]: 22,
    [REHAB_CONSTANTS.MEASUREMENT_SCALES.BARTHEL]: 15,
    [REHAB_CONSTANTS.MEASUREMENT_SCALES.GOAL_ATTAINMENT]: 1,
  };
  const mcid = mcidValues[scale] || 10;
  return {
    threshold: mcid,
    reached: Math.abs(change) >= mcid,
    value: Math.abs(change),
  };
}

// ========================================
// THERAPIST PERFORMANCE ANALYTICS
// ========================================

/**
 * تحليل أداء المعالج
 * @param {object} therapist - بيانات المعالج
 * @param {Array} sessions - جلسات المعالج
 * @param {Array} outcomes - نتائج المستفيدين
 * @returns {object} - مؤشرات الأداء
 */
function analyzeTherapistPerformance(therapist, sessions, outcomes) {
  if (!therapist) return { isValid: false };

  const sessionMetrics = analyzeSessionMetrics(sessions || []);

  // معدل تحسن المستفيدين
  const beneficiaryCount = outcomes?.length || 0;
  const improvedCount = outcomes?.filter(o => (o.percentageChange || 0) > 25).length || 0;
  const improvementRate =
    beneficiaryCount > 0 ? Math.round((improvedCount / beneficiaryCount) * 100) : 0;

  // الحد الأقصى لعدد المستفيدين حسب التخصص
  const maxCaseload = _getMaxCaseload(therapist.specialization);
  const currentCaseload = therapist.activeCaseload || therapist.caseload || 0;
  const caseloadUtilization =
    maxCaseload > 0 ? Math.round((currentCaseload / maxCaseload) * 100) : 0;

  // الساعات المكتملة هذا الشهر
  const monthlyHours = sessionMetrics.totalHours;

  // نقاط الأداء (0-100)
  const performanceScore = _calculateTherapistScore({
    attendanceRate: sessionMetrics.attendanceRate,
    improvementRate,
    caseloadUtilization,
    noShowRate:
      sessionMetrics.total > 0
        ? Math.round((sessionMetrics.noShow / sessionMetrics.total) * 100)
        : 0,
  });

  return {
    therapistId: therapist.id,
    specialization: therapist.specialization,
    sessionMetrics,
    caseloadUtilization,
    currentCaseload,
    maxCaseload,
    improvementRate,
    monthlyHours,
    performanceScore,
    rating: _scoreToRating(performanceScore),
    alerts: _generateTherapistAlerts(therapist, sessionMetrics, caseloadUtilization),
  };
}

function _getMaxCaseload(specialization) {
  const caseloads = {
    [REHAB_CONSTANTS.SPECIALIZATIONS.ABA]: REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_ABA,
    [REHAB_CONSTANTS.SPECIALIZATIONS.PT]: REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_PT,
  };
  return caseloads[specialization] || REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_OTHER;
}

function _calculateTherapistScore({
  attendanceRate,
  improvementRate,
  caseloadUtilization,
  noShowRate,
}) {
  let score = 0;
  // معدل الحضور (30%)
  score += (attendanceRate / 100) * 30;
  // معدل التحسن (40%)
  score += (improvementRate / 100) * 40;
  // الكفاءة (20%) - حوالي 80% استخدام مثالي
  const caseloadScore = Math.max(0, 100 - Math.abs(caseloadUtilization - 80));
  score += (caseloadScore / 100) * 20;
  // خصم الغياب (10%)
  score += Math.max(0, 10 - noShowRate / 10);

  return Math.round(Math.min(100, score));
}

function _scoreToRating(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'satisfactory';
  if (score >= 45) return 'needs_improvement';
  return 'unsatisfactory';
}

function _generateTherapistAlerts(therapist, sessionMetrics, caseloadUtilization) {
  const alerts = [];
  if (sessionMetrics.attendanceRate < REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_WARNING) {
    alerts.push({
      type: 'attendance',
      severity: 'warning',
      message: `معدل حضور المستفيدين ${sessionMetrics.attendanceRate}% أقل من المطلوب`,
    });
  }
  if (caseloadUtilization > 100) {
    alerts.push({
      type: 'caseload',
      severity: 'warning',
      message: 'تجاوز الحد الأقصى لعدد المستفيدين',
    });
  }
  if (sessionMetrics.consecutiveNoShows >= 3) {
    alerts.push({
      type: 'no_show',
      severity: 'urgent',
      message: `${sessionMetrics.consecutiveNoShows} غياب متتالي - مراجعة مطلوبة`,
    });
  }
  return alerts;
}

// ========================================
// BENEFICIARY RISK ASSESSMENT
// ========================================

/**
 * تقييم خطر تسرب/انقطاع المستفيد
 * @param {object} beneficiary - بيانات المستفيد
 * @param {Array} sessions - جلسات المستفيد
 * @param {object} goalProgress - تقدم الأهداف
 * @returns {object} - مستوى الخطر والمؤشرات
 */
function assessDropoutRisk(beneficiary, sessions, goalProgress) {
  if (!beneficiary) {
    return { riskLevel: 'unknown', riskScore: 0, factors: [] };
  }

  let riskScore = 0;
  const factors = [];

  // عامل الغياب المتكرر
  const sessionStats = analyzeSessionMetrics(sessions || []);
  if (sessionStats.attendanceRate < 50) {
    riskScore += 35;
    factors.push({ factor: 'low_attendance', weight: 35, value: sessionStats.attendanceRate });
  } else if (sessionStats.attendanceRate < 70) {
    riskScore += 20;
    factors.push({ factor: 'moderate_attendance', weight: 20, value: sessionStats.attendanceRate });
  }

  // غياب متتالي
  if (sessionStats.consecutiveNoShows >= 3) {
    riskScore += 25;
    factors.push({
      factor: 'consecutive_no_shows',
      weight: 25,
      value: sessionStats.consecutiveNoShows,
    });
  }

  // عدم تقدم في الأهداف
  if (goalProgress) {
    if (goalProgress.overallProgress < 20) {
      riskScore += 15;
      factors.push({
        factor: 'minimal_goal_progress',
        weight: 15,
        value: goalProgress.overallProgress,
      });
    }
    const decliningGoals =
      goalProgress.goalDetails?.filter(g => g.trend === 'declining').length || 0;
    if (decliningGoals > 0) {
      riskScore += 10;
      factors.push({ factor: 'declining_goals', weight: 10, value: decliningGoals });
    }
  }

  // عمر المستفيد (كبار السن أو المراهقون أعلى خطراً)
  if (beneficiary.age >= 14 && beneficiary.age <= 18) {
    riskScore += 10;
    factors.push({ factor: 'adolescent_age', weight: 10, value: beneficiary.age });
  }

  // عدم وجود ولي أمر منخرط
  if (beneficiary.guardianEngagementScore < 50) {
    riskScore += 15;
    factors.push({
      factor: 'low_guardian_engagement',
      weight: 15,
      value: beneficiary.guardianEngagementScore,
    });
  }

  // تحديد مستوى الخطر
  let riskLevel;
  if (riskScore >= 60) riskLevel = 'high';
  else if (riskScore >= 35) riskLevel = 'medium';
  else riskLevel = 'low';

  return {
    beneficiaryId: beneficiary.id,
    riskLevel,
    riskScore: Math.min(100, riskScore),
    factors,
    recommendations: _generateDropoutInterventions(riskLevel, factors),
  };
}

function _generateDropoutInterventions(riskLevel, factors) {
  const interventions = [];
  if (riskLevel === 'high') {
    interventions.push('تواصل فوري مع ولي الأمر');
    interventions.push('مراجعة خطة التدخل مع الفريق السريري');
    interventions.push('جدولة جلسة تقييم شاملة');
  }
  if (factors.some(f => f.factor === 'consecutive_no_shows')) {
    interventions.push('الاتصال بولي الأمر لفهم أسباب الغياب');
  }
  if (factors.some(f => f.factor === 'minimal_goal_progress')) {
    interventions.push('إعادة النظر في الأهداف ومدى واقعيتها');
  }
  return interventions;
}

// ========================================
// CLINICAL PROGRESS REPORT
// ========================================

/**
 * توليد تقرير التقدم السريري الشامل
 * @param {object} beneficiary - بيانات المستفيد
 * @param {Array} sessions - الجلسات
 * @param {Array} goals - الأهداف
 * @param {Array} assessments - التقييمات
 * @param {object} period - الفترة الزمنية {start, end}
 * @returns {object} - تقرير شامل
 */
function generateClinicalProgressReport(beneficiary, sessions, goals, assessments, period) {
  if (!beneficiary) {
    return { isValid: false, message: 'بيانات المستفيد مطلوبة' };
  }

  const sessionMetrics = analyzeSessionMetrics(sessions || [], {
    startDate: period?.start,
    endDate: period?.end,
  });

  const goalProgress = calculateIEPProgress(goals || []);

  const outcomeResults = (assessments || []).map(a => calculateOutcomeMeasure(a));

  const dropoutRisk = assessDropoutRisk(beneficiary, sessions || [], goalProgress);

  // تقييم الأداء العام
  const overallScore = _calculateOverallProgressScore(sessionMetrics, goalProgress, outcomeResults);

  return {
    isValid: true,
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name || beneficiary.nameAr,
    period: {
      start: period?.start || 'غير محدد',
      end: period?.end || 'غير محدد',
    },
    summary: {
      overallScore,
      overallRating: _scoreToRating(overallScore),
      attendanceRate: sessionMetrics.attendanceRate,
      goalAchievementRate: goalProgress.achievementRate,
      dropoutRisk: dropoutRisk.riskLevel,
    },
    sessionMetrics,
    goalProgress,
    outcomeResults,
    dropoutRisk,
    recommendations: [...goalProgress.recommendations, ...dropoutRisk.recommendations],
    generatedAt: new Date().toISOString(),
  };
}

function _calculateOverallProgressScore(sessionMetrics, goalProgress, outcomes) {
  let score = 0;
  // حضور (30%)
  score += (sessionMetrics.attendanceRate / 100) * 30;
  // إنجاز الأهداف (40%)
  score += (goalProgress.achievementRate / 100) * 40;
  // نتائج التقييم (30%)
  if (outcomes.length > 0) {
    const avgProgress =
      outcomes.reduce((s, o) => s + Math.max(0, o.percentageChange || 0), 0) / outcomes.length;
    score += Math.min(30, (avgProgress / 100) * 30);
  } else {
    score += 15; // neutral إذا لا تقييمات
  }
  return Math.round(score);
}

// ========================================
// PROGRAM EFFECTIVENESS ANALYSIS
// ========================================

/**
 * تحليل فعالية البرامج العلاجية
 * @param {Array} programs - برامج علاجية مع نتائجها
 * @returns {object} - تحليل الفعالية
 */
function analyzeProgramEffectiveness(programs) {
  if (!Array.isArray(programs) || programs.length === 0) {
    return { totalPrograms: 0, effectiveness: [], ranking: [] };
  }

  const analysis = programs.map(program => {
    const outcomes = program.outcomes || [];
    const totalParticipants = outcomes.length;

    if (totalParticipants === 0) {
      return {
        programId: program.id,
        programName: program.name,
        participants: 0,
        effectivenessScore: 0,
        rating: 'insufficient_data',
      };
    }

    const significantImprovement = outcomes.filter(o => (o.percentageChange || 0) >= 50).length;

    const goalAchievements = outcomes.map(o => o.goalAchievementRate || 0);
    const avgGoalAchievement =
      goalAchievements.reduce((s, v) => s + v, 0) / goalAchievements.length;

    const dropoutCount = outcomes.filter(o => o.droppedOut === true).length;
    const retentionRate = Math.round(
      ((totalParticipants - dropoutCount) / totalParticipants) * 100
    );

    const effectivenessScore = Math.round(
      (significantImprovement / totalParticipants) * 50 +
        (avgGoalAchievement / 100) * 30 +
        (retentionRate / 100) * 20
    );

    return {
      programId: program.id,
      programName: program.name,
      participants: totalParticipants,
      significantImprovementRate: Math.round((significantImprovement / totalParticipants) * 100),
      avgGoalAchievement: Math.round(avgGoalAchievement),
      retentionRate,
      effectivenessScore,
      rating: _scoreToRating(effectivenessScore),
    };
  });

  // ترتيب حسب الفعالية
  const ranking = [...analysis].sort((a, b) => b.effectivenessScore - a.effectivenessScore);

  return {
    totalPrograms: programs.length,
    effectiveness: analysis,
    ranking,
    bestProgram: ranking[0] || null,
    averageEffectiveness:
      analysis.length > 0
        ? Math.round(analysis.reduce((s, p) => s + p.effectivenessScore, 0) / analysis.length)
        : 0,
  };
}

// ========================================
// DISCHARGE READINESS ASSESSMENT
// ========================================

/**
 * تقييم جاهزية المستفيد للتخريج
 * @param {object} beneficiary - بيانات المستفيد
 * @param {object} goalProgress - تقدم الأهداف
 * @param {Array} functionalScores - درجات الوظائف
 * @returns {object} - تقييم جاهزية التخريج
 */
function assessDischargeReadiness(beneficiary, goalProgress, functionalScores) {
  if (!beneficiary || !goalProgress) {
    return { readyForDischarge: false, readinessScore: 0 };
  }

  const criteria = [];
  let totalScore = 0;

  // معيار 1: إنجاز الأهداف (40%)
  const goalAchievementScore = Math.min(100, goalProgress.achievementRate);
  criteria.push({
    criterion: 'goal_achievement',
    weight: 40,
    score: goalAchievementScore,
    met: goalAchievementScore >= REHAB_CONSTANTS.THRESHOLDS.GOAL_ACHIEVEMENT_TARGET,
    description: `إنجاز الأهداف: ${goalAchievementScore}%`,
  });
  totalScore += (goalAchievementScore / 100) * 40;

  // معيار 2: مقاييس الوظائف (35%)
  const avgFunctional =
    functionalScores && functionalScores.length > 0
      ? functionalScores.reduce((s, f) => s + (f.normalizedScore || 0), 0) / functionalScores.length
      : 50;
  criteria.push({
    criterion: 'functional_independence',
    weight: 35,
    score: avgFunctional,
    met: avgFunctional >= 70,
    description: `الاستقلالية الوظيفية: ${Math.round(avgFunctional)}%`,
  });
  totalScore += (avgFunctional / 100) * 35;

  // معيار 3: حضور الجلسات (15%)
  const attendanceScore = beneficiary.lastPeriodAttendance || 80;
  criteria.push({
    criterion: 'attendance_consistency',
    weight: 15,
    score: attendanceScore,
    met: attendanceScore >= REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_WARNING,
    description: `انتظام الحضور: ${attendanceScore}%`,
  });
  totalScore += (attendanceScore / 100) * 15;

  // معيار 4: انخراط الأسرة (10%)
  const familyScore = beneficiary.guardianEngagementScore || 70;
  criteria.push({
    criterion: 'family_involvement',
    weight: 10,
    score: familyScore,
    met: familyScore >= 60,
    description: `انخراط الأسرة: ${familyScore}%`,
  });
  totalScore += (familyScore / 100) * 10;

  const readinessScore = Math.round(totalScore);
  const criteriaMet = criteria.filter(c => c.met).length;
  const readyForDischarge = readinessScore >= 75 && criteriaMet >= 3;

  return {
    beneficiaryId: beneficiary.id,
    readyForDischarge,
    readinessScore,
    criteriaMet,
    totalCriteria: criteria.length,
    criteria,
    recommendation: readyForDischarge
      ? 'المستفيد جاهز للتخريج مع متابعة دورية'
      : `يحتاج ${criteria.filter(c => !c.met).length} معايير إضافية قبل التخريج`,
  };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  REHAB_CONSTANTS,
  // IEP Goals
  calculateIEPProgress,
  // Sessions
  analyzeSessionMetrics,
  // Outcome Measures
  calculateOutcomeMeasure,
  // Therapist Performance
  analyzeTherapistPerformance,
  // Risk Assessment
  assessDropoutRisk,
  // Reports
  generateClinicalProgressReport,
  // Program Effectiveness
  analyzeProgramEffectiveness,
  // Discharge
  assessDischargeReadiness,
};
