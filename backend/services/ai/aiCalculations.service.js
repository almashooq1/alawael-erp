/**
 * AI & Predictive Analytics Calculations Service - خدمة الذكاء الاصطناعي والتحليلات التنبؤية
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const AI_CONSTANTS = {
  // مستويات الخطر للتسرب
  DROPOUT_RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // أنواع التوصيات
  RECOMMENDATION_TYPES: {
    INCREASE_SESSIONS: 'increase_sessions',
    DECREASE_SESSIONS: 'decrease_sessions',
    CHANGE_THERAPIST: 'change_therapist',
    ADD_SERVICE: 'add_service',
    FAMILY_COUNSELING: 'family_counseling',
    REASSESSMENT: 'reassessment',
    DISCHARGE: 'discharge',
  },

  // حدود الثقة للتنبؤات
  CONFIDENCE_LEVELS: {
    HIGH: 0.85,
    MEDIUM: 0.7,
    LOW: 0.55,
  },

  // فترات التنبؤ (بالأسابيع)
  PREDICTION_HORIZONS: {
    SHORT: 4,
    MEDIUM: 12,
    LONG: 24,
  },

  // عوامل التسرب الافتراضية
  DROPOUT_FACTORS: {
    ATTENDANCE: 0.35,
    PROGRESS: 0.25,
    FAMILY_ENGAGEMENT: 0.2,
    FINANCIAL: 0.1,
    TRANSPORT: 0.1,
  },

  // حدود التنبؤ بالتحسن
  IMPROVEMENT_THRESHOLDS: {
    EXCELLENT: 80,
    GOOD: 60,
    FAIR: 40,
    POOR: 20,
  },
};

// ========================================
// DROPOUT RISK PREDICTION
// ========================================

/**
 * التنبؤ بخطر انقطاع المستفيد عن الخدمة
 * @param {object} beneficiaryMetrics - مؤشرات المستفيد
 * @returns {object} - {riskScore, riskLevel, factors, recommendations}
 */
function predictDropoutRisk(beneficiaryMetrics) {
  if (!beneficiaryMetrics || typeof beneficiaryMetrics !== 'object') {
    return { riskScore: 0, riskLevel: 'low', factors: [], recommendations: [] };
  }

  let riskScore = 0;
  const factors = [];

  // 1. معدل الحضور (الأثر الأكبر)
  const attendanceRate = beneficiaryMetrics.attendanceRate ?? 100;
  if (attendanceRate < 50) {
    riskScore += 35;
    factors.push({ factor: 'معدل حضور منخفض جداً', weight: 35, value: attendanceRate });
  } else if (attendanceRate < 70) {
    riskScore += 20;
    factors.push({ factor: 'معدل حضور منخفض', weight: 20, value: attendanceRate });
  } else if (attendanceRate < 85) {
    riskScore += 10;
    factors.push({ factor: 'معدل حضور متوسط', weight: 10, value: attendanceRate });
  }

  // 2. معدل التقدم
  const progressRate = beneficiaryMetrics.progressRate ?? 50;
  if (progressRate < 10) {
    riskScore += 25;
    factors.push({ factor: 'ضعف ملحوظ في التقدم', weight: 25, value: progressRate });
  } else if (progressRate < 25) {
    riskScore += 15;
    factors.push({ factor: 'تقدم بطيء', weight: 15, value: progressRate });
  }

  // 3. مشاركة الأسرة
  const familyEngagement = beneficiaryMetrics.familyEngagement ?? 50;
  if (familyEngagement < 30) {
    riskScore += 20;
    factors.push({ factor: 'ضعف مشاركة الأسرة', weight: 20, value: familyEngagement });
  } else if (familyEngagement < 60) {
    riskScore += 10;
    factors.push({ factor: 'مشاركة أسرة متوسطة', weight: 10, value: familyEngagement });
  }

  // 4. الوضع المالي
  if (beneficiaryMetrics.hasPaymentDelay) {
    riskScore += 15;
    factors.push({ factor: 'تأخر في الدفع', weight: 15 });
  }

  // 5. مشاكل النقل
  if (beneficiaryMetrics.hasTransportIssues) {
    riskScore += 10;
    factors.push({ factor: 'مشاكل في التنقل', weight: 10 });
  }

  // 6. الرضا عن الخدمة
  const satisfactionScore = beneficiaryMetrics.satisfactionScore ?? 70;
  if (satisfactionScore < 40) {
    riskScore += 20;
    factors.push({ factor: 'رضا منخفض عن الخدمة', weight: 20, value: satisfactionScore });
  } else if (satisfactionScore < 60) {
    riskScore += 10;
    factors.push({ factor: 'رضا متوسط عن الخدمة', weight: 10, value: satisfactionScore });
  }

  // 7. عدد الإلغاءات المتتالية
  const consecutiveCancellations = beneficiaryMetrics.consecutiveCancellations ?? 0;
  if (consecutiveCancellations >= 3) {
    riskScore += 20;
    factors.push({ factor: 'إلغاءات متتالية متعددة', weight: 20, value: consecutiveCancellations });
  } else if (consecutiveCancellations >= 2) {
    riskScore += 10;
    factors.push({ factor: 'إلغاءين متتاليين', weight: 10, value: consecutiveCancellations });
  }

  riskScore = Math.min(100, riskScore);

  let riskLevel;
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  // التوصيات بناءً على العوامل
  const recommendations = _generateDropoutRecommendations(factors, riskLevel);

  return {
    riskScore,
    riskLevel,
    factors: factors.sort((a, b) => b.weight - a.weight),
    recommendations,
    confidence:
      riskScore > 0 ? AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM : AI_CONSTANTS.CONFIDENCE_LEVELS.HIGH,
  };
}

