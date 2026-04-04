'use strict';

/**
 * Quality Assurance Calculations Service
 * وحدة ضمان الجودة والامتثال - Pure Business Logic
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 *
 * لا يحتوي على أي imports خارجية - pure functions فقط
 */

// ========================================
// CONSTANTS
// ========================================
const QUALITY_CONSTANTS = {
  AUDIT_TYPES: {
    CLINICAL: 'clinical',
    ADMINISTRATIVE: 'administrative',
    FINANCIAL: 'financial',
    SAFETY: 'safety',
    COMPLIANCE: 'compliance',
    PATIENT_SATISFACTION: 'patient_satisfaction',
  },

  AUDIT_STATUS: {
    PLANNED: 'planned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    OVERDUE: 'overdue',
  },

  FINDING_SEVERITY: {
    CRITICAL: 'critical', // يستوجب إيقاف العمل فوراً
    MAJOR: 'major', // يستوجب التصحيح خلال 24 ساعة
    MINOR: 'minor', // يستوجب التصحيح خلال أسبوع
    OBSERVATION: 'observation', // توصية للتحسين
  },

  FINDING_STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    OVERDUE: 'overdue',
  },

  INCIDENT_TYPES: {
    MEDICATION_ERROR: 'medication_error',
    FALL: 'fall',
    EQUIPMENT_FAILURE: 'equipment_failure',
    NEAR_MISS: 'near_miss',
    PATIENT_COMPLAINT: 'patient_complaint',
    STAFF_INJURY: 'staff_injury',
    INFECTION: 'infection',
    DOCUMENTATION_ERROR: 'documentation_error',
  },

  INCIDENT_SEVERITY: {
    LEVEL_1: 1, // No harm
    LEVEL_2: 2, // Minor harm
    LEVEL_3: 3, // Moderate harm
    LEVEL_4: 4, // Severe harm
    LEVEL_5: 5, // Death/permanent disability
  },

  KPI_CATEGORIES: {
    CLINICAL_OUTCOMES: 'clinical_outcomes',
    OPERATIONAL_EFFICIENCY: 'operational_efficiency',
    PATIENT_SATISFACTION: 'patient_satisfaction',
    STAFF_PERFORMANCE: 'staff_performance',
    FINANCIAL_HEALTH: 'financial_health',
    SAFETY: 'safety',
  },

  // معايير الجودة القياسية (مرجع)
  BENCHMARKS: {
    APPOINTMENT_ATTENDANCE_RATE: 85, // % حضور مواعيد
    SESSION_COMPLETION_RATE: 90, // % إكمال الجلسات المقررة
    PATIENT_SATISFACTION_SCORE: 4.0, // من 5
    DOCUMENTATION_TIMELINESS: 95, // % توثيق في الوقت المحدد
    INCIDENT_RATE_PER_1000: 5, // حوادث لكل 1000 جلسة
    STAFF_TURNOVER_RATE: 15, // % سنوياً كحد أقصى
    COMPLAINT_RESOLUTION_TIME: 72, // ساعة
    GOAL_ACHIEVEMENT_RATE: 70, // % من أهداف IEP
    OCCUPANCY_RATE: 80, // % إشغال الطاقة
  },

  COMPLIANCE_CATEGORIES: {
    MOH: 'moh', // وزارة الصحة
    NCBE: 'ncbe', // الهيئة الوطنية لتقييم وجودة المستشفيات
    SCFHS: 'scfhs', // الهيئة السعودية للتخصصات الصحية
    MOL: 'mol', // وزارة العمل
    ZATCA: 'zatca', // هيئة الزكاة والضريبة والجمارك
    HRSD: 'hrsd', // وزارة الموارد البشرية والتنمية الاجتماعية
  },

  RESOLUTION_DEADLINES_HOURS: {
    critical: 4,
    major: 24,
    minor: 168, // 7 أيام
    observation: 720, // 30 يوم
  },
};

// ========================================
// KPI CALCULATIONS
// ========================================

/**
 * حساب معدل حضور المواعيد
 * Appointment Attendance Rate
 */
