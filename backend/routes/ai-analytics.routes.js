/**
 * AI Analytics Routes — مسارات وحدة الذكاء الاصطناعي والتحليلات التنبؤية
 * Prompt 20: AI & Predictive Analytics Module
 *
 * Base: /api/ai-analytics
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Models
const AiPrediction = require('../models/AiPrediction');
const AiSuggestion = require('../models/AiSuggestion');
const AiAlert = require('../models/AiAlert');
const AiGeneratedReport = require('../models/AiGeneratedReport');
const AiModelConfig = require('../models/AiModelConfig');

// Auth middleware
router.use(authenticate);

// ─── Helper: safe try-catch wrapper ──────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم AI الرئيسية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/dashboard
 * لوحة الملخص الرئيسية
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const branchId = req.query.branch_id || req.user?.branch_id;
    const branchFilter = branchId ? { branch_id: branchId } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUnreadAlerts,
      criticalAlerts,
      urgentAlerts,
      warningAlerts,
      infoAlerts,
      recentAlerts,
      activePredictions,
      avgConfidence,
      atRiskCount,
      pendingSuggestions,
      acceptedThisMonth,
    ] = await Promise.all([
      AiAlert.countDocuments({
        ...branchFilter,
        is_read: false,
        is_dismissed: false,
        deleted_at: null,
      }),
      AiAlert.countDocuments({
        ...branchFilter,
        severity: 'critical',
        is_read: false,
        is_dismissed: false,
        deleted_at: null,
      }),
      AiAlert.countDocuments({
        ...branchFilter,
        severity: 'urgent',
        is_read: false,
        is_dismissed: false,
        deleted_at: null,
      }),
      AiAlert.countDocuments({
        ...branchFilter,
        severity: 'warning',
        is_read: false,
        is_dismissed: false,
        deleted_at: null,
      }),
      AiAlert.countDocuments({
        ...branchFilter,
        severity: 'info',
        is_read: false,
        is_dismissed: false,
        deleted_at: null,
      }),
      AiAlert.find({ ...branchFilter, is_read: false, is_dismissed: false, deleted_at: null })
        .sort({ created_at: -1 })
        .limit(10)
        .lean(),
      AiPrediction.countDocuments({ ...branchFilter, status: 'active', deleted_at: null }),
      AiPrediction.aggregate([
        { $match: { ...branchFilter, status: 'active' } },
        { $group: { _id: null, avg: { $avg: '$confidence' } } },
      ]),
      AiPrediction.countDocuments({
        ...branchFilter,
        status: 'active',
        prediction_type: 'progress',
        predicted_value: { $lt: 0.4 },
      }),
      AiSuggestion.countDocuments({ ...branchFilter, status: 'pending', deleted_at: null }),
      AiSuggestion.countDocuments({
        ...branchFilter,
        status: { $in: ['accepted', 'partially_accepted'] },
        reviewed_at: { $gte: startOfMonth },
        deleted_at: null,
      }),
    ]);

    // نسبة القبول
    const totalReviewed = await AiSuggestion.countDocuments({
      ...branchFilter,
      status: { $in: ['accepted', 'partially_accepted', 'rejected'] },
      deleted_at: null,
    });
    const acceptanceRate =
      totalReviewed > 0 ? Math.round((acceptedThisMonth / totalReviewed) * 100 * 10) / 10 : 0;

    // KPI trends — آخر 6 أشهر
    const kpiTrends = await buildKpiTrends(branchId, 6);

    // التنبؤ المالي البسيط
    const financialPrediction = await buildFinancialPrediction(branchId);

    // دقة النموذج
    const progressModel = await AiModelConfig.findOne({ model_name: 'progress_predictor' }).lean();

    res.json({
      alerts: {
        total_unread: totalUnreadAlerts,
        critical: criticalAlerts,
        urgent: urgentAlerts,
        warning: warningAlerts,
        info: infoAlerts,
        recent: recentAlerts,
      },
      predictions: {
        total_active: activePredictions,
        avg_confidence: avgConfidence[0]?.avg
          ? Math.round(avgConfidence[0].avg * 10000) / 10000
          : null,
        accuracy_last_month: progressModel?.accuracy_score || null,
        at_risk_count: atRiskCount,
      },
      suggestions: {
        pending: pendingSuggestions,
        accepted_this_month: acceptedThisMonth,
        acceptance_rate: acceptanceRate,
      },
      financial: financialPrediction,
      kpi_trends: kpiTrends,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS — التنبيهات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/alerts
 * قائمة التنبيهات مع فلاتر
 */
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const {
      branch_id,
      alert_type,
      severity,
      is_read,
      target_type,
      page = 1,
      per_page = 20,
    } = req.query;

    const filter = { deleted_at: null };
    if (branch_id) filter.branch_id = branch_id;
    else if (req.user?.branch_id) filter.branch_id = req.user.branch_id;
    if (alert_type) filter.alert_type = alert_type;
    if (severity) filter.severity = severity;
    if (is_read !== undefined) filter.is_read = is_read === 'true';
    if (target_type) filter.target_type = target_type;

    const skip = (parseInt(page) - 1) * parseInt(per_page);

    const [alerts, total] = await Promise.all([
      AiAlert.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(per_page)).lean(),
      AiAlert.countDocuments(filter),
    ]);

    res.json({
      data: alerts,
      meta: {
        total,
        page: parseInt(page),
        per_page: parseInt(per_page),
        last_page: Math.ceil(total / parseInt(per_page)),
      },
    });
  })
);