/**
 * توليد توصيات لمنع التسرب
 */
function _generateDropoutRecommendations(factors, riskLevel) {
  const recommendations = [];
  const factorNames = factors.map(f => f.factor);

  if (factorNames.some(f => f.includes('حضور'))) {
    recommendations.push({
      type: 'attendance_intervention',
      action: 'اتصال فوري بولي الأمر لمناقشة عوائق الحضور',
      priority: 'high',
    });
  }

  if (factorNames.some(f => f.includes('تقدم'))) {
    recommendations.push({
      type: 'reassessment',
      action: 'إعادة تقييم خطة التأهيل وتعديل الأهداف',
      priority: 'high',
    });
  }

  if (factorNames.some(f => f.includes('أسرة'))) {
    recommendations.push({
      type: 'family_counseling',
      action: 'جلسة توعوية مع الأسرة لتعزيز المشاركة',
      priority: 'medium',
    });
  }

  if (factorNames.some(f => f.includes('دفع'))) {
    recommendations.push({
      type: 'financial_support',
      action: 'مراجعة خيارات الدعم المالي أو التأمين',
      priority: 'medium',
    });
  }

  if (factorNames.some(f => f.includes('نقل'))) {
    recommendations.push({
      type: 'transport_support',
      action: 'ترتيب خدمة نقل مناسبة للمستفيد',
      priority: 'medium',
    });
  }

  if (riskLevel === 'critical') {
    recommendations.unshift({
      type: 'urgent_intervention',
      action: 'تدخل عاجل من المدير الطبي',
      priority: 'critical',
    });
  }

  return recommendations;
}

// ========================================
// PROGRESS PREDICTION
// ========================================

/**
 * التنبؤ بمستوى تقدم المستفيد خلال فترة مستقبلية
 * @param {Array} historicalScores - السجل التاريخي [{date, score, maxScore}]
 * @param {number} weeksAhead - عدد الأسابيع المستقبلية
 * @returns {object} - {predictedScore, confidence, trajectory}
 */
