/**
 * Branches & Settings Calculations Service
 * خدمة حسابات الفروع والإعدادات
 * Multi-Branch Operations + Performance KPIs + Capacity Management
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const BRANCH_CONSTANTS = {
  CAPACITY: {
    MIN_UTILIZATION_RATE: 0.6, // 60% الحد الأدنى للاستغلال
    OPTIMAL_UTILIZATION_RATE: 0.8, // 80% الاستغلال الأمثل
    MAX_UTILIZATION_RATE: 0.95, // 95% الحد الأقصى
    THERAPIST_MAX_DAILY_SESSIONS: 8,
    ROOM_OPERATIONAL_HOURS: 10, // ساعات تشغيل الغرفة يومياً
  },
  PERFORMANCE: {
    EXCELLENT_THRESHOLD: 90, // ممتاز ≥ 90%
    GOOD_THRESHOLD: 75, // جيد ≥ 75%
    AVERAGE_THRESHOLD: 60, // مقبول ≥ 60%
    POOR_THRESHOLD: 0, // ضعيف < 60%
  },
  SATISFACTION: {
    EXCELLENT: 4.5,
    GOOD: 4.0,
    AVERAGE: 3.0,
    POOR: 0,
  },
  KPI_WEIGHTS: {
    occupancy: 0.25,
    satisfaction: 0.2,
    revenue: 0.25,
    clinical_outcomes: 0.2,
    staff_efficiency: 0.1,
  },
  BENCHMARK: {
    SESSION_DURATION_MINUTES: 45,
    CANCELLATION_RATE_TARGET: 0.05, // 5% هدف معدل الإلغاء
    NO_SHOW_RATE_TARGET: 0.08, // 8% هدف معدل الغياب
    WAITLIST_MAX_DAYS: 14, // أقصى فترة انتظار مقبولة
  },
};

// ========================================
// BRANCH CAPACITY CALCULATIONS
// ========================================

/**
 * حساب معدل استغلال الطاقة الاستيعابية للفرع
 * @param {object} branchData - {totalSessions, capacity, rooms, therapists}
 * @returns {object} - معدل الاستغلال والحالة
 */
function calculateBranchCapacityUtilization(branchData) {
  if (!branchData || typeof branchData !== 'object') {
    return {
      utilizationRate: 0,
      utilizationPercentage: 0,
      status: 'unknown',
      recommendation: 'بيانات غير مكتملة',
    };
  }

  const {
    totalSessions = 0,
    maxCapacity = 0,
    rooms = 0,
    therapists = 0,
    workingDays = 1,
  } = branchData;

  // حساب الطاقة القصوى
  const therapistCapacity =
    therapists * BRANCH_CONSTANTS.CAPACITY.THERAPIST_MAX_DAILY_SESSIONS * workingDays;
  const roomCapacity =
    rooms *
    ((BRANCH_CONSTANTS.CAPACITY.ROOM_OPERATIONAL_HOURS * 60) /
      BRANCH_CONSTANTS.BENCHMARK.SESSION_DURATION_MINUTES) *
    workingDays;

  const effectiveCapacity = maxCapacity || Math.min(therapistCapacity, roomCapacity);

  if (effectiveCapacity <= 0) {
    return {
      utilizationRate: 0,
      utilizationPercentage: 0,
      status: 'no_capacity',
      recommendation: 'لا توجد طاقة استيعابية محددة',
    };
  }

  const utilizationRate = Math.min(totalSessions / effectiveCapacity, 1);
  const utilizationPercentage = Math.round(utilizationRate * 10000) / 100;

  let status, recommendation;
  if (utilizationRate >= BRANCH_CONSTANTS.CAPACITY.MAX_UTILIZATION_RATE) {
    status = 'over_capacity';
    recommendation = 'الطاقة الاستيعابية ممتلئة - يجب توسيع الطاقم أو الغرف';
  } else if (utilizationRate >= BRANCH_CONSTANTS.CAPACITY.OPTIMAL_UTILIZATION_RATE) {
    status = 'optimal';
    recommendation = 'استغلال مثالي للطاقة الاستيعابية';
  } else if (utilizationRate >= BRANCH_CONSTANTS.CAPACITY.MIN_UTILIZATION_RATE) {
    status = 'acceptable';
    recommendation = 'استغلال مقبول - يمكن استقبال مستفيدين إضافيين';
  } else {
    status = 'under_utilized';
    recommendation = 'الطاقة الاستيعابية مستغلة بأقل من المطلوب';
  }

  return {
    utilizationRate,
    utilizationPercentage,
    totalSessions,
    effectiveCapacity,
    availableSlots: Math.max(0, Math.floor(effectiveCapacity - totalSessions)),
    status,
    recommendation,
    therapistCapacity,
    roomCapacity,
  };
}

