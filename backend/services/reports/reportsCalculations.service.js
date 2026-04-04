'use strict';

/**
 * Reports & Analytics Calculations Service
 * وحدة التقارير والتحليلات - Pure Business Logic
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 *
 * لا يحتوي على أي imports خارجية - pure functions فقط
 */

// ========================================
// CONSTANTS
// ========================================
const REPORTS_CONSTANTS = {
  REPORT_TYPES: {
    FINANCIAL: 'financial',
    CLINICAL: 'clinical',
    HR: 'hr',
    OPERATIONAL: 'operational',
    COMPLIANCE: 'compliance',
    EXECUTIVE: 'executive',
  },

  PERIOD_TYPES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    ANNUAL: 'annual',
    CUSTOM: 'custom',
  },

  CHART_TYPES: {
    BAR: 'bar',
    LINE: 'line',
    PIE: 'pie',
    DONUT: 'donut',
    AREA: 'area',
    SCATTER: 'scatter',
  },

  KPI_STATUS: {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    ACCEPTABLE: 'acceptable',
    POOR: 'poor',
    CRITICAL: 'critical',
  },

  TREND_DIRECTION: {
    UP: 'up',
    DOWN: 'down',
    STABLE: 'stable',
  },

  COMPARISON_TYPES: {
    PERIOD_OVER_PERIOD: 'period_over_period',
    BRANCH_COMPARISON: 'branch_comparison',
    TARGET_VS_ACTUAL: 'target_vs_actual',
    YEAR_OVER_YEAR: 'year_over_year',
  },
};

// ========================================
// KPI CALCULATIONS
// ========================================

/**
 * حساب مؤشر الأداء الرئيسي (KPI) مقارنةً بالهدف
 */
function calculateKPI(actual, target, kpiName, lowerIsBetter) {
  if (target === null || target === undefined) {
    return { isValid: false, error: 'الهدف مطلوب لحساب مؤشر الأداء' };
  }
  if (target === 0) {
    return { isValid: false, error: 'الهدف لا يمكن أن يكون صفراً' };
  }

  const achievementRate = (actual / target) * 100;
  const variance = actual - target;
  const variancePct = ((actual - target) / target) * 100;

  // تحديد الحالة
  let status;
  const rate = lowerIsBetter ? 100 - (achievementRate - 100) : achievementRate;

  if (rate >= 100) status = REPORTS_CONSTANTS.KPI_STATUS.EXCELLENT;
  else if (rate >= 90) status = REPORTS_CONSTANTS.KPI_STATUS.GOOD;
  else if (rate >= 75) status = REPORTS_CONSTANTS.KPI_STATUS.ACCEPTABLE;
  else if (rate >= 60) status = REPORTS_CONSTANTS.KPI_STATUS.POOR;
  else status = REPORTS_CONSTANTS.KPI_STATUS.CRITICAL;

  return {
    isValid: true,
    kpiName: kpiName || 'KPI',
    actual,
    target,
    achievementRate: Math.round(achievementRate * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    variancePct: Math.round(variancePct * 100) / 100,
    status,
    lowerIsBetter: !!lowerIsBetter,
    achieved: lowerIsBetter ? actual <= target : actual >= target,
  };
}

/**
 * حساب لوحة مؤشرات الأداء الرئيسية (KPI Dashboard)
 */
function buildKPIDashboard(kpiData) {
  if (!kpiData || !Array.isArray(kpiData) || kpiData.length === 0) {
    return { isValid: false, error: 'بيانات مؤشرات الأداء مطلوبة' };
  }

  const results = kpiData.map(kpi =>
    calculateKPI(kpi.actual, kpi.target, kpi.name, kpi.lowerIsBetter)
  );

  const valid = results.filter(r => r.isValid);
  const achieved = valid.filter(r => r.achieved).length;
  const statusCounts = {};

  valid.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  const overallScore =
    valid.length > 0 ? valid.reduce((sum, r) => sum + r.achievementRate, 0) / valid.length : 0;

  return {
    isValid: true,
    totalKPIs: kpiData.length,
    achievedCount: achieved,
    achievementRate: valid.length > 0 ? Math.round((achieved / valid.length) * 100) : 0,
    overallScore: Math.round(overallScore * 100) / 100,
    statusCounts,
    kpis: valid,
    overallStatus:
      overallScore >= 90
        ? REPORTS_CONSTANTS.KPI_STATUS.EXCELLENT
        : overallScore >= 75
          ? REPORTS_CONSTANTS.KPI_STATUS.GOOD
          : overallScore >= 60
            ? REPORTS_CONSTANTS.KPI_STATUS.ACCEPTABLE
            : REPORTS_CONSTANTS.KPI_STATUS.POOR,
  };
}

// ========================================
// TREND ANALYSIS
// ========================================

/**
 * تحليل الاتجاه لسلسلة زمنية
 */
function analyzeTrend(dataPoints) {
  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
    return { isValid: false, error: 'يلزم نقطتان على الأقل لتحليل الاتجاه' };
  }

  const values = dataPoints.map(p => (typeof p === 'object' ? p.value : p));
  const n = values.length;

  // المتوسط
  const avg = values.reduce((a, b) => a + b, 0) / n;

  // الانحراف المعياري
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // معامل الاتجاه الخطي (Linear Regression)
  const xMean = (n - 1) / 2;
  const numerator = values.reduce((sum, v, i) => sum + (i - xMean) * (v - avg), 0);
  const denominator = values.reduce((sum, _, i) => sum + Math.pow(i - xMean, 2), 0);
  const slope = denominator !== 0 ? numerator / denominator : 0;

  // تغيير النسبة المئوية الإجمالية
  const first = values[0];
  const last = values[n - 1];
  const totalChangePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  // الحد الأدنى والأقصى
  const min = Math.min(...values);
  const max = Math.max(...values);

  // اتجاه
  let direction;
  if (Math.abs(totalChangePct) < 2) {
    direction = REPORTS_CONSTANTS.TREND_DIRECTION.STABLE;
  } else if (totalChangePct > 0) {
    direction = REPORTS_CONSTANTS.TREND_DIRECTION.UP;
  } else {
    direction = REPORTS_CONSTANTS.TREND_DIRECTION.DOWN;
  }

  return {
    isValid: true,
    dataPoints: n,
    avg: Math.round(avg * 100) / 100,
    min,
    max,
    stdDev: Math.round(stdDev * 100) / 100,
    slope: Math.round(slope * 1000) / 1000,
    totalChangePct: Math.round(totalChangePct * 100) / 100,
    direction,
    firstValue: first,
    lastValue: last,
    isIncreasing: slope > 0,
    volatility: avg !== 0 ? Math.round((stdDev / avg) * 100 * 100) / 100 : 0,
  };
}