function calculateAttendanceRate(scheduledAppointments, attendedAppointments) {
  if (!scheduledAppointments || scheduledAppointments <= 0) {
    return { rate: 0, isValid: false, error: 'عدد المواعيد المجدولة يجب أن يكون أكبر من صفر' };
  }

  if (attendedAppointments < 0 || attendedAppointments > scheduledAppointments) {
    return { rate: 0, isValid: false, error: 'عدد الحضور غير صالح' };
  }

  const rate = (attendedAppointments / scheduledAppointments) * 100;
  const meetsStandard = rate >= QUALITY_CONSTANTS.BENCHMARKS.APPOINTMENT_ATTENDANCE_RATE;

  return {
    isValid: true,
    rate: Math.round(rate * 100) / 100,
    scheduled: scheduledAppointments,
    attended: attendedAppointments,
    missed: scheduledAppointments - attendedAppointments,
    benchmark: QUALITY_CONSTANTS.BENCHMARKS.APPOINTMENT_ATTENDANCE_RATE,
    meetsStandard,
    status: meetsStandard ? 'acceptable' : 'below_standard',
  };
}

/**
 * حساب معدل إكمال الجلسات
 * Session Completion Rate
 */
function calculateSessionCompletionRate(plannedSessions, completedSessions) {
  if (!plannedSessions || plannedSessions <= 0) {
    return { rate: 0, isValid: false, error: 'عدد الجلسات المخططة يجب أن يكون أكبر من صفر' };
  }

  const rate = (completedSessions / plannedSessions) * 100;
  const meetsStandard = rate >= QUALITY_CONSTANTS.BENCHMARKS.SESSION_COMPLETION_RATE;

  return {
    isValid: true,
    rate: Math.round(rate * 100) / 100,
    planned: plannedSessions,
    completed: completedSessions,
    incomplete: plannedSessions - completedSessions,
    benchmark: QUALITY_CONSTANTS.BENCHMARKS.SESSION_COMPLETION_RATE,
    meetsStandard,
  };
}

/**
 * حساب معدل تحقيق أهداف IEP
 * IEP Goal Achievement Rate
 */
function calculateGoalAchievementRate(goals) {
  if (!goals || !Array.isArray(goals) || goals.length === 0) {
    return { rate: 0, isValid: false, error: 'لا توجد أهداف للحساب' };
  }

  const total = goals.length;
  const achieved = goals.filter(g => g.status === 'achieved' || g.progressPercentage >= 100).length;
  const inProgress = goals.filter(
    g => g.status === 'in_progress' || (g.progressPercentage > 0 && g.progressPercentage < 100)
  ).length;
  const notStarted = goals.filter(g => !g.progressPercentage || g.progressPercentage === 0).length;

  const rate = (achieved / total) * 100;
  const partialRate = ((achieved + inProgress * 0.5) / total) * 100;

  return {
    isValid: true,
    total,
    achieved,
    inProgress,
    notStarted,
    achievementRate: Math.round(rate * 100) / 100,
    partialRate: Math.round(partialRate * 100) / 100,
    benchmark: QUALITY_CONSTANTS.BENCHMARKS.GOAL_ACHIEVEMENT_RATE,
    meetsStandard: rate >= QUALITY_CONSTANTS.BENCHMARKS.GOAL_ACHIEVEMENT_RATE,
  };
}

/**
 * حساب معدل الإشغال (Occupancy Rate)
 */
function calculateOccupancyRate(availableSlots, usedSlots) {
  if (!availableSlots || availableSlots <= 0) {
    return { rate: 0, isValid: false, error: 'الطاقة المتاحة يجب أن تكون أكبر من صفر' };
  }

  if (usedSlots < 0 || usedSlots > availableSlots) {
    return { rate: 0, isValid: false, error: 'الطاقة المستخدمة غير صالحة' };
  }

  const rate = (usedSlots / availableSlots) * 100;
  const benchmark = QUALITY_CONSTANTS.BENCHMARKS.OCCUPANCY_RATE;

  return {
    isValid: true,
    rate: Math.round(rate * 100) / 100,
    available: availableSlots,
    used: usedSlots,
    unused: availableSlots - usedSlots,
    benchmark,
    meetsStandard: rate >= benchmark,
    efficiency:
      rate >= 90
        ? 'over_capacity_risk'
        : rate >= benchmark
          ? 'optimal'
          : rate >= 60
            ? 'acceptable'
            : 'under_utilized',
  };
}

