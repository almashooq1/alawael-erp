/**
 * Rehabilitation & Clinical Calculations Service - خدمة حسابات التأهيل والسريريات
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const REHAB_CONSTANTS = {
  // أنواع الإعاقات
  DISABILITY_TYPES: {
    AUTISM: 'autism',
    CEREBRAL_PALSY: 'cerebral_palsy',
    DOWN_SYNDROME: 'down_syndrome',
    INTELLECTUAL: 'intellectual_disability',
    SPEECH_LANGUAGE: 'speech_language',
    HEARING: 'hearing_impairment',
    VISUAL: 'visual_impairment',
    LEARNING: 'learning_disability',
    ADHD: 'adhd',
    OTHER: 'other',
  },

  // مستويات الشدة
  SEVERITY_LEVELS: {
    MILD: 'mild',
    MODERATE: 'moderate',
    SEVERE: 'severe',
  },

  // أنواع الخدمات
  SERVICE_TYPES: {
    PT: 'pt', // علاج طبيعي
    OT: 'ot', // علاج وظيفي
    SPEECH: 'speech', // علاج نطق ولغة
    ABA: 'aba', // تحليل سلوك تطبيقي
    PSYCHOLOGY: 'psychology', // خدمات نفسية
    SPECIAL_ED: 'special_education', // تربية خاصة
    VOCATIONAL: 'vocational', // تأهيل مهني
    NURSING: 'nursing', // تمريض
  },

  // حالات الأهداف في خطة التأهيل
  GOAL_STATUSES: {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    ACHIEVED: 'achieved',
    PARTIALLY_ACHIEVED: 'partially_achieved',
    DISCONTINUED: 'discontinued',
  },

  // نماذج التقييم المعيارية
  ASSESSMENT_SCALES: {
    GMFCS: 'gmfcs', // Gross Motor Function Classification System
    MACS: 'macs', // Manual Ability Classification System
    VABS: 'vabs', // Vineland Adaptive Behavior Scales
    CARS: 'cars', // Childhood Autism Rating Scale
    BAYLEY: 'bayley', // Bayley Scales of Infant Development
    DENVER: 'denver', // Denver Developmental Screening Test
  },

  // مستويات GMFCS (5 مستويات)
  GMFCS_LEVELS: {
    I: 1, // مشي مستقل بدون قيود
    II: 2, // مشي مع قيود
    III: 3, // مشي باستخدام أدوات مساعدة
    IV: 4, // مشي محدود
    V: 5, // محمول أو يستخدم كرسي
  },

  // أوزان الخدمات في حساب خطة التأهيل (النسب الافتراضية)
  SERVICE_WEIGHTS: {
    pt: 0.25,
    ot: 0.2,
    speech: 0.2,
    aba: 0.15,
    psychology: 0.1,
    special_education: 0.1,
  },
};

// ========================================
// BENEFICIARY ELIGIBILITY & INTAKE
// ========================================

/**
 * تقييم أهلية المستفيد وتحديد الأولوية
 * @param {object} beneficiaryData - بيانات المستفيد
 * @returns {object} - {isEligible, priorityScore, priorityLevel, reasons}
 */
function assessBeneficiaryEligibility(beneficiaryData) {
  if (!beneficiaryData || typeof beneficiaryData !== 'object') {
    return {
      isEligible: false,
      priorityScore: 0,
      priorityLevel: 'low',
      reasons: ['بيانات غير صالحة'],
    };
  }

  const reasons = [];
  let score = 0;

  // 1. تحقق من العمر (0-18 سنة للأطفال، أو حتى 65 للبالغين)
  const age = beneficiaryData.age || 0;
  if (age < 0 || age > 65) {
    return {
      isEligible: false,
      priorityScore: 0,
      priorityLevel: 'ineligible',
      reasons: ['العمر خارج النطاق المقبول'],
    };
  }

  // 2. درجة الأولوية حسب العمر (تدخل مبكر = أولوية أعلى)
  if (age <= 3) {
    score += 40;
    reasons.push('تدخل مبكر (عمر مثالي)');
  } else if (age <= 6) {
    score += 30;
  } else if (age <= 12) {
    score += 20;
  } else if (age <= 18) {
    score += 10;
  } else {
    score += 5; // بالغون
  }

  // 3. درجة الأولوية حسب شدة الإعاقة
  const severity = beneficiaryData.disabilitySeverity || 'mild';
  if (severity === REHAB_CONSTANTS.SEVERITY_LEVELS.SEVERE) {
    score += 30;
    reasons.push('إعاقة شديدة');
  } else if (severity === REHAB_CONSTANTS.SEVERITY_LEVELS.MODERATE) {
    score += 20;
  } else {
    score += 10;
  }

  // 4. لا يتلقى خدمات حالياً
  if (!beneficiaryData.currentlyReceivingServices) {
    score += 15;
    reasons.push('لا يتلقى خدمات حالياً');
  }

  // 5. إحالة طبية عاجلة
  if (beneficiaryData.urgentReferral) {
    score += 20;
    reasons.push('إحالة طبية عاجلة');
  }

  // 6. وثائق مكتملة
  const hasRequiredDocs = beneficiaryData.hasNationalId && beneficiaryData.hasMedicalReport;
  if (!hasRequiredDocs) {
    score -= 10;
    reasons.push('وثائق ناقصة');
  }

  // تحديد مستوى الأولوية
  let priorityLevel;
  if (score >= 80) priorityLevel = 'critical';
  else if (score >= 60) priorityLevel = 'high';
  else if (score >= 40) priorityLevel = 'medium';
  else priorityLevel = 'low';

  return {
    isEligible: true,
    priorityScore: Math.max(0, Math.min(100, score)),
    priorityLevel,
    reasons,
  };
}

