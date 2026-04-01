/**
 * ProgressPredictionService — خدمة التنبؤ بتقدم المستفيدين
 * Prompt 20: AI & Predictive Analytics Module
 */

const axios = require('axios');
const AiPrediction = require('../../models/AiPrediction');
const AiModelConfig = require('../../models/AiModelConfig');
const logger = require('../../utils/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * استخراج المتغيرات من بيانات المستفيد
 */
function extractFeatures(beneficiary, sessions, assessments, goals) {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentSessions = sessions.filter(s => new Date(s.session_date || s.date) >= threeMonthsAgo);
  const attendedCount = recentSessions.filter(
    s => s.attendance_status === 'attended' || s.status === 'completed'
  ).length;
  const totalCount = recentSessions.length;
  const attendanceRate = totalCount > 0 ? attendedCount / totalCount : 0;

  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(b.assessment_date || b.date) - new Date(a.assessment_date || a.date)
  );
  const latestAssessment = sortedAssessments[0] || null;
  const previousAssessment = sortedAssessments[1] || null;

  let assessmentTrend = 0;
  if (latestAssessment && previousAssessment) {
    assessmentTrend = (latestAssessment.total_score || 0) - (previousAssessment.total_score || 0);
  }

  const weeks = Math.max(1, Math.round((now - threeMonthsAgo) / (7 * 24 * 3600 * 1000)));
  const sessionsPerWeek = totalCount > 0 ? Math.round((attendedCount / weeks) * 10) / 10 : 0;

  const achievedGoals = goals.filter(
    g => g.status === 'achieved' || g.status === 'completed'
  ).length;
  const totalGoals = goals.length;
  const goalCompletionRate = totalGoals > 0 ? achievedGoals / totalGoals : 0;

  const dob = beneficiary.date_of_birth || beneficiary.dob;
  const enrollmentDate = beneficiary.enrollment_date || beneficiary.created_at;

  return {
    disability_type: beneficiary.disability_type || beneficiary.type_of_disability,
    disability_severity: beneficiary.disability_severity || beneficiary.severity,
    current_age: dob ? Math.floor((now - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null,
    months_in_program: enrollmentDate
      ? Math.floor((now - new Date(enrollmentDate)) / (30.44 * 24 * 3600 * 1000))
      : 0,
    sessions_per_week: sessionsPerWeek,
    attendance_rate: Math.round(attendanceRate * 10000) / 10000,
    total_sessions_attended: attendedCount,
    latest_assessment_score: latestAssessment?.total_score || 0,
    assessment_trend: assessmentTrend,
    goal_completion_rate: Math.round(goalCompletionRate * 10000) / 10000,
    active_goals_count: goals.filter(g => g.status === 'in_progress' || g.status === 'active')
      .length,
    has_family_involvement: beneficiary.family_involvement_score || 0,
  };
}

/**
 * تنبؤ بديل (Rule-based) عند عدم توفر خدمة ML
 */
function fallbackPrediction(features) {
  let score = 0.5;

  if (features.attendance_rate >= 0.9) score += 0.15;
  else if (features.attendance_rate >= 0.7) score += 0.05;
  else if (features.attendance_rate < 0.5) score -= 0.2;

  if (features.assessment_trend > 0) score += 0.1;
  else if (features.assessment_trend < 0) score -= 0.1;

  score += features.goal_completion_rate * 0.2;

  if (features.sessions_per_week >= 3) score += 0.05;
  if (features.sessions_per_week >= 5) score += 0.05;

  score = Math.max(0, Math.min(1, score));

  let attendanceImpact = '+5%';
  if (features.attendance_rate >= 0.9) attendanceImpact = '+15%';
  else if (features.attendance_rate < 0.5) attendanceImpact = '-20%';

  return {
    value: Math.round(score * 10000) / 10000,
    confidence: 0.5,
    model_version: 'rule_based_v1',
    details: {
      method: 'rule_based_fallback',
      factors: {
        attendance_impact: attendanceImpact,
        assessment_impact:
          features.assessment_trend > 0 ? '+10%' : features.assessment_trend < 0 ? '-10%' : '0%',
        goal_impact: `+${Math.round(features.goal_completion_rate * 20)}%`,
      },
    },
  };
}

/**
 * استدعاء خدمة ML الخارجية
 */
async function callMLService(endpoint, data) {
  const response = await axios.post(`${ML_SERVICE_URL}/api/v1/${endpoint}`, data, {
    timeout: 30000,
  });
  if (response.status !== 200) {
    throw new Error(`ML service returned status: ${response.status}`);
  }
  return response.data;
}

/**
 * التنبؤ بتقدم مستفيد معين
 */
async function predictProgress(
  beneficiary,
  plan = null,
  sessions = [],
  assessments = [],
  goals = []
) {
  const features = extractFeatures(beneficiary, sessions, assessments, goals);

  let prediction;
  try {
    prediction = await callMLService('predict_progress', features);
  } catch (err) {
    logger.warn('ML service unavailable, using fallback', { error: err.message });
    prediction = fallbackPrediction(features);
  }

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setMonth(targetDate.getMonth() + 1);

  const doc = new AiPrediction({
    beneficiary_id: beneficiary._id,
    plan_id: plan?._id || null,
    prediction_type: 'progress',
    prediction_scope: 'monthly',
    predicted_value: prediction.value,
    confidence: prediction.confidence,
    features_used: features,
    prediction_details: prediction.details || null,
    model_version: prediction.model_version || 'rule_based_v1',
    status: 'active',
    prediction_date: now,
    target_date: targetDate,
    branch_id: beneficiary.branch_id,
  });

  await doc.save();
  return doc;
}

/**
 * التنبؤ بخطر الانسحاب
 */
async function predictDropoutRisk(beneficiary, sessions = []) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentSessions = sessions.filter(s => new Date(s.session_date || s.date) >= thirtyDaysAgo);
  const prevSessions = sessions.filter(s => {
    const d = new Date(s.session_date || s.date);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const recentAbsenceRate =
    recentSessions.length > 0
      ? recentSessions.filter(s => s.attendance_status === 'absent').length / recentSessions.length
      : 0;

  const prevAbsenceRate =
    prevSessions.length > 0
      ? prevSessions.filter(s => s.attendance_status === 'absent').length / prevSessions.length
      : 0;

  // خطر الانسحاب = نسبة غياب مرتفعة ومتزايدة
  let riskScore = recentAbsenceRate;
  if (recentAbsenceRate > prevAbsenceRate) {
    riskScore = Math.min(1, riskScore + 0.2);
  }

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 14);

  const doc = new AiPrediction({
    beneficiary_id: beneficiary._id,
    prediction_type: 'dropout_risk',
    prediction_scope: 'weekly',
    predicted_value: Math.round(riskScore * 10000) / 10000,
    confidence: 0.65,
    features_used: {
      recent_absence_rate: recentAbsenceRate,
      previous_absence_rate: prevAbsenceRate,
      trend: recentAbsenceRate > prevAbsenceRate ? 'increasing' : 'stable',
    },
    model_version: 'rule_based_v1',
    status: 'active',
    prediction_date: now,
    target_date: targetDate,
    branch_id: beneficiary.branch_id,
  });

  await doc.save();
  return doc;
}

/**
 * التحقق من دقة التنبؤات السابقة وتحديث نموذج الدقة
 */
async function validatePastPredictions(Beneficiary, Goal) {
  const expired = await AiPrediction.find({
    status: 'active',
    target_date: { $lte: new Date() },
    actual_value: null,
  }).lean();

  let validated = 0;

  for (const pred of expired) {
    try {
      // جلب الأهداف الحالية لحساب التقدم الفعلي
      const goals = await Goal.find({ beneficiary_id: pred.beneficiary_id }).lean();
      if (!goals.length) continue;

      const avgProgress =
        goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length / 100;

      const doc = await AiPrediction.findById(pred._id);
      if (doc) {
        await doc.validatePrediction(Math.round(avgProgress * 10000) / 10000);
        validated++;
      }
    } catch (err) {
      logger.error(`Validation failed for prediction ${pred._id}`, { error: err.message });
    }
  }

  // تحديث دقة النموذج
  await updateModelAccuracy();

  return validated;
}

/**
 * حساب وتحديث دقة النموذج
 */
async function updateModelAccuracy() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentValidated = await AiPrediction.find({
    prediction_type: 'progress',
    actual_value: { $ne: null },
    validated_at: { $gte: threeMonthsAgo },
  }).lean();

  if (recentValidated.length < 10) return;

  const accurateCount = recentValidated.filter(
    p => Math.abs((p.actual_value || 0) - p.predicted_value) <= 0.15
  ).length;
  const accuracy = accurateCount / recentValidated.length;

  await AiModelConfig.findOneAndUpdate(
    { model_name: 'progress_predictor' },
    {
      $set: {
        accuracy_score: Math.round(accuracy * 10000) / 10000,
        last_evaluated_at: new Date(),
        training_data_count: recentValidated.length,
      },
    },
    { upsert: true }
  );
}

module.exports = {
  predictProgress,
  predictDropoutRisk,
  validatePastPredictions,
  updateModelAccuracy,
  extractFeatures,
  fallbackPrediction,
};
