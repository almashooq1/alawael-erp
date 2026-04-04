/**
 * SmartPlanSuggestionService — خدمة اقتراح الخطط العلاجية الذكية
 * Prompt 20: AI & Predictive Analytics Module
 *
 * يقوم بتحليل المستفيدين المشابهين والأهداف الناجحة
 * لاقتراح خطة علاجية مُثلى لمستفيد جديد أو عند إعادة التخطيط.
 */

const AiSuggestion = require('../../models/AiSuggestion');
const logger = require('../../utils/logger');

/**
 * خريطة الأنشطة المقترحة بحسب المجال
 */
const ACTIVITY_MAP = {
  communication: [
    { name_ar: 'تمارين التواصل البصري', name_en: 'Eye contact exercises' },
    { name_ar: 'بطاقات التواصل المصورة (PECS)', name_en: 'PECS communication cards' },
    { name_ar: 'تمارين النطق والكلام', name_en: 'Speech and articulation exercises' },
    { name_ar: 'التواصل بالإشارة', name_en: 'Sign language communication' },
  ],
  motor: [
    { name_ar: 'تمارين التوازن', name_en: 'Balance exercises' },
    { name_ar: 'تمارين المهارات الحركية الدقيقة', name_en: 'Fine motor skill exercises' },
    { name_ar: 'العلاج بالماء', name_en: 'Hydrotherapy' },
    { name_ar: 'التكامل الحسي', name_en: 'Sensory integration' },
  ],
  cognitive: [
    { name_ar: 'ألعاب التصنيف والمطابقة', name_en: 'Sorting and matching games' },
    { name_ar: 'تمارين الذاكرة والانتباه', name_en: 'Memory and attention exercises' },
    { name_ar: 'حل المشكلات البسيطة', name_en: 'Simple problem solving' },
    { name_ar: 'التعلم بالقصص', name_en: 'Story-based learning' },
  ],
  social: [
    { name_ar: 'اللعب التعاوني', name_en: 'Cooperative play' },
    { name_ar: 'قصص اجتماعية', name_en: 'Social stories' },
    { name_ar: 'تدريب المهارات الاجتماعية الجماعي', name_en: 'Group social skills training' },
    { name_ar: 'محاكاة المواقف الاجتماعية', name_en: 'Social situation role-play' },
  ],
  self_care: [
    { name_ar: 'تدريب ارتداء الملابس', name_en: 'Dressing training' },
    { name_ar: 'تدريب النظافة الشخصية', name_en: 'Personal hygiene training' },
    { name_ar: 'تدريب تناول الطعام', name_en: 'Eating skills training' },
    { name_ar: 'الاستقلالية في الحمام', name_en: 'Bathroom independence training' },
  ],
  behavioral: [
    { name_ar: 'تحليل السلوك التطبيقي (ABA)', name_en: 'Applied Behavior Analysis (ABA)' },
    { name_ar: 'تعزيز السلوك الإيجابي', name_en: 'Positive behavior reinforcement' },
    { name_ar: 'تقنيات الاسترخاء', name_en: 'Relaxation techniques' },
  ],
};

/**
 * اقتراح خطة علاجية لمستفيد بناءً على بيانات الأهداف المشابهة
 *
 * @param {Object} beneficiary - بيانات المستفيد
 * @param {Object|null} assessment - نتيجة التقييم الأخير
 * @param {Array} similarBeneficiaries - مستفيدون مشابهون (من DB)
 * @param {Array} successfulGoals - أهداف ناجحة من حالات مشابهة
 * @returns {Promise<Object>} - وثيقة AiSuggestion
 */
async function suggestPlan(
  beneficiary,
  assessment = null,
  similarBeneficiaries = [],
  successfulGoals = []
) {
  const similarCount = similarBeneficiaries.length;

  // تحليل الأهداف الناجحة
  const goalStats = analyzeGoalStats(successfulGoals);

  // بناء محتوى الاقتراح
  const content = buildSuggestionContent(beneficiary, assessment, goalStats, similarCount);

  // حساب درجة الثقة
  const confidenceScore = calculateConfidence(similarCount);

  // حفظ الاقتراح
  const suggestion = new AiSuggestion({
    target_type: 'treatment_plan',
    target_id: null,
    beneficiary_id: beneficiary._id,
    suggestion_type: 'goals',
    suggestion_category: 'treatment',
    content,
    reasoning: {
      similar_cases_count: similarCount,
      analysis_method: 'collaborative_filtering',
      data_period: '24_months',
      assessment_id: assessment?._id || null,
    },
    priority: 'high',
    confidence_score: confidenceScore,
    model_version: 'plan_suggester_v1',
    branch_id: beneficiary.branch_id,
  });

  await suggestion.save();
  return suggestion;
}

