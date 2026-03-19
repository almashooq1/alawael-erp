/* eslint-disable no-unused-vars */
/**
 * نظام إدارة الحالات المتقدم
 * Advanced Case Management Service
 *
 * يتضمن:
 * - إدارة الإحالات والقبول
 * - تحديد الأهلية التلقائي
 * - تفويض الخدمات
 * - مراقبة التقدم
 * - تخطيط الانتقال والخروج
 */

const logger = require('../utils/logger');

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// النماذج (Models)
// ============================================

// نموذج الإحالة
const referralSchema = new Schema(
  {
    referralNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // مصدر الإحالة
    source: {
      type: {
        type: String,
        enum: ['self', 'family', 'hospital', 'school', 'government', 'ngo', 'other'],
      },
      organization: String,
      contactPerson: String,
      contactPhone: String,
      contactEmail: String,
      referralLetter: String, // رابط خطاب الإحالة
    },

    // سبب الإحالة
    reason: {
      primary: String,
      secondary: [String],
      urgency: { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },
      notes: String,
    },

    // المعلومات الطبية الأولية
    medicalInfo: {
      diagnosis: String,
      icdCode: String,
      disabilityType: String,
      severity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
      comorbidities: [String],
      medications: [String],
      previousInterventions: [String],
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'received',
        'under_review',
        'assessment_scheduled',
        'assessment_completed',
        'accepted',
        'rejected',
        'waitlisted',
      ],
      default: 'received',
    },

    // الأولوية
    priorityScore: { type: Number, min: 1, max: 100 },
    priorityFactors: {
      urgencyLevel: Number,
      functionalImpact: Number,
      familySupport: Number,
      resourceAvailability: Number,
      waitingTime: Number,
    },

    // التواريخ
    dates: {
      received: { type: Date, default: Date.now },
      reviewed: Date,
      assessmentScheduled: Date,
      decisionMade: Date,
      expectedEnrollment: Date,
    },

    // المراجعة
    review: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewDate: Date,
      eligibilityStatus: {
        type: String,
        enum: ['eligible', 'conditionally_eligible', 'ineligible', 'pending'],
      },
      eligibilityNotes: String,
      recommendedServices: [String],
      estimatedDuration: Number, // بالأيام
      estimatedSessions: Number,
    },

    // الموافقات
    consents: [
      {
        type: { type: String },
        consentedAt: Date,
        consentedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        documentUrl: String,
      },
    ],

    // الملاحظات
    notes: [
      {
        content: String,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        visibility: { type: String, enum: ['internal', 'external'], default: 'internal' },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج الخطة الفردية للخدمة
const servicePlanSchema = new Schema(
  {
    planNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    referralId: { type: Schema.Types.ObjectId, ref: 'Referral' },

    // معلومات الخطة
    planInfo: {
      name: String,
      type: {
        type: String,
        enum: ['rehabilitation', 'educational', 'vocational', 'comprehensive'],
      },
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['draft', 'active', 'on_hold', 'completed', 'discontinued'],
        default: 'draft',
      },
    },

    // الفريق العلاجي
    careTeam: [
      {
        member: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['primary_therapist', 'co_therapist', 'supervisor', 'case_manager', 'specialist'],
        },
        specialty: String,
        allocation: Number, // نسبة الوقت المخصصة
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // الأهداف
    goals: [
      {
        code: String,
        domain: {
          type: String,
          enum: [
            'physical',
            'cognitive',
            'communication',
            'social',
            'emotional',
            'vocational',
            'independence',
          ],
        },
        category: String,
        description: String,
        shortTermObjectives: [
          {
            description: String,
            criteria: String,
            targetDate: Date,
            status: {
              type: String,
              enum: [
                'not_started',
                'in_progress',
                'achieved',
                'partially_achieved',
                'discontinued',
              ],
            },
            progressPercentage: { type: Number, min: 0, max: 100 },
            achievedDate: Date,
          },
        ],
        longTermGoal: String,
        measurementMethod: String,
        baselineScore: Number,
        targetScore: Number,
        currentScore: Number,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
      },
    ],

    // الخدمات المصرح بها
    authorizedServices: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
        serviceName: String,
        frequency: {
          sessionsPerWeek: Number,
          durationMinutes: Number,
          totalSessions: Number,
        },
        authorization: {
          authorizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          authorizedAt: Date,
          validFrom: Date,
          validUntil: Date,
          status: {
            type: String,
            enum: ['pending', 'approved', 'expired', 'exhausted', 'cancelled'],
          },
        },
        utilization: {
          usedSessions: { type: Number, default: 0 },
          remainingSessions: Number,
          lastSessionDate: Date,
        },
      },
    ],

    // الجدول الزمني
    schedule: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 },
        sessions: [
          {
            serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
            startTime: String,
            endTime: String,
            therapist: { type: Schema.Types.ObjectId, ref: 'User' },
            location: String,
          },
        ],
      },
    ],

    // مراجعات الخطة
    reviews: [
      {
        reviewDate: Date,
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewType: { type: String, enum: ['periodic', 'milestone', 'request', 'discharge'] },
        findings: String,
        recommendations: [String],
        planModifications: [
          {
            field: String,
            oldValue: String,
            newValue: String,
            reason: String,
          },
        ],
        nextReviewDate: Date,
      },
    ],

    // مؤشرات النتائج
    outcomes: {
      functionalImprovement: Number,
      qualityOfLifeScore: Number,
      satisfactionScore: Number,
      goalAchievementRate: Number,
      attendanceRate: Number,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج تخطيط الخروج
const dischargePlanSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    servicePlanId: { type: Schema.Types.ObjectId, ref: 'ServicePlan' },

    // معلومات الخروج
    dischargeInfo: {
      type: {
        type: String,
        enum: ['planned', 'premature', 'transferred', 'declined', 'completed'],
      },
      reason: String,
      plannedDate: Date,
      actualDate: Date,
      status: { type: String, enum: ['planning', 'in_progress', 'completed', 'follow_up'] },
    },

    // معايير الخروج
    dischargeCriteria: [
      {
        criterion: String,
        met: { type: Boolean, default: false },
        evidence: String,
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
      },
    ],

    // ملخص الإنجازات
    achievementsSummary: {
      goalsAchieved: Number,
      goalsPartiallyAchieved: Number,
      goalsNotAchieved: Number,
      overallProgress: Number,
      keyAchievements: [String],
      areasForContinuedGrowth: [String],
    },

    // التوصيات
    recommendations: {
      continuedServices: [String],
      homeProgram: String,
      communityResources: [String],
      followUpSchedule: [
        {
          timeframe: String,
          purpose: String,
          responsible: String,
        },
      ],
    },

    // الروابط المجتمعية
    communityLinkages: [
      {
        organization: String,
        contactPerson: String,
        service: String,
        referralDate: Date,
        status: String,
      },
    ],

    // التقييم النهائي
    finalAssessment: {
      functionalStatus: {
        admission: Number,
        discharge: Number,
        improvement: Number,
      },
      qualityOfLife: {
        admission: Number,
        discharge: Number,
        improvement: Number,
      },
      familySatisfaction: Number,
      beneficiarySatisfaction: Number,
      therapistAssessment: String,
    },

    // المتابعة بعد الخروج
    followUp: {
      schedule: [
        {
          date: Date,
          type: { type: String, enum: ['phone', 'visit', 'virtual', 'survey'] },
          status: { type: String, enum: ['scheduled', 'completed', 'missed', 'rescheduled'] },
          notes: String,
        },
      ],
      lastContact: Date,
      nextContact: Date,
      outcomes: String,
    },

    preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// إنشاء النماذج
const Referral = mongoose.model('Referral', referralSchema);
const ServicePlan = mongoose.model('ServicePlan', servicePlanSchema);
const DischargePlan = mongoose.model('DischargePlan', dischargePlanSchema);

// ============================================
// خدمة إدارة الحالات
// ============================================

class AdvancedCaseManagementService {
  /**
   * إنشاء إحالة جديدة
   */
  async createReferral(referralData) {
    try {
      // توليد رقم الإحالة
      const referralNumber = await this.generateReferralNumber();

      // حساب درجة الأولوية
      const priorityScore = await this.calculatePriorityScore(referralData);

      const referral = new Referral({
        ...referralData,
        referralNumber,
        priorityScore,
        'dates.received': new Date(),
      });

      await referral.save();

      // إرسال إشعار
      await this.sendReferralNotification(referral);

      // بدء عملية المراجعة التلقائية
      await this.initiateAutoReview(referral);

      return referral;
    } catch (error) {
      throw new Error(`خطأ في إنشاء الإحالة: ${error.message}`);
    }
  }

  /**
   * توليد رقم الإحالة
   */
  async generateReferralNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await Referral.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
    });
    return `REF-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * حساب درجة الأولوية
   */
  async calculatePriorityScore(referralData) {
    let score = 50; // الدرجة الأساسية

    // عامل الإلحاح
    const urgencyScores = { emergency: 30, urgent: 20, routine: 0 };
    score += urgencyScores[referralData.reason?.urgency] || 0;

    // عامل شدة الإعاقة
    const severityScores = { profound: 15, severe: 10, moderate: 5, mild: 0 };
    score += severityScores[referralData.medicalInfo?.severity] || 0;

    // عامل الدعم الأسري
    score -= (referralData.familySupportScore || 5) * 2;

    // التأكد من أن الدرجة في النطاق الصحيح
    return Math.max(1, Math.min(100, score));
  }

  /**
   * مراجعة الإحالة
   */
  async reviewReferral(referralId, reviewData) {
    try {
      const referral = await Referral.findById(referralId);
      if (!referral) {
        throw new Error('الإحالة غير موجودة');
      }

      // التحقق من الأهلية
      const eligibilityResult = await this.checkEligibility(referral, reviewData);

      referral.review = {
        ...reviewData,
        reviewedBy: reviewData.reviewerId,
        reviewDate: new Date(),
        eligibilityStatus: eligibilityResult.status,
        eligibilityNotes: eligibilityResult.notes,
      };

      referral.status =
        eligibilityResult.status === 'eligible'
          ? 'accepted'
          : eligibilityResult.status === 'conditionally_eligible'
            ? 'accepted'
            : 'rejected';
      referral.dates.reviewed = new Date();
      referral.dates.decisionMade = new Date();

      await referral.save();

      // إذا تم القبول، إنشاء خطة خدمة
      if (referral.status === 'accepted') {
        await this.initiateServicePlan(referral);
      }

      return referral;
    } catch (error) {
      throw new Error(`خطأ في مراجعة الإحالة: ${error.message}`);
    }
  }

  /**
   * التحقق من الأهلية
   */
  async checkEligibility(referral, reviewData) {
    // معايير الأهلية
    const criteria = {
      hasDisabilityCertification: reviewData.hasDisabilityCert || false,
      withinAgeRange: this.checkAgeRange(referral.beneficiaryId),
      withinServiceArea: reviewData.withinServiceArea !== false,
      noContradictions: reviewData.noContradictions !== false,
    };

    const metCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;

    if (metCriteria === totalCriteria) {
      return { status: 'eligible', notes: 'جميع معايير الأهلية متوفرة' };
    } else if (metCriteria >= totalCriteria * 0.75) {
      return {
        status: 'conditionally_eligible',
        notes: 'أهلية مشروطة - بعض المعايير تحتاج متابعة',
      };
    } else {
      return { status: 'ineligible', notes: 'لا يستوفي معايير الأهلية' };
    }
  }

  /**
   * فحص نطاق العمر
   */
  checkAgeRange(beneficiaryId) {
    // منطق فحص العمر
    return true;
  }

  /**
   * إنشاء خطة خدمة
   */
  async createServicePlan(planData) {
    try {
      const planNumber = await this.generatePlanNumber();

      const servicePlan = new ServicePlan({
        ...planData,
        planNumber,
        'planInfo.status': 'draft',
      });

      await servicePlan.save();
      return servicePlan;
    } catch (error) {
      throw new Error(`خطأ في إنشاء خطة الخدمة: ${error.message}`);
    }
  }

  /**
   * توليد رقم الخطة
   */
  async generatePlanNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const count = await ServicePlan.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });
    return `SP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * تفويض خدمة
   */
  async authorizeService(planId, serviceAuthorization) {
    try {
      const plan = await ServicePlan.findById(planId);
      if (!plan) {
        throw new Error('خطة الخدمة غير موجودة');
      }

      const authorization = {
        ...serviceAuthorization,
        authorization: {
          ...serviceAuthorization.authorization,
          authorizedAt: new Date(),
          status: 'approved',
        },
        utilization: {
          usedSessions: 0,
          remainingSessions: serviceAuthorization.frequency.totalSessions,
        },
      };

      plan.authorizedServices.push(authorization);
      await plan.save();

      return plan;
    } catch (error) {
      throw new Error(`خطأ في تفويض الخدمة: ${error.message}`);
    }
  }

  /**
   * تسجيل جلسة
   */
  async recordSession(planId, serviceId, sessionData) {
    try {
      const plan = await ServicePlan.findById(planId);
      if (!plan) {
        throw new Error('خطة الخدمة غير موجودة');
      }

      const service = plan.authorizedServices.id(serviceId);
      if (!service) {
        throw new Error('الخدمة غير موجودة');
      }

      // تحديث الاستخدام
      service.utilization.usedSessions += 1;
      service.utilization.remainingSessions -= 1;
      service.utilization.lastSessionDate = new Date();

      // التحقق من استنفاد الجلسات
      if (service.utilization.remainingSessions <= 0) {
        service.authorization.status = 'exhausted';
      }

      await plan.save();
      return plan;
    } catch (error) {
      throw new Error(`خطأ في تسجيل الجلسة: ${error.message}`);
    }
  }

  /**
   * تحديث تقدم الهدف
   */
  async updateGoalProgress(planId, goalId, progressData) {
    try {
      const plan = await ServicePlan.findById(planId);
      if (!plan) {
        throw new Error('خطة الخدمة غير موجودة');
      }

      const goal = plan.goals.id(goalId);
      if (!goal) {
        throw new Error('الهدف غير موجود');
      }

      // تحديث بيانات التقدم
      goal.currentScore = progressData.currentScore || goal.currentScore;

      // تحديث الأهداف قصيرة المدى
      if (progressData.objectiveId) {
        const objective = goal.shortTermObjectives.id(progressData.objectiveId);
        if (objective) {
          objective.status = progressData.status || objective.status;
          objective.progressPercentage = progressData.percentage || objective.progressPercentage;
          if (progressData.status === 'achieved') {
            objective.achievedDate = new Date();
          }
        }
      }

      // حساب معدل تحقيق الأهداف
      await this.calculateGoalAchievementRate(plan);

      await plan.save();
      return plan;
    } catch (error) {
      throw new Error(`خطأ في تحديث تقدم الهدف: ${error.message}`);
    }
  }

  /**
   * حساب معدل تحقيق الأهداف
   */
  async calculateGoalAchievementRate(plan) {
    const totalObjectives = plan.goals.reduce(
      (sum, goal) => sum + goal.shortTermObjectives.length,
      0
    );

    const achievedObjectives = plan.goals.reduce(
      (sum, goal) => sum + goal.shortTermObjectives.filter(obj => obj.status === 'achieved').length,
      0
    );

    plan.outcomes.goalAchievementRate =
      totalObjectives > 0 ? Math.round((achievedObjectives / totalObjectives) * 100) : 0;
  }

  /**
   * مراجعة الخطة
   */
  async reviewPlan(planId, reviewData) {
    try {
      const plan = await ServicePlan.findById(planId);
      if (!plan) {
        throw new Error('خطة الخدمة غير موجودة');
      }

      const review = {
        ...reviewData,
        reviewDate: new Date(),
      };

      plan.reviews.push(review);

      // تطبيق التعديلات إن وجدت
      if (reviewData.modifications) {
        for (const mod of reviewData.modifications) {
          await this.applyPlanModification(plan, mod);
        }
      }

      await plan.save();
      return plan;
    } catch (error) {
      throw new Error(`خطأ في مراجعة الخطة: ${error.message}`);
    }
  }

  /**
   * تطبيق تعديل على الخطة
   */
  async applyPlanModification(plan, modification) {
    // تطبيق التعديل حسب نوع الحقل
    const [field, ...path] = modification.field.split('.');

    if (path.length === 0) {
      plan[field] = modification.newValue;
    } else {
      let current = plan[field];
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = modification.newValue;
    }
  }

  /**
   * إنشاء خروج
   */
  async createDischargePlan(dischargeData) {
    try {
      const dischargePlan = new DischargePlan({
        ...dischargeData,
        'dischargeInfo.status': 'planning',
      });

      await dischargePlan.save();
      return dischargePlan;
    } catch (error) {
      throw new Error(`خطأ في إنشاء خطة الخروج: ${error.message}`);
    }
  }

  /**
   * تقييم معايير الخروج
   */
  async evaluateDischargeCriteria(planId) {
    try {
      const dischargePlan = await DischargePlan.findById(planId);
      if (!dischargePlan) {
        throw new Error('خطة الخروج غير موجودة');
      }

      // تقييم كل معيار
      const evaluationResults = dischargePlan.dischargeCriteria.map(criterion => {
        // منطق التقييم
        const isMet = this.evaluateCriterion(criterion);
        criterion.met = isMet;
        criterion.verifiedAt = new Date();
        return criterion;
      });

      await dischargePlan.save();

      // حساب نسبة الوفاء
      const metCount = evaluationResults.filter(c => c.met).length;
      const satisfactionRate = (metCount / evaluationResults.length) * 100;

      return {
        criteria: evaluationResults,
        satisfactionRate,
        readyForDischarge: satisfactionRate >= 80,
      };
    } catch (error) {
      throw new Error(`خطأ في تقييم معايير الخروج: ${error.message}`);
    }
  }

  /**
   * تقييم معيار واحد
   */
  evaluateCriterion(criterion) {
    // منطق التقييم بناءً على نوع المعيار
    return true;
  }

  /**
   * إتمام الخروج
   */
  async completeDischarge(planId, completionData) {
    try {
      const dischargePlan = await DischargePlan.findById(planId);
      if (!dischargePlan) {
        throw new Error('خطة الخروج غير موجودة');
      }

      dischargePlan.dischargeInfo.actualDate = new Date();
      dischargePlan.dischargeInfo.status = 'completed';
      dischargePlan.finalAssessment = completionData.finalAssessment;

      // إعداد جدول المتابعة
      if (completionData.followUpSchedule) {
        dischargePlan.followUp.schedule = completionData.followUpSchedule.map(item => ({
          ...item,
          status: 'scheduled',
        }));
      }

      await dischargePlan.save();

      // تحديث حالة خطة الخدمة
      await ServicePlan.findByIdAndUpdate(dischargePlan.servicePlanId, {
        'planInfo.status': 'completed',
        'planInfo.endDate': new Date(),
      });

      return dischargePlan;
    } catch (error) {
      throw new Error(`خطأ في إتمام الخروج: ${error.message}`);
    }
  }

  /**
   * إحصائيات الحالات
   */
  async getCaseStatistics(filters = {}) {
    try {
      const stats = {
        referrals: {
          total: await Referral.countDocuments(filters),
          byStatus: await Referral.aggregate([
            { $match: filters },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
          avgProcessingTime: await this.calculateAvgProcessingTime(filters),
        },
        activePlans: await ServicePlan.countDocuments({ 'planInfo.status': 'active', ...filters }),
        discharges: await DischargePlan.countDocuments({
          'dischargeInfo.status': 'completed',
          ...filters,
        }),
        outcomes: await this.calculateOutcomes(filters),
      };

      return stats;
    } catch (error) {
      throw new Error(`خطأ في الحصول على الإحصائيات: ${error.message}`);
    }
  }

  /**
   * حساب متوسط وقت المعالجة
   */
  async calculateAvgProcessingTime(filters) {
    const result = await Referral.aggregate([
      { $match: { ...filters, status: { $in: ['accepted', 'rejected'] } } },
      {
        $project: {
          processingTime: {
            $subtract: ['$dates.decisionMade', '$dates.received'],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$processingTime' },
        },
      },
    ]);

    return result.length > 0 ? Math.round(result[0].avgTime / (1000 * 60 * 60 * 24)) : 0; // بالأيام
  }

  /**
   * حساب النتائج
   */
  async calculateOutcomes(filters) {
    const plans = await ServicePlan.find({ 'planInfo.status': 'completed', ...filters });

    if (plans.length === 0) {
      return { avgGoalAchievement: 0, avgFunctionalImprovement: 0 };
    }

    const totalGoalAchievement = plans.reduce(
      (sum, plan) => sum + (plan.outcomes.goalAchievementRate || 0),
      0
    );

    const totalFunctionalImprovement = plans.reduce(
      (sum, plan) => sum + (plan.outcomes.functionalImprovement || 0),
      0
    );

    return {
      avgGoalAchievement: Math.round(totalGoalAchievement / plans.length),
      avgFunctionalImprovement: Math.round(totalFunctionalImprovement / plans.length),
    };
  }

  // دوال مساعدة

  async sendReferralNotification(referral) {
    // إرسال إشعار بالبريد الإلكتروني أو SMS
    logger.info(`إرسال إشعار للإحالة: ${referral.referralNumber}`);
  }

  async initiateAutoReview(referral) {
    // بدء المراجعة التلقائية
    logger.info(`بدء المراجعة التلقائية للإحالة: ${referral.referralNumber}`);
  }

  async initiateServicePlan(referral) {
    // إنشاء خطة خدمة مبدئية
    logger.info(`إنشاء خطة خدمة للإحالة: ${referral.referralNumber}`);
  }
}

// تصدير
module.exports = {
  AdvancedCaseManagementService,
  Referral,
  ServicePlan,
  DischargePlan,
};