function predictProgressTrajectory(historicalScores, weeksAhead = 12) {
  if (!Array.isArray(historicalScores) || historicalScores.length < 2) {
    return {
      predictedScore: null,
      confidence: 0,
      trajectory: 'insufficient_data',
      dataPoints: historicalScores?.length || 0,
    };
  }

  // ترتيب زمني
  const sorted = historicalScores
    .filter(s => s && s.score !== undefined && s.maxScore > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(s => ({ ...s, pct: (s.score / s.maxScore) * 100 }));

  if (sorted.length < 2) {
    return { predictedScore: null, confidence: 0, trajectory: 'insufficient_data', dataPoints: 0 };
  }

  // حساب معدل التحسن الخطي
  const n = sorted.length;
  const lastPct = sorted[n - 1].pct;
  const firstPct = sorted[0].pct;
  const ratePerDataPoint = (lastPct - firstPct) / (n - 1);

  // تحويل إلى معدل أسبوعي تقريبي
  const daysBetweenFirst =
    sorted.length > 1
      ? (new Date(sorted[n - 1].date) - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24)
      : 30;
  const weeksBetween = Math.max(1, daysBetweenFirst / 7);
  const weeklyRate = (lastPct - firstPct) / weeksBetween;

  // التنبؤ المستقبلي
  const rawPrediction = lastPct + weeklyRate * weeksAhead;
  const predictedScore = Math.max(0, Math.min(100, Math.round(rawPrediction * 100) / 100));

  // تحديد مسار التقدم
  let trajectory;
  if (weeklyRate > 2) trajectory = 'accelerating';
  else if (weeklyRate > 0.5) trajectory = 'steady_improvement';
  else if (weeklyRate > -0.5) trajectory = 'plateau';
  else trajectory = 'declining';

  // درجة الثقة (تزيد مع عدد النقاط وتقل مع بُعد التنبؤ)
  const baseConfidence = Math.min(0.95, 0.5 + n * 0.05);
  const decayFactor = Math.max(0.5, 1 - weeksAhead * 0.01);
  const confidence = Math.round(baseConfidence * decayFactor * 100) / 100;

  return {
    predictedScore,
    currentScore: Math.round(lastPct * 100) / 100,
    weeklyRate: Math.round(weeklyRate * 100) / 100,
    trajectory,
    confidence,
    weeksAhead,
    dataPoints: n,
    expectedLevel: _classifyPredictionLevel(predictedScore),
  };
}

function _classifyPredictionLevel(score) {
  if (score >= AI_CONSTANTS.IMPROVEMENT_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= AI_CONSTANTS.IMPROVEMENT_THRESHOLDS.GOOD) return 'good';
  if (score >= AI_CONSTANTS.IMPROVEMENT_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
}

// ========================================
// THERAPIST-BENEFICIARY MATCHING
// ========================================

/**
 * حساب درجة التوافق بين معالج ومستفيد
 * @param {object} therapist - بيانات المعالج
 * @param {object} beneficiary - بيانات المستفيد
 * @returns {object} - {compatibilityScore, factors, isRecommended}
 */
function calculateTherapistCompatibility(therapist, beneficiary) {
  if (!therapist || !beneficiary) {
    return { compatibilityScore: 0, factors: [], isRecommended: false };
  }

  let score = 0;
  const factors = [];

  // 1. التخصص مناسب للتشخيص
  const specialization = therapist.specialization || '';
  const diagnosisType = beneficiary.diagnosisType || '';

  const specializationMatch = _checkSpecializationMatch(specialization, diagnosisType);
  if (specializationMatch.matches) {
    score += 30;
    factors.push({ factor: 'تطابق التخصص والتشخيص', score: 30 });
  } else if (specializationMatch.partial) {
    score += 15;
    factors.push({ factor: 'تطابق جزئي في التخصص', score: 15 });
  }

  // 2. خبرة المعالج مع نفس نوع الإعاقة
  const experienceScore = therapist.experienceWithSimilarCases || 0;
  const expPoints = Math.min(20, Math.round(experienceScore * 0.4));
  score += expPoints;
  if (expPoints > 10) {
    factors.push({ factor: 'خبرة عالية مع حالات مماثلة', score: expPoints });
  }

  // 3. العمر وجنس المعالج (للأطفال الصغار الأم أفضل)
  const beneficiaryAge = beneficiary.age || 5;
  if (beneficiaryAge < 6 && therapist.gender === 'female') {
    score += 10;
    factors.push({ factor: 'معالجة أنثى للطفل الصغير (مفضل)', score: 10 });
  }

  // 4. توافق جدول الأوقات
  const scheduleCompatibility = _calculateScheduleCompatibility(
    therapist.availableSlots || [],
    beneficiary.preferredSlots || []
  );
  const schedulePoints = Math.round(scheduleCompatibility * 20);
  score += schedulePoints;
  if (schedulePoints > 10) {
    factors.push({ factor: 'توافق جيد في الجدول الزمني', score: schedulePoints });
  }

  // 5. سجل نجاح المعالج مع نفس نوع الإعاقة
  const successRate = therapist.successRateWithDiagnosis || 50;
  const successPoints = Math.min(20, Math.round(successRate * 0.2));
  score += successPoints;
  if (successPoints > 10) {
    factors.push({ factor: 'معدل نجاح مرتفع مع هذا التشخيص', score: successPoints });
  }

  score = Math.min(100, score);

  return {
    compatibilityScore: score,
    factors: factors.sort((a, b) => b.score - a.score),
    isRecommended: score >= 60,
    matchLevel: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
  };
}

/**
 * التحقق من توافق التخصص مع التشخيص
 */
function _checkSpecializationMatch(specialization, diagnosisType) {
  const matchMatrix = {
    aba: ['autism', 'adhd', 'intellectual_disability'],
    speech: ['autism', 'speech_language', 'down_syndrome', 'hearing_impairment'],
    pt: ['cerebral_palsy', 'down_syndrome', 'muscular_dystrophy'],
    ot: ['autism', 'cerebral_palsy', 'down_syndrome', 'learning_disability'],
    psychology: ['autism', 'adhd', 'learning_disability', 'emotional_behavioral'],
    special_education: ['intellectual_disability', 'down_syndrome', 'learning_disability'],
  };

  const partialMatrix = {
    aba: ['down_syndrome', 'learning_disability'],
    speech: ['cerebral_palsy', 'intellectual_disability'],
    pt: ['autism', 'other'],
    ot: ['adhd', 'speech_language'],
  };

  const fullMatch = matchMatrix[specialization]?.includes(diagnosisType) || false;
  const partialMatch =
    !fullMatch && (partialMatrix[specialization]?.includes(diagnosisType) || false);

  return { matches: fullMatch, partial: partialMatch };
}

/**
 * حساب توافق الجداول
 */
function _calculateScheduleCompatibility(therapistSlots, beneficiarySlots) {
  if (!therapistSlots.length || !beneficiarySlots.length) return 0.5;
  const matches = beneficiarySlots.filter(s => therapistSlots.includes(s)).length;
  return Math.min(1, matches / beneficiarySlots.length);
}

/**
 * ترتيب المعالجين المتاحين للمستفيد
 * @param {Array} therapists - قائمة المعالجين
 * @param {object} beneficiary - بيانات المستفيد
 * @returns {Array} - قائمة مرتبة بالتوافق
 */
function rankTherapistsForBeneficiary(therapists, beneficiary) {
  if (!Array.isArray(therapists) || therapists.length === 0) return [];

  return therapists
    .map(t => ({
      ...t,
      compatibility: calculateTherapistCompatibility(t, beneficiary),
    }))
    .sort((a, b) => b.compatibility.compatibilityScore - a.compatibility.compatibilityScore);
}

// ========================================
// RESOURCE DEMAND FORECASTING
// ========================================

/**
 * التنبؤ بالطلب على الموارد (جلسات، معالجون، غرف)
 * @param {Array} historicalDemand - البيانات التاريخية [{month, sessions, beneficiaries}]
 * @param {number} monthsAhead - عدد الأشهر المستقبلية
 * @returns {object} - {forecast, totalProjected, peakMonth}
 */
function forecastResourceDemand(historicalDemand, monthsAhead = 3) {
  if (!Array.isArray(historicalDemand) || historicalDemand.length < 3) {
    return {
      forecast: [],
      totalProjected: 0,
      growthRate: 0,
      peakMonth: null,
      confidence: 0,
    };
  }

  const n = historicalDemand.length;
  const sessions = historicalDemand.map(d => d.sessions || 0);
  const beneficiaries = historicalDemand.map(d => d.beneficiaries || 0);

  // حساب معدل النمو المتوسط (moving average)
  const recentWindow = Math.min(3, n);
  const recentSessions = sessions.slice(-recentWindow);
  const recentBeneficiaries = beneficiaries.slice(-recentWindow);

  const avgSessions = recentSessions.reduce((s, v) => s + v, 0) / recentWindow;
  const avgBeneficiaries = recentBeneficiaries.reduce((s, v) => s + v, 0) / recentWindow;

  // معدل النمو الشهري
  const growthRate = n > 1 ? ((sessions[n - 1] - sessions[0]) / sessions[0] / (n - 1)) * 100 : 0;

  const monthlyGrowthFactor = 1 + growthRate / 100;

  // توليد التوقعات
  const forecast = [];
  let cumulativeSessions = 0;

  for (let i = 1; i <= monthsAhead; i++) {
    const projectedSessions = Math.round(avgSessions * Math.pow(monthlyGrowthFactor, i));
    const projectedBeneficiaries = Math.round(avgBeneficiaries * Math.pow(monthlyGrowthFactor, i));
    const requiredTherapists = Math.ceil(projectedBeneficiaries / 15); // 15 مستفيد لكل معالج
    const requiredRooms = Math.ceil(projectedSessions / 160); // 8 جلسات يومياً × 20 يوم = 160

    forecast.push({
      monthOffset: i,
      projectedSessions,
      projectedBeneficiaries,
      requiredTherapists,
      requiredRooms,
    });
    cumulativeSessions += projectedSessions;
  }

  const peakMonth = forecast.reduce(
    (max, m) => (m.projectedSessions > (max?.projectedSessions || 0) ? m : max),
    null
  );

  return {
    forecast,
    totalProjected: cumulativeSessions,
    avgMonthlyBaseline: Math.round(avgSessions),
    growthRate: Math.round(growthRate * 100) / 100,
    peakMonth,
    confidence:
      n >= 6 ? AI_CONSTANTS.CONFIDENCE_LEVELS.HIGH : AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM,
  };
}

// ========================================
// ANOMALY DETECTION
// ========================================

/**
 * اكتشاف الحالات الشاذة في بيانات الجلسات
 * @param {Array} sessionData - بيانات الجلسات [{value, date, type}]
 * @param {number} zThreshold - حد Z-score للكشف عن الشذوذ (افتراضي 2)
 * @returns {object} - {anomalies, stats, hasAnomalies}
 */
function detectAnomalies(sessionData, zThreshold = 2) {
  if (!Array.isArray(sessionData) || sessionData.length < 5) {
    return { anomalies: [], stats: null, hasAnomalies: false };
  }

  const values = sessionData.map(d => d.value || 0).filter(v => !isNaN(v));
  if (values.length < 5) return { anomalies: [], stats: null, hasAnomalies: false };

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const anomalies = [];
  sessionData.forEach((d, index) => {
    const value = d.value || 0;
    const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;

    if (Math.abs(zScore) > zThreshold) {
      anomalies.push({
        index,
        date: d.date,
        value,
        zScore: Math.round(zScore * 100) / 100,
        type: value > mean ? 'unusually_high' : 'unusually_low',
        severity: Math.abs(zScore) > 3 ? 'severe' : 'moderate',
      });
    }
  });

  return {
    anomalies,
    stats: {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    },
    hasAnomalies: anomalies.length > 0,
    anomalyRate: Math.round((anomalies.length / sessionData.length) * 10000) / 100,
  };
}

// ========================================
// OPTIMAL SCHEDULING RECOMMENDATIONS
// ========================================

/**
 * اقتراح أفضل جدول للجلسات بناءً على بيانات الأداء
 * @param {object} performanceData - بيانات الأداء التاريخية
 * @returns {object} - {optimalDays, optimalTimes, expectedImprovement}
 */
function recommendOptimalSchedule(performanceData) {
  if (!performanceData || typeof performanceData !== 'object') {
    return { optimalDays: [], optimalTimes: [], expectedImprovement: 0 };
  }

  const dayPerformance = performanceData.byDay || {};
  const timePerformance = performanceData.byTime || {};

  // ترتيب الأيام حسب الأداء
  const optimalDays = Object.entries(dayPerformance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day, score]) => ({ day, avgScore: Math.round(score) }));

  // ترتيب الأوقات حسب الأداء
  const optimalTimes = Object.entries(timePerformance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([time, score]) => ({ time, avgScore: Math.round(score) }));

  // حساب التحسن المتوقع
  const currentAvg = performanceData.currentAvgScore || 60;
  const optimalAvg =
    optimalDays.length > 0
      ? optimalDays.reduce((s, d) => s + d.avgScore, 0) / optimalDays.length
      : currentAvg;
  const expectedImprovement = Math.max(0, Math.round(optimalAvg - currentAvg));

  return {
    optimalDays,
    optimalTimes,
    expectedImprovement,
    recommendation:
      expectedImprovement > 5
        ? 'إعادة جدولة الجلسات للأوقات المثلى متوقع أن يحسن الأداء'
        : 'الجدول الحالي مناسب',
  };
}

