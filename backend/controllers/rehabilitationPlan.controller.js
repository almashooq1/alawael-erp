/**
 * 🏥 Rehabilitation Plan Controller — المتحكم الرئيسي لخطط التأهيل المتكاملة
 * يربط: IndividualizedRehabilitationPlanService + AIAssessmentService +
 *        alerts-notifications + rehabilitation-reports + tele-rehabilitation +
 *        therapist-dashboard + quality-assurance + smart-scheduling
 * الإصدار 3.0.0
 */

'use strict';

const logger = require('../utils/logger');

// ── استيراد الخدمات الأساسية ──────────────────────────────────────────────
let IndividualizedRehabilitationPlanService,
  AIAssessmentService,
  AlertsNotificationsService,
  RehabilitationReportsService,
  TeleRehabilitationService,
  TherapistDashboardService,
  QualityAssuranceService,
  SmartSchedulingService;

try {
  ({
    IndividualizedRehabilitationPlanService,
  } = require('../rehabilitation-services/individualized-rehabilitation-plan-service'));
  ({ AIAssessmentService } = require('../rehabilitation-services/ai-assessment-service'));
  // Use safe destructuring — each service may export named or default
  const _alerts = require('../rehabilitation-services/alerts-notifications-service');
  AlertsNotificationsService = _alerts.AlertsNotificationsService || _alerts;
  const _reports = require('../rehabilitation-services/rehabilitation-reports-service');
  RehabilitationReportsService = _reports.RehabilitationReportsService || _reports;
  const _tele = require('../rehabilitation-services/tele-rehabilitation-service');
  TeleRehabilitationService = _tele.TeleRehabilitationService || _tele;
  const _therapist = require('../rehabilitation-services/therapist-dashboard-service');
  TherapistDashboardService = _therapist.TherapistDashboardService || _therapist;
  const _qa = require('../rehabilitation-services/quality-assurance-service');
  QualityAssuranceService = _qa.QualityAssuranceService || _qa;
  const _sched = require('../rehabilitation-services/smart-scheduling-service');
  SmartSchedulingService = _sched.SmartSchedulingService || _sched;
} catch (err) {
  logger.warn('[RehabPlanController] بعض الخدمات غير متاحة — وضع مستقل:', { error: err.message });
}

// ── إنشاء مثيلات الخدمات ─────────────────────────────────────────────────
const planService = IndividualizedRehabilitationPlanService
  ? new IndividualizedRehabilitationPlanService()
  : null;
const aiService = AIAssessmentService ? new AIAssessmentService() : null;
const alertsService = AlertsNotificationsService ? new AlertsNotificationsService() : null;
const reportsService = RehabilitationReportsService ? new RehabilitationReportsService() : null;
const teleService = TeleRehabilitationService ? new TeleRehabilitationService() : null;
const qaService = QualityAssuranceService ? new QualityAssuranceService() : null;
const schedService = SmartSchedulingService ? new SmartSchedulingService() : null;

// ────────────────────────────────────────────────────────────────────────────
// دوال مساعدة
// ────────────────────────────────────────────────────────────────────────────

/** الاستجابة الموحدة */
const respond = (res, statusCode, success, message, data = {}) =>
  res.status(statusCode).json({ success, message, ...data, timestamp: new Date() });

/** التحقق من صحة بيانات الخطة
 * يدعم حقول الفرونت: beneficiary, primaryDiagnosis, disabilityCategory
 * ويدعم حقول الخدمة القديمة: beneficiaryId, beneficiaryName, disabilityType
 */