/**
 * حساب عمر المستفيد بالأشهر والسنوات
 * @param {string|Date} dateOfBirth - تاريخ الميلاد
 * @param {Date} asOfDate - تاريخ الحساب
 * @returns {object} - {years, months, totalMonths, ageGroup}
 */
function calculateChronologicalAge(dateOfBirth, asOfDate = new Date()) {
  if (!dateOfBirth) return { years: 0, months: 0, totalMonths: 0, ageGroup: 'unknown' };

  const birth = new Date(dateOfBirth);
  const now = new Date(asOfDate);
  if (isNaN(birth.getTime()) || birth > now) {
    return { years: 0, months: 0, totalMonths: 0, ageGroup: 'unknown' };
  }

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  let ageGroup;
  if (years < 1) ageGroup = 'infant';
  else if (years < 3) ageGroup = 'toddler';
  else if (years < 6) ageGroup = 'preschool';
  else if (years < 13) ageGroup = 'school_age';
  else if (years < 18) ageGroup = 'adolescent';
  else ageGroup = 'adult';

  return { years, months, totalMonths, ageGroup };
}

// ========================================
// IEP - INDIVIDUALIZED EDUCATION PROGRAM
// ========================================

/**
 * حساب نسبة إنجاز خطة التأهيل الفردية (IEP)
 * @param {Array} goals - أهداف الخطة [{status, weight, domain}]
 * @returns {object} - {completionRate, byDomain, achievedCount, totalCount}
 */
function calculateIEPCompletion(goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return {
      completionRate: 0,
      weightedCompletionRate: 0,
      byDomain: {},
      achievedCount: 0,
      totalCount: 0,
      statusBreakdown: {},
    };
  }

  const statusBreakdown = {};
  const byDomain = {};
  let totalWeight = 0;
  let achievedWeight = 0;
  let achievedCount = 0;

  goals.forEach(goal => {
    if (!goal) return;
    const status = goal.status || 'not_started';
    const weight = goal.weight || 1;
    const domain = goal.domain || 'general';

    // عداد الحالات
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

    // حساب الوزن المنجز
    totalWeight += weight;
    if (status === REHAB_CONSTANTS.GOAL_STATUSES.ACHIEVED) {
      achievedWeight += weight;
      achievedCount++;
    } else if (status === REHAB_CONSTANTS.GOAL_STATUSES.PARTIALLY_ACHIEVED) {
      achievedWeight += weight * 0.5;
    }

    // تجميع حسب المجال
    if (!byDomain[domain]) {
      byDomain[domain] = { total: 0, achieved: 0, partial: 0, completionRate: 0 };
    }
    byDomain[domain].total++;
    if (status === REHAB_CONSTANTS.GOAL_STATUSES.ACHIEVED) {
      byDomain[domain].achieved++;
    } else if (status === REHAB_CONSTANTS.GOAL_STATUSES.PARTIALLY_ACHIEVED) {
      byDomain[domain].partial++;
    }
  });

  // حساب نسب الإنجاز
  for (const domain of Object.keys(byDomain)) {
    const d = byDomain[domain];
    d.completionRate =
      d.total > 0 ? Math.round(((d.achieved + d.partial * 0.5) / d.total) * 10000) / 100 : 0;
  }

  const completionRate =
    goals.length > 0 ? Math.round((achievedCount / goals.length) * 10000) / 100 : 0;
  const weightedCompletionRate =
    totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 10000) / 100 : 0;

  return {
    completionRate,
    weightedCompletionRate,
    byDomain,
    achievedCount,
    totalCount: goals.length,
    statusBreakdown,
    isOnTrack: weightedCompletionRate >= 60,
  };
}

/**
 * إنشاء أهداف IEP المقترحة بناءً على التقييم
 * @param {object} assessment - نتائج التقييم
 * @returns {Array} - أهداف مقترحة
 */