// ========================================
// OUTCOME PREDICTION
// ========================================

/**
 * التنبؤ بالنتائج النهائية لمستفيد بعد برنامج تأهيل
 * @param {object} intakeData - بيانات الدخول
 * @param {object} programDetails - تفاصيل البرنامج
 * @returns {object} - {predictedOutcome, probability, keyFactors}
 */
function predictOutcome(intakeData, programDetails) {
  if (!intakeData || !programDetails) {
    return { predictedOutcome: 'unknown', probability: 0, keyFactors: [] };
  }

  let successScore = 50; // نقطة البداية
  const keyFactors = [];

  // العوامل المؤثرة على النتيجة

  // 1. العمر عند بدء التدخل
  const age = intakeData.age || 10;
  if (age <= 3) {
    successScore += 20;
    keyFactors.push({ factor: 'تدخل مبكر جداً', impact: +20 });
  } else if (age <= 6) {
    successScore += 15;
    keyFactors.push({ factor: 'تدخل مبكر', impact: +15 });
  } else if (age <= 12) {
    successScore += 5;
  } else {
    successScore -= 5;
    keyFactors.push({ factor: 'تأخر في بدء التدخل', impact: -5 });
  }

  // 2. شدة الإعاقة
  const severity = intakeData.severity || 'moderate';
  if (severity === 'mild') {
    successScore += 15;
    keyFactors.push({ factor: 'إعاقة خفيفة', impact: +15 });
  } else if (severity === 'severe') {
    successScore -= 10;
    keyFactors.push({ factor: 'إعاقة شديدة', impact: -10 });
  }

  // 3. كثافة البرنامج
  const weeklyHours = programDetails.weeklyHours || 5;
  if (weeklyHours >= 20) {
    successScore += 15;
    keyFactors.push({ factor: 'برنامج مكثف (≥20 ساعة)', impact: +15 });
  } else if (weeklyHours >= 10) {
    successScore += 8;
  } else if (weeklyHours < 5) {
    successScore -= 10;
    keyFactors.push({ factor: 'برنامج قليل الكثافة', impact: -10 });
  }

  // 4. تنوع الخدمات
  const servicesCount = programDetails.servicesCount || 1;
  if (servicesCount >= 3) {
    successScore += 10;
    keyFactors.push({ factor: 'برنامج متعدد الخدمات', impact: +10 });
  }

  // 5. التزام الأسرة
  const familyCommitment = intakeData.familyCommitmentLevel || 50;
  if (familyCommitment >= 80) {
    successScore += 15;
    keyFactors.push({ factor: 'التزام عالي من الأسرة', impact: +15 });
  } else if (familyCommitment < 40) {
    successScore -= 10;
    keyFactors.push({ factor: 'التزام منخفض من الأسرة', impact: -10 });
  }

  successScore = Math.max(0, Math.min(100, successScore));

  let predictedOutcome;
  if (successScore >= 80) predictedOutcome = 'excellent';
  else if (successScore >= 65) predictedOutcome = 'good';
  else if (successScore >= 50) predictedOutcome = 'fair';
  else predictedOutcome = 'limited';

  return {
    predictedOutcome,
    probability: successScore,
    keyFactors: keyFactors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    confidence: AI_CONSTANTS.CONFIDENCE_LEVELS.MEDIUM,
    recommendation: _getOutcomeRecommendation(predictedOutcome, keyFactors),
  };
}