/**
 * حساب توزيع الأحمال بين المعالجين
 * @param {Array} therapists - [{id, name, currentSessions, maxSessions}]
 * @returns {object} - توزيع الأحمال والتوصيات
 */
function calculateTherapistLoadDistribution(therapists) {
  if (!Array.isArray(therapists) || therapists.length === 0) {
    return {
      totalTherapists: 0,
      averageLoad: 0,
      overloaded: [],
      underloaded: [],
      balanced: [],
      loadBalanceScore: 100,
    };
  }

  const loadData = therapists.map(t => {
    const max = t.maxSessions || BRANCH_CONSTANTS.CAPACITY.THERAPIST_MAX_DAILY_SESSIONS;
    const current = t.currentSessions || 0;
    const loadRate = max > 0 ? current / max : 0;
    return {
      id: t.id,
      name: t.name,
      currentSessions: current,
      maxSessions: max,
      loadRate,
      loadPercentage: Math.round(loadRate * 100),
      status: loadRate >= 0.95 ? 'overloaded' : loadRate >= 0.6 ? 'balanced' : 'underloaded',
    };
  });

  const overloaded = loadData.filter(t => t.status === 'overloaded');
  const underloaded = loadData.filter(t => t.status === 'underloaded');
  const balanced = loadData.filter(t => t.status === 'balanced');

  const avgLoad = loadData.reduce((s, t) => s + t.loadRate, 0) / loadData.length;
  const variance =
    loadData.reduce((s, t) => s + Math.pow(t.loadRate - avgLoad, 2), 0) / loadData.length;
  const stdDev = Math.sqrt(variance);

  // نقاط التوازن: كلما قل الانحراف المعياري كان التوزيع أفضل
  const loadBalanceScore = Math.max(0, Math.round((1 - stdDev) * 100));

  return {
    totalTherapists: therapists.length,
    averageLoad: Math.round(avgLoad * 100),
    overloaded,
    underloaded,
    balanced,
    loadBalanceScore,
    recommendation:
      overloaded.length > 0
        ? `${overloaded.length} معالج(ة) مثقل بالعمل - يجب إعادة توزيع الجلسات`
        : underloaded.length > 0
          ? `${underloaded.length} معالج(ة) لديه طاقة متاحة`
          : 'توزيع الأحمال متوازن',
  };
}

// ========================================
// BRANCH PERFORMANCE KPIs
// ========================================

/**
 * حساب مؤشرات الأداء الرئيسية للفرع
 * @param {object} metrics - بيانات الأداء
 * @returns {object} - KPIs والتقييم الكلي
 */