function generateIEPGoalSuggestions(assessment) {
  if (!assessment || typeof assessment !== 'object') return [];

  const suggestions = [];
  const { serviceType, currentLevel, targetLevel, domain, timeframe = 3 } = assessment;

  if (!serviceType || currentLevel === undefined || targetLevel === undefined) return [];

  const gap = targetLevel - currentLevel;
  if (gap <= 0) return []; // لا يوجد فجوة للتحسين

  // تقسيم الهدف إلى أهداف أصغر حسب الإطار الزمني
  const stepsCount = Math.min(Math.ceil(gap / 10), timeframe);
  const stepSize = gap / stepsCount;

  for (let i = 1; i <= stepsCount; i++) {
    suggestions.push({
      step: i,
      domain: domain || serviceType,
      serviceType,
      targetValue: Math.round((currentLevel + stepSize * i) * 10) / 10,
      timeframeMonths: Math.round((timeframe / stepsCount) * i),
      priority: i === 1 ? 'high' : 'medium',
      measurable: true,
    });
  }

  return suggestions;
}

// ========================================
// ASSESSMENT SCORING
// ========================================

/**
 * حساب درجة التقييم المعيارية وتفسيرها
 * @param {string} scale - نوع المقياس
 * @param {number} rawScore - الدرجة الخام
 * @param {number} maxScore - الدرجة القصوى
 * @param {object} norms - معايير المقياس {mean, sd}
 * @returns {object} - {percentile, zScore, interpretation}
 */
function calculateStandardizedScore(scale, rawScore, maxScore, norms = null) {
  if (rawScore === undefined || rawScore === null || maxScore <= 0) {
    return {
      percentile: 0,
      standardScore: 0,
      interpretation: 'بيانات غير كافية',
      level: 'unknown',
    };
  }

  const score = Math.max(0, Math.min(rawScore, maxScore));
  const percentage = Math.round((score / maxScore) * 10000) / 100;

  // إذا كانت هناك معايير (mean, sd) نحسب Z-score
  let zScore = null;
  let standardScore = null;
  if (norms && norms.mean !== undefined && norms.sd > 0) {
    zScore = Math.round(((score - norms.mean) / norms.sd) * 100) / 100;
    standardScore = Math.round(100 + zScore * 15); // IQ-like standard score
  }

  // تفسير النتيجة
  let interpretation, level;
  if (percentage >= 90) {
    interpretation = 'ممتاز - يتفوق على المستوى المتوقع';
    level = 'excellent';
  } else if (percentage >= 75) {
    interpretation = 'جيد - يلبي المستوى المتوقع';
    level = 'good';
  } else if (percentage >= 50) {
    interpretation = 'متوسط - يحتاج دعماً متوسطاً';
    level = 'average';
  } else if (percentage >= 25) {
    interpretation = 'دون المتوسط - يحتاج دعماً مكثفاً';
    level = 'below_average';
  } else {
    interpretation = 'يحتاج تدخلاً فورياً';
    level = 'poor';
  }

  return {
    rawScore: score,
    maxScore,
    percentage,
    zScore,
    standardScore,
    interpretation,
    level,
    scale,
  };
}

/**
 * تقييم التطور الحركي الإجمالي (Gross Motor)
 * @param {Array} milestones - مراحل التطور [{task, achieved, expectedAgeMonths}]
 * @param {number} currentAgeMonths - العمر الحالي بالأشهر
 * @returns {object} - {motorAge, delay, delayMonths, gmfcsEstimate}
 */
function assessGrossMotorDevelopment(milestones, currentAgeMonths) {
  if (!Array.isArray(milestones) || milestones.length === 0 || !currentAgeMonths) {
    return { motorAge: 0, delay: false, delayMonths: 0, gmfcsEstimate: null };
  }

  // أعلى مرحلة تم إنجازها
  const achieved = milestones.filter(m => m && m.achieved);
  if (achieved.length === 0) {
    return {
      motorAge: 0,
      delay: currentAgeMonths > 3,
      delayMonths: currentAgeMonths,
      gmfcsEstimate: currentAgeMonths > 12 ? 5 : null,
    };
  }

  // العمر الحركي = أعلى مرحلة محققة
  const motorAge = Math.max(...achieved.map(m => m.expectedAgeMonths || 0));
  const delayMonths = Math.max(0, currentAgeMonths - motorAge);
  const delay = delayMonths > 2;

  // تقدير GMFCS بناءً على التأخر
  let gmfcsEstimate = null;
  if (currentAgeMonths >= 18) {
    const delayPercentage = (delayMonths / currentAgeMonths) * 100;
    if (delayPercentage < 10) gmfcsEstimate = 1;
    else if (delayPercentage < 25) gmfcsEstimate = 2;
    else if (delayPercentage < 50) gmfcsEstimate = 3;
    else if (delayPercentage < 75) gmfcsEstimate = 4;
    else gmfcsEstimate = 5;
  }

  return {
    motorAge,
    currentAge: currentAgeMonths,
    delay,
    delayMonths,
    delayPercentage:
      currentAgeMonths > 0 ? Math.round((delayMonths / currentAgeMonths) * 10000) / 100 : 0,
    gmfcsEstimate,
    achievedMilestones: achieved.length,
    totalMilestones: milestones.length,
  };
}