function _getOutcomeRecommendation(outcome, factors) {
  if (outcome === 'excellent' || outcome === 'good') {
    return 'توقعات إيجابية - استمر بالبرنامج الحالي';
  }
  const negativeFactors = factors.filter(f => f.impact < 0);
  if (negativeFactors.length > 0) {
    return `معالجة العوامل السلبية: ${negativeFactors.map(f => f.factor).join(', ')}`;
  }
  return 'مراجعة شاملة للبرنامج مع الفريق المتعدد التخصصات';
}

// ========================================
// COHORT ANALYSIS
// ========================================

/**
 * تحليل مجموعة المستفيدين وتحديد الأنماط
 * @param {Array} cohortData - بيانات مجموعة المستفيدين
 * @returns {object} - {segments, insights, recommendations}
 */
function analyzeCohort(cohortData) {
  if (!Array.isArray(cohortData) || cohortData.length === 0) {
    return { segments: [], insights: [], recommendations: [] };
  }

  // تقسيم المجموعة إلى شرائح
  const segments = {
    highProgress: cohortData.filter(b => (b.progressRate || 0) >= 20),
    moderateProgress: cohortData.filter(
      b => (b.progressRate || 0) >= 10 && (b.progressRate || 0) < 20
    ),
    lowProgress: cohortData.filter(b => (b.progressRate || 0) >= 0 && (b.progressRate || 0) < 10),
    declining: cohortData.filter(b => (b.progressRate || 0) < 0),
    atRisk: cohortData.filter(b => (b.dropoutRisk || 0) >= 50),
  };

  // إحصاءات
  const avgProgress =
    cohortData.length > 0
      ? cohortData.reduce((s, b) => s + (b.progressRate || 0), 0) / cohortData.length
      : 0;

  const avgAttendance =
    cohortData.length > 0
      ? cohortData.reduce((s, b) => s + (b.attendanceRate || 0), 0) / cohortData.length
      : 0;

  // استخلاص الرؤى
  const insights = [];
  const highProgressRate = (segments.highProgress.length / cohortData.length) * 100;
  if (highProgressRate >= 50) {
    insights.push({
      type: 'positive',
      message: `${Math.round(highProgressRate)}% من المستفيدين يحققون تقدماً ممتازاً`,
    });
  }

  if (segments.atRisk.length > 0) {
    insights.push({
      type: 'warning',
      message: `${segments.atRisk.length} مستفيد في خطر الانقطاع`,
      count: segments.atRisk.length,
    });
  }

  if (segments.declining.length > 0) {
    insights.push({
      type: 'alert',
      message: `${segments.declining.length} مستفيد يُظهر تراجعاً - يحتاج تدخلاً فورياً`,
      count: segments.declining.length,
    });
  }

  // التوصيات
  const recommendations = [];
  if (segments.atRisk.length > cohortData.length * 0.2) {
    recommendations.push('مراجعة برنامج الاحتفاظ بالمستفيدين');
  }
  if (avgAttendance < 75) {
    recommendations.push('تحسين استراتيجيات التواصل مع الأسر');
  }
  if (avgProgress < 10) {
    recommendations.push('مراجعة أساليب العلاج وتقييم فاعليتها');
  }

  return {
    segments: {
      highProgress: segments.highProgress.length,
      moderateProgress: segments.moderateProgress.length,
      lowProgress: segments.lowProgress.length,
      declining: segments.declining.length,
      atRisk: segments.atRisk.length,
    },
    stats: {
      total: cohortData.length,
      avgProgress: Math.round(avgProgress * 100) / 100,
      avgAttendance: Math.round(avgAttendance * 100) / 100,
    },
    insights,
    recommendations,
  };
}