function calculateBranchKPIs(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return { overallScore: 0, rating: 'poor', kpis: {} };
  }

  const {
    totalSessions = 0,
    completedSessions = 0,
    cancelledSessions = 0,
    noShowSessions = 0,
    totalRevenue = 0,
    targetRevenue = 1,
    satisfactionScore = 0,
    clinicalGoalsAchieved = 0,
    totalClinicalGoals = 1,
    staffCount = 1,
    occupancyRate = 0,
  } = metrics;

  // 1. معدل إتمام الجلسات
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  // 2. معدل الإلغاء
  const cancellationRate = totalSessions > 0 ? (cancelledSessions / totalSessions) * 100 : 0;

  // 3. معدل الغياب
  const noShowRate = totalSessions > 0 ? (noShowSessions / totalSessions) * 100 : 0;

  // 4. تحقيق الإيرادات
  const revenueAchievementRate = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

  // 5. الأهداف السريرية
  const clinicalGoalRate =
    totalClinicalGoals > 0 ? (clinicalGoalsAchieved / totalClinicalGoals) * 100 : 0;

  // 6. إنتاجية الموظفين
  const staffProductivity = staffCount > 0 ? completedSessions / staffCount : 0;

  // حساب النقاط (0-100 لكل مؤشر)
  const kpiScores = {
    sessionCompletion: Math.min(100, completionRate),
    revenueAchievement: Math.min(100, revenueAchievementRate),
    clientSatisfaction: (satisfactionScore / 5) * 100,
    clinicalOutcomes: Math.min(100, clinicalGoalRate),
    occupancyUtilization: Math.min(100, occupancyRate),
  };

  // الوزن المعيار
  const weights = BRANCH_CONSTANTS.KPI_WEIGHTS;
  const overallScore =
    kpiScores.occupancyUtilization * weights.occupancy +
    kpiScores.clientSatisfaction * weights.satisfaction +
    kpiScores.revenueAchievement * weights.revenue +
    kpiScores.clinicalOutcomes * weights.clinical_outcomes +
    kpiScores.sessionCompletion * weights.staff_efficiency;

  const rating = _getPerformanceRating(overallScore);

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    rating,
    kpis: {
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      revenueAchievementRate: Math.round(revenueAchievementRate * 100) / 100,
      clinicalGoalRate: Math.round(clinicalGoalRate * 100) / 100,
      staffProductivity: Math.round(staffProductivity * 100) / 100,
      satisfactionScore,
    },
    kpiScores,
    benchmarkComparison: {
      cancellationVsTarget:
        cancellationRate <= BRANCH_CONSTANTS.BENCHMARK.CANCELLATION_RATE_TARGET * 100
          ? 'within_target'
          : 'exceeds_target',
      noShowVsTarget:
        noShowRate <= BRANCH_CONSTANTS.BENCHMARK.NO_SHOW_RATE_TARGET * 100
          ? 'within_target'
          : 'exceeds_target',
    },
  };
}

function _getPerformanceRating(score) {
  if (score >= BRANCH_CONSTANTS.PERFORMANCE.EXCELLENT_THRESHOLD) return 'excellent';
  if (score >= BRANCH_CONSTANTS.PERFORMANCE.GOOD_THRESHOLD) return 'good';
  if (score >= BRANCH_CONSTANTS.PERFORMANCE.AVERAGE_THRESHOLD) return 'average';
  return 'poor';
}

// ========================================
// MULTI-BRANCH COMPARISONS
// ========================================

/**
 * مقارنة الأداء بين الفروع المتعددة
 * @param {Array} branches - [{id, name, metrics}]
 * @returns {object} - التصنيف والمقارنة
 */
function compareBranchPerformance(branches) {
  if (!Array.isArray(branches) || branches.length === 0) {
    return { ranked: [], best: null, worst: null, average: 0 };
  }

  const evaluated = branches.map(branch => ({
    id: branch.id,
    name: branch.name,
    ...calculateBranchKPIs(branch.metrics || branch),
  }));

  // ترتيب تنازلي حسب النقاط
  const ranked = evaluated.sort((a, b) => b.overallScore - a.overallScore);
  ranked.forEach((b, i) => {
    b.rank = i + 1;
  });

  const avgScore = ranked.reduce((s, b) => s + b.overallScore, 0) / ranked.length;

  return {
    ranked,
    best: ranked[0] || null,
    worst: ranked[ranked.length - 1] || null,
    average: Math.round(avgScore * 100) / 100,
    totalBranches: branches.length,
    aboveAverage: ranked.filter(b => b.overallScore >= avgScore).length,
    belowAverage: ranked.filter(b => b.overallScore < avgScore).length,
  };
}

/**
 * توزيع المستفيدين على الفروع حسب الطاقة الاستيعابية
 * @param {number} totalBeneficiaries - إجمالي المستفيدين للتوزيع
 * @param {Array} branches - [{id, name, capacity, currentLoad}]
 * @returns {Array} - التوزيع المقترح
 */