/**
 * مقارنة فترتين زمنيتين
 */
function comparePeriods(currentPeriod, previousPeriod, metrics) {
  if (!currentPeriod || !previousPeriod) {
    return { isValid: false, error: 'بيانات الفترتين مطلوبة' };
  }
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return { isValid: false, error: 'المقاييس المطلوبة للمقارنة مطلوبة' };
  }

  const comparisons = metrics.map(metric => {
    const current = currentPeriod[metric] ?? 0;
    const previous = previousPeriod[metric] ?? 0;
    const change = current - previous;
    const changePct = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    return {
      metric,
      current,
      previous,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      direction:
        Math.abs(changePct) < 1
          ? REPORTS_CONSTANTS.TREND_DIRECTION.STABLE
          : changePct > 0
            ? REPORTS_CONSTANTS.TREND_DIRECTION.UP
            : REPORTS_CONSTANTS.TREND_DIRECTION.DOWN,
    };
  });

  return {
    isValid: true,
    comparisonType: REPORTS_CONSTANTS.COMPARISON_TYPES.PERIOD_OVER_PERIOD,
    comparisons,
    improved: comparisons.filter(c => c.direction === REPORTS_CONSTANTS.TREND_DIRECTION.UP).length,
    declined: comparisons.filter(c => c.direction === REPORTS_CONSTANTS.TREND_DIRECTION.DOWN)
      .length,
    stable: comparisons.filter(c => c.direction === REPORTS_CONSTANTS.TREND_DIRECTION.STABLE)
      .length,
  };
}

// ========================================
// FINANCIAL REPORTS
// ========================================

/**
 * حساب الإيرادات والمصروفات وصافي الدخل
 */