// ========================================
// SMART ALERTS
// ========================================

/**
 * توليد تنبيهات ذكية بناءً على بيانات متعددة
 * @param {object} systemData - بيانات النظام الشاملة
 * @returns {Array} - قائمة التنبيهات المرتبة بالأولوية
 */
function generateSmartAlerts(systemData) {
  if (!systemData || typeof systemData !== 'object') return [];

  const alerts = [];

  // تنبيهات المستفيدين في خطر
  if (systemData.beneficiariesAtRisk > 0) {
    alerts.push({
      type: 'beneficiary_risk',
      severity: systemData.beneficiariesAtRisk > 5 ? 'critical' : 'high',
      message: `${systemData.beneficiariesAtRisk} مستفيد في خطر انقطاع`,
      action: 'مراجعة قائمة المستفيدين في خطر فوراً',
      count: systemData.beneficiariesAtRisk,
    });
  }

  // تنبيهات معدل الحضور
  if ((systemData.overallAttendanceRate || 100) < 75) {
    alerts.push({
      type: 'attendance_drop',
      severity: systemData.overallAttendanceRate < 60 ? 'critical' : 'medium',
      message: `معدل الحضور انخفض إلى ${systemData.overallAttendanceRate}%`,
      action: 'تحليل أسباب انخفاض الحضور',
    });
  }

  // تنبيهات حمل العمل
  if (systemData.overloadedTherapists > 0) {
    alerts.push({
      type: 'therapist_overload',
      severity: 'medium',
      message: `${systemData.overloadedTherapists} معالج بحمل عمل مرتفع`,
      action: 'إعادة توزيع الحالات بين المعالجين',
      count: systemData.overloadedTherapists,
    });
  }

  // تنبيهات المواعيد الفائتة
  if ((systemData.noShowRate || 0) > 20) {
    alerts.push({
      type: 'high_no_show',
      severity: 'medium',
      message: `معدل الغياب بدون إشعار مرتفع: ${systemData.noShowRate}%`,
      action: 'تفعيل نظام التذكيرات الآلي',
    });
  }

  // تنبيهات قائمة الانتظار
  if ((systemData.waitlistSize || 0) > 20) {
    alerts.push({
      type: 'long_waitlist',
      severity: systemData.waitlistSize > 50 ? 'high' : 'low',
      message: `قائمة الانتظار تضم ${systemData.waitlistSize} مستفيداً`,
      action: 'النظر في توظيف معالجين إضافيين أو توسعة الطاقة',
      count: systemData.waitlistSize,
    });
  }

  // ترتيب حسب الخطورة
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return alerts.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
}