/**
 * حساب معدل الحوادث لكل 1000 جلسة
 */
function calculateIncidentRate(totalIncidents, totalSessions) {
  if (!totalSessions || totalSessions <= 0) {
    return { rate: 0, isValid: false, error: 'عدد الجلسات يجب أن يكون أكبر من صفر' };
  }

  const rate = (totalIncidents / totalSessions) * 1000;
  const benchmark = QUALITY_CONSTANTS.BENCHMARKS.INCIDENT_RATE_PER_1000;
  const meetsStandard = rate <= benchmark;

  return {
    isValid: true,
    rate: Math.round(rate * 100) / 100,
    totalIncidents,
    totalSessions,
    benchmark,
    meetsStandard,
    riskLevel:
      rate === 0
        ? 'none'
        : rate <= benchmark
          ? 'acceptable'
          : rate <= benchmark * 2
            ? 'elevated'
            : 'high',
  };
}

// ========================================
// AUDIT SCORING
// ========================================

/**
 * حساب درجة التدقيق
 * Audit Score Calculation
 */
function calculateAuditScore(auditItems) {
  if (!auditItems || !Array.isArray(auditItems) || auditItems.length === 0) {
    return { score: 0, isValid: false, error: 'لا توجد عناصر تدقيق' };
  }

  // تحقق من أن كل عنصر له الحقول المطلوبة
  const invalid = auditItems.find(item => item.weight === undefined || item.score === undefined);
  if (invalid) {
    return { score: 0, isValid: false, error: 'عناصر التدقيق تفتقر إلى الوزن أو الدرجة' };
  }

  const totalWeight = auditItems.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return {
      score: 0,
      isValid: false,
      error: `مجموع الأوزان يجب أن يساوي 100 (الحالي: ${totalWeight})`,
    };
  }

  const weightedScore = auditItems.reduce((sum, item) => {
    const normalizedScore = Math.min(100, Math.max(0, item.score));
    return sum + (normalizedScore * item.weight) / 100;
  }, 0);

  const finalScore = Math.round(weightedScore * 100) / 100;

  return {
    isValid: true,
    score: finalScore,
    totalWeight,
    itemCount: auditItems.length,
    grade:
      finalScore >= 90
        ? 'A'
        : finalScore >= 80
          ? 'B'
          : finalScore >= 70
            ? 'C'
            : finalScore >= 60
              ? 'D'
              : 'F',
    gradeAr:
      finalScore >= 90
        ? 'ممتاز'
        : finalScore >= 80
          ? 'جيد جداً'
          : finalScore >= 70
            ? 'جيد'
            : finalScore >= 60
              ? 'مقبول'
              : 'غير مقبول',
    passesAudit: finalScore >= 70,
    items: auditItems.map(item => ({
      ...item,
      weightedScore: Math.round(((item.score * item.weight) / 100) * 100) / 100,
    })),
  };
}

/**
 * تصنيف النتيجة وتحديد الأولوية
 */