/**
 * PUT /api/ai-analytics/alerts/:id/read
 * تحديد تنبيه كمقروء
 */
router.put(
  '/alerts/:id/read',
  asyncHandler(async (req, res) => {
    const alert = await AiAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });
    await alert.markAsRead(req.user._id || req.user.id);
    res.json({ message: 'تم تحديد التنبيه كمقروء', alert });
  })
);

/**
 * POST /api/ai-analytics/alerts/read-all
 * تحديد جميع التنبيهات كمقروءة
 */
router.post(
  '/alerts/read-all',
  asyncHandler(async (req, res) => {
    const branchId = req.query.branch_id || req.user?.branch_id;
    const filter = { is_read: false, deleted_at: null };
    if (branchId) filter.branch_id = branchId;

    const result = await AiAlert.updateMany(filter, {
      $set: {
        is_read: true,
        read_by: req.user._id || req.user.id,
        read_at: new Date(),
      },
    });

    res.json({ message: `تم قراءة ${result.modifiedCount} تنبيه`, count: result.modifiedCount });
  })
);

/**
 * POST /api/ai-analytics/alerts/:id/action
 * اتخاذ إجراء على تنبيه
 */
router.post(
  '/alerts/:id/action',
  asyncHandler(async (req, res) => {
    const { action, notes } = req.body;
    if (!action) return res.status(400).json({ message: 'الإجراء مطلوب' });

    const alert = await AiAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });

    await alert.takeAction(req.user._id || req.user.id, action, notes);
    res.json({ message: 'تم تسجيل الإجراء', alert });
  })
);

/**
 * DELETE /api/ai-analytics/alerts/:id
 * رفض/إخفاء تنبيه
 */
router.delete(
  '/alerts/:id',
  asyncHandler(async (req, res) => {
    const alert = await AiAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });
    await alert.dismiss();
    res.json({ message: 'تم إخفاء التنبيه' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// PREDICTIONS — التنبؤات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/predictions/beneficiary/:beneficiaryId
 * تنبؤات مستفيد معين
 */
router.get(
  '/predictions/beneficiary/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const predictions = await AiPrediction.find({
      beneficiary_id: req.params.beneficiaryId,
      deleted_at: null,
    })
      .sort({ prediction_date: -1 })
      .limit(20)
      .lean();
    res.json({ data: predictions });
  })
);

/**
 * POST /api/ai-analytics/predictions/request
 * طلب تنبؤ جديد لمستفيد
 */