function calculateIncomeStatement(revenues, expenses, period) {
  if (!revenues || !Array.isArray(revenues)) {
    return { isValid: false, error: 'بيانات الإيرادات مطلوبة' };
  }
  if (!expenses || !Array.isArray(expenses)) {
    return { isValid: false, error: 'بيانات المصروفات مطلوبة' };
  }

  const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // تجميع الإيرادات حسب الفئة
  const revenueByCategory = {};
  revenues.forEach(r => {
    const cat = r.category || 'other';
    revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (r.amount || 0);
  });

  // تجميع المصروفات حسب الفئة
  const expenseByCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
  });

  return {
    isValid: true,
    period: period || 'current',
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    revenueByCategory,
    expenseByCategory,
    isProfitable: grossProfit > 0,
    expenseRatio:
      totalRevenue !== 0 ? Math.round((totalExpenses / totalRevenue) * 100 * 100) / 100 : 0,
  };
}

/**
 * حساب التدفق النقدي
 */
function calculateCashFlow(inflows, outflows) {
  if (!inflows || !Array.isArray(inflows)) {
    return { isValid: false, error: 'بيانات التدفقات الداخلة مطلوبة' };
  }
  if (!outflows || !Array.isArray(outflows)) {
    return { isValid: false, error: 'بيانات التدفقات الخارجة مطلوبة' };
  }

  const totalInflows = inflows.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalOutflows = outflows.reduce((sum, o) => sum + (o.amount || 0), 0);
  const netCashFlow = totalInflows - totalOutflows;

  // تجميع حسب النوع
  const inflowByType = {};
  inflows.forEach(i => {
    const type = i.type || 'other';
    inflowByType[type] = (inflowByType[type] || 0) + (i.amount || 0);
  });

  const outflowByType = {};
  outflows.forEach(o => {
    const type = o.type || 'other';
    outflowByType[type] = (outflowByType[type] || 0) + (o.amount || 0);
  });

  return {
    isValid: true,
    totalInflows: Math.round(totalInflows * 100) / 100,
    totalOutflows: Math.round(totalOutflows * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    inflowByType,
    outflowByType,
    isPositive: netCashFlow >= 0,
    cashFlowRatio:
      totalOutflows !== 0 ? Math.round((totalInflows / totalOutflows) * 100 * 100) / 100 : 0,
  };
}

/**
 * تحليل عمر الديون (Aging Analysis)
 */
function calculateAgingAnalysis(invoices, asOfDate) {
  if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
    return { isValid: false, error: 'لا توجد فواتير لتحليل العمر' };
  }

  const referenceDate = asOfDate ? new Date(asOfDate) : new Date();

  const buckets = {
    current: { label: 'حالية (0-30 يوم)', min: 0, max: 30, total: 0, count: 0 },
    days31_60: { label: '31-60 يوم', min: 31, max: 60, total: 0, count: 0 },
    days61_90: { label: '61-90 يوم', min: 61, max: 90, total: 0, count: 0 },
    over90: { label: 'أكثر من 90 يوم', min: 91, max: Infinity, total: 0, count: 0 },
  };

  let totalOutstanding = 0;

  invoices.forEach(inv => {
    const dueDate = new Date(inv.dueDate || inv.invoiceDate);
    const daysPastDue = Math.floor((referenceDate - dueDate) / (1000 * 60 * 60 * 24));
    const amount = inv.outstandingAmount || inv.amount || 0;
    totalOutstanding += amount;

    if (daysPastDue <= 30) {
      buckets.current.total += amount;
      buckets.current.count++;
    } else if (daysPastDue <= 60) {
      buckets.days31_60.total += amount;
      buckets.days31_60.count++;
    } else if (daysPastDue <= 90) {
      buckets.days61_90.total += amount;
      buckets.days61_90.count++;
    } else {
      buckets.over90.total += amount;
      buckets.over90.count++;
    }
  });

  // تقريب القيم
  Object.keys(buckets).forEach(key => {
    buckets[key].total = Math.round(buckets[key].total * 100) / 100;
    buckets[key].pct =
      totalOutstanding > 0
        ? Math.round((buckets[key].total / totalOutstanding) * 100 * 100) / 100
        : 0;
  });

  return {
    isValid: true,
    totalInvoices: invoices.length,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    buckets,
    overdueAmount:
      Math.round((buckets.days31_60.total + buckets.days61_90.total + buckets.over90.total) * 100) /
      100,
    overdueCount: buckets.days31_60.count + buckets.days61_90.count + buckets.over90.count,
    criticalAmount: Math.round(buckets.over90.total * 100) / 100,
    requiresAction: buckets.over90.total > 0,
  };
}