/**
 * تحليل إحصاءات الأهداف الناجحة
 * @param {Array} goals - قائمة الأهداف من حالات مشابهة
 * @returns {Object} - إحصاءات مجمّعة حسب المجال
 */
function analyzeGoalStats(goals = []) {
  const stats = {};

  for (const goal of goals) {
    const domain = goal.domain || 'general';
    if (!stats[domain]) {
      stats[domain] = {
        domain,
        goals: {},
        total_count: 0,
        achieved_count: 0,
        avg_sessions: [],
      };
    }

    stats[domain].total_count++;
    if (goal.status === 'achieved' || goal.status === 'completed') {
      stats[domain].achieved_count++;
      if (goal.sessions_to_achieve) {
        stats[domain].avg_sessions.push(goal.sessions_to_achieve);
      }
    }

    const goalKey = goal.title_ar || goal.title_en || 'unknown';
    if (!stats[domain].goals[goalKey]) {
      stats[domain].goals[goalKey] = {
        title_ar: goal.title_ar,
        title_en: goal.title_en,
        count: 0,
        achieved: 0,
        avg_target: [],
      };
    }
    stats[domain].goals[goalKey].count++;
    if (goal.status === 'achieved' || goal.status === 'completed') {
      stats[domain].goals[goalKey].achieved++;
    }
    if (goal.target_value) {
      stats[domain].goals[goalKey].avg_target.push(goal.target_value);
    }
  }

  // احتساب نسب النجاح
  for (const domain of Object.values(stats)) {
    domain.success_rate = domain.total_count > 0 ? domain.achieved_count / domain.total_count : 0;

    const sessArr = domain.avg_sessions;
    domain.avg_sessions_to_achieve =
      sessArr.length > 0 ? Math.round(sessArr.reduce((a, b) => a + b, 0) / sessArr.length) : 0;
  }

  return stats;
}

/**
 * بناء محتوى الاقتراح
 */
function buildSuggestionContent(beneficiary, assessment, goalStats, similarCount) {
  const suggestedGoals = [];
  const activeDomains = new Set();

  // بناء الأهداف المقترحة من الإحصاءات
  for (const [domain, data] of Object.entries(goalStats)) {
    if (data.success_rate < 0.3) continue; // تجاهل المجالات ذات نسبة نجاح منخفضة

    activeDomains.add(domain);

    for (const [goalKey, goalData] of Object.entries(data.goals)) {
      const successRate = goalData.count > 0 ? goalData.achieved / goalData.count : 0;
      if (successRate < 0.4) continue; // تجاهل الأهداف ذات نسبة نجاح منخفضة

      const avgTarget =
        goalData.avg_target.length > 0
          ? Math.round(goalData.avg_target.reduce((a, b) => a + b, 0) / goalData.avg_target.length)
          : 80;

      suggestedGoals.push({
        title_ar: goalData.title_ar || goalKey,
        title_en: goalData.title_en || goalKey,
        domain,
        target_value: avgTarget,
        success_rate_in_similar_cases: Math.round(successRate * 100 * 10) / 10,
        suggested_sessions: data.avg_sessions_to_achieve || 20,
        rationale_ar: `بناءً على نجاح ${goalData.achieved} من ${goalData.count} مستفيد مشابه`,
        rationale_en: `Based on success of ${goalData.achieved} out of ${goalData.count} similar cases`,
        confidence: Math.round(successRate * 100) / 100,
      });
    }
  }

  // ترتيب الأهداف حسب نسبة النجاح
  suggestedGoals.sort((a, b) => b.success_rate_in_similar_cases - a.success_rate_in_similar_cases);

  // تحديد عدد الجلسات الأسبوعية الأمثل
  const optimalWeeklySessions = calculateOptimalWeeklySessions(goalStats);

  // تحديد المدة المتوقعة
  const maxGoalSessions = suggestedGoals.reduce((max, g) => Math.max(max, g.suggested_sessions), 0);
  const estimatedWeeks =
    maxGoalSessions > 0 && optimalWeeklySessions > 0
      ? Math.min(52, Math.ceil(maxGoalSessions / optimalWeeklySessions))
      : 24;

  // اقتراح الأنشطة بناءً على المجالات النشطة
  const suggestedActivities = buildActivities(activeDomains);

  return {
    suggested_goals: suggestedGoals.slice(0, 8),
    suggested_weekly_sessions: optimalWeeklySessions,
    suggested_duration_weeks: estimatedWeeks,
    suggested_activities: suggestedActivities,
    based_on_similar_cases: similarCount,
    confidence_note_ar:
      similarCount >= 10
        ? 'ثقة عالية — بناءً على عدد كافٍ من الحالات المشابهة'
        : 'ثقة متوسطة — عدد الحالات المشابهة محدود',
    confidence_note_en:
      similarCount >= 10
        ? 'High confidence — based on sufficient similar cases'
        : 'Medium confidence — limited similar cases available',
  };
}

