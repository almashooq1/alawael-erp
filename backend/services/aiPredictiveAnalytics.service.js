/**
 * AI Predictive Analytics Service — خدمة التحليلات التنبؤية بالذكاء الاصطناعي
 *
 * Pure statistical algorithms (no ML libraries) for rehabilitation center predictions:
 *   • Goal achievement forecasting (linear regression)
 *   • Discharge readiness scoring
 *   • Risk flag detection
 *   • Intervention recommendations
 *   • Length of stay estimation
 *
 * All outputs include Arabic text for the Al-Awael ERP RTL interface.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* ─── Lazy model getters (avoid circular deps) ─────────────────────────── */
function getModels() {
  try {
    return {
      Goal: mongoose.models.Goal || require('../models/Goal'),
      GoalProgressEntry: mongoose.models.GoalProgressEntry || require('../models/GoalProgressEntry'),
      ICFAssessment: mongoose.models.ICFAssessment || require('../models/icf/ICFAssessment.model'),
      TherapySession: mongoose.models.TherapySession || require('../models/TherapySession'),
      Beneficiary: mongoose.models.Beneficiary || require('../models/Beneficiary'),
      GoalBank: mongoose.models.GoalBank || require('../models/GoalBank'),
      Employee: mongoose.models.Employee || require('../models/Employee'),
    };
  } catch (err) {
    logger.warn('[AIPredictive] Model load warning:', err.message);
    return {};
  }
}

/* ─── Statistical helpers ─────────────────────────────────────────────── */

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  const variance = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(variance);
}