// ========================================
// CLINICAL REPORTS
// ========================================

/**
 * إحصاءات المستفيدين والجلسات
 */
function calculateBeneficiaryStats(beneficiaries, sessions) {
  if (!beneficiaries || !Array.isArray(beneficiaries)) {
    return { isValid: false, error: 'بيانات المستفيدين مطلوبة' };
  }

  const total = beneficiaries.length;
  const active = beneficiaries.filter(b => b.status === 'active').length;
  const inactive = beneficiaries.filter(b => b.status === 'inactive').length;
  const waitlist = beneficiaries.filter(b => b.status === 'waitlist').length;

  // توزيع حسب نوع الإعاقة
  const byDisabilityType = {};
  beneficiaries.forEach(b => {
    const type = b.disabilityType || 'unspecified';
    byDisabilityType[type] = (byDisabilityType[type] || 0) + 1;
  });

  // توزيع حسب الجنس
  const byGender = { male: 0, female: 0, unspecified: 0 };
  beneficiaries.forEach(b => {
    byGender[b.gender || 'unspecified']++;
  });

  // توزيع الأعمار
  const ageGroups = { '0-3': 0, '4-6': 0, '7-12': 0, '13-18': 0, '18+': 0 };
  beneficiaries.forEach(b => {
    const age = b.age || 0;
    if (age <= 3) ageGroups['0-3']++;
    else if (age <= 6) ageGroups['4-6']++;
    else if (age <= 12) ageGroups['7-12']++;
    else if (age <= 18) ageGroups['13-18']++;
    else ageGroups['18+']++;
  });

  // إحصاءات الجلسات
  let sessionStats = null;
  if (sessions && Array.isArray(sessions)) {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled');
    const noShowSessions = sessions.filter(s => s.status === 'no_show');

    sessionStats = {
      total: sessions.length,
      completed: completedSessions.length,
      cancelled: cancelledSessions.length,
      noShow: noShowSessions.length,
      attendanceRate:
        sessions.length > 0
          ? Math.round((completedSessions.length / sessions.length) * 100 * 100) / 100
          : 0,
    };
  }

  return {
    isValid: true,
    total,
    active,
    inactive,
    waitlist,
    activeRate: total > 0 ? Math.round((active / total) * 100 * 100) / 100 : 0,
    byDisabilityType,
    byGender,
    ageGroups,
    sessionStats,
  };
}

/**
 * حساب معدل استخدام الطاقة الاستيعابية
 */
function calculateCapacityUtilization(availableSlots, usedSlots, period) {
  if (availableSlots === null || availableSlots === undefined || availableSlots < 0) {
    return { isValid: false, error: 'الطاقة المتاحة يجب أن تكون غير سالبة' };
  }
  if (usedSlots < 0) {
    return { isValid: false, error: 'الفترات المستخدمة لا يمكن أن تكون سالبة' };
  }
  if (usedSlots > availableSlots) {
    return { isValid: false, error: 'الفترات المستخدمة تتجاوز الطاقة المتاحة' };
  }

  const utilizationRate = availableSlots > 0 ? (usedSlots / availableSlots) * 100 : 0;
  const unusedSlots = availableSlots - usedSlots;

  return {
    isValid: true,
    period: period || 'current',
    availableSlots,
    usedSlots,
    unusedSlots,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    status:
      utilizationRate >= 90
        ? 'over_utilized'
        : utilizationRate >= 70
          ? 'optimal'
          : utilizationRate >= 50
            ? 'under_utilized'
            : 'critically_low',
    efficiency: utilizationRate >= 75 ? 'good' : utilizationRate >= 50 ? 'acceptable' : 'poor',
  };
}

// ========================================
// HR REPORTS
// ========================================

/**
 * إحصاءات الموارد البشرية
 */