function classifyAuditFinding(description, category, evidenceCount) {
  if (!description || !category) {
    return { isValid: false, error: 'وصف النتيجة والفئة مطلوبان' };
  }

  // تحديد الخطورة بناءً على كلمات مفتاحية
  const criticalKeywords = ['سلامة', 'خطر', 'طارئ', 'وفاة', 'إصابة', 'critical', 'safety'];
  const majorKeywords = ['توقف', 'عدم امتثال', 'مخالفة', 'نظام', 'قانون', 'major'];
  const minorKeywords = ['تحسين', 'تأخير', 'توثيق', 'إجراء', 'minor'];

  const lowerDesc = description.toLowerCase();
  let severity = QUALITY_CONSTANTS.FINDING_SEVERITY.OBSERVATION;

  if (criticalKeywords.some(kw => lowerDesc.includes(kw))) {
    severity = QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL;
  } else if (majorKeywords.some(kw => lowerDesc.includes(kw))) {
    severity = QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR;
  } else if (minorKeywords.some(kw => lowerDesc.includes(kw))) {
    severity = QUALITY_CONSTANTS.FINDING_SEVERITY.MINOR;
  }

  const deadlineHours = QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS[severity];

  return {
    isValid: true,
    description,
    category,
    severity,
    deadlineHours,
    requiresImmediateAction: severity === QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL,
    evidenceStrength:
      !evidenceCount || evidenceCount === 0
        ? 'no_evidence'
        : evidenceCount === 1
          ? 'weak'
          : evidenceCount <= 3
            ? 'moderate'
            : 'strong',
    status: QUALITY_CONSTANTS.FINDING_STATUS.OPEN,
  };
}

// ========================================
// INCIDENT ANALYSIS
// ========================================

/**
 * تحليل الحادثة وحساب مستوى الخطر
 * RPN = Severity × Probability × Detectability
 */
function calculateIncidentRPN(severity, probability, detectability) {
  if (
    severity < 1 ||
    severity > 10 ||
    probability < 1 ||
    probability > 10 ||
    detectability < 1 ||
    detectability > 10
  ) {
    return { isValid: false, error: 'القيم يجب أن تكون بين 1 و 10' };
  }

  const rpn = severity * probability * detectability;
  const maxRpn = 1000; // 10×10×10

  return {
    isValid: true,
    rpn,
    severity,
    probability,
    detectability,
    riskLevel: rpn >= 500 ? 'critical' : rpn >= 200 ? 'high' : rpn >= 80 ? 'medium' : 'low',
    riskLevelAr: rpn >= 500 ? 'حرج' : rpn >= 200 ? 'عالٍ' : rpn >= 80 ? 'متوسط' : 'منخفض',
    percentage: Math.round((rpn / maxRpn) * 100),
    requiresImmediateAction: rpn >= 500,
    recommendation:
      rpn >= 500
        ? 'إيقاف فوري ومراجعة شاملة'
        : rpn >= 200
          ? 'تصحيح عاجل خلال 24 ساعة'
          : rpn >= 80
            ? 'تصحيح خلال أسبوع'
            : 'مراقبة وتحسين',
  };
}

/**
 * تصنيف الحوادث وإحصائياتها
 */
function analyzeIncidentTrends(incidents, periodDays) {
  if (!incidents || !Array.isArray(incidents)) {
    return {
      isValid: false,
      total: 0,
      bySeverity: {},
      byType: {},
      trend: 'stable',
    };
  }

  const total = incidents.length;
  const period = periodDays || 30;

  const bySeverity = {};
  const byType = {};

  incidents.forEach(incident => {
    // تجميع حسب الخطورة
    const sev = incident.severity || 'unknown';
    if (!bySeverity[sev]) bySeverity[sev] = 0;
    bySeverity[sev]++;

    // تجميع حسب النوع
    const type = incident.type || 'unknown';
    if (!byType[type]) byType[type] = 0;
    byType[type]++;
  });

  // تحليل الاتجاه (أولى/أواخر الفترة)
  const halfPeriod = Math.floor(incidents.length / 2);
  const firstHalf = incidents.slice(0, halfPeriod).length;
  const secondHalf = incidents.slice(halfPeriod).length;
  const trend =
    secondHalf > firstHalf * 1.2
      ? 'increasing'
      : secondHalf < firstHalf * 0.8
        ? 'decreasing'
        : 'stable';

  // النوع الأكثر تكراراً
  const mostCommonType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  return {
    isValid: true,
    total,
    periodDays: period,
    ratePerDay: Math.round((total / period) * 100) / 100,
    bySeverity,
    byType,
    trend,
    mostCommonType: mostCommonType ? mostCommonType[0] : null,
    mostCommonTypeCount: mostCommonType ? mostCommonType[1] : 0,
    criticalCount: bySeverity[5] || bySeverity['critical'] || 0,
    requiresReview:
      total > 0 && !!(bySeverity[5] || bySeverity['critical'] || trend === 'increasing'),
  };
}