/**
 * تقييم مستوى اللغة والتواصل
 * @param {object} languageData - بيانات اللغة
 * @returns {object} - {receptiveAge, expressiveAge, delay, recommendations}
 */
function assessLanguageDevelopment(languageData) {
  if (!languageData || typeof languageData !== 'object') {
    return { receptiveAge: 0, expressiveAge: 0, delay: false };
  }

  const receptiveScore = languageData.receptiveScore || 0;
  const expressiveScore = languageData.expressiveScore || 0;
  const receptiveMax = languageData.receptiveMax || 100;
  const expressiveMax = languageData.expressiveMax || 100;
  const chronologicalAge = languageData.chronologicalAgeMonths || 0;

  const receptiveAge = Math.round((receptiveScore / receptiveMax) * chronologicalAge);
  const expressiveAge = Math.round((expressiveScore / expressiveMax) * chronologicalAge);

  const receptiveDelay = Math.max(0, chronologicalAge - receptiveAge);
  const expressiveDelay = Math.max(0, chronologicalAge - expressiveAge);
  const delay = receptiveDelay > 6 || expressiveDelay > 6;

  const recommendations = [];
  if (receptiveDelay > 12) recommendations.push('تقييم سمع فوري');
  if (expressiveDelay > 6) recommendations.push('جلسات علاج نطق مكثفة');
  if (receptiveDelay > 6) recommendations.push('برنامج تحفيز لغوي');
  if (!delay) recommendations.push('متابعة دورية');

  return {
    receptiveAge,
    expressiveAge,
    receptiveDelay,
    expressiveDelay,
    delay,
    severity:
      expressiveDelay > 24
        ? 'severe'
        : expressiveDelay > 12
          ? 'moderate'
          : expressiveDelay > 6
            ? 'mild'
            : 'none',
    recommendations,
  };
}

// ========================================
// PROGRESS TRACKING
// ========================================

/**
 * تتبع تقدم مستفيد عبر جلسات متعددة
 * @param {Array} sessionScores - [{sessionDate, score, maxScore, domain}]
 * @returns {object} - {progressRate, trend, byDomain, projected}
 */
function trackBeneficiaryProgress(sessionScores) {
  if (!Array.isArray(sessionScores) || sessionScores.length === 0) {
    return { progressRate: 0, trend: 'insufficient_data', byDomain: {}, projected: null };
  }

  // ترتيب زمني
  const sorted = sessionScores
    .filter(s => s && s.sessionDate && s.maxScore > 0)
    .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));

  if (sorted.length < 2) {
    return { progressRate: 0, trend: 'insufficient_data', byDomain: {}, projected: null };
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstPct = (first.score / first.maxScore) * 100;
  const lastPct = (last.score / last.maxScore) * 100;
  const progressRate = Math.round((lastPct - firstPct) * 100) / 100;

  // الاتجاه
  const trend = progressRate > 5 ? 'improving' : progressRate < -5 ? 'declining' : 'stable';

  // التجميع حسب المجال
  const byDomain = {};
  sorted.forEach(s => {
    const domain = s.domain || 'general';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push({ date: s.sessionDate, pct: (s.score / s.maxScore) * 100 });
  });

  // التوقع التالي (linear extrapolation)
  let projected = null;
  if (sorted.length >= 3 && progressRate > 0) {
    const sessionsFromNow = 1;
    const avgProgressPerSession = progressRate / (sorted.length - 1);
    projected = Math.min(
      100,
      Math.round((lastPct + avgProgressPerSession * sessionsFromNow) * 100) / 100
    );
  }

  return {
    progressRate,
    trend,
    firstScore: Math.round(firstPct * 100) / 100,
    lastScore: Math.round(lastPct * 100) / 100,
    totalSessions: sorted.length,
    byDomain,
    projected,
    isOnTarget: progressRate >= 5,
  };
}

/**
 * مقارنة تقدم مجموعة من المستفيدين
 * @param {Array} beneficiariesProgress - [{id, name, sessions}]
 * @returns {object} - {rankings, averageProgress, topPerformer}
 */
function compareBeneficiariesProgress(beneficiariesProgress) {
  if (!Array.isArray(beneficiariesProgress) || beneficiariesProgress.length === 0) {
    return { rankings: [], averageProgress: 0, topPerformer: null };
  }

  const withProgress = beneficiariesProgress
    .filter(b => b && b.sessions)
    .map(b => {
      const progress = trackBeneficiaryProgress(b.sessions);
      return {
        id: b.id,
        name: b.name,
        progressRate: progress.progressRate,
        trend: progress.trend,
        lastScore: progress.lastScore,
      };
    });

  const rankings = [...withProgress].sort((a, b) => b.progressRate - a.progressRate);
  const averageProgress =
    withProgress.length > 0
      ? Math.round(
          (withProgress.reduce((s, b) => s + b.progressRate, 0) / withProgress.length) * 100
        ) / 100
      : 0;

  return {
    rankings,
    averageProgress,
    topPerformer: rankings[0] || null,
    leastProgress: rankings[rankings.length - 1] || null,
    improving: withProgress.filter(b => b.trend === 'improving').length,
    stable: withProgress.filter(b => b.trend === 'stable').length,
    declining: withProgress.filter(b => b.trend === 'declining').length,
  };
}