function distributeBeneficiariesAcrossBranches(totalBeneficiaries, branches) {
  if (!totalBeneficiaries || !Array.isArray(branches) || branches.length === 0) {
    return [];
  }

  // حساب الطاقة المتاحة لكل فرع
  const availableBranches = branches
    .map(b => ({
      ...b,
      available: Math.max(0, (b.capacity || 0) - (b.currentLoad || 0)),
    }))
    .filter(b => b.available > 0);

  if (availableBranches.length === 0) {
    return branches.map(b => ({ ...b, allocated: 0, waitlisted: totalBeneficiaries }));
  }

  const totalAvailable = availableBranches.reduce((s, b) => s + b.available, 0);
  let remaining = totalBeneficiaries;
  const result = [];

  for (const branch of availableBranches) {
    const proportion = branch.available / totalAvailable;
    const allocated = Math.min(
      Math.round(totalBeneficiaries * proportion),
      branch.available,
      remaining
    );
    remaining -= allocated;
    result.push({
      id: branch.id,
      name: branch.name,
      allocated,
      available: branch.available,
      utilizationAfter: Math.round(
        (((branch.currentLoad || 0) + allocated) / (branch.capacity || 1)) * 100
      ),
    });
  }

  // توزيع المتبقي على أكثر الفروع سعة
  if (remaining > 0) {
    result.sort((a, b) => b.available - a.available);
    result[0].allocated += remaining;
  }

  return result;
}

// ========================================
// WAITLIST MANAGEMENT
// ========================================

/**
 * تحليل قائمة الانتظار وحساب أوقات الانتظار المتوقعة
 * @param {Array} waitlistEntries - [{id, requestedAt, priority, serviceType}]
 * @param {object} branchCapacity - {dailyAvailableSlots}
 * @returns {object} - تحليل قائمة الانتظار
 */
function analyzeWaitlist(waitlistEntries, branchCapacity) {
  if (!Array.isArray(waitlistEntries) || waitlistEntries.length === 0) {
    return {
      totalWaiting: 0,
      averageWaitDays: 0,
      urgentCount: 0,
      estimatedClearanceDate: null,
    };
  }

  const today = new Date();
  const dailySlots = branchCapacity?.dailyAvailableSlots || 5;

  // حساب أيام الانتظار لكل مدخل
  const analyzed = waitlistEntries.map(entry => {
    const requestDate = new Date(entry.requestedAt || today);
    const waitDays = Math.max(0, Math.round((today - requestDate) / (1000 * 60 * 60 * 24)));
    return {
      ...entry,
      waitDays,
      isOverdue: waitDays > BRANCH_CONSTANTS.BENCHMARK.WAITLIST_MAX_DAYS,
    };
  });

  const urgentCount = analyzed.filter(e => e.priority === 'urgent' || e.priority === 'high').length;
  const avgWaitDays = analyzed.reduce((s, e) => s + e.waitDays, 0) / analyzed.length;

  // تاريخ تصفية قائمة الانتظار المتوقع
  const daysToCleared = Math.ceil(waitlistEntries.length / dailySlots);
  const clearanceDate = new Date(today);
  clearanceDate.setDate(clearanceDate.getDate() + daysToCleared);

  const overdueCount = analyzed.filter(e => e.isOverdue).length;

  return {
    totalWaiting: waitlistEntries.length,
    averageWaitDays: Math.round(avgWaitDays),
    urgentCount,
    overdueCount,
    overduePercentage: Math.round((overdueCount / analyzed.length) * 100),
    estimatedClearanceDate: clearanceDate.toISOString().split('T')[0],
    estimatedDaysToCleared: daysToCleared,
    entries: analyzed.sort((a, b) => {
      // ترتيب: عاجل أولاً، ثم الأطول انتظاراً
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pA = priorityOrder[a.priority] ?? 2;
      const pB = priorityOrder[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;
      return b.waitDays - a.waitDays;
    }),
  };
}

// ========================================
// SETTINGS VALIDATION & SCORING
// ========================================

/**
 * التحقق من اكتمال إعدادات الفرع
 * @param {object} settings - إعدادات الفرع
 * @returns {object} - نقاط الاكتمال والمشاكل
 */
function validateBranchSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { completenessScore: 0, issues: ['إعدادات الفرع غير موجودة'], isComplete: false };
  }

  const requiredFields = [
    { field: 'name', label: 'اسم الفرع' },
    { field: 'address', label: 'عنوان الفرع' },
    { field: 'phone', label: 'رقم الهاتف' },
    { field: 'managerName', label: 'اسم المدير' },
    { field: 'operatingHours', label: 'ساعات العمل' },
    { field: 'capacity', label: 'الطاقة الاستيعابية' },
  ];

  const recommendedFields = [
    { field: 'email', label: 'البريد الإلكتروني' },
    { field: 'licenseNumber', label: 'رقم الترخيص' },
    { field: 'insuranceContracts', label: 'عقود التأمين' },
    { field: 'emergencyContact', label: 'جهة الاتصال للطوارئ' },
  ];

  const issues = [];
  const warnings = [];
  let requiredScore = 0;
  let recommendedScore = 0;

  for (const f of requiredFields) {
    if (settings[f.field] !== undefined && settings[f.field] !== null && settings[f.field] !== '') {
      requiredScore++;
    } else {
      issues.push(`${f.label} مطلوب`);
    }
  }

  for (const f of recommendedFields) {
    if (settings[f.field] !== undefined && settings[f.field] !== null && settings[f.field] !== '') {
      recommendedScore++;
    } else {
      warnings.push(`${f.label} يُنصح بإدخاله`);
    }
  }

  const completenessScore = Math.round(
    ((requiredScore / requiredFields.length) * 0.7 +
      (recommendedScore / recommendedFields.length) * 0.3) *
      100
  );

  return {
    completenessScore,
    isComplete: issues.length === 0,
    requiredCompleted: requiredScore,
    requiredTotal: requiredFields.length,
    recommendedCompleted: recommendedScore,
    recommendedTotal: recommendedFields.length,
    issues,
    warnings,
    status:
      completenessScore >= 90
        ? 'complete'
        : completenessScore >= 70
          ? 'mostly_complete'
          : 'incomplete',
  };
}