// ========================================
// PATIENT SATISFACTION
// ========================================

/**
 * حساب نقاط رضا المستفيدين
 */
function calculateSatisfactionScore(responses) {
  if (!responses || !Array.isArray(responses) || responses.length === 0) {
    return { score: 0, isValid: false, error: 'لا توجد استجابات لحساب الرضا' };
  }

  // كل استجابة: { question, score (1-5), category }
  const validResponses = responses.filter(r => r.score >= 1 && r.score <= 5);
  if (validResponses.length === 0) {
    return { score: 0, isValid: false, error: 'لا توجد استجابات صالحة (القيم بين 1-5)' };
  }

  const totalScore = validResponses.reduce((sum, r) => sum + r.score, 0);
  const averageScore = totalScore / validResponses.length;

  // تجميع حسب الفئة
  const byCategory = {};
  validResponses.forEach(r => {
    const cat = r.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += r.score;
    byCategory[cat].count++;
  });

  const categoryAverages = {};
  Object.entries(byCategory).forEach(([cat, data]) => {
    categoryAverages[cat] = Math.round((data.total / data.count) * 100) / 100;
  });

  // Net Promoter Score بسيط (من يعطي 4-5 هو promoter، 1-2 detractor)
  const promoters = validResponses.filter(r => r.score >= 4).length;
  const detractors = validResponses.filter(r => r.score <= 2).length;
  const nps = Math.round(((promoters - detractors) / validResponses.length) * 100);

  return {
    isValid: true,
    score: Math.round(averageScore * 100) / 100,
    totalResponses: validResponses.length,
    benchmark: QUALITY_CONSTANTS.BENCHMARKS.PATIENT_SATISFACTION_SCORE,
    meetsStandard: averageScore >= QUALITY_CONSTANTS.BENCHMARKS.PATIENT_SATISFACTION_SCORE,
    nps,
    promoters,
    detractors,
    neutral: validResponses.length - promoters - detractors,
    byCategory: categoryAverages,
    distribution: {
      5: validResponses.filter(r => r.score === 5).length,
      4: validResponses.filter(r => r.score === 4).length,
      3: validResponses.filter(r => r.score === 3).length,
      2: validResponses.filter(r => r.score === 2).length,
      1: validResponses.filter(r => r.score === 1).length,
    },
    level:
      averageScore >= 4.5
        ? 'excellent'
        : averageScore >= 4.0
          ? 'good'
          : averageScore >= 3.0
            ? 'acceptable'
            : averageScore >= 2.0
              ? 'poor'
              : 'very_poor',
  };
}

// ========================================
// COMPLIANCE CHECKLIST
// ========================================

/**
 * تقييم مستوى الامتثال التنظيمي
 */
function evaluateComplianceChecklist(checklistItems) {
  if (!checklistItems || !Array.isArray(checklistItems) || checklistItems.length === 0) {
    return { complianceRate: 0, isValid: false, error: 'لا توجد عناصر امتثال' };
  }

  const total = checklistItems.length;
  const compliant = checklistItems.filter(item => item.status === 'compliant').length;
  const nonCompliant = checklistItems.filter(item => item.status === 'non_compliant').length;
  const partial = checklistItems.filter(item => item.status === 'partial').length;
  const notApplicable = checklistItems.filter(item => item.status === 'not_applicable').length;

  const applicable = total - notApplicable;
  const complianceRate =
    applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100 * 100) / 100 : 0;

  // الفجوات الحرجة (المتطلبات الإلزامية غير الممتثلة)
  const criticalGaps = checklistItems.filter(
    item => item.isMandatory && item.status === 'non_compliant'
  );

  // تجميع حسب الفئة التنظيمية
  const byCategory = {};
  checklistItems.forEach(item => {
    const cat = item.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = { compliant: 0, nonCompliant: 0, partial: 0, total: 0 };
    byCategory[cat].total++;
    if (item.status === 'compliant') byCategory[cat].compliant++;
    else if (item.status === 'non_compliant') byCategory[cat].nonCompliant++;
    else if (item.status === 'partial') byCategory[cat].partial++;
  });

  return {
    isValid: true,
    complianceRate,
    total,
    applicable,
    compliant,
    nonCompliant,
    partial,
    notApplicable,
    criticalGaps: criticalGaps.map(item => ({
      id: item.id,
      requirement: item.requirement,
      category: item.category,
    })),
    hasCriticalGaps: criticalGaps.length > 0,
    byCategory,
    overallStatus:
      criticalGaps.length > 0
        ? 'non_compliant'
        : complianceRate >= 90
          ? 'fully_compliant'
          : complianceRate >= 70
            ? 'substantially_compliant'
            : 'partially_compliant',
  };
}