// ========================================
// REHABILITATION PROGRAM DESIGN
// ========================================

/**
 * تحديد الخدمات الموصى بها بناءً على التشخيص
 * @param {string} diagnosisType - نوع الإعاقة
 * @param {string} severity - شدة الإعاقة
 * @param {number} ageYears - العمر بالسنوات
 * @returns {Array} - [{service, priority, sessionsPerWeek, rationale}]
 */
function recommendServices(diagnosisType, severity, ageYears) {
  if (!diagnosisType) return [];

  const recommendations = [];
  const isEarlyIntervention = ageYears <= 6;

  // توصيات حسب نوع الإعاقة
  const serviceMatrix = {
    [REHAB_CONSTANTS.DISABILITY_TYPES.AUTISM]: [
      {
        service: 'aba',
        priority: 'high',
        sessionsPerWeek: severity === 'severe' ? 5 : 3,
        rationale: 'تحليل السلوك التطبيقي',
      },
      { service: 'speech', priority: 'high', sessionsPerWeek: 3, rationale: 'تطوير التواصل' },
      { service: 'ot', priority: 'medium', sessionsPerWeek: 2, rationale: 'التكامل الحسي' },
    ],
    [REHAB_CONSTANTS.DISABILITY_TYPES.CEREBRAL_PALSY]: [
      {
        service: 'pt',
        priority: 'high',
        sessionsPerWeek: severity === 'severe' ? 5 : 3,
        rationale: 'تطوير المهارات الحركية',
      },
      { service: 'ot', priority: 'high', sessionsPerWeek: 3, rationale: 'مهارات الحياة اليومية' },
      { service: 'speech', priority: 'medium', sessionsPerWeek: 2, rationale: 'مهارات التواصل' },
    ],
    [REHAB_CONSTANTS.DISABILITY_TYPES.DOWN_SYNDROME]: [
      { service: 'speech', priority: 'high', sessionsPerWeek: 3, rationale: 'تطوير اللغة' },
      { service: 'pt', priority: 'medium', sessionsPerWeek: 2, rationale: 'القوة العضلية' },
      {
        service: 'special_education',
        priority: 'high',
        sessionsPerWeek: 3,
        rationale: 'التعلم الأكاديمي',
      },
    ],
    [REHAB_CONSTANTS.DISABILITY_TYPES.SPEECH_LANGUAGE]: [
      { service: 'speech', priority: 'high', sessionsPerWeek: 4, rationale: 'العلاج المباشر' },
    ],
    [REHAB_CONSTANTS.DISABILITY_TYPES.INTELLECTUAL]: [
      {
        service: 'special_education',
        priority: 'high',
        sessionsPerWeek: 4,
        rationale: 'التدريب الأكاديمي',
      },
      { service: 'ot', priority: 'medium', sessionsPerWeek: 2, rationale: 'مهارات الحياة' },
    ],
  };

  const matrix = serviceMatrix[diagnosisType];
  if (matrix) {
    matrix.forEach(rec => {
      // زيادة الجلسات في حالة التدخل المبكر
      const adjustedSessions = isEarlyIntervention
        ? Math.min(rec.sessionsPerWeek + 1, 5)
        : rec.sessionsPerWeek;
      recommendations.push({ ...rec, sessionsPerWeek: adjustedSessions });
    });
  }

  // إضافة توصية عامة إذا لم توجد توصيات
  if (recommendations.length === 0) {
    recommendations.push({
      service: 'psychology',
      priority: 'medium',
      sessionsPerWeek: 2,
      rationale: 'تقييم شامل مطلوب',
    });
  }

  return recommendations.sort(
    (a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1)
  );
}

/**
 * حساب الحمل الجلساتي الأسبوعي للمستفيد
 * @param {Array} services - [{service, sessionsPerWeek, durationMinutes}]
 * @returns {object} - {totalSessionsPerWeek, totalMinutesPerWeek, byService, isOverloaded}
 */