router.post(
  '/predictions/request',
  asyncHandler(async (req, res) => {
    const { beneficiary_id } = req.body;
    if (!beneficiary_id) return res.status(400).json({ message: 'beneficiary_id مطلوب' });

    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(beneficiary_id).lean();
    if (!beneficiary) return res.status(404).json({ message: 'المستفيد غير موجود' });

    // جلب الجلسات والأهداف
    const DailySession = (() => {
      try {
        return require('../models/DailySession');
      } catch (_) {
        return null;
      }
    })();
    const Goal = (() => {
      try {
        return require('../models/Goal');
      } catch (_) {
        return null;
      }
    })();

    const sessions = DailySession ? await DailySession.find({ beneficiary_id }).lean() : [];
    const goals = Goal ? await Goal.find({ beneficiary_id }).lean() : [];

    const { predictProgress } = require('../services/ai/progressPrediction.service');
    const prediction = await predictProgress(beneficiary, null, sessions, [], goals);

    res.json({ message: 'تم توليد التنبؤ', prediction });
  })
);

/**
 * GET /api/ai-analytics/predictions
 * قائمة التنبؤات
 */
router.get(
  '/predictions',
  asyncHandler(async (req, res) => {
    const { branch_id, prediction_type, status, page = 1, per_page = 20 } = req.query;

    const filter = { deleted_at: null };
    if (branch_id) filter.branch_id = branch_id;
    else if (req.user?.branch_id) filter.branch_id = req.user.branch_id;
    if (prediction_type) filter.prediction_type = prediction_type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(per_page);
    const [predictions, total] = await Promise.all([
      AiPrediction.find(filter)
        .sort({ prediction_date: -1 })
        .skip(skip)
        .limit(parseInt(per_page))
        .populate('beneficiary_id', 'full_name name_ar')
        .lean(),
      AiPrediction.countDocuments(filter),
    ]);

    res.json({
      data: predictions,
      meta: { total, page: parseInt(page), per_page: parseInt(per_page) },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTIONS — الاقتراحات الذكية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/suggestions
 * قائمة الاقتراحات
 */
router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const {
      status,
      beneficiary_id,
      suggestion_type,
      branch_id,
      page = 1,
      per_page = 20,
    } = req.query;

    const filter = { deleted_at: null };
    if (branch_id) filter.branch_id = branch_id;
    else if (req.user?.branch_id) filter.branch_id = req.user.branch_id;
    if (status) filter.status = status;
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (suggestion_type) filter.suggestion_type = suggestion_type;

    const skip = (parseInt(page) - 1) * parseInt(per_page);
    const [suggestions, total] = await Promise.all([
      AiSuggestion.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(per_page))
        .populate('beneficiary_id', 'full_name name_ar name_en')
        .lean(),
      AiSuggestion.countDocuments(filter),
    ]);

    res.json({
      data: suggestions,
      meta: { total, page: parseInt(page), per_page: parseInt(per_page) },
    });
  })
);

/**
 * POST /api/ai-analytics/suggestions/:id/review
 * قبول/رفض اقتراح
 */
router.post(
  '/suggestions/:id/review',
  asyncHandler(async (req, res) => {
    const { action, notes, accepted_items } = req.body;
    if (!action) return res.status(400).json({ message: 'action مطلوب' });

    const suggestion = await AiSuggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'الاقتراح غير موجود' });

    const userId = req.user._id || req.user.id;
    if (action === 'reject') {
      await suggestion.reject(userId, notes || '');
    } else {
      await suggestion.accept(userId, action === 'partial' ? accepted_items : null, notes);
    }

    res.json({ message: 'تمت المراجعة', suggestion });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS — التقارير المولّدة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/reports
 * قائمة التقارير
 */
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { beneficiary_id, report_type, status, branch_id, page = 1, per_page = 20 } = req.query;

    const filter = { deleted_at: null };
    if (branch_id) filter.branch_id = branch_id;
    else if (req.user?.branch_id) filter.branch_id = req.user.branch_id;
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (report_type) filter.report_type = report_type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(per_page);
    const [reports, total] = await Promise.all([
      AiGeneratedReport.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(per_page))
        .populate('beneficiary_id', 'full_name name_ar name_en')
        .lean(),
      AiGeneratedReport.countDocuments(filter),
    ]);

    res.json({
      data: reports,
      meta: { total, page: parseInt(page), per_page: parseInt(per_page) },
    });
  })
);