// ========================================
// STAFF PERFORMANCE
// ========================================

/**
 * حساب معدل دوران الموظفين
 */
function calculateStaffTurnoverRate(startHeadcount, endHeadcount, separations, period) {
  if (!startHeadcount || startHeadcount <= 0) {
    return { rate: 0, isValid: false, error: 'عدد الموظفين في بداية الفترة مطلوب' };
  }

  const avgHeadcount = (startHeadcount + endHeadcount) / 2;
  const rate = (separations / avgHeadcount) * 100;

  // تعديل لفترة كاملة (سنوية)
  const annualizedRate = period && period !== 12 ? (rate / period) * 12 : rate;

  const benchmark = QUALITY_CONSTANTS.BENCHMARKS.STAFF_TURNOVER_RATE;

  return {
    isValid: true,
    rate: Math.round(rate * 100) / 100,
    annualizedRate: Math.round(annualizedRate * 100) / 100,
    startHeadcount,
    endHeadcount,
    separations,
    averageHeadcount: Math.round(avgHeadcount * 100) / 100,
    benchmark,
    meetsStandard: annualizedRate <= benchmark,
    riskLevel:
      annualizedRate <= benchmark
        ? 'acceptable'
        : annualizedRate <= benchmark * 1.5
          ? 'elevated'
          : 'high',
  };
}

// ========================================
// DOCUMENTATION TIMELINESS
// ========================================

/**
 * حساب معدل توثيق الجلسات في الوقت المحدد
 */
function calculateDocumentationTimeliness(sessions) {
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    return { rate: 0, isValid: false, error: 'لا توجد جلسات للتقييم' };
  }

  const total = sessions.length;
  const timelyThresholdHours = 24; // يجب التوثيق خلال 24 ساعة

  let timelyCount = 0;
  let lateCount = 0;
  let missingCount = 0;
  let totalDelayHours = 0;

  sessions.forEach(session => {
    if (!session.documentedAt) {
      missingCount++;
    } else {
      const sessionEnd = new Date(session.endTime || session.date);
      const docTime = new Date(session.documentedAt);
      const delayHours = (docTime - sessionEnd) / (1000 * 60 * 60);

      if (delayHours <= timelyThresholdHours) {
        timelyCount++;
      } else {
        lateCount++;
        totalDelayHours += delayHours;
      }
    }
  });

  const timelinessRate = (timelyCount / total) * 100;
  const avgDelayHours = lateCount > 0 ? totalDelayHours / lateCount : 0;

  return {
    isValid: true,
    timelinessRate: Math.round(timelinessRate * 100) / 100,
    total,
    timely: timelyCount,
    late: lateCount,
    missing: missingCount,
    avgDelayHours: Math.round(avgDelayHours * 100) / 100,
    benchmark: QUALITY_CONSTANTS.BENCHMARKS.DOCUMENTATION_TIMELINESS,
    meetsStandard: timelinessRate >= QUALITY_CONSTANTS.BENCHMARKS.DOCUMENTATION_TIMELINESS,
    missingDocumentationRate: Math.round((missingCount / total) * 100 * 100) / 100,
  };
}

// ========================================
// COMPREHENSIVE QUALITY DASHBOARD
// ========================================

