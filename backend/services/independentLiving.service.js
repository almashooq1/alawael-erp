/**
 * @module services/independentLiving.service
 * @description خدمة نظام الانتقال للحياة المستقلة
 * تتضمن منطق الأعمال لتقييم ADL، خطط التدريب، تتبع التقدم، والإسكان المدعوم
 */

const ADLAssessment = require('../models/ADLAssessment');
const IndependentLivingPlan = require('../models/IndependentLivingPlan');
const IndependentLivingProgress = require('../models/IndependentLivingProgress');
const SupportedHousing = require('../models/SupportedHousing');
const _logger = require('../utils/logger');

class IndependentLivingService {
  // ═══════════════════════════════════════════════════════
  //  تقييم مهارات الحياة اليومية (ADL)
  // ═══════════════════════════════════════════════════════

  /**
   * إنشاء تقييم ADL جديد
   */
  static async createAssessment(data) {
    const assessment = new ADLAssessment(data);
    await assessment.save();
    return assessment.toObject();
  }

  /**
   * جلب تقييمات مستفيد مع فلترة وترقيم
   */
  static async getAssessments(filters = {}) {
    const {
      beneficiary,
      assessor,
      assessmentType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const query = {};
    if (beneficiary) query.beneficiary = beneficiary;
    if (assessor) query.assessor = assessor;
    if (assessmentType) query.assessmentType = assessmentType;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.assessmentDate = {};
      if (dateFrom) query.assessmentDate.$gte = new Date(dateFrom);
      if (dateTo) query.assessmentDate.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const [assessments, total] = await Promise.all([
      ADLAssessment.find(query)
        .populate('beneficiary', 'fullName email')
        .populate('assessor', 'fullName email')
        .populate('reviewedBy', 'fullName email')
        .sort({ assessmentDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ADLAssessment.countDocuments(query),
    ]);

    return {
      assessments,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جلب تقييم واحد بالتفصيل
   */
  static async getAssessmentById(id) {
    return ADLAssessment.findById(id)
      .populate('beneficiary', 'fullName email phone')
      .populate('assessor', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .lean();
  }

  /**
   * تحديث تقييم ADL
   */
  static async updateAssessment(id, data) {
    const assessment = await ADLAssessment.findById(id);
    if (!assessment) return null;

    Object.assign(assessment, data);
    await assessment.save(); // يفعّل pre-save لحساب الدرجات
    return assessment.toObject();
  }

  /**
   * مراجعة تقييم ADL
   */
  static async reviewAssessment(id, reviewerId, reviewNotes) {
    const assessment = await ADLAssessment.findById(id);
    if (!assessment) return null;

    assessment.status = 'reviewed';
    assessment.reviewedBy = reviewerId;
    assessment.reviewedAt = new Date();
    assessment.reviewNotes = reviewNotes;
    await assessment.save();
    return assessment.toObject();
  }

  /**
   * حذف تقييم ADL
   */
  static async deleteAssessment(id) {
    return ADLAssessment.findByIdAndDelete(id);
  }

  /**
   * مقارنة تقييمات مستفيد عبر الزمن
   */
  static async compareAssessments(beneficiaryId) {
    const assessments = await ADLAssessment.find({ beneficiary: beneficiaryId })
      .sort({ assessmentDate: 1 })
      .select('assessmentDate overallScore categoryScores independenceLevel assessmentType')
      .lean();

    if (assessments.length < 2) {
      return { assessments, comparison: null, message: 'يلزم تقييمان على الأقل للمقارنة' };
    }

    const first = assessments[0];
    const latest = assessments[assessments.length - 1];

    const comparison = {
      overallChange: latest.overallScore - first.overallScore,
      categoryChanges: {},
      periodDays: Math.floor(
        (new Date(latest.assessmentDate) - new Date(first.assessmentDate)) / (24 * 60 * 60 * 1000)
      ),
      assessmentsCount: assessments.length,
      startLevel: first.independenceLevel,
      currentLevel: latest.independenceLevel,
    };

    const categories = [
      'cooking',
      'cleaning',
      'shopping',
      'transportation',
      'personal_care',
      'money_management',
      'communication',
      'safety',
    ];
    for (const cat of categories) {
      comparison.categoryChanges[cat] = {
        first: first.categoryScores?.[cat] || 0,
        latest: latest.categoryScores?.[cat] || 0,
        change: (latest.categoryScores?.[cat] || 0) - (first.categoryScores?.[cat] || 0),
      };
    }

    return { assessments, comparison };
  }

  // ═══════════════════════════════════════════════════════
  //  خطط التدريب الفردية
  // ═══════════════════════════════════════════════════════

  /**
   * إنشاء خطة تدريب جديدة
   */
  static async createPlan(data) {
    const plan = new IndependentLivingPlan(data);
    await plan.save();
    return plan.toObject();
  }

  /**
   * جلب خطط التدريب مع فلترة
   */
  static async getPlans(filters = {}) {
    const { beneficiary, status, createdBy, page = 1, limit = 20 } = filters;

    const query = {};
    if (beneficiary) query.beneficiary = beneficiary;
    if (status) query.status = status;
    if (createdBy) query.createdBy = createdBy;

    const skip = (page - 1) * limit;
    const [plans, total] = await Promise.all([
      IndependentLivingPlan.find(query)
        .populate('beneficiary', 'fullName email')
        .populate('createdBy', 'fullName email')
        .populate('baselineAssessment', 'overallScore independenceLevel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IndependentLivingPlan.countDocuments(query),
    ]);

    return {
      plans,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جلب خطة تدريب بالتفصيل
   */
  static async getPlanById(id) {
    return IndependentLivingPlan.findById(id)
      .populate('beneficiary', 'fullName email phone')
      .populate('createdBy', 'fullName email')
      .populate('baselineAssessment')
      .populate('assignedTeam.member', 'fullName email role')
      .populate('sessions.trainer', 'fullName email')
      .lean();
  }

  /**
   * تحديث خطة تدريب
   */
  static async updatePlan(id, data) {
    const plan = await IndependentLivingPlan.findById(id);
    if (!plan) return null;

    Object.assign(plan, data);
    await plan.save();
    return plan.toObject();
  }

  /**
   * حذف خطة تدريب
   */
  static async deletePlan(id) {
    return IndependentLivingPlan.findByIdAndDelete(id);
  }

  /**
   * إضافة جلسة تدريب لخطة
   */
  static async addSession(planId, sessionData) {
    const plan = await IndependentLivingPlan.findById(planId);
    if (!plan) return null;

    plan.sessions.push(sessionData);
    await plan.save();
    return plan.toObject();
  }

  /**
   * تحديث هدف تدريبي
   */
  static async updateGoal(planId, goalId, goalData) {
    const plan = await IndependentLivingPlan.findById(planId);
    if (!plan) return null;

    const goal = plan.goals.id(goalId);
    if (!goal) return null;

    Object.assign(goal, goalData);

    // حساب نسبة تقدم الهدف من الخطوات
    if (goal.steps && goal.steps.length > 0) {
      const completedSteps = goal.steps.filter(s => s.isCompleted).length;
      goal.progressPercentage = Math.round((completedSteps / goal.steps.length) * 100);
    }

    if (goal.progressPercentage >= 100) {
      goal.status = 'achieved';
      goal.achievedAt = new Date();
    }

    await plan.save();
    return plan.toObject();
  }

  /**
   * إضافة مراجعة لخطة
   */
  static async addPlanReview(planId, reviewData) {
    const plan = await IndependentLivingPlan.findById(planId);
    if (!plan) return null;

    plan.reviews.push(reviewData);
    await plan.save();
    return plan.toObject();
  }

  // ═══════════════════════════════════════════════════════
  //  تتبع التقدم نحو الاستقلالية
  // ═══════════════════════════════════════════════════════

  /**
   * تسجيل تقدم فترة جديدة
   */
  static async recordProgress(data) {
    // جلب آخر تقدم مسجل لتحديد القيم السابقة
    const lastProgress = await IndependentLivingProgress.findOne({
      beneficiary: data.beneficiary,
      plan: data.plan,
    })
      .sort({ periodEnd: -1 })
      .lean();

    if (lastProgress) {
      data.previousOverallScore = lastProgress.overallScore;
      data.previousIndependenceLevel = lastProgress.independenceLevel;
    }

    const progress = new IndependentLivingProgress(data);
    await progress.save();
    return progress.toObject();
  }

  /**
   * جلب سجلات التقدم مع فلترة
   */
  static async getProgressRecords(filters = {}) {
    const { beneficiary, plan, period, status, page = 1, limit = 20 } = filters;

    const query = {};
    if (beneficiary) query.beneficiary = beneficiary;
    if (plan) query.plan = plan;
    if (period) query.period = period;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      IndependentLivingProgress.find(query)
        .populate('beneficiary', 'fullName email')
        .populate('plan', 'title status')
        .populate('recordedBy', 'fullName email')
        .sort({ periodEnd: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      IndependentLivingProgress.countDocuments(query),
    ]);

    return {
      records,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جلب سجل تقدم بالتفصيل
   */
  static async getProgressById(id) {
    return IndependentLivingProgress.findById(id)
      .populate('beneficiary', 'fullName email phone')
      .populate('plan', 'title status goals')
      .populate('recordedBy', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .populate('milestones.verifiedBy', 'fullName email')
      .lean();
  }

  /**
   * تحديث سجل تقدم
   */
  static async updateProgress(id, data) {
    const progress = await IndependentLivingProgress.findById(id);
    if (!progress) return null;

    Object.assign(progress, data);
    await progress.save();
    return progress.toObject();
  }

  /**
   * حذف سجل تقدم
   */
  static async deleteProgress(id) {
    return IndependentLivingProgress.findByIdAndDelete(id);
  }

  /**
   * تقرير منحنى التقدم لمستفيد
   */
  static async getProgressTimeline(beneficiaryId, planId) {
    const query = { beneficiary: beneficiaryId };
    if (planId) query.plan = planId;

    const records = await IndependentLivingProgress.find(query)
      .sort({ periodEnd: 1 })
      .select(
        'periodStart periodEnd overallScore categoryScores independenceLevel trend milestones'
      )
      .lean();

    const timeline = records.map(r => ({
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      overallScore: r.overallScore,
      categoryScores: r.categoryScores,
      independenceLevel: r.independenceLevel,
      trend: r.trend,
      milestonesCount: r.milestones?.length || 0,
    }));

    // ملخص إحصائي
    const stats = {
      totalRecords: records.length,
      startScore: records.length > 0 ? records[0].overallScore : 0,
      currentScore: records.length > 0 ? records[records.length - 1].overallScore : 0,
      highestScore: Math.max(...records.map(r => r.overallScore), 0),
      lowestScore: records.length > 0 ? Math.min(...records.map(r => r.overallScore)) : 0,
      totalMilestones: records.reduce((acc, r) => acc + (r.milestones?.length || 0), 0),
      overallImprovement:
        records.length >= 2
          ? records[records.length - 1].overallScore - records[0].overallScore
          : 0,
    };

    return { timeline, stats };
  }

  // ═══════════════════════════════════════════════════════
  //  برامج الإسكان المدعوم
  // ═══════════════════════════════════════════════════════

  /**
   * إنشاء برنامج إسكان مدعوم
   */
  static async createHousingProgram(data) {
    const program = new SupportedHousing(data);
    await program.save();
    return program.toObject();
  }

  /**
   * جلب برامج الإسكان مع فلترة
   */
  static async getHousingPrograms(filters = {}) {
    const {
      beneficiary,
      caseManager,
      programType,
      status,
      transitionPhase,
      page = 1,
      limit = 20,
    } = filters;

    const query = {};
    if (beneficiary) query.beneficiary = beneficiary;
    if (caseManager) query.caseManager = caseManager;
    if (programType) query.programType = programType;
    if (status) query.status = status;
    if (transitionPhase) query.transitionPhase = transitionPhase;

    const skip = (page - 1) * limit;
    const [programs, total] = await Promise.all([
      SupportedHousing.find(query)
        .populate('beneficiary', 'fullName email')
        .populate('caseManager', 'fullName email')
        .populate('plan', 'title status overallProgress')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SupportedHousing.countDocuments(query),
    ]);

    return {
      programs,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جلب برنامج إسكان بالتفصيل
   */
  static async getHousingProgramById(id) {
    return SupportedHousing.findById(id)
      .populate('beneficiary', 'fullName email phone')
      .populate('caseManager', 'fullName email phone')
      .populate('plan')
      .populate('readinessAssessments.assessedBy', 'fullName email')
      .populate('supportServices.provider', 'fullName email')
      .populate('homeVisits.visitor', 'fullName email')
      .lean();
  }

  /**
   * تحديث برنامج إسكان
   */
  static async updateHousingProgram(id, data) {
    const program = await SupportedHousing.findById(id);
    if (!program) return null;

    Object.assign(program, data);
    await program.save();
    return program.toObject();
  }

  /**
   * حذف برنامج إسكان
   */
  static async deleteHousingProgram(id) {
    return SupportedHousing.findByIdAndDelete(id);
  }

  /**
   * إضافة تقييم جاهزية سكن
   */
  static async addReadinessAssessment(programId, assessmentData) {
    const program = await SupportedHousing.findById(programId);
    if (!program) return null;

    program.readinessAssessments.push(assessmentData);
    await program.save();
    return program.toObject();
  }

  /**
   * إضافة زيارة منزلية
   */
  static async addHomeVisit(programId, visitData) {
    const program = await SupportedHousing.findById(programId);
    if (!program) return null;

    program.homeVisits.push(visitData);
    await program.save();
    return program.toObject();
  }

  /**
   * إضافة استبيان رضا
   */
  static async addSatisfactionSurvey(programId, surveyData) {
    const program = await SupportedHousing.findById(programId);
    if (!program) return null;

    program.satisfactionSurveys.push(surveyData);
    await program.save();
    return program.toObject();
  }

  // ═══════════════════════════════════════════════════════
  //  الإحصائيات والتقارير الشاملة
  // ═══════════════════════════════════════════════════════

  /**
   * لوحة معلومات النظام
   */
  static async getDashboardStats() {
    const [
      totalAssessments,
      completedAssessments,
      totalPlans,
      activePlans,
      totalHousing,
      activeHousing,
      independentCount,
    ] = await Promise.all([
      ADLAssessment.countDocuments(),
      ADLAssessment.countDocuments({ status: 'completed' }),
      IndependentLivingPlan.countDocuments(),
      IndependentLivingPlan.countDocuments({ status: 'active' }),
      SupportedHousing.countDocuments(),
      SupportedHousing.countDocuments({ status: 'active' }),
      ADLAssessment.countDocuments({ independenceLevel: 'independent' }),
    ]);

    // متوسط درجة الاستقلالية
    const avgScoreResult = await ADLAssessment.aggregate([
      { $match: { status: { $in: ['completed', 'reviewed'] } } },
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
    ]);

    // توزيع مستويات الاستقلالية
    const levelDistribution = await ADLAssessment.aggregate([
      { $match: { status: { $in: ['completed', 'reviewed'] } } },
      { $group: { _id: '$independenceLevel', count: { $sum: 1 } } },
    ]);

    // توزيع أنواع برامج الإسكان
    const housingDistribution = await SupportedHousing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$programType', count: { $sum: 1 } } },
    ]);

    return {
      assessments: { total: totalAssessments, completed: completedAssessments },
      plans: { total: totalPlans, active: activePlans },
      housing: { total: totalHousing, active: activeHousing },
      independentBeneficiaries: independentCount,
      averageIndependenceScore: avgScoreResult[0]?.avgScore
        ? Math.round(avgScoreResult[0].avgScore)
        : 0,
      levelDistribution: levelDistribution.reduce((acc, l) => {
        acc[l._id] = l.count;
        return acc;
      }, {}),
      housingDistribution: housingDistribution.reduce((acc, h) => {
        acc[h._id] = h.count;
        return acc;
      }, {}),
    };
  }

  /**
   * تقرير شامل لمستفيد
   */
  static async getBeneficiaryReport(beneficiaryId) {
    const [assessments, plans, progress, housing] = await Promise.all([
      ADLAssessment.find({ beneficiary: beneficiaryId })
        .sort({ assessmentDate: -1 })
        .limit(5)
        .lean(),
      IndependentLivingPlan.find({ beneficiary: beneficiaryId }).sort({ createdAt: -1 }).lean(),
      IndependentLivingProgress.find({ beneficiary: beneficiaryId })
        .sort({ periodEnd: -1 })
        .limit(12)
        .lean(),
      SupportedHousing.find({ beneficiary: beneficiaryId }).sort({ createdAt: -1 }).lean(),
    ]);

    const latestAssessment = assessments[0] || null;
    const latestProgress = progress[0] || null;

    return {
      beneficiaryId,
      currentStatus: {
        independenceLevel: latestAssessment?.independenceLevel || 'unknown',
        overallScore: latestAssessment?.overallScore || 0,
        trend: latestProgress?.trend || 'unknown',
      },
      assessments: {
        total: assessments.length,
        latest: latestAssessment,
      },
      plans: {
        total: plans.length,
        active: plans.filter(p => p.status === 'active').length,
        items: plans,
      },
      progress: {
        total: progress.length,
        records: progress,
      },
      housing: {
        total: housing.length,
        active: housing.filter(h => h.status === 'active').length,
        items: housing,
      },
    };
  }
}

module.exports = IndependentLivingService;