function calculateSessionLoad(services) {
  if (!Array.isArray(services) || services.length === 0) {
    return { totalSessionsPerWeek: 0, totalMinutesPerWeek: 0, byService: {}, isOverloaded: false };
  }

  const byService = {};
  let totalSessionsPerWeek = 0;
  let totalMinutesPerWeek = 0;

  services.forEach(s => {
    if (!s || !s.service) return;
    const sessions = Math.max(0, s.sessionsPerWeek || 0);
    const duration = Math.max(0, s.durationMinutes || 45);
    totalSessionsPerWeek += sessions;
    totalMinutesPerWeek += sessions * duration;
    byService[s.service] = { sessions, duration, weeklyMinutes: sessions * duration };
  });

  // الحد الأقصى الموصى به: 15 جلسة أسبوعياً (بناءً على الأبحاث)
  const MAX_SESSIONS = 15;
  const MAX_HOURS = 10; // 10 ساعات أسبوعياً

  return {
    totalSessionsPerWeek,
    totalMinutesPerWeek,
    totalHoursPerWeek: Math.round((totalMinutesPerWeek / 60) * 100) / 100,
    byService,
    isOverloaded: totalSessionsPerWeek > MAX_SESSIONS || totalMinutesPerWeek > MAX_HOURS * 60,
    utilizationRate: Math.round((totalSessionsPerWeek / MAX_SESSIONS) * 10000) / 100,
  };
}

// ========================================
// SESSION EFFECTIVENESS
// ========================================

/**
 * حساب فاعلية الجلسة
 * @param {object} session - بيانات الجلسة
 * @returns {object} - {effectivenessScore, factors, recommendation}
 */
function calculateSessionEffectiveness(session) {
  if (!session || typeof session !== 'object') {
    return { effectivenessScore: 0, factors: [], recommendation: 'بيانات غير كافية' };
  }

  let score = 100;
  const factors = [];

  // 1. الحضور والمشاركة
  const participation = session.participationLevel || 50;
  if (participation < 30) {
    score -= 30;
    factors.push({ factor: 'مشاركة منخفضة جداً', impact: -30 });
  } else if (participation < 60) {
    score -= 15;
    factors.push({ factor: 'مشاركة متوسطة', impact: -15 });
  }

  // 2. إكمال الأنشطة المخططة
  const completedActivities = session.completedActivities || 0;
  const plannedActivities = session.plannedActivities || 1;
  const completionRate = (completedActivities / plannedActivities) * 100;
  if (completionRate < 50) {
    score -= 20;
    factors.push({ factor: 'إكمال أنشطة منخفض', impact: -20 });
  } else if (completionRate < 80) {
    score -= 10;
    factors.push({ factor: 'إكمال أنشطة متوسط', impact: -10 });
  }

  // 3. السلوك والتعاون
  if (session.behaviorChallenges) {
    score -= 15;
    factors.push({ factor: 'تحديات سلوكية', impact: -15 });
  }

  // 4. تحقيق هدف الجلسة
  if (session.sessionGoalAchieved === true) {
    factors.push({ factor: 'تحقيق هدف الجلسة', impact: 0 });
  } else if (session.sessionGoalAchieved === false) {
    score -= 20;
    factors.push({ factor: 'لم يتحقق هدف الجلسة', impact: -20 });
  }

  // 5. مدة الجلسة الفعلية vs المخططة
  const actualDuration = session.actualDurationMinutes || session.plannedDurationMinutes || 45;
  const plannedDuration = session.plannedDurationMinutes || 45;
  if (actualDuration < plannedDuration * 0.7) {
    score -= 10;
    factors.push({ factor: 'جلسة أقصر من المخطط', impact: -10 });
  }

  score = Math.max(0, Math.min(100, score));

  let recommendation;
  if (score >= 80) recommendation = 'جلسة فعالة - استمر بنفس الأسلوب';
  else if (score >= 60) recommendation = 'فاعلية متوسطة - مراجعة بعض الأنشطة';
  else if (score >= 40) recommendation = 'فاعلية منخفضة - مراجعة شاملة للأسلوب';
  else recommendation = 'فاعلية ضعيفة جداً - إعادة تقييم الخطة';

  return {
    effectivenessScore: score,
    effectivenessLevel:
      score >= 80 ? 'high' : score >= 60 ? 'medium' : score >= 40 ? 'low' : 'very_low',
    factors,
    recommendation,
    completionRate: Math.round(completionRate),
  };
}

/**
 * تحليل نمط الجلسات وتحديد التوصيات
 * @param {Array} sessions - [{date, effectivenessScore, participationLevel, therapistId}]
 * @returns {object} - {avgEffectiveness, trend, patterns, recommendations}
 */