/**
 * حساب نقاط الجودة لإعدادات النظام الكاملة
 * @param {object} systemSettings - الإعدادات الكاملة للنظام
 * @returns {object} - نقاط الجودة والتوصيات
 */
function calculateSystemSettingsScore(systemSettings) {
  if (!systemSettings) {
    return { score: 0, level: 'critical', recommendations: [] };
  }

  const checks = [
    {
      key: 'twoFactorAuth',
      label: 'المصادقة الثنائية',
      weight: 15,
      value: !!systemSettings.twoFactorAuth,
    },
    {
      key: 'backupEnabled',
      label: 'النسخ الاحتياطي التلقائي',
      weight: 15,
      value: !!systemSettings.backupEnabled,
    },
    {
      key: 'auditLogging',
      label: 'سجل التدقيق',
      weight: 10,
      value: !!systemSettings.auditLogging,
    },
    {
      key: 'sessionTimeout',
      label: 'انتهاء الجلسة التلقائي',
      weight: 10,
      value: !!systemSettings.sessionTimeout,
    },
    {
      key: 'emailNotifications',
      label: 'إشعارات البريد الإلكتروني',
      weight: 10,
      value: !!systemSettings.emailNotifications,
    },
    {
      key: 'smsNotifications',
      label: 'إشعارات SMS',
      weight: 10,
      value: !!systemSettings.smsNotifications,
    },
    {
      key: 'zatcaIntegration',
      label: 'تكامل ZATCA',
      weight: 15,
      value: !!systemSettings.zatcaIntegration,
    },
    {
      key: 'gosiIntegration',
      label: 'تكامل GOSI',
      weight: 10,
      value: !!systemSettings.gosiIntegration,
    },
    {
      key: 'dataEncryption',
      label: 'تشفير البيانات',
      weight: 5,
      value: !!systemSettings.dataEncryption,
    },
  ];

  let score = 0;
  const recommendations = [];

  for (const check of checks) {
    if (check.value) {
      score += check.weight;
    } else {
      recommendations.push({
        setting: check.key,
        label: check.label,
        priority: check.weight >= 15 ? 'high' : check.weight >= 10 ? 'medium' : 'low',
        impact: `${check.weight} نقطة`,
      });
    }
  }

  return {
    score,
    level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'average' : 'critical',
    recommendations: recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    }),
    passed: checks.filter(c => c.value).length,
    total: checks.length,
  };
}

// ========================================
// BRANCH REVENUE & FINANCIAL
// ========================================

/**
 * حساب الإيرادات المتوقعة للفرع بناءً على الطاقة الاستيعابية
 * @param {object} branchData - بيانات الفرع
 * @returns {object} - توقعات الإيرادات
 */