/**
 * توليد لوحة مؤشرات الجودة الشاملة
 */
function generateQualityDashboard(metrics) {
  if (!metrics) {
    return { isValid: false, error: 'بيانات المؤشرات مطلوبة' };
  }

  const kpis = [];

  // مؤشر الحضور
  if (metrics.scheduledAppointments !== undefined) {
    const attendance = calculateAttendanceRate(
      metrics.scheduledAppointments,
      metrics.attendedAppointments || 0
    );
    kpis.push({
      name: 'معدل الحضور',
      nameEn: 'Attendance Rate',
      category: QUALITY_CONSTANTS.KPI_CATEGORIES.OPERATIONAL_EFFICIENCY,
      value: attendance.rate,
      unit: '%',
      benchmark: attendance.benchmark,
      status: attendance.meetsStandard ? 'green' : 'red',
      trend: 'stable',
    });
  }

  // مؤشر رضا المستفيدين
  if (metrics.satisfactionScore !== undefined) {
    const isMet =
      metrics.satisfactionScore >= QUALITY_CONSTANTS.BENCHMARKS.PATIENT_SATISFACTION_SCORE;
    kpis.push({
      name: 'رضا المستفيدين',
      nameEn: 'Patient Satisfaction',
      category: QUALITY_CONSTANTS.KPI_CATEGORIES.PATIENT_SATISFACTION,
      value: metrics.satisfactionScore,
      unit: '/5',
      benchmark: QUALITY_CONSTANTS.BENCHMARKS.PATIENT_SATISFACTION_SCORE,
      status: isMet ? 'green' : 'red',
    });
  }

  // مؤشر الحوادث
  if (metrics.totalIncidents !== undefined && metrics.totalSessions !== undefined) {
    const incidentRate = calculateIncidentRate(metrics.totalIncidents, metrics.totalSessions);
    kpis.push({
      name: 'معدل الحوادث',
      nameEn: 'Incident Rate',
      category: QUALITY_CONSTANTS.KPI_CATEGORIES.SAFETY,
      value: incidentRate.rate,
      unit: 'لكل 1000 جلسة',
      benchmark: incidentRate.benchmark,
      status: incidentRate.meetsStandard ? 'green' : 'red',
    });
  }

  // مؤشر الإشغال
  if (metrics.availableSlots !== undefined) {
    const occupancy = calculateOccupancyRate(metrics.availableSlots, metrics.usedSlots || 0);
    kpis.push({
      name: 'معدل الإشغال',
      nameEn: 'Occupancy Rate',
      category: QUALITY_CONSTANTS.KPI_CATEGORIES.OPERATIONAL_EFFICIENCY,
      value: occupancy.rate,
      unit: '%',
      benchmark: occupancy.benchmark,
      status: occupancy.meetsStandard ? 'green' : 'yellow',
    });
  }

  const greenCount = kpis.filter(k => k.status === 'green').length;
  const redCount = kpis.filter(k => k.status === 'red').length;
  const overallHealth = kpis.length > 0 ? Math.round((greenCount / kpis.length) * 100) : 0;

  return {
    isValid: true,
    kpis,
    summary: {
      totalKPIs: kpis.length,
      greenCount,
      yellowCount: kpis.filter(k => k.status === 'yellow').length,
      redCount,
      overallHealth,
      healthLevel:
        overallHealth >= 80
          ? 'excellent'
          : overallHealth >= 60
            ? 'good'
            : overallHealth >= 40
              ? 'fair'
              : 'poor',
    },
    generatedAt: new Date().toISOString(),
  };
}

// ========================================
// CORRECTIVE ACTION PLAN
// ========================================

/**
 * توليد خطة الإجراءات التصحيحية
 */