function analyzeSessionPatterns(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { avgEffectiveness: 0, trend: 'no_data', patterns: [], recommendations: [] };
  }

  const sorted = sessions
    .filter(s => s && typeof s.effectivenessScore === 'number')
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  if (sorted.length === 0)
    return { avgEffectiveness: 0, trend: 'no_data', patterns: [], recommendations: [] };

  const avgEffectiveness = Math.round(
    sorted.reduce((s, sess) => s + sess.effectivenessScore, 0) / sorted.length
  );

  // تحديد الاتجاه
  let trend = 'stable';
  if (sorted.length >= 3) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg = firstHalf.reduce((s, ses) => s + ses.effectivenessScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, ses) => s + ses.effectivenessScore, 0) / secondHalf.length;
    if (secondAvg - firstAvg > 5) trend = 'improving';
    else if (firstAvg - secondAvg > 5) trend = 'declining';
  }

  // اكتشاف الأنماط
  const patterns = [];
  const lowSessions = sorted.filter(s => s.effectivenessScore < 50).length;
  if (lowSessions / sorted.length > 0.3) {
    patterns.push('نسبة عالية من الجلسات ضعيفة الفاعلية');
  }

  const avgParticipation =
    sorted.filter(s => s.participationLevel).reduce((s, ses) => s + ses.participationLevel, 0) /
    sorted.filter(s => s.participationLevel).length;
  if (avgParticipation && avgParticipation < 50) {
    patterns.push('مستوى مشاركة منخفض باستمرار');
  }

  // التوصيات
  const recommendations = [];
  if (avgEffectiveness < 60) recommendations.push('مراجعة أسلوب الجلسة وأنشطتها');
  if (trend === 'declining') recommendations.push('مراجعة عاجلة مع المشرف');
  if (patterns.length > 0) recommendations.push('جلسة مع ولي الأمر لمناقشة العوامل المؤثرة');

  return {
    avgEffectiveness,
    trend,
    patterns,
    recommendations,
    totalSessions: sorted.length,
  };
}

// ========================================
// CASELOAD MANAGEMENT
// ========================================

/**
 * حساب حمل العمل (Caseload) للمعالج
 * @param {Array} cases - [{beneficiaryId, sessionsPerWeek, complexity}]
 * @param {number} maxHoursPerWeek - الساعات المتاحة أسبوعياً
 * @returns {object} - {totalCases, weeklyHours, caseloadScore, isOverloaded}
 */
function calculateTherapistCaseload(cases, maxHoursPerWeek = 35) {
  if (!Array.isArray(cases) || cases.length === 0) {
    return { totalCases: 0, weeklyHours: 0, caseloadScore: 0, isOverloaded: false };
  }

  const SESSION_DURATION = 0.75; // 45 دقيقة = 0.75 ساعة
  const DOCUMENTATION_RATIO = 0.25; // 15 دقيقة توثيق لكل جلسة

  let totalWeeklySessions = 0;
  let complexityScore = 0;

  cases.forEach(c => {
    if (!c) return;
    const sessions = c.sessionsPerWeek || 1;
    const complexity = c.complexity === 'high' ? 1.5 : c.complexity === 'low' ? 0.7 : 1;
    totalWeeklySessions += sessions;
    complexityScore += sessions * complexity;
  });

  const directHours = totalWeeklySessions * SESSION_DURATION;
  const documentationHours = totalWeeklySessions * SESSION_DURATION * DOCUMENTATION_RATIO;
  const weeklyHours = Math.round((directHours + documentationHours) * 100) / 100;

  const utilizationRate =
    maxHoursPerWeek > 0 ? Math.round((weeklyHours / maxHoursPerWeek) * 10000) / 100 : 0;

  // نقاط الحمل (100 = مثالي، > 100 = زائد)
  const caseloadScore = Math.round((complexityScore / (maxHoursPerWeek * 1.2)) * 100);

  return {
    totalCases: cases.length,
    totalWeeklySessions,
    weeklyHours,
    directHours: Math.round(directHours * 100) / 100,
    documentationHours: Math.round(documentationHours * 100) / 100,
    utilizationRate,
    caseloadScore,
    isOverloaded: weeklyHours > maxHoursPerWeek || caseloadScore > 100,
    status:
      caseloadScore > 120
        ? 'critical'
        : caseloadScore > 100
          ? 'high'
          : caseloadScore > 70
            ? 'optimal'
            : 'light',
  };
}

// ========================================
// OUTCOME MEASUREMENT
// ========================================

/**
 * حساب نتائج التدخل التأهيلي بعد فترة
 * @param {object} preData - بيانات ما قبل التدخل
 * @param {object} postData - بيانات ما بعد التدخل
 * @returns {object} - {improvement, effectSize, clinicalSignificance}
 */
function calculateInterventionOutcome(preData, postData) {
  if (!preData || !postData) {
    return {
      rawImprovement: 0,
      percentageImprovement: 0,
      effectSize: null,
      clinicalSignificance: false,
      isImproved: false,
    };
  }

  const preScore = preData.score || 0;
  const postScore = postData.score || 0;
  const maxScore = preData.maxScore || postData.maxScore || 100;
  const sd = preData.standardDeviation || null;

  const rawImprovement = postScore - preScore;
  const percentageImprovement =
    maxScore > 0 ? Math.round((rawImprovement / maxScore) * 10000) / 100 : 0;

  // Cohen's d (effect size)
  let effectSize = null;
  let effectSizeLabel = null;
  if (sd && sd > 0) {
    effectSize = Math.round((rawImprovement / sd) * 100) / 100;
    effectSizeLabel =
      Math.abs(effectSize) >= 0.8
        ? 'large'
        : Math.abs(effectSize) >= 0.5
          ? 'medium'
          : Math.abs(effectSize) >= 0.2
            ? 'small'
            : 'trivial';
  }

  // الأهمية السريرية (MCID - Minimum Clinically Important Difference)
  const mcid = preData.mcid || maxScore * 0.1; // 10% كقيمة افتراضية
  const clinicalSignificance = rawImprovement >= mcid;

  return {
    preScore,
    postScore,
    rawImprovement,
    percentageImprovement,
    effectSize,
    effectSizeLabel,
    clinicalSignificance,
    isImproved: rawImprovement > 0,
    mcid,
    interventionPeriodDays:
      postData.date && preData.date
        ? Math.ceil((new Date(postData.date) - new Date(preData.date)) / (24 * 60 * 60 * 1000))
        : null,
  };
}