function calculateBranchRevenueProjection(branchData) {
  if (!branchData) {
    return { projected: 0, minimum: 0, maximum: 0 };
  }

  const {
    therapists = 0,
    averageSessionFee = 300,
    workingDaysPerMonth = 22,
    targetUtilization = 0.8,
  } = branchData;

  const dailySessions = therapists * BRANCH_CONSTANTS.CAPACITY.THERAPIST_MAX_DAILY_SESSIONS;
  const monthlySessions = dailySessions * workingDaysPerMonth;

  const projectedSessions = Math.floor(monthlySessions * targetUtilization);
  const minSessions = Math.floor(monthlySessions * BRANCH_CONSTANTS.CAPACITY.MIN_UTILIZATION_RATE);
  const maxSessions = Math.floor(monthlySessions * BRANCH_CONSTANTS.CAPACITY.MAX_UTILIZATION_RATE);

  return {
    projectedRevenue: Math.round(projectedSessions * averageSessionFee),
    minimumRevenue: Math.round(minSessions * averageSessionFee),
    maximumRevenue: Math.round(maxSessions * averageSessionFee),
    projectedSessions,
    minSessions,
    maxSessions,
    breakEvenSessions: branchData.fixedCosts
      ? Math.ceil(branchData.fixedCosts / averageSessionFee)
      : null,
  };
}

/**
 * مقارنة الإيرادات الفعلية مقابل المستهدفة للفروع
 * @param {Array} branches - [{id, name, actualRevenue, targetRevenue}]
 * @returns {object} - تحليل مقارن
 */
function analyzeBranchRevenueVsTarget(branches) {
  if (!Array.isArray(branches) || branches.length === 0) {
    return { branches: [], totalActual: 0, totalTarget: 0, achievementRate: 0 };
  }

  let totalActual = 0;
  let totalTarget = 0;

  const analyzed = branches.map(branch => {
    const actual = branch.actualRevenue || 0;
    const target = branch.targetRevenue || 1;
    const achievementRate = Math.round((actual / target) * 10000) / 100;
    const variance = actual - target;

    totalActual += actual;
    totalTarget += target;

    return {
      id: branch.id,
      name: branch.name,
      actualRevenue: actual,
      targetRevenue: target,
      achievementRate,
      variance,
      variancePercentage: Math.round((variance / target) * 10000) / 100,
      status:
        achievementRate >= 100
          ? 'achieved'
          : achievementRate >= 80
            ? 'near_target'
            : 'below_target',
    };
  });

  const overallAchievement = Math.round((totalActual / totalTarget) * 10000) / 100;

  return {
    branches: analyzed.sort((a, b) => b.achievementRate - a.achievementRate),
    totalActual: Math.round(totalActual),
    totalTarget: Math.round(totalTarget),
    achievementRate: overallAchievement,
    variance: Math.round(totalActual - totalTarget),
    topPerformer: analyzed[0] || null,
    bottomPerformer: analyzed[analyzed.length - 1] || null,
  };
}

// ========================================
// OPERATIONAL HOURS ANALYSIS
// ========================================

/**
 * تحليل أوقات العمل وحساب الساعات الفعلية
 * @param {object} schedule - {openTime, closeTime, breakStart, breakEnd, daysOff}
 * @returns {object} - تفاصيل أوقات العمل
 */
function analyzeOperatingHours(schedule) {
  if (!schedule || !schedule.openTime || !schedule.closeTime) {
    return { dailyHours: 0, weeklyHours: 0, monthlyHours: 0, isValid: false };
  }

  const parseTime = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const openMinutes = parseTime(schedule.openTime);
  const closeMinutes = parseTime(schedule.closeTime);

  if (closeMinutes <= openMinutes) {
    return {
      dailyHours: 0,
      weeklyHours: 0,
      monthlyHours: 0,
      isValid: false,
      error: 'وقت الإغلاق قبل وقت الفتح',
    };
  }

  let dailyMinutes = closeMinutes - openMinutes;

  // خصم وقت الاستراحة
  if (schedule.breakStart && schedule.breakEnd) {
    const breakStart = parseTime(schedule.breakStart);
    const breakEnd = parseTime(schedule.breakEnd);
    if (breakEnd > breakStart) {
      dailyMinutes -= breakEnd - breakStart;
    }
  }

  const dailyHours = Math.round((dailyMinutes / 60) * 100) / 100;
  const workingDaysPerWeek = 7 - (schedule.daysOff?.length || 2); // افتراض يومان إجازة
  const weeklyHours = Math.round(dailyHours * workingDaysPerWeek * 100) / 100;
  const monthlyHours = Math.round(weeklyHours * 4.33 * 100) / 100;

  // حساب عدد الجلسات الممكنة
  const sessionsPerDay = Math.floor(
    dailyMinutes / BRANCH_CONSTANTS.BENCHMARK.SESSION_DURATION_MINUTES
  );

  return {
    dailyHours,
    weeklyHours,
    monthlyHours,
    workingDaysPerWeek,
    dailyMinutes,
    sessionsPerDay,
    isValid: true,
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
  };
}