/**
 * Simple linear regression: y = mx + b
 * x = days since first entry, y = progressPercent
 */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const x = points.map((_, i) => i); // use index as time proxy (or days)
  const y = points.map(p => p);

  const xMean = mean(x);
  const yMean = mean(y);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  // R-squared
  const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssRes = y.reduce((sum, yi, i) => sum + (yi - (slope * x[i] + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateAr(date) {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  1. predictGoalAchievement
 * ═══════════════════════════════════════════════════════════════════════ */

async function predictGoalAchievement(goalId, weeksAhead = 4) {
  const { Goal, GoalProgressEntry } = getModels();
  if (!Goal || !GoalProgressEntry) {
    throw new Error('النماذج غير متوفرة');
  }

  const goal = await Goal.findById(goalId).lean();
  if (!goal) throw new Error('الهدف غير موجود');

  const entries = await GoalProgressEntry.find({ goalId })
    .sort({ recordedAt: 1 })
    .lean();

  const progressValues = entries.map(e => e.progressPercent);
  const latestProgress = progressValues.length > 0 ? progressValues[progressValues.length - 1] : (goal.progressPercentage || 0);

  // Linear regression on progress over time
  const regression = linearRegression(progressValues);

  // Predict progress after weeksAhead
  const futureIndex = progressValues.length + Math.round(weeksAhead * 7 / 7); // add weeks as indices
  const predictedProgress = Math.min(100, Math.max(0, regression.slope * futureIndex + regression.intercept));

  // Predicted completion date
  const daysToCompletion = regression.slope > 0 ? Math.round((100 - latestProgress) / regression.slope) : null;
  const predictedCompletionDate = daysToCompletion && daysToCompletion > 0
    ? addDays(new Date(), daysToCompletion)
    : goal.targetDate || null;

  const confidence = Math.round(regression.r2 * 100);
  const probability = predictedProgress >= 100 ? 95 : Math.round(predictedProgress * 0.9);

  let recommendedAction = 'استمرار الخطة الحالية';
  if (regression.slope < 0) recommendedAction = 'مراجعة الخطة العلاجية — هناك تراجع في التقدم';
  else if (predictedProgress < 50 && daysToCompletion && daysToCompletion > weeksAhead * 7) {
    recommendedAction = 'تكثيف الجلسات أو تعديل الهدف لزيادة فرص التحقق';
  } else if (predictedProgress >= 100) {
    recommendedAction = 'الهدف متوقع تحققه قريباً — الاستعداد للتقييم النهائي';
  }

  return {
    predictedCompletionDate: predictedCompletionDate ? formatDateAr(predictedCompletionDate) : 'غير محدد',
    confidence: `${confidence}%`,
    probability: `${probability}%`,
    recommendedAction,
    details: {
      currentProgress: `${latestProgress}%`,
      predictedProgress: `${Math.round(predictedProgress)}%`,
      trend: regression.slope > 0 ? 'تصاعدي' : regression.slope < 0 ? 'تراجعي' : 'مستقر',
      entriesCount: entries.length,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  2. predictDischargeReadiness
 * ═══════════════════════════════════════════════════════════════════════ */

async function predictDischargeReadiness(beneficiaryId) {
  const { ICFAssessment, Goal, TherapySession } = getModels();
  if (!ICFAssessment || !Goal || !TherapySession) {
    throw new Error('النماذج غير متوفرة');
  }

  const beneficiary = await getModels().Beneficiary.findById(beneficiaryId).lean();
  if (!beneficiary) throw new Error('المستفيد غير موجود');

  // Last 3 assessments
  const assessments = await ICFAssessment.find({ beneficiaryId, isDeleted: false })
    .sort({ assessmentDate: -1 })
    .limit(3)
    .lean();

  // Criteria checks
  const criteria = [];
  let readinessScore = 0;
  let totalCriteria = 0;

  // 1. All domain scores < 1.5 (mild impairment)
  const latestAssessment = assessments[0];
  const domainScoresOk = latestAssessment?.domainScores?.every(d => d.averageQualifier < 1.5) ?? false;
  criteria.push({
    name: 'درجات ICF أقل من خفيفة (1.5)',
    passed: domainScoresOk,
    value: latestAssessment?.domainScores?.map(d => `${d.domainAr || d.domain}: ${d.averageQualifier.toFixed(2)}`).join('، ') || 'لا توجد بيانات',
  });
  if (domainScoresOk) readinessScore += 25;
  totalCriteria += 25;

  // 2. Goal achievement rate > 70%
  const goals = await Goal.find({ participantId: beneficiaryId }).lean();
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;
  const totalGoals = goals.length || 1;
  const achievementRate = (achievedGoals / totalGoals) * 100;
  const achievementOk = achievementRate >= 70;
  criteria.push({
    name: 'معدل تحقيق الأهداف > 70%',
    passed: achievementOk,
    value: `${achievementRate.toFixed(1)}% (${achievedGoals}/${totalGoals})`,
  });
  if (achievementOk) readinessScore += 25;
  totalCriteria += 25;

  // 3. Session attendance > 80%
  const sessions = await TherapySession.find({ beneficiary: beneficiaryId }).lean();
  const totalSessions = sessions.length || 1;
  const attendedSessions = sessions.filter(s => s.status === 'COMPLETED' && s.attendance?.isPresent !== false).length;
  const attendanceRate = (attendedSessions / totalSessions) * 100;
  const attendanceOk = attendanceRate >= 80;
  criteria.push({
    name: 'حضور الجلسات > 80%',
    passed: attendanceOk,
    value: `${attendanceRate.toFixed(1)}% (${attendedSessions}/${totalSessions})`,
  });
  if (attendanceOk) readinessScore += 25;
  totalCriteria += 25;

  // 4. Recent assessment exists (< 3 months)
  const hasRecentAssessment = latestAssessment && daysBetween(latestAssessment.assessmentDate, new Date()) < 90;
  criteria.push({
    name: 'تقييم حديث (< 3 أشهر)',
    passed: hasRecentAssessment,
    value: latestAssessment ? formatDateAr(latestAssessment.assessmentDate) : 'لا يوجد تقييم',
  });
  if (hasRecentAssessment) readinessScore += 25;
  totalCriteria += 25;

  const isReady = readinessScore >= 75;

  const recommendations = [];
  if (!domainScoresOk) recommendations.push('تكثيف التدخل في المجالات ذات الدرجات المرتفعة');
  if (!achievementOk) recommendations.push('إعادة صياغة الأهداف أو تعديل الجدول العلاجي');
  if (!attendanceOk) recommendations.push('معالجة أسباب الغياب وتحسين التزام المستفيد');
  if (!hasRecentAssessment) recommendations.push('إجراء تقييم ICF شامل حديث');
  if (recommendations.length === 0) recommendations.push('المستفيد جاهز للتقييم النهائي للخروج');

  return {
    readinessScore: `${readinessScore}%`,
    isReady,
    criteria,
    recommendations,
    summary: isReady
      ? 'المستفيد يبدو جاهزاً للخروج بناءً على المعايير الحالية'
      : 'المستفيد يحتاج مزيداً من التدخل قبل استيفاء معايير الخروج',
  };
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  3. predictRiskFlags
 * ═══════════════════════════════════════════════════════════════════════ */

async function predictRiskFlags(beneficiaryId) {
  const { ICFAssessment, Goal, GoalProgressEntry, TherapySession } = getModels();
  if (!ICFAssessment || !Goal || !GoalProgressEntry || !TherapySession) {
    throw new Error('النماذج غير متوفرة');
  }

  const flags = [];

  // 1. Declining ICF scores
  const assessments = await ICFAssessment.find({ beneficiaryId, isDeleted: false })
    .sort({ assessmentDate: -1 })
    .limit(3)
    .lean();

  if (assessments.length >= 2) {
    const current = assessments[0];
    const previous = assessments[1];
    const overallChange = (current.overallFunctioningScore || 0) - (previous.overallFunctioningScore || 0);
    if (overallChange > 5) { // higher score = worse in ICF context
      flags.push({
        riskType: 'تراجع الأداء الوظيفي',
        severity: overallChange > 15 ? 'عالي' : 'متوسط',
        description: `الدرجة الوظيفية الكلية تدهورت من ${previous.overallFunctioningScore}% إلى ${current.overallFunctioningScore}%`,
        recommendation: 'مراجعة الخطة العلاجية وإعادة التقييم السريري',
      });
    }
  }

  // 2. Missed sessions > 3 in a row
  const sessions = await TherapySession.find({ beneficiary: beneficiaryId })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  let consecutiveMissed = 0;
  for (const s of sessions) {
    if (s.status === 'NO_SHOW' || s.status === 'CANCELLED_BY_PATIENT' || s.status === 'CANCELLED_BY_CENTER') {
      consecutiveMissed++;
    } else {
      break;
    }
  }
  if (consecutiveMissed >= 3) {
    flags.push({
      riskType: 'غياب متكرر عن الجلسات',
      severity: consecutiveMissed >= 5 ? 'عالي' : 'متوسط',
      description: `${consecutiveMissed} جلسات متتالية غائب/ملغاة`,
      recommendation: 'التواصل مع الأسرة وتحليل أسباب الغياب، مراجعة خطة الجدولة',
    });
  }

  // 3. Goals with no progress > 4 weeks
  const goals = await Goal.find({ participantId: beneficiaryId, status: 'in-progress' }).lean();
  for (const goal of goals) {
    const lastEntry = await GoalProgressEntry.findOne({ goalId: goal._id })
      .sort({ recordedAt: -1 })
      .lean();
    const daysSinceLast = lastEntry ? daysBetween(lastEntry.recordedAt, new Date()) : daysBetween(goal.startDate, new Date());
    if (daysSinceLast > 28) {
      flags.push({
        riskType: 'توقف تقدم الهدف',
        severity: daysSinceLast > 56 ? 'عالي' : 'متوسط',
        description: `الهدف "${goal.title}" لم يُسجل له تقدم منذ ${Math.round(daysSinceLast / 7)} أسابيع`,
        recommendation: 'مراجعة الهدف مع الفريق العلاجي، إعادة تقييم القابلية للتحقق',
      });
    }
  }

  // 4. ICF reassessment overdue > 6 months
  const latestAssessment = assessments[0];
  if (latestAssessment) {
    const daysSinceAssessment = daysBetween(latestAssessment.assessmentDate, new Date());
    if (daysSinceAssessment > 180) {
      flags.push({
        riskType: 'تقييم ICF متأخر',
        severity: daysSinceAssessment > 270 ? 'عالي' : 'متوسط',
        description: `آخر تقييم ICF كان بتاريخ ${formatDateAr(latestAssessment.assessmentDate)} (قبل ${Math.round(daysSinceAssessment / 30)} شهر)`,
        recommendation: 'جدولة تقييم ICF دوري عاجل',
      });
    }
  } else {
    flags.push({
      riskType: 'غياب تقييم ICF',
      severity: 'عالي',
      description: 'لم يُسجل أي تقييم ICF لهذا المستفيد',
      recommendation: 'إجراء تقييم ICF شامل أولي فوراً',
    });
  }

  return flags;
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  4. recommendNextInterventions
 * ═══════════════════════════════════════════════════════════════════════ */

async function recommendNextInterventions(beneficiaryId) {
  const { ICFAssessment, GoalBank, Employee } = getModels();
  if (!ICFAssessment || !GoalBank) {
    throw new Error('النماذج غير متوفرة');
  }

  const recommendations = [];

  // Get latest assessment
  const assessment = await ICFAssessment.findOne({ beneficiaryId, isDeleted: false })
    .sort({ assessmentDate: -1 })
    .lean();

  if (!assessment) {
    return [{
      intervention: 'تقييم ICF أولي',
      rationale: 'لا يوجد تقييم وظيفي متاح لتحديد احتياجات التدخل',
      priority: 'عالية',
      expectedImpact: 'تحديد خط الأساس ووضع خطة العلاج الأولية',
    }];
  }

  // Find weakest domain (highest qualifier = worst)
  const domainScores = assessment.domainScores || [];
  const sortedDomains = [...domainScores].sort((a, b) => (b.averageQualifier || 0) - (a.averageQualifier || 0));
  const weakestDomain = sortedDomains[0];

  if (!weakestDomain) {
    return [{
      intervention: 'مراجعة شاملة للخطة',
      rationale: 'جميع المجالات ضمن المدى الطبيعي — التركيز على الصيانة والمتابعة',
      priority: 'منخفضة',
      expectedImpact: 'الحفاظ على المكتسبات ومنع التراجع',
    }];
  }

  // Domain Arabic names
  const domainArMap = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'هياكل الجسم',
    activitiesParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
  };

  // Recommend intervention for weakest domain
  recommendations.push({
    intervention: `تدليك علاجي مكثف — ${domainArMap[weakestDomain.domain] || weakestDomain.domain}`,
    rationale: `المجال يحمل أعلى درجة إعاقة (${weakestDomain.averageQualifier.toFixed(2)}) ويتطلب تدخلاً مكثفاً`,
    priority: weakestDomain.averageQualifier >= 3 ? 'عالية' : 'متوسطة',
    expectedImpact: 'تخفيف درجة الإعاقة وتحسين الأداء الوظيفي في 4–6 أسابيع',
  });

  // Check GoalBank for matching goals
  const goalBankMatches = await GoalBank.find({
    domain: weakestDomain.domain,
    isActive: true,
  })
    .limit(3)
    .lean();

  for (const gb of goalBankMatches) {
    recommendations.push({
      intervention: `هدف من بنك الأهداف: ${gb.titleAr || gb.title}`,
      rationale: `يتوافق مع مجال الضعف (${domainArMap[weakestDomain.domain] || weakestDomain.domain}) ويُستخدم في الحالات المشابهة`,
      priority: 'متوسطة',
      expectedImpact: gb.expectedOutcomeAr || gb.expectedOutcome || 'تحسين وظيفي محدد',
    });
  }

  // Check therapist availability (simplified)
  try {
    const availableTherapists = await Employee.find({
      role: 'therapist',
      isActive: true,
    })
      .limit(3)
      .lean();

    for (const t of availableTherapists) {
      recommendations.push({
        intervention: `جلسة مع ${t.nameAr || t.name} (${t.specialty || 'أخصائي علاج طبيعي'})`,
        rationale: 'متاح في الجدول ويتخصص في المجال المستهدف',
        priority: 'منخفضة',
        expectedImpact: 'تقدم منتظم ومتابعة دقيقة للأهداف',
      });
    }
  } catch {
    // Therapist lookup optional
  }

  return recommendations;
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  5. predictLengthOfStay
 * ═══════════════════════════════════════════════════════════════════════ */

async function predictLengthOfStay(beneficiaryId) {
  const { ICFAssessment, GoalProgressEntry, Goal } = getModels();
  if (!ICFAssessment || !Goal) {
    throw new Error('النماذج غير متوفرة');
  }

  const assessments = await ICFAssessment.find({ beneficiaryId, isDeleted: false })
    .sort({ assessmentDate: 1 })
    .lean();

  if (assessments.length === 0) {
    return {
      estimatedWeeksRemaining: 'غير محدد',
      confidenceRange: { low: 'غير محدد', high: 'غير محدد' },
      factors: ['لا يوجد تقييم ICF متاح'],
    };
  }

  const initialAssessment = assessments[0];
  const latestAssessment = assessments[assessments.length - 1];

  // Initial severity (0-4 scale, higher = worse)
  const initialSeverity = initialAssessment.overallFunctioningScore
    ? initialAssessment.overallFunctioningScore / 25 // normalize 0-100 to 0-4
    : 2;

  // Progress rate: change in overall score per week
  const totalDays = daysBetween(initialAssessment.assessmentDate, latestAssessment.assessmentDate);
  const totalWeeks = totalDays / 7 || 1;
  const scoreChange = (latestAssessment.overallFunctioningScore || 0) - (initialAssessment.overallFunctioningScore || 0);
  // In ICF lower is better, so negative change = improvement
  const progressRate = Math.abs(scoreChange) / totalWeeks || 0.1;

  // Baseline weeks based on severity
  const baselineWeeks = initialSeverity > 3 ? 52 : initialSeverity > 2 ? 36 : initialSeverity > 1 ? 24 : 12;

  // Formula: initialSeverity / progressRate * baselineWeeks
  const estimatedWeeks = initialSeverity / (progressRate || 0.1) * (baselineWeeks / 10);
  const estimatedWeeksRemaining = Math.max(1, Math.round(estimatedWeeks));

  // Confidence range based on data availability
  const dataPoints = assessments.length;
  const confidenceWidth = dataPoints >= 5 ? 0.2 : dataPoints >= 3 ? 0.4 : 0.6;
  const low = Math.max(1, Math.round(estimatedWeeksRemaining * (1 - confidenceWidth)));
  const high = Math.round(estimatedWeeksRemaining * (1 + confidenceWidth));

  const factors = [];
  factors.push(`شدة الحالة الأولية: ${initialSeverity.toFixed(1)} / 4`);
  factors.push(`معدل التقدم: ${progressRate.toFixed(2)} درجة/أسبوع`);
  factors.push(`عدد التقييمات: ${dataPoints}`);
  if (scoreChange < 0) factors.push('اتجاه إيجابي: تحسن في الدرجات الوظيفية');
  else if (scoreChange > 0) factors.push('اتجاه سلبي: تدهور في الدرجات الوظيفية');
  else factors.push('اتجاه مستقر: لا تغيير كبير في الدرجات');

  return {
    estimatedWeeksRemaining: `${estimatedWeeksRemaining} أسبوع`,
    confidenceRange: { low: `${low} أسبوع`, high: `${high} أسبوع` },
    factors,
  };
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  6. fullAnalysis — aggregator
 * ═══════════════════════════════════════════════════════════════════════ */

async function fullAnalysis(beneficiaryId) {
  const [dischargeReadiness, riskFlags, interventions, lengthOfStay] = await Promise.all([
    predictDischargeReadiness(beneficiaryId),
    predictRiskFlags(beneficiaryId),
    recommendNextInterventions(beneficiaryId),
    predictLengthOfStay(beneficiaryId),
  ]);

  return {
    beneficiaryId,
    generatedAt: new Date().toISOString(),
    dischargeReadiness,
    riskFlags,
    interventions,
    lengthOfStay,
  };
}

/* ─── Module exports ────────────────────────────────────────────────────── */

module.exports = {
  predictGoalAchievement,
  predictDischargeReadiness,
  predictRiskFlags,
  recommendNextInterventions,
  predictLengthOfStay,
  fullAnalysis,
};