/**
 * GET /api/ai-analytics/reports/:id
 * تفاصيل تقرير
 */
router.get(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const report = await AiGeneratedReport.findById(req.params.id)
      .populate('beneficiary_id', 'full_name name_ar name_en')
      .lean();
    if (!report) return res.status(404).json({ message: 'التقرير غير موجود' });
    res.json({ data: report });
  })
);

/**
 * POST /api/ai-analytics/reports/generate
 * توليد تقرير شهري بالذكاء الاصطناعي
 */
router.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const { beneficiary_id, month, language = 'ar' } = req.body;
    if (!beneficiary_id || !month) {
      return res.status(400).json({ message: 'beneficiary_id و month مطلوبان' });
    }

    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(beneficiary_id).lean();
    if (!beneficiary) return res.status(404).json({ message: 'المستفيد غير موجود' });

    const { generateMonthlyParentReport } = require('../services/ai/smartReport.service');
    const report = await generateMonthlyParentReport(beneficiary, month, language);

    res.json({ message: 'تم توليد التقرير', report });
  })
);

/**
 * PUT /api/ai-analytics/reports/:id/approve
 * الموافقة على تقرير
 */
router.put(
  '/reports/:id/approve',
  asyncHandler(async (req, res) => {
    const report = await AiGeneratedReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'التقرير غير موجود' });
    report.status = 'approved';
    report.approved_by = req.user._id || req.user.id;
    report.approved_at = new Date();
    await report.save();
    res.json({ message: 'تمت الموافقة على التقرير', report });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL ANALYSIS — التحليل السلوكي
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/ai-analytics/analyze/beneficiary/:beneficiaryId
 * تحليل الأنماط السلوكية لمستفيد
 */
router.post(
  '/analyze/beneficiary/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;

    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(beneficiaryId).lean();
    if (!beneficiary) return res.status(404).json({ message: 'المستفيد غير موجود' });

    const DailySession = (() => {
      try {
        return require('../models/DailySession');
      } catch (_) {
        return null;
      }
    })();
    const sessions = DailySession
      ? await DailySession.find({ beneficiary_id: beneficiaryId }).lean()
      : [];

    const { analyzeBeneficiary } = require('../services/ai/behavioralPattern.service');
    const patterns = await analyzeBeneficiary(beneficiary, sessions);

    res.json({ message: 'تم التحليل', patterns });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE OPTIMIZATION — تحسين الجدولة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/ai-analytics/schedule/optimize
 * اقتراح جدول أسبوعي محسّن باستخدام خوارزمية Greedy + Constraint Satisfaction
 */
router.post(
  '/schedule/optimize',
  asyncHandler(async (req, res) => {
    const { branch_id, week_start, constraints = {} } = req.body;
    if (!branch_id || !week_start) {
      return res.status(400).json({ message: 'branch_id و week_start مطلوبان' });
    }

    const weekStartDate = new Date(week_start);
    if (isNaN(weekStartDate.getTime())) {
      return res.status(400).json({ message: 'تنسيق التاريخ غير صحيح' });
    }

    const Beneficiary = require('../models/Beneficiary');
    const Appointment = require('../models/Appointment');
    const User = (() => {
      try {
        return require('../models/User');
      } catch (_) {
        return null;
      }
    })();

    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [activeBeneficiaries, existingAppointments, specialists] = await Promise.all([
      Beneficiary.find({ branch_id, status: 'active', deleted_at: null })
        .select(
          '_id name_ar full_name disability_severity disability_type status branch_id preferred_time required_specialty'
        )
        .lean(),
      Appointment.find({
        branch_id,
        appointment_date: { $gte: weekStartDate, $lte: weekEnd },
        status: { $ne: 'cancelled' },
      }).lean(),
      User
        ? User.find({ branch_id, is_active: true, deleted_at: null })
            .select('_id name_ar name specialties availability max_caseload current_caseload')
            .lean()
        : Promise.resolve([]),
    ]);

    const {
      optimizeWeeklySchedule,
      generateScheduleSummaryAr,
    } = require('../services/ai/scheduleOptimizer.service');

    const result = optimizeWeeklySchedule({
      branchId: branch_id,
      weekStart: weekStartDate,
      beneficiaries: activeBeneficiaries,
      specialists,
      existingAppointments,
      constraints,
    });

    res.json({
      message: generateScheduleSummaryAr(result),
      data: result,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// SMART PLAN SUGGESTION — اقتراح الخطة العلاجية الذكية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/ai-analytics/suggest-plan
 * اقتراح خطة علاجية بناءً على حالات مشابهة
 */
router.post(
  '/suggest-plan',
  asyncHandler(async (req, res) => {
    const { beneficiary_id, assessment_id } = req.body;
    if (!beneficiary_id) {
      return res.status(400).json({ message: 'beneficiary_id مطلوب' });
    }

    const Beneficiary = require('../models/Beneficiary');
    const beneficiary = await Beneficiary.findById(beneficiary_id).lean();
    if (!beneficiary) return res.status(404).json({ message: 'المستفيد غير موجود' });

    // جلب التقييم إن وُجد
    let assessment = null;
    if (assessment_id) {
      const Assessment = (() => {
        try {
          return require('../models/Assessment');
        } catch (_) {
          return null;
        }
      })();
      if (Assessment) {
        assessment = await Assessment.findById(assessment_id).lean();
      }
    }

    const {
      findSimilarBeneficiaries,
      fetchSuccessfulGoals,
      suggestPlan,
    } = require('../services/ai/smartPlanSuggestion.service');

    const Goal = (() => {
      try {
        return require('../models/Goal');
      } catch (_) {
        return null;
      }
    })();

    const similarBeneficiaries = await findSimilarBeneficiaries(beneficiary, Beneficiary);
    const successfulGoals = await fetchSuccessfulGoals(similarBeneficiaries, Goal);
    const suggestion = await suggestPlan(
      beneficiary,
      assessment,
      similarBeneficiaries,
      successfulGoals
    );

    res.json({
      message: 'تم توليد اقتراح الخطة العلاجية',
      suggestion,
      similar_cases_found: similarBeneficiaries.length,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CONFIGS — إعدادات النماذج
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/models
 * قائمة إعدادات نماذج AI
 */
router.get(
  '/models',
  asyncHandler(async (req, res) => {
    const models = await AiModelConfig.find().lean();
    res.json({ data: models });
  })
);

/**
 * PUT /api/ai-analytics/models/:id
 * تحديث إعدادات نموذج
 */
router.put(
  '/models/:id',
  asyncHandler(async (req, res) => {
    const { parameters, is_active, auto_retrain, retrain_frequency } = req.body;
    const config = await AiModelConfig.findById(req.params.id);
    if (!config) return res.status(404).json({ message: 'النموذج غير موجود' });

    if (parameters !== undefined) config.parameters = parameters;
    if (is_active !== undefined) config.is_active = is_active;
    if (auto_retrain !== undefined) config.auto_retrain = auto_retrain;
    if (retrain_frequency !== undefined) config.retrain_frequency = retrain_frequency;

    await config.save();
    res.json({ message: 'تم التحديث', config });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL CHECKS — تشغيل الفحوصات يدوياً
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/ai-analytics/run-checks
 * تشغيل فحوصات AI يدوياً (للمدراء)
 */
router.post(
  '/run-checks',
  asyncHandler(async (req, res) => {
    const { branch_id } = req.body;
    const { runAllChecks } = require('../services/ai/proactiveAlerts.service');
    const results = await runAllChecks(branch_id || null);
    res.json({ message: 'تم تشغيل الفحوصات', results });
  })
);

/**
 * POST /api/ai-analytics/validate-predictions
 * التحقق من دقة التنبؤات السابقة
 */
router.post(
  '/validate-predictions',
  asyncHandler(async (req, res) => {
    const { validatePastPredictions } = require('../services/ai/progressPrediction.service');
    const Goal = (() => {
      try {
        return require('../models/Goal');
      } catch (_) {
        return null;
      }
    })();
    const validated = await validatePastPredictions(null, Goal || { find: async () => [] });
    res.json({ message: 'تم التحقق من التنبؤات', validated_count: validated });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS — إحصاءات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/ai-analytics/stats
 * إحصاءات شاملة
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const branchId = req.query.branch_id || req.user?.branch_id;
    const branchFilter = branchId ? { branch_id: branchId } : {};

    const [alertsByType, alertsBySeverity, predictionsByType, suggestionsByStatus] =
      await Promise.all([
        AiAlert.aggregate([
          { $match: { ...branchFilter, deleted_at: null } },
          { $group: { _id: '$alert_type', count: { $sum: 1 } } },
        ]),
        AiAlert.aggregate([
          { $match: { ...branchFilter, deleted_at: null } },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        AiPrediction.aggregate([
          { $match: { ...branchFilter, deleted_at: null } },
          {
            $group: {
              _id: '$prediction_type',
              count: { $sum: 1 },
              avg_confidence: { $avg: '$confidence' },
            },
          },
        ]),
        AiSuggestion.aggregate([
          { $match: { ...branchFilter, deleted_at: null } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      alerts_by_type: alertsByType,
      alerts_by_severity: alertsBySeverity,
      predictions_by_type: predictionsByType,
      suggestions_by_status: suggestionsByStatus,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function buildKpiTrends(branchId, monthsBack) {
  const trends = [];
  const DailySession = (() => {
    try {
      return require('../models/DailySession');
    } catch (_) {
      return null;
    }
  })();
  const Beneficiary = require('../models/Beneficiary');

  for (let i = monthsBack - 1; i >= 0; i--) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const branchFilter = branchId ? { branch_id: branchId } : {};

    let totalSessions = 0;
    let attendedSessions = 0;
    let avgPerformance = 0;

    if (DailySession) {
      const sessions = await DailySession.find({
        ...branchFilter,
        $or: [{ session_date: { $gte: start, $lte: end } }, { date: { $gte: start, $lte: end } }],
      }).lean();

      totalSessions = sessions.length;
      attendedSessions = sessions.filter(
        s => s.attendance_status === 'attended' || s.status === 'completed'
      ).length;
      const perf = sessions.filter(s => s.performance_score).map(s => s.performance_score);
      avgPerformance =
        perf.length > 0 ? Math.round((perf.reduce((a, b) => a + b, 0) / perf.length) * 10) / 10 : 0;
    }

    const activeBeneficiaries = await Beneficiary.countDocuments({
      ...branchFilter,
      status: 'active',
      created_at: { $lte: end },
      deleted_at: null,
    });

    trends.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
      total_sessions: totalSessions,
      attendance_rate:
        totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100 * 10) / 10 : 0,
      avg_performance: avgPerformance,
      active_beneficiaries: activeBeneficiaries,
    });
  }

  return trends;
}

async function buildFinancialPrediction(branchId) {
  try {
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const Appointment = require('../models/Appointment');

    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

    const scheduledNextMonth = await Appointment.countDocuments({
      ...branchFilter,
      appointment_date: { $gte: nextMonthStart, $lte: nextMonthEnd },
      status: { $ne: 'cancelled' },
    });

    return {
      next_month_scheduled_sessions: scheduledNextMonth,
      expected_attendance_rate: 80,
      note: 'تقدير تقريبي بناءً على المواعيد المجدولة',
    };
  } catch (_) {
    return { next_month_scheduled_sessions: 0, expected_attendance_rate: 80 };
  }
}

// Error handler
router.use((err, req, res, _next) => {
  logger.error('AI Analytics route error', { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
});

module.exports = router;