// ========================================
// BRANCH HEALTH SCORE
// ========================================

/**
 * حساب النقاط الصحية الشاملة للفرع
 * @param {object} branchData - بيانات شاملة للفرع
 * @returns {object} - النقاط الصحية والحالة
 */
function calculateBranchHealthScore(branchData) {
  if (!branchData) {
    return { healthScore: 0, status: 'critical', alerts: [] };
  }

  const alerts = [];
  let healthScore = 100;

  // 1. طاقة استيعابية غير مستغلة
  const utilization = branchData.utilizationRate || 0;
  if (utilization < BRANCH_CONSTANTS.CAPACITY.MIN_UTILIZATION_RATE) {
    healthScore -= 20;
    alerts.push({
      type: 'low_utilization',
      severity: 'warning',
      message: `معدل الاستغلال منخفض: ${Math.round(utilization * 100)}%`,
    });
  }

  // 2. معدل رضا العملاء
  const satisfaction = branchData.satisfactionScore || 0;
  if (satisfaction < BRANCH_CONSTANTS.SATISFACTION.AVERAGE) {
    healthScore -= 25;
    alerts.push({
      type: 'low_satisfaction',
      severity: 'critical',
      message: `رضا العملاء منخفض: ${satisfaction}/5`,
    });
  } else if (satisfaction < BRANCH_CONSTANTS.SATISFACTION.GOOD) {
    healthScore -= 10;
    alerts.push({
      type: 'moderate_satisfaction',
      severity: 'warning',
      message: `رضا العملاء متوسط: ${satisfaction}/5`,
    });
  }

  // 3. معدل الإلغاء
  const cancellationRate = branchData.cancellationRate || 0;
  if (cancellationRate > BRANCH_CONSTANTS.BENCHMARK.CANCELLATION_RATE_TARGET * 2) {
    healthScore -= 20;
    alerts.push({
      type: 'high_cancellation',
      severity: 'critical',
      message: `معدل الإلغاء مرتفع: ${Math.round(cancellationRate * 100)}%`,
    });
  }

  // 4. مشاكل في الموظفين
  const staffTurnover = branchData.staffTurnoverRate || 0;
  if (staffTurnover > 0.2) {
    healthScore -= 15;
    alerts.push({
      type: 'high_turnover',
      severity: 'warning',
      message: `معدل دوران الموظفين مرتفع: ${Math.round(staffTurnover * 100)}%`,
    });
  }

  // 5. التأخر في الدفعات
  const overduePayments = branchData.overduePaymentsCount || 0;
  if (overduePayments > 10) {
    healthScore -= 10;
    alerts.push({
      type: 'overdue_payments',
      severity: 'warning',
      message: `${overduePayments} دفعة متأخرة`,
    });
  }

  // 6. قائمة انتظار طويلة
  const avgWaitDays = branchData.averageWaitlistDays || 0;
  if (avgWaitDays > BRANCH_CONSTANTS.BENCHMARK.WAITLIST_MAX_DAYS) {
    healthScore -= 10;
    alerts.push({
      type: 'long_waitlist',
      severity: 'info',
      message: `متوسط فترة الانتظار: ${avgWaitDays} يوم`,
    });
  }

  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    healthScore,
    status:
      healthScore >= 80
        ? 'healthy'
        : healthScore >= 60
          ? 'fair'
          : healthScore >= 40
            ? 'at_risk'
            : 'critical',
    alerts: alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
    alertCount: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
  };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  BRANCH_CONSTANTS,
  // Capacity
  calculateBranchCapacityUtilization,
  calculateTherapistLoadDistribution,
  // KPIs
  calculateBranchKPIs,
  compareBranchPerformance,
  distributeBeneficiariesAcrossBranches,
  // Waitlist
  analyzeWaitlist,
  // Settings
  validateBranchSettings,
  calculateSystemSettingsScore,
  // Revenue
  calculateBranchRevenueProjection,
  analyzeBranchRevenueVsTarget,
  // Operations
  analyzeOperatingHours,
  // Health
  calculateBranchHealthScore,
};