const validatePlanData = body => {
  // دعم اسمَي الحقل القديم والجديد معًا
  const beneficiary = body.beneficiary || body.beneficiaryId;
  const diagnosis = body.primaryDiagnosis || body.disabilityType || body.disabilityCategory;

  if (!beneficiary?.toString().trim()) return 'رقم أو اسم المستفيد مطلوب';
  if (!diagnosis?.toString().trim()) return 'التشخيص الأساسي أو نوع الإعاقة مطلوب';
  if (!body.startDate) return 'تاريخ البدء مطلوب';

  // التحقق من معرّف ObjectId إذا كان الحقل يبدو معرّفًا
  if (beneficiary && /^[a-fA-F0-9]{24}$/.test(beneficiary) === false && beneficiary.length < 2) {
    return 'معرّف المستفيد قصير جداً (2 أحرف على الأقل)';
  }

  // التحقق من التواريخ
  if (body.endDate && body.startDate && body.endDate <= body.startDate) {
    return 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
  }

  // حد طول التشخيص
  if (diagnosis && diagnosis.length > 200) {
    return 'التشخيص يتجاوز الحد المسموح (200 حرف)';
  }

  return null;
};

/** التحقق من صحة بيانات الهدف
 * يدعم حقول الفرونت: goalText, domain
 * ويدعم حقول الخدمة القديمة: description, domain
 */
const validateGoalData = body => {
  const text = body.goalText || body.description;
  if (!text?.trim()) return 'نص الهدف مطلوب';
  if (!body.domain?.trim()) return 'مجال الهدف مطلوب';
  if (body.targetDate && isNaN(new Date(body.targetDate).getTime())) {
    return 'تاريخ الهدف غير صالح';
  }
  return null;
};

/** التحقق من معرّف ObjectId */
const isValidId = id => /^[a-fA-F0-9]{24}$/.test(id);