/**
 * حساب عدد الجلسات الأسبوعية الأمثل
 */
function calculateOptimalWeeklySessions(goalStats) {
  const sessionCounts = Object.values(goalStats)
    .filter(d => d.avg_sessions_to_achieve > 0)
    .map(d => d.avg_sessions_to_achieve);

  if (!sessionCounts.length) return 3;

  // الوسيط
  const sorted = sessionCounts.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];

  return Math.max(2, Math.min(5, median > 20 ? 3 : 2));
}

/**
 * بناء قائمة الأنشطة المقترحة
 */
function buildActivities(activeDomains) {
  const activities = [];
  for (const domain of activeDomains) {
    const domainActivities = ACTIVITY_MAP[domain] || [];
    activities.push(...domainActivities);
  }
  return activities.slice(0, 10);
}

/**
 * حساب درجة الثقة بناءً على عدد الحالات المشابهة
 */
function calculateConfidence(similarCount) {
  if (similarCount >= 20) return 0.9;
  if (similarCount >= 10) return 0.75;
  if (similarCount >= 5) return 0.6;
  return 0.4;
}

/**
 * البحث عن مستفيدين مشابهين من قاعدة البيانات
 * (helper للاستخدام في controller أو route)
 *
 * @param {Object} beneficiary - المستفيد الهدف
 * @param {Object} BeneficiaryModel - نموذج Mongoose
 * @returns {Promise<Array>}
 */
async function findSimilarBeneficiaries(beneficiary, BeneficiaryModel) {
  try {
    const ageTolerance = 2; // ± 2 سنة
    const dob = beneficiary.date_of_birth || beneficiary.dob;
    const enrollmentDate = beneficiary.enrollment_date || beneficiary.created_at;

    const ageAtEnrollment =
      dob && enrollmentDate
        ? Math.floor((new Date(enrollmentDate) - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
        : null;

    const filter = {
      _id: { $ne: beneficiary._id },
      status: { $in: ['active', 'completed', 'discharged'] },
      disability_type: beneficiary.disability_type || beneficiary.type_of_disability,
    };

    // تضمين مرشح الشدة إن وُجد
    if (beneficiary.disability_severity || beneficiary.severity) {
      filter.disability_severity = beneficiary.disability_severity || beneficiary.severity;
    }

    const similar = await BeneficiaryModel.find(filter).limit(50).lean();
    return similar;
  } catch (err) {
    logger.error('findSimilarBeneficiaries error', { error: err.message });
    return [];
  }
}

/**
 * جلب الأهداف الناجحة من خطط المستفيدين المشابهين
 *
 * @param {Array} similarBeneficiaries - مصفوفة المستفيدين
 * @param {Object} GoalModel - نموذج Goal من Mongoose
 * @returns {Promise<Array>}
 */
async function fetchSuccessfulGoals(similarBeneficiaries, GoalModel) {
  if (!similarBeneficiaries.length || !GoalModel) return [];

  try {
    const ids = similarBeneficiaries.map(b => b._id);
    const goals = await GoalModel.find({
      beneficiary_id: { $in: ids },
      status: { $in: ['achieved', 'completed'] },
    })
      .limit(500)
      .lean();
    return goals;
  } catch (err) {
    logger.error('fetchSuccessfulGoals error', { error: err.message });
    return [];
  }
}

module.exports = {
  suggestPlan,
  analyzeGoalStats,
  buildSuggestionContent,
  calculateConfidence,
  findSimilarBeneficiaries,
  fetchSuccessfulGoals,
  ACTIVITY_MAP,
};