function generateCorrectiveActionPlan(findings) {
  if (!findings || !Array.isArray(findings) || findings.length === 0) {
    return { isValid: false, actions: [], total: 0 };
  }

  // ترتيب النتائج حسب الخطورة
  const severityOrder = {
    [QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL]: 4,
    [QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR]: 3,
    [QUALITY_CONSTANTS.FINDING_SEVERITY.MINOR]: 2,
    [QUALITY_CONSTANTS.FINDING_SEVERITY.OBSERVATION]: 1,
  };

  const sorted = [...findings].sort(
    (a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
  );

  const actions = sorted.map((finding, index) => {
    const deadlineHours = QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS[finding.severity] || 720;
    const deadlineDate = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    return {
      priority: index + 1,
      findingId: finding.id || `F${index + 1}`,
      description: finding.description,
      severity: finding.severity,
      deadlineHours,
      deadlineDateStr: deadlineDate.toISOString(),
      responsibleRole:
        finding.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL
          ? 'center_director'
          : finding.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR
            ? 'quality_manager'
            : 'department_head',
      suggestedAction:
        finding.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL
          ? 'إيقاف العملية + مراجعة فورية + تقرير للإدارة العليا'
          : finding.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR
            ? 'مراجعة الإجراءات + تدريب الفريق + تقرير دوري'
            : finding.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.MINOR
              ? 'تحديث الإجراءات + مراجعة دورية'
              : 'توثيق للمراجعة المستقبلية',
      status: QUALITY_CONSTANTS.FINDING_STATUS.OPEN,
    };
  });

  const criticalActions = actions.filter(
    a => a.severity === QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL
  ).length;

  return {
    isValid: true,
    actions,
    total: actions.length,
    criticalActions,
    requiresImmediateAttention: criticalActions > 0,
    estimatedCompletionDays: actions.reduce((max, a) => Math.max(max, a.deadlineHours / 24), 0),
  };
}

// ========================================
// QUALITY TREND ANALYSIS
// ========================================

/**
 * تحليل اتجاه الجودة عبر الزمن
 */
function analyzeQualityTrend(periodData) {
  if (!periodData || !Array.isArray(periodData) || periodData.length < 2) {
    return { isValid: false, error: 'يلزم فترتان على الأقل لتحليل الاتجاه' };
  }

  const scores = periodData.map(p => p.score || 0);
  const n = scores.length;

  // حساب المتوسط المتحرك (3 فترات)
  const movingAvg = scores.map((_, i) => {
    if (i < 2) return scores[i];
    return Math.round(((scores[i] + scores[i - 1] + scores[i - 2]) / 3) * 100) / 100;
  });

  // تحديد الاتجاه (خطي بسيط)
  const firstHalfAvg =
    scores.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0) / Math.floor(n / 2);
  const secondHalfAvg =
    scores.slice(Math.floor(n / 2)).reduce((a, b) => a + b, 0) / (n - Math.floor(n / 2));

  const changePct =
    firstHalfAvg > 0
      ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 * 100) / 100
      : 0;

  const trend = changePct > 5 ? 'improving' : changePct < -5 ? 'declining' : 'stable';

  // أعلى وأدنى نقاط
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const latestScore = scores[n - 1];

  return {
    isValid: true,
    periods: n,
    scores,
    movingAverage: movingAvg,
    trend,
    changePct,
    firstHalfAvg: Math.round(firstHalfAvg * 100) / 100,
    secondHalfAvg: Math.round(secondHalfAvg * 100) / 100,
    maxScore,
    minScore,
    latestScore,
    volatility: Math.round((maxScore - minScore) * 100) / 100,
    isImproving: trend === 'improving',
    requiresAttention: trend === 'declining' || latestScore < 70,
  };
}

// ========================================
// EXPORT
// ========================================
module.exports = {
  QUALITY_CONSTANTS,
  calculateAttendanceRate,
  calculateSessionCompletionRate,
  calculateGoalAchievementRate,
  calculateOccupancyRate,
  calculateIncidentRate,
  calculateAuditScore,
  classifyAuditFinding,
  calculateIncidentRPN,
  analyzeIncidentTrends,
  calculateSatisfactionScore,
  evaluateComplianceChecklist,
  calculateStaffTurnoverRate,
  calculateDocumentationTimeliness,
  generateQualityDashboard,
  generateCorrectiveActionPlan,
  analyzeQualityTrend,
};