function calculateHRStats(employees) {
  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    return { isValid: false, error: 'بيانات الموظفين مطلوبة' };
  }

  const total = employees.length;
  const active = employees.filter(e => e.status === 'active').length;
  const onLeave = employees.filter(e => e.status === 'on_leave').length;

  // نسبة السعودة
  const saudis = employees.filter(e => e.isSaudi).length;
  const saudizationRate = Math.round((saudis / total) * 100 * 100) / 100;

  // توزيع حسب القسم
  const byDepartment = {};
  employees.forEach(e => {
    const dept = e.department || 'unspecified';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  });

  // توزيع حسب التخصص
  const bySpecialization = {};
  employees
    .filter(e => e.specialization)
    .forEach(e => {
      bySpecialization[e.specialization] = (bySpecialization[e.specialization] || 0) + 1;
    });

  // متوسط الخبرة
  const avgExperience =
    total > 0 ? employees.reduce((sum, e) => sum + (e.yearsOfExperience || 0), 0) / total : 0;

  // متوسط الراتب
  const avgSalary =
    active > 0
      ? employees
          .filter(e => e.status === 'active')
          .reduce((sum, e) => sum + (e.basicSalary || 0), 0) / active
      : 0;

  return {
    isValid: true,
    total,
    active,
    onLeave,
    terminated: employees.filter(e => e.status === 'terminated').length,
    saudis,
    nonSaudis: total - saudis,
    saudizationRate,
    saudizationTarget: 70, // نطاقات
    meetsSaudizationTarget: saudizationRate >= 70,
    byDepartment,
    bySpecialization,
    avgExperience: Math.round(avgExperience * 10) / 10,
    avgSalary: Math.round(avgSalary * 100) / 100,
    turnoverRisk: employees.filter(e => e.performanceRating === 'needs_improvement').length,
  };
}

/**
 * تقرير الحضور والغياب
 */
function calculateAttendanceReport(attendanceRecords, workingDays) {
  if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return { isValid: false, error: 'سجلات الحضور مطلوبة' };
  }
  if (!workingDays || workingDays <= 0) {
    return { isValid: false, error: 'عدد أيام العمل يجب أن يكون أكبر من صفر' };
  }

  const present = attendanceRecords.filter(r => r.status === 'present').length;
  const absent = attendanceRecords.filter(r => r.status === 'absent').length;
  const late = attendanceRecords.filter(r => r.status === 'late').length;
  const onLeave = attendanceRecords.filter(r => r.status === 'leave').length;
  const halfDay = attendanceRecords.filter(r => r.status === 'half_day').length;

  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round(((present + halfDay * 0.5) / attendanceRecords.length) * 100 * 100) / 100
      : 0;

  const totalLateMinutes = attendanceRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
  const avgLateMinutes = late > 0 ? Math.round(totalLateMinutes / late) : 0;

  return {
    isValid: true,
    totalRecords: attendanceRecords.length,
    workingDays,
    present,
    absent,
    late,
    onLeave,
    halfDay,
    attendanceRate,
    absenceRate: Math.round((absent / attendanceRecords.length) * 100 * 100) / 100,
    lateRate: Math.round((late / attendanceRecords.length) * 100 * 100) / 100,
    totalLateMinutes,
    avgLateMinutes,
    perfectAttendance: attendanceRecords.filter(r => r.status === 'present' && !r.lateMinutes)
      .length,
  };
}

// ========================================
// BRANCH COMPARISON
// ========================================

/**
 * مقارنة أداء الفروع
 */