// ========================================
// KPI SCORING
// ========================================

/**
 * حساب مؤشرات الأداء الرئيسية الذكية
 * @param {object} metricsData - بيانات المؤشرات
 * @returns {object} - {kpis, overallScore, grade, insights}
 */
function calculateSmartKPIs(metricsData) {
  if (!metricsData || typeof metricsData !== 'object') {
    return { kpis: {}, overallScore: 0, grade: 'F', insights: [] };
  }

  const kpis = {};
  const weights = {
    clinicalOutcomes: 0.3,
    beneficiaryRetention: 0.25,
    therapistEfficiency: 0.2,
    financialHealth: 0.15,
    familySatisfaction: 0.1,
  };

  // 1. النتائج السريرية
  const goalAchievementRate = metricsData.goalAchievementRate || 0;
  kpis.clinicalOutcomes = {
    score: goalAchievementRate,
    benchmark: 70,
    status: goalAchievementRate >= 70 ? 'on_target' : 'below_target',
    trend: metricsData.clinicalTrend || 'stable',
  };

  // 2. معدل الاحتفاظ بالمستفيدين
  const retentionRate = metricsData.retentionRate || 0;
  kpis.beneficiaryRetention = {
    score: retentionRate,
    benchmark: 85,
    status: retentionRate >= 85 ? 'on_target' : 'below_target',
    trend: metricsData.retentionTrend || 'stable',
  };

  // 3. كفاءة المعالجين
  const therapistUtilization = metricsData.therapistUtilization || 0;
  kpis.therapistEfficiency = {
    score: Math.min(100, therapistUtilization),
    benchmark: 75,
    status:
      therapistUtilization >= 75 && therapistUtilization <= 95 ? 'on_target' : 'needs_attention',
    trend: metricsData.utilizationTrend || 'stable',
  };

  // 4. الصحة المالية
  const collectionRate = metricsData.collectionRate || 0;
  kpis.financialHealth = {
    score: collectionRate,
    benchmark: 90,
    status: collectionRate >= 90 ? 'on_target' : 'below_target',
    trend: metricsData.financialTrend || 'stable',
  };

  // 5. رضا الأسر
  const satisfactionScore = metricsData.familySatisfactionScore || 0;
  kpis.familySatisfaction = {
    score: satisfactionScore,
    benchmark: 80,
    status: satisfactionScore >= 80 ? 'on_target' : 'below_target',
    trend: metricsData.satisfactionTrend || 'stable',
  };

  // الدرجة الكلية المرجحة
  let weightedScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weightedScore += (kpis[key]?.score || 0) * weight;
  }
  const overallScore = Math.round(weightedScore);

  const grade =
    overallScore >= 90
      ? 'A'
      : overallScore >= 75
        ? 'B'
        : overallScore >= 60
          ? 'C'
          : overallScore >= 45
            ? 'D'
            : 'F';

  // استخلاص الرؤى
  const insights = Object.entries(kpis)
    .filter(([, kpi]) => kpi.status === 'below_target')
    .map(([key]) => ({
      area: key,
      message: `${key} أقل من المستهدف - يحتاج تدخلاً`,
    }));

  return {
    kpis,
    overallScore,
    grade,
    insights,
    benchmarksMet: Object.values(kpis).filter(k => k.status === 'on_target').length,
    totalBenchmarks: Object.keys(kpis).length,
  };
}

// ========================================
// HELPERS
// ========================================

/**
 * حساب المتوسط المتحرك
 * @param {Array} values - قيم رقمية
 * @param {number} window - حجم النافذة
 * @returns {Array} - المتوسطات المتحركة
 */
function calculateMovingAverage(values, window = 3) {
  if (!Array.isArray(values) || values.length === 0) return [];
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return Math.round((slice.reduce((s, v) => s + (v || 0), 0) / slice.length) * 100) / 100;
  });
}

/**
 * تحويل المؤشرات الخام إلى درجة موحدة 0-100
 */
function normalizeMetric(value, min, max) {
  if (max <= min) return 0;
  return Math.round(((Math.max(min, Math.min(max, value)) - min) / (max - min)) * 10000) / 100;
}

/**
 * حساب الارتباط بين متغيرين
 * @param {Array} x - المتغير الأول
 * @param {Array} y - المتغير الثاني
 * @returns {number} - معامل الارتباط (بيرسون) -1 إلى 1
 */
function calculateCorrelation(x, y) {
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let sumXSq = 0;
  let sumYSq = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumXSq += dx * dx;
    sumYSq += dy * dy;
  }

  const denominator = Math.sqrt(sumXSq * sumYSq);
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : 0;
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
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
};