/**
 * تقييم فاعلية برنامج تأهيلي شامل
 * @param {Array} outcomes - [{beneficiaryId, pre, post, serviceType}]
 * @returns {object} - {overallEffectiveness, byService, successRate}
 */
function evaluateProgramEffectiveness(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return { overallEffectiveness: 0, byService: {}, successRate: 0, totalEvaluated: 0 };
  }

  const byService = {};
  let totalImprovement = 0;
  let successCount = 0;

  outcomes.forEach(o => {
    if (!o || !o.pre || !o.post) return;
    const result = calculateInterventionOutcome(o.pre, o.post);
    const service = o.serviceType || 'general';

    if (!byService[service])
      byService[service] = { total: 0, improved: 0, avgImprovement: 0, totalImprovement: 0 };
    byService[service].total++;
    byService[service].totalImprovement += result.percentageImprovement;
    if (result.isImproved) byService[service].improved++;
    if (result.clinicalSignificance) successCount++;
    totalImprovement += result.percentageImprovement;
  });

  // حساب المتوسطات
  for (const service of Object.keys(byService)) {
    const s = byService[service];
    s.avgImprovement = s.total > 0 ? Math.round((s.totalImprovement / s.total) * 100) / 100 : 0;
    s.improvementRate = s.total > 0 ? Math.round((s.improved / s.total) * 10000) / 100 : 0;
  }

  const totalEvaluated = outcomes.filter(o => o && o.pre && o.post).length;
  const overallEffectiveness =
    totalEvaluated > 0 ? Math.round((totalImprovement / totalEvaluated) * 100) / 100 : 0;
  const successRate =
    totalEvaluated > 0 ? Math.round((successCount / totalEvaluated) * 10000) / 100 : 0;

  return {
    overallEffectiveness,
    byService,
    successRate,
    totalEvaluated,
    effectivenessLevel:
      successRate >= 70
        ? 'excellent'
        : successRate >= 50
          ? 'good'
          : successRate >= 30
            ? 'fair'
            : 'poor',
  };
}

// ========================================
// HELPERS
// ========================================

/**
 * تحويل الدرجة إلى نسبة مئوية مقيّدة بين 0 و 100
 */
function normalizeScore(score, maxScore) {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.round((Math.max(0, Math.min(score || 0, maxScore)) / maxScore) * 10000) / 100;
}

/**
 * تصنيف مستوى الأداء بناءً على نقطة النسبة المئوية
 */
function classifyPerformanceLevel(percentage) {
  if (percentage >= 85) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 55) return 'average';
  if (percentage >= 40) return 'below_average';
  return 'poor';
}

/**
 * حساب مؤشر التقدم الكلي للمستفيد
 * @param {object} metrics - مؤشرات متعددة
 * @returns {object} - {overallIndex, grade}
 */
function calculateBeneficiaryProgressIndex(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return { overallIndex: 0, grade: 'F', details: {} };
  }

  const weights = {
    goalAchievement: 0.35,
    sessionAttendance: 0.25,
    functionalImprovement: 0.25,
    familyEngagement: 0.15,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  const details = {};

  for (const [metric, weight] of Object.entries(weights)) {
    if (typeof metrics[metric] === 'number') {
      const score = Math.min(100, Math.max(0, metrics[metric]));
      details[metric] = { score, weight };
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  const overallIndex = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const grade =
    overallIndex >= 90
      ? 'A'
      : overallIndex >= 75
        ? 'B'
        : overallIndex >= 60
          ? 'C'
          : overallIndex >= 45
            ? 'D'
            : 'F';

  return { overallIndex, grade, details };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  REHAB_CONSTANTS,
  assessBeneficiaryEligibility,
  calculateChronologicalAge,
  calculateIEPCompletion,
  generateIEPGoalSuggestions,
  calculateStandardizedScore,
  assessGrossMotorDevelopment,
  assessLanguageDevelopment,
  trackBeneficiaryProgress,
  compareBeneficiariesProgress,
  recommendServices,
  calculateSessionLoad,
  calculateSessionEffectiveness,
  analyzeSessionPatterns,
  calculateTherapistCaseload,
  calculateInterventionOutcome,
  evaluateProgramEffectiveness,
  normalizeScore,
  classifyPerformanceLevel,
  calculateBeneficiaryProgressIndex,
};