function compareBranchPerformance(branches, metrics) {
  if (!branches || !Array.isArray(branches) || branches.length === 0) {
    return { isValid: false, error: 'بيانات الفروع مطلوبة' };
  }
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return { isValid: false, error: 'مقاييس المقارنة مطلوبة' };
  }

  // حساب الترتيب لكل مقياس
  const rankings = {};
  metrics.forEach(metric => {
    const sorted = [...branches]
      .filter(b => b[metric] !== undefined && b[metric] !== null)
      .sort((a, b) => b[metric] - a[metric]);

    sorted.forEach((branch, index) => {
      if (!rankings[branch.branchId]) rankings[branch.branchId] = {};
      rankings[branch.branchId][metric] = index + 1;
    });
  });

  // حساب متوسطات كل فرع
  const branchResults = branches.map(branch => {
    const metricValues = metrics
      .filter(m => branch[m] !== undefined && branch[m] !== null)
      .map(m => branch[m]);

    const avgScore =
      metricValues.length > 0 ? metricValues.reduce((a, b) => a + b, 0) / metricValues.length : 0;

    const avgRank = rankings[branch.branchId]
      ? Object.values(rankings[branch.branchId]).reduce((a, b) => a + b, 0) /
        Object.values(rankings[branch.branchId]).length
      : null;

    return {
      branchId: branch.branchId,
      branchName: branch.branchName || branch.branchId,
      metrics: Object.fromEntries(metrics.map(m => [m, branch[m] ?? null])),
      rankings: rankings[branch.branchId] || {},
      avgScore: Math.round(avgScore * 100) / 100,
      avgRank: avgRank ? Math.round(avgRank * 100) / 100 : null,
    };
  });

  // ترتيب الفروع حسب متوسط الأداء
  branchResults.sort((a, b) => (a.avgRank || Infinity) - (b.avgRank || Infinity));

  const overallValues = metrics.map(m => {
    const vals = branches.filter(b => b[m] !== undefined).map(b => b[m]);
    return {
      metric: m,
      avg:
        vals.length > 0
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
          : 0,
      max: vals.length > 0 ? Math.max(...vals) : 0,
      min: vals.length > 0 ? Math.min(...vals) : 0,
    };
  });

  return {
    isValid: true,
    branchCount: branches.length,
    metrics,
    branches: branchResults,
    topBranch: branchResults[0] || null,
    bottomBranch: branchResults[branchResults.length - 1] || null,
    overallStats: overallValues,
  };
}

// ========================================
// EXECUTIVE DASHBOARD
// ========================================

/**
 * بناء لوحة التحكم التنفيذية
 */
function buildExecutiveDashboard(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'بيانات لوحة التحكم مطلوبة' };
  }

  const dashboard = {
    isValid: true,
    generatedAt: new Date().toISOString(),
    summary: {},
    alerts: [],
    highlights: [],
  };

  // ملخص مالي
  if (data.financials) {
    const { revenue, expenses, target } = data.financials;
    const profit = (revenue || 0) - (expenses || 0);
    const profitMargin = revenue ? (profit / revenue) * 100 : 0;
    const revenueAchievement = target ? (revenue / target) * 100 : null;

    dashboard.summary.financial = {
      revenue: Math.round((revenue || 0) * 100) / 100,
      expenses: Math.round((expenses || 0) * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      revenueAchievement: revenueAchievement ? Math.round(revenueAchievement * 100) / 100 : null,
    };

    if (profitMargin < 10) {
      dashboard.alerts.push({
        type: 'financial',
        severity: 'warning',
        message: 'هامش الربح منخفض (أقل من 10%)',
      });
    }
    if (revenueAchievement && revenueAchievement < 80) {
      dashboard.alerts.push({
        type: 'financial',
        severity: 'critical',
        message: `تحقيق الإيرادات ${Math.round(revenueAchievement)}% من الهدف`,
      });
    }
  }

  // ملخص المستفيدين
  if (data.beneficiaries) {
    const { total, active, newThisMonth } = data.beneficiaries;
    dashboard.summary.beneficiaries = {
      total: total || 0,
      active: active || 0,
      newThisMonth: newThisMonth || 0,
      activeRate: total ? Math.round((active / total) * 100) : 0,
    };
  }

  // ملخص الموارد البشرية
  if (data.hr) {
    const { totalEmployees, saudizationRate, attendanceRate } = data.hr;
    dashboard.summary.hr = {
      totalEmployees: totalEmployees || 0,
      saudizationRate: saudizationRate || 0,
      attendanceRate: attendanceRate || 0,
    };

    if (saudizationRate < 70) {
      dashboard.alerts.push({
        type: 'hr',
        severity: 'warning',
        message: `نسبة السعودة ${saudizationRate}% أقل من المطلوب 70%`,
      });
    }
  }

  // ملخص العمليات
  if (data.operations) {
    const { sessionCount, utilizationRate, qualityScore } = data.operations;
    dashboard.summary.operations = {
      sessionCount: sessionCount || 0,
      utilizationRate: utilizationRate || 0,
      qualityScore: qualityScore || 0,
    };

    if (utilizationRate < 60) {
      dashboard.alerts.push({
        type: 'operations',
        severity: 'warning',
        message: `معدل الاستخدام ${utilizationRate}% منخفض`,
      });
    }
  }

  dashboard.alertCount = dashboard.alerts.length;
  dashboard.criticalAlerts = dashboard.alerts.filter(a => a.severity === 'critical').length;

  return dashboard;
}