// ────────────────────────────────────────────────────────────────────────────
// 1. إنشاء خطة تأهيل شخصية جديدة
// ────────────────────────────────────────────────────────────────────────────
exports.createPlan = async (req, res) => {
  try {
    const validationError = validatePlanData(req.body);
    if (validationError) return respond(res, 400, false, validationError);

    if (!planService) return respond(res, 503, false, 'خدمة خطط التأهيل غير متاحة حالياً');

    // توحيد أسماء الحقول — الفرونت يُرسل beneficiary/primaryDiagnosis/disabilityCategory
    const normalizedBody = {
      ...req.body,
      // الخدمة تتوقع beneficiaryId
      beneficiaryId: req.body.beneficiaryId || req.body.beneficiary,
      // الخدمة تتوقع beneficiaryName (اختياري إذا توفر)
      beneficiaryName: req.body.beneficiaryName || req.body.beneficiary,
      // الخدمة تتوقع disabilityType
      disabilityType:
        req.body.disabilityType || req.body.disabilityCategory || req.body.primaryDiagnosis,
      // القالب
      templateType: req.body.templateType || req.body.templateUsed || 'comprehensive',
    };

    // 1) إنشاء الخطة الأساسية
    const result = await planService.createPlan({
      ...normalizedBody,
      createdBy: req.user?.id || 'system',
    });

    // 2) تقييم AI تلقائي إذا توفرت بيانات سريرية
    let aiAssessment = null;
    if (aiService && req.body.clinicalData) {
      aiAssessment = await aiService.conductAIAssessment(normalizedBody.beneficiaryId, {
        ...req.body.clinicalData,
        diagnosis: normalizedBody.disabilityType,
      });

      // تحديث الخطة بتوصيات AI
      if (aiAssessment?.aiResults?.suggestedServices?.length) {
        result.plan.aiSuggestedServices = aiAssessment.aiResults.suggestedServices;
        result.plan.aiRecommendedPath = aiAssessment.aiResults.recommendedPath;
        result.plan.estimatedDuration = aiAssessment.aiResults.estimatedDuration;
      }
    }

    // 3) إرسال إشعار للمعالج المسؤول
    if (alertsService && req.body.primaryTherapist) {
      await alertsService
        .sendAlert?.({
          type: 'new_plan',
          recipientId: req.body.primaryTherapist,
          message: `تم إنشاء خطة تأهيل جديدة للمستفيد: ${normalizedBody.beneficiaryName}`,
          planId: result.planId,
          priority: 'high',
        })
        .catch(() => {});
    }

    // 4) إنشاء جلسة أولى في نظام الجدولة الذكية
    if (schedService && req.body.primaryTherapist) {
      await schedService
        .scheduleInitialAssessment?.({
          planId: result.planId,
          beneficiary: normalizedBody.beneficiaryId,
          therapist: req.body.primaryTherapist,
          requestedBy: req.user?.id || 'system',
        })
        .catch(() => {});
    }

    return respond(res, 201, true, result.message, {
      planId: result.planId,
      plan: result.plan,
      aiAssessment: aiAssessment
        ? {
            recommendedPath: aiAssessment.aiResults?.recommendedPath,
            estimatedDuration: aiAssessment.aiResults?.estimatedDuration,
            priorityAreas: aiAssessment.aiResults?.priorityAreas?.slice(0, 5),
            riskScore: aiAssessment.aiResults?.riskScore,
            suggestedServices: aiAssessment.aiResults?.suggestedServices,
          }
        : null,
    });
  } catch (err) {
    logger.error('[createPlan]', { error: err.message, stack: err.stack });
    return respond(res, 500, false, 'خطأ داخلي في إنشاء الخطة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 2. استرجاع خطة بعينها
// ────────────────────────────────────────────────────────────────────────────
exports.getPlan = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const plan = planService.getPlan(req.params.planId);
    if (!plan) return respond(res, 404, false, 'الخطة غير موجودة');

    // إثراء الخطة بأحدث تقييم AI
    let latestAI = null;
    if (aiService) {
      const report = await aiService.getAIReport(plan.beneficiary.id).catch(() => null);
      if (report?.latestAssessment) latestAI = report;
    }

    // بيانات لوحة المعالج
    let therapistData = null;
    if (TherapistDashboardService) {
      const tdService = new TherapistDashboardService();
      therapistData = await tdService.getPlanSummary?.(req.params.planId).catch(() => null);
    }

    return respond(res, 200, true, 'تم استرجاع الخطة بنجاح', { plan, latestAI, therapistData });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في استرجاع الخطة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 3. استرجاع جميع خطط مستفيد
// ────────────────────────────────────────────────────────────────────────────
exports.getBeneficiaryPlans = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const plans = planService.getBeneficiaryPlans(req.params.beneficiaryId);

    // تضمين بيانات AI لكل خطة
    let aiTrends = null;
    if (aiService) {
      aiTrends = await aiService.getAssessmentTrends(req.params.beneficiaryId).catch(() => null);
    }

    return respond(res, 200, true, `تم استرجاع ${plans.length} خطة`, { plans, aiTrends });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في استرجاع الخطط', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 4. إضافة هدف SMART للخطة
// ────────────────────────────────────────────────────────────────────────────
exports.addGoal = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { planId } = req.params;

    const goalError = validateGoalData(req.body);
    if (goalError) return respond(res, 400, false, goalError);

    // توحيد أسماء حقول الهدف — الفرونت يُرسل goalText والخدمة تتوقع description
    const normalizedGoal = {
      ...req.body,
      description: req.body.description || req.body.goalText,
    };

    const result = planService.addGoal(planId, normalizedGoal);

    // إشعار المعالج
    if (alertsService) {
      await alertsService
        .sendAlert?.({
          type: 'goal_added',
          planId,
          goalId: result.goal?.id,
          message: `تم إضافة هدف جديد: ${normalizedGoal.description}`,
          priority: req.body.priority === 'high' ? 'high' : 'normal',
        })
        .catch(() => {});
    }

    return respond(res, 201, true, result.message, { goal: result.goal });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في إضافة الهدف', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 5. تحديث تقدم الهدف
// ────────────────────────────────────────────────────────────────────────────
exports.updateGoalProgress = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { planId, goalId } = req.params;

    const result = planService.updateGoalProgress(planId, goalId, req.body);

    // إشعار الإنجاز
    if (alertsService && result.status === 'achieved') {
      await alertsService
        .sendAlert?.({
          type: 'goal_achieved',
          planId,
          goalId,
          message: '🎉 تم تحقيق هدف!',
          priority: 'high',
        })
        .catch(() => {});
    }

    // تحديث QA إذا كان هناك تراجع
    if (qaService && result.status === 'needs_attention') {
      await qaService
        .flagForReview?.({
          planId,
          goalId,
          reason: 'تقدم أقل من المتوقع — يلزم مراجعة',
        })
        .catch(() => {});
    }

    return respond(res, 200, true, result.message, {
      goal: result.goal,
      progressPercent: result.progressPercent,
      status: result.status,
    });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في تحديث التقدم', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 6. إضافة خدمة للخطة
// ────────────────────────────────────────────────────────────────────────────
exports.addService = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const result = planService.addService(req.params.planId, req.body);
    return respond(res, 201, true, result.message, { service: result.service });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في إضافة الخدمة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 7. تسجيل جلسة علاجية
// ────────────────────────────────────────────────────────────────────────────
exports.recordSession = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { planId, serviceId } = req.params;

    const result = planService.recordServiceSession(planId, serviceId, req.body);

    // تحديث لوحة المعالج
    if (TherapistDashboardService) {
      const tdService = new TherapistDashboardService();
      await tdService
        .updateSessionStats?.({ planId, serviceId, session: result.session })
        .catch(() => {});
    }

    return respond(res, 200, true, result.message, {
      session: result.session,
      totalSessions: result.totalSessions,
    });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في تسجيل الجلسة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 8. تقييم AI شامل للمستفيد
// ────────────────────────────────────────────────────────────────────────────
exports.conductAIAssessment = async (req, res) => {
  try {
    if (!aiService) return respond(res, 503, false, 'خدمة AI غير متاحة');
    const assessment = await aiService.conductAIAssessment(req.params.beneficiaryId, req.body);

    // تقييم الخطر
    const riskProfile = await aiService.assessRisk(req.params.beneficiaryId).catch(() => null);

    // إشعار إذا كان الخطر مرتفعاً
    if (alertsService && riskProfile?.riskLevel === 'حرج') {
      await alertsService
        .sendAlert?.({
          type: 'critical_risk',
          beneficiaryId: req.params.beneficiaryId,
          message: `⚠️ مستوى خطر حرج للمستفيد — يلزم تدخل فوري`,
          priority: 'critical',
        })
        .catch(() => {});
    }

    return respond(res, 200, true, 'تم إجراء التقييم بنجاح', { assessment, riskProfile });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في التقييم', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 9. توقع النتائج بالذكاء الاصطناعي
// ────────────────────────────────────────────────────────────────────────────
exports.predictOutcomes = async (req, res) => {
  try {
    if (!aiService) return respond(res, 503, false, 'خدمة AI غير متاحة');
    const { beneficiaryId } = req.params;
    const { serviceType = 'physicalTherapy', durationWeeks = 12 } = req.body;

    const prediction = await aiService.predictOutcomes(beneficiaryId, serviceType, durationWeeks);
    return respond(res, 200, true, 'تم توليد التوقعات', { prediction });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في التوقع', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 10. مراجعة الخطة الدورية
// ────────────────────────────────────────────────────────────────────────────
exports.reviewPlan = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { planId } = req.params;

    const review = planService.reviewPlan(planId, req.body);

    // توليد تقرير المراجعة
    if (reportsService) {
      await reportsService.generateReviewReport?.({ planId, review }).catch(() => {});
    }

    // جدولة المراجعة القادمة
    if (schedService && review.nextReviewDate) {
      await schedService
        .scheduleReview?.({
          planId,
          date: review.nextReviewDate,
          assignedTo: req.body.coordinator || req.user?.id,
        })
        .catch(() => {});
    }

    return respond(res, 200, true, review.message, {
      review: review.review,
      nextReviewDate: review.nextReviewDate,
    });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في المراجعة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 11. تقرير تقدم شامل
// ────────────────────────────────────────────────────────────────────────────
exports.generateProgressReport = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { planId } = req.params;

    const report = planService.generateProgressReport(planId, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      type: req.query.type || 'quarterly',
    });

    // إثراء بتقرير AI
    const plan = planService.getPlan(planId);
    if (aiService && plan) {
      const aiReport = await aiService.getAIReport(plan.beneficiary.id).catch(() => null);
      if (aiReport) report.aiInsights = aiReport.aiInsights;
    }

    // تقرير التيلي-ريهاب
    if (teleService) {
      const teleStats = await teleService.getSessionStats?.({ planId }).catch(() => null);
      if (teleStats) report.teleRehabStats = teleStats;
    }

    return respond(res, 200, true, 'تم توليد التقرير', { report });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في التقرير', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 12. لوحة تحكم AI للمعالج (Dashboard)
// ────────────────────────────────────────────────────────────────────────────
exports.getTherapistDashboard = async (req, res) => {
  try {
    const therapistId = req.params.therapistId || req.user?.id;
    if (!therapistId) return respond(res, 400, false, 'معرّف المعالج مطلوب');

    // جمع البيانات من كل الأنظمة
    const [aiTrends, alerts, qaStats, schedStats] = await Promise.allSettled([
      aiService?.getAssessmentTrends?.(therapistId) || Promise.resolve(null),
      alertsService?.getPendingAlerts?.(therapistId) || Promise.resolve([]),
      qaService?.getTherapistStats?.(therapistId) || Promise.resolve(null),
      schedService?.getWeeklySchedule?.(therapistId) || Promise.resolve(null),
    ]);

    // ملخص الخطط النشطة (من الذاكرة المحلية لهذا المثيل)
    const activePlans = planService
      ? Array.from(planService.plans.values()).filter(p => p.status !== 'completed').length
      : 0;

    return respond(res, 200, true, 'لوحة التحكم', {
      dashboard: {
        therapistId,
        activePlans,
        aiTrends: aiTrends.status === 'fulfilled' ? aiTrends.value : null,
        alerts: alerts.status === 'fulfilled' ? alerts.value : [],
        qaStats: qaStats.status === 'fulfilled' ? qaStats.value : null,
        schedule: schedStats.status === 'fulfilled' ? schedStats.value : null,
        templates: planService?.getAvailableTemplates() || [],
      },
    });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في لوحة التحكم', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 13. بنك الأهداف
// ────────────────────────────────────────────────────────────────────────────
exports.getGoalBank = async (req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const { domain, area } = req.query;
    const result = planService.getGoalsFromBank(domain || 'motorSkills', area);
    return respond(res, 200, true, 'تم استرجاع الأهداف', result);
  } catch (err) {
    return respond(res, 500, false, 'خطأ في استرجاع بنك الأهداف', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 14. جلسة تيلي-ريهاب مرتبطة بالخطة
// ────────────────────────────────────────────────────────────────────────────
exports.scheduleTeleSession = async (req, res) => {
  try {
    if (!teleService) return respond(res, 503, false, 'خدمة التيلي-ريهاب غير متاحة');
    const result = await teleService.scheduleSession?.({
      planId: req.params.planId,
      ...req.body,
    });
    return respond(res, 201, true, 'تمت جدولة الجلسة عن بُعد', { session: result });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في الجدولة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 15. إحصائيات الجودة والاعتماد
// ────────────────────────────────────────────────────────────────────────────
exports.getQualityMetrics = async (req, res) => {
  try {
    if (!qaService) return respond(res, 503, false, 'خدمة الجودة غير متاحة');
    const metrics = (await qaService.getPlanQualityMetrics?.(req.params.planId)) || {};
    return respond(res, 200, true, 'مؤشرات الجودة', { metrics });
  } catch (err) {
    return respond(res, 500, false, 'خطأ في مؤشرات الجودة', { error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 16. القوالب المتاحة
// ────────────────────────────────────────────────────────────────────────────
exports.getTemplates = async (_req, res) => {
  try {
    if (!planService) return respond(res, 503, false, 'الخدمة غير متاحة');
    const templates = planService.getAvailableTemplates();
    return respond(res, 200, true, 'القوالب المتاحة', { templates });
  } catch (err) {
    return respond(res, 500, false, 'خطأ', { error: err.message });
  }
};