// ========================================
// DATA AGGREGATION
// ========================================

/**
 * تجميع البيانات حسب فترة زمنية
 */
function aggregateByPeriod(records, periodType, valueField, dateField) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { isValid: false, error: 'لا توجد سجلات للتجميع' };
  }
  if (!valueField) {
    return { isValid: false, error: 'حقل القيمة مطلوب' };
  }

  const dField = dateField || 'date';
  const grouped = {};

  records.forEach(record => {
    const date = record[dField] ? new Date(record[dField]) : null;
    if (!date) return;

    let key;
    switch (periodType) {
      case REPORTS_CONSTANTS.PERIOD_TYPES.DAILY:
        key = date.toISOString().split('T')[0];
        break;
      case REPORTS_CONSTANTS.PERIOD_TYPES.WEEKLY: {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `W${Math.ceil(date.getDate() / 7)}-${date.getMonth() + 1}-${date.getFullYear()}`;
        break;
      }
      case REPORTS_CONSTANTS.PERIOD_TYPES.MONTHLY:
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case REPORTS_CONSTANTS.PERIOD_TYPES.QUARTERLY:
        key = `Q${Math.ceil((date.getMonth() + 1) / 3)}-${date.getFullYear()}`;
        break;
      case REPORTS_CONSTANTS.PERIOD_TYPES.ANNUAL:
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) grouped[key] = { period: key, total: 0, count: 0, values: [] };
    const val = record[valueField] || 0;
    grouped[key].total += val;
    grouped[key].count++;
    grouped[key].values.push(val);
  });

  const result = Object.values(grouped).map(g => ({
    ...g,
    total: Math.round(g.total * 100) / 100,
    avg: g.count > 0 ? Math.round((g.total / g.count) * 100) / 100 : 0,
    min: g.values.length > 0 ? Math.min(...g.values) : 0,
    max: g.values.length > 0 ? Math.max(...g.values) : 0,
  }));

  result.sort((a, b) => a.period.localeCompare(b.period));

  return {
    isValid: true,
    periodType: periodType || REPORTS_CONSTANTS.PERIOD_TYPES.MONTHLY,
    periods: result.length,
    data: result,
    grandTotal: Math.round(result.reduce((s, r) => s + r.total, 0) * 100) / 100,
    grandAvg:
      result.length > 0
        ? Math.round((result.reduce((s, r) => s + r.total, 0) / result.length) * 100) / 100
        : 0,
  };
}

/**
 * حساب التوزيع النسبي (Distribution)
 */
function calculateDistribution(items, groupByField, valueField) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: 'لا توجد عناصر للتوزيع' };
  }
  if (!groupByField) {
    return { isValid: false, error: 'حقل التجميع مطلوب' };
  }

  const grouped = {};
  const total = valueField ? items.reduce((sum, i) => sum + (i[valueField] || 0), 0) : items.length;

  items.forEach(item => {
    const key = item[groupByField] || 'other';
    if (!grouped[key]) grouped[key] = { label: key, count: 0, value: 0 };
    grouped[key].count++;
    if (valueField) grouped[key].value += item[valueField] || 0;
  });

  const distribution = Object.values(grouped).map(g => ({
    ...g,
    value: valueField ? Math.round(g.value * 100) / 100 : g.count,
    pct: Math.round(((valueField ? g.value : g.count) / total) * 100 * 100) / 100,
  }));

  distribution.sort((a, b) => b.value - a.value);

  return {
    isValid: true,
    total: valueField ? Math.round(total * 100) / 100 : total,
    groupCount: distribution.length,
    distribution,
    topCategory: distribution[0] || null,
    bottomCategory: distribution[distribution.length - 1] || null,
  };
}

// ========================================
// EXPORT
// ========================================
module.exports = {
  REPORTS_CONSTANTS,
  calculateKPI,
  buildKPIDashboard,
  analyzeTrend,
  comparePeriods,
  calculateIncomeStatement,
  calculateCashFlow,
  calculateAgingAnalysis,
  calculateBeneficiaryStats,
  calculateCapacityUtilization,
  calculateHRStats,
  calculateAttendanceReport,
  compareBranchPerformance,
  buildExecutiveDashboard,
  aggregateByPeriod,
  calculateDistribution,
};
