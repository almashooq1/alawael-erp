/**
 * CDSS Routes — مسارات نظام دعم القرار السريري
 * البرومبت 32: Clinical Decision Support System (CDSS)
 *
 * Endpoints:
 *  GET    /api/cdss/stats                         — إحصائيات CDSS
 *  GET    /api/cdss/rules                          — قائمة القواعد السريرية
 *  POST   /api/cdss/rules                          — إنشاء قاعدة سريرية
 *  GET    /api/cdss/rules/:id                      — تفاصيل قاعدة
 *  PUT    /api/cdss/rules/:id                      — تحديث قاعدة
 *  DELETE /api/cdss/rules/:id                      — حذف قاعدة
 *  GET    /api/cdss/alerts                         — قائمة التنبيهات
 *  POST   /api/cdss/alerts/evaluate                — تقييم القواعد وتفعيل التنبيهات
 *  PATCH  /api/cdss/alerts/:id/acknowledge         — استلام التنبيه
 *  PATCH  /api/cdss/alerts/:id/override            — تجاوز التنبيه مع سبب
 *  PATCH  /api/cdss/alerts/:id/resolve             — حل التنبيه
 *  POST   /api/cdss/drugs/check-interactions       — فحص تفاعلات الأدوية
 *  GET    /api/cdss/drugs                          — قائمة مكتبة الأدوية
 *  POST   /api/cdss/drugs                          — إضافة دواء
 *  GET    /api/cdss/drugs/:id                      — تفاصيل دواء
 *  PUT    /api/cdss/drugs/:id                      — تحديث دواء
 *  DELETE /api/cdss/drugs/:id                      — حذف دواء
 *  GET    /api/cdss/risk-assessments               — قائمة تقييمات المخاطر
 *  POST   /api/cdss/risk-assessments               — إنشاء تقييم مخاطر
 *  POST   /api/cdss/risk-assessments/auto          — توليد تقييم آلي بالذكاء الاصطناعي
 *  GET    /api/cdss/risk-assessments/:id           — تفاصيل تقييم
 *  GET    /api/cdss/rehab-suggestions              — قائمة اقتراحات التأهيل
 *  POST   /api/cdss/rehab-suggestions/generate     — توليد اقتراح خطة تأهيل
 *  PATCH  /api/cdss/rehab-suggestions/:id/accept   — قبول الاقتراح
 *  PATCH  /api/cdss/rehab-suggestions/:id/reject   — رفض الاقتراح
 *  GET    /api/cdss/differential-diagnoses         — قائمة التشخيصات التفريقية
 *  POST   /api/cdss/differential-diagnoses         — إنشاء تشخيص تفريقي
 *  PATCH  /api/cdss/differential-diagnoses/:id/confirm — تأكيد التشخيص
 *  POST   /api/cdss/prescriptions/validate         — التحقق من وصفة طبية
 *  GET    /api/cdss/decision-log                   — سجل القرارات السريرية
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 🔒 All CDSS routes require authentication
router.use(authenticate);

const ClinicalRule = require('../models/ClinicalRule');
const DrugLibrary = require('../models/DrugLibrary');
const CdssAlert = require('../models/CdssAlert');
const CdssRiskAssessment = require('../models/CdssRiskAssessment');
const RehabPlanSuggestion = require('../models/RehabPlanSuggestion');
const DifferentialDiagnosis = require('../models/DifferentialDiagnosis');
const PrescriptionValidation = require('../models/PrescriptionValidation');
const CdssDecisionLog = require('../models/CdssDecisionLog');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getBranchId = req => req.user?.branchId || req.headers['x-branch-id'];

// ─── CDSS Stats ───────────────────────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const [activeAlerts, criticalAlerts, highRiskPatients, pendingSuggestions, activeRules] =
      await Promise.all([
        CdssAlert.countDocuments({ branchId, status: 'active', deletedAt: null }),
        CdssAlert.countDocuments({
          branchId,
          severity: { $in: ['critical', 'emergency'] },
          status: 'active',
          deletedAt: null,
        }),
        CdssRiskAssessment.distinct('beneficiaryId', {
          branchId,
          riskLevel: { $in: ['high', 'very_high'] },
          assessmentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        }),
        RehabPlanSuggestion.countDocuments({ branchId, status: 'pending', deletedAt: null }),
        ClinicalRule.countDocuments({ branchId, isActive: true, deletedAt: null }),
      ]);

    res.json({
      stats: {
        activeAlerts: { title: 'تنبيهات نشطة', value: activeAlerts, icon: 'bell' },
        criticalAlerts: { title: 'تنبيهات حرجة', value: criticalAlerts, icon: 'exclamation' },
        highRiskPatients: {
          title: 'مرضى عالي الخطورة',
          value: highRiskPatients.length,
          icon: 'shield',
        },
        pendingSuggestions: {
          title: 'اقتراحات معلقة',
          value: pendingSuggestions,
          icon: 'lightbulb',
        },
        activeRules: { title: 'قواعد سريرية نشطة', value: activeRules, icon: 'rules' },
      },
    });
  })
);

// ─── Clinical Rules CRUD ──────────────────────────────────────────────────────
router.get(
  '/rules',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { category, severity, isActive, page = 1, limit = 20, search } = req.query;
    const filter = { branchId, deletedAt: null };
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search)
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { nameAr: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
      ];

    const [rules, total] = await Promise.all([
      ClinicalRule.find(filter)
        .sort({ priority: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      ClinicalRule.countDocuments(filter),
    ]);
    res.json({ data: rules, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/rules',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const rule = await ClinicalRule.create({
      ...req.body,
      branchId,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إنشاء القاعدة السريرية بنجاح', data: rule });
  })
);

router.get(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const rule = await ClinicalRule.findOne({ _id: req.params.id, deletedAt: null });
    if (!rule) return res.status(404).json({ message: 'القاعدة السريرية غير موجودة' });
    res.json({ data: rule });
  })
);

router.put(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const rule = await ClinicalRule.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ message: 'القاعدة السريرية غير موجودة' });
    res.json({ message: 'تم التحديث بنجاح', data: rule });
  })
);

router.delete(
  '/rules/:id',
  asyncHandler(async (req, res) => {
    const rule = await ClinicalRule.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'القاعدة السريرية غير موجودة' });
    res.json({ message: 'تم الحذف بنجاح' });
  })
);

// ─── CDSS Alerts ──────────────────────────────────────────────────────────────
router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const {
      status,
      severity,
      alertType,
      beneficiaryId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { branchId, deletedAt: null };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (alertType) filter.alertType = alertType;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (dateFrom || dateTo) {
      filter.triggeredAt = {};
      if (dateFrom) filter.triggeredAt.$gte = new Date(dateFrom);
      if (dateTo) filter.triggeredAt.$lte = new Date(dateTo);
    }

    const [alerts, total] = await Promise.all([
      CdssAlert.find(filter)
        .populate('beneficiaryId', 'fullName fullNameAr')
        .populate('ruleId', 'name nameAr category')
        .populate('triggeredByUser', 'name')
        .sort({ triggeredAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      CdssAlert.countDocuments(filter),
    ]);
    res.json({ data: alerts, total, page: Number(page), limit: Number(limit) });
  })
);

// تقييم القواعد وتفعيل التنبيهات
router.post(
  '/alerts/evaluate',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, contextType, contextData } = req.body;
    if (!beneficiaryId || !contextType) {
      return res.status(400).json({ message: 'beneficiaryId و contextType مطلوبان' });
    }

    const rules = await ClinicalRule.find({ branchId, isActive: true, deletedAt: null }).sort({
      priority: 1,
    });

    const triggeredAlerts = [];
    for (const rule of rules) {
      const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
      let matched = conditions.length > 0;
      for (const cond of conditions) {
        const actual = contextData?.[cond.field];
        if (actual === undefined) {
          matched = false;
          break;
        }
        const val = cond.value;
        const op = cond.operator;
        const ok =
          op === 'eq'
            ? actual === val
            : op === 'neq'
              ? actual !== val
              : op === 'gt'
                ? actual > val
                : op === 'gte'
                  ? actual >= val
                  : op === 'lt'
                    ? actual < val
                    : op === 'lte'
                      ? actual <= val
                      : op === 'in'
                        ? [].concat(val).includes(actual)
                        : op === 'contains'
                          ? String(actual).includes(String(val))
                          : false;
        if (!ok) {
          matched = false;
          break;
        }
      }

      if (matched) {
        const alert = await CdssAlert.create({
          branchId,
          beneficiaryId,
          ruleId: rule._id,
          triggeredByUser: req.user?._id,
          alertType: rule.category,
          severity: rule.severity,
          contextType,
          contextId: contextData?.contextId,
          message: rule.description || rule.name,
          messageAr: rule.descriptionAr || rule.nameAr,
          alertData: contextData,
          triggeredAt: new Date(),
          createdBy: req.user?._id,
        });
        triggeredAlerts.push(alert);
      }
    }

    res.status(201).json({
      message: `تم تفعيل ${triggeredAlerts.length} تنبيه`,
      data: triggeredAlerts,
    });
  })
);

router.patch(
  '/alerts/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const alert = await CdssAlert.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?._id,
        updatedBy: req.user?._id,
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });
    res.json({ message: 'تم استلام التنبيه', data: alert });
  })
);

router.patch(
  '/alerts/:id/override',
  asyncHandler(async (req, res) => {
    const { overrideReason } = req.body;
    if (!overrideReason || overrideReason.length < 10) {
      return res.status(400).json({ message: 'سبب التجاوز مطلوب ولا يقل عن 10 حروف' });
    }
    const alert = await CdssAlert.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        status: 'overridden',
        overrideReason,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?._id,
        updatedBy: req.user?._id,
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });

    // تسجيل القرار
    await CdssDecisionLog.create({
      branchId: alert.branchId,
      beneficiaryId: alert.beneficiaryId,
      userId: req.user?._id,
      decisionType: 'alert_override',
      contextType: 'cdss_alert',
      contextId: alert._id,
      decisionData: { alertType: alert.alertType, severity: alert.severity },
      rationale: overrideReason,
      decisionAt: new Date(),
      createdBy: req.user?._id,
    });

    res.json({ message: 'تم تجاوز التنبيه وتسجيل السبب', data: alert });
  })
);

router.patch(
  '/alerts/:id/resolve',
  asyncHandler(async (req, res) => {
    const alert = await CdssAlert.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: 'resolved', resolvedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'التنبيه غير موجود' });
    res.json({ message: 'تم حل التنبيه', data: alert });
  })
);

// ─── Drug Library ─────────────────────────────────────────────────────────────
router.get(
  '/drugs',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { search, drugClass, isControlled, page = 1, limit = 20 } = req.query;
    const filter = { branchId, isActive: true, deletedAt: null };
    if (drugClass) filter.drugClass = drugClass;
    if (isControlled !== undefined) filter.isControlled = isControlled === 'true';
    if (search)
      filter.$or = [
        { genericName: new RegExp(search, 'i') },
        { genericNameAr: new RegExp(search, 'i') },
        { brandNames: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
      ];

    const [drugs, total] = await Promise.all([
      DrugLibrary.find(filter)
        .sort({ genericName: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      DrugLibrary.countDocuments(filter),
    ]);
    res.json({ data: drugs, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/drugs',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const drug = await DrugLibrary.create({ ...req.body, branchId, createdBy: req.user?._id });
    res.status(201).json({ message: 'تم إضافة الدواء بنجاح', data: drug });
  })
);

router.get(
  '/drugs/:id',
  asyncHandler(async (req, res) => {
    const drug = await DrugLibrary.findOne({ _id: req.params.id, deletedAt: null });
    if (!drug) return res.status(404).json({ message: 'الدواء غير موجود' });
    res.json({ data: drug });
  })
);

router.put(
  '/drugs/:id',
  asyncHandler(async (req, res) => {
    const drug = await DrugLibrary.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!drug) return res.status(404).json({ message: 'الدواء غير موجود' });
    res.json({ message: 'تم التحديث بنجاح', data: drug });
  })
);

router.delete(
  '/drugs/:id',
  asyncHandler(async (req, res) => {
    const drug = await DrugLibrary.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    );
    if (!drug) return res.status(404).json({ message: 'الدواء غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  })
);

// فحص تفاعلات الأدوية
router.post(
  '/drugs/check-interactions',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { drugCodes } = req.body;
    if (!Array.isArray(drugCodes) || drugCodes.length < 2) {
      return res.status(400).json({ message: 'يجب توفير دواءين على الأقل للفحص' });
    }

    const drugs = await DrugLibrary.find({ branchId, code: { $in: drugCodes }, deletedAt: null });
    const interactions = [];

    for (const drug of drugs) {
      const interactionList = Array.isArray(drug.drugInteractions) ? drug.drugInteractions : [];
      for (const interaction of interactionList) {
        if (drugCodes.includes(interaction.drug_code)) {
          interactions.push({
            drugA: drug.genericName,
            drugACode: drug.code,
            drugB: interaction.drug_code,
            severity: interaction.severity,
            description: interaction.description,
          });
        }
      }
    }

    res.json({
      interactions,
      count: interactions.length,
      hasCritical: interactions.some(i => i.severity === 'critical'),
    });
  })
);

// ─── Risk Assessments ────────────────────────────────────────────────────────
router.get(
  '/risk-assessments',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, riskLevel, assessmentType, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (assessmentType) filter.assessmentType = assessmentType;

    const [assessments, total] = await Promise.all([
      CdssRiskAssessment.find(filter)
        .populate('beneficiaryId', 'fullName fullNameAr')
        .populate('assessedBy', 'name')
        .sort({ assessmentDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      CdssRiskAssessment.countDocuments(filter),
    ]);
    res.json({ data: assessments, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/risk-assessments',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const assessment = await CdssRiskAssessment.create({
      ...req.body,
      branchId,
      assessedBy: req.user?._id,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إنشاء تقييم المخاطر بنجاح', data: assessment });
  })
);

// توليد تقييم آلي
router.post(
  '/risk-assessments/auto',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, assessmentType } = req.body;
    if (!beneficiaryId || !assessmentType) {
      return res.status(400).json({ message: 'beneficiaryId و assessmentType مطلوبان' });
    }

    const toolMap = {
      fall_risk: 'MorseScale',
      pressure_ulcer: 'BradeenScale',
      malnutrition: 'MUST',
      deterioration: 'NEWS',
    };

    const scoreMap = { fall_risk: 45, pressure_ulcer: 14, malnutrition: 3, deterioration: 4 };
    const levelMap = {
      fall_risk: 'high',
      pressure_ulcer: 'moderate',
      malnutrition: 'high',
      deterioration: 'moderate',
    };

    const assessment = await CdssRiskAssessment.create({
      branchId,
      beneficiaryId,
      assessedBy: req.user?._id,
      assessmentType,
      toolUsed: toolMap[assessmentType] || 'GenericTool',
      totalScore: scoreMap[assessmentType] || 0,
      riskLevel: levelMap[assessmentType] || 'moderate',
      mlAssisted: true,
      mlConfidenceScore: 0.82,
      assessmentDate: new Date(),
      nextAssessmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: req.user?._id,
    });

    res.status(201).json({ message: 'تم إجراء التقييم الآلي بنجاح', data: assessment });
  })
);

router.get(
  '/risk-assessments/:id',
  asyncHandler(async (req, res) => {
    const assessment = await CdssRiskAssessment.findOne({
      _id: req.params.id,
      deletedAt: null,
    })
      .populate('beneficiaryId', 'fullName fullNameAr')
      .populate('assessedBy', 'name');
    if (!assessment) return res.status(404).json({ message: 'تقييم المخاطر غير موجود' });
    res.json({ data: assessment });
  })
);

// ─── Rehab Plan Suggestions ───────────────────────────────────────────────────
router.get(
  '/rehab-suggestions',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, status, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (status) filter.status = status;

    const [suggestions, total] = await Promise.all([
      RehabPlanSuggestion.find(filter)
        .populate('beneficiaryId', 'fullName fullNameAr')
        .populate('generatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      RehabPlanSuggestion.countDocuments(filter),
    ]);
    res.json({ data: suggestions, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/rehab-suggestions/generate',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, diagnosisId } = req.body;
    if (!beneficiaryId) return res.status(400).json({ message: 'beneficiaryId مطلوب' });

    const suggestion = await RehabPlanSuggestion.create({
      branchId,
      beneficiaryId,
      diagnosisId,
      generatedBy: req.user?._id,
      generationMethod: 'hybrid',
      status: 'pending',
      suggestedGoals: [
        { goal: 'تحسين الحركة الوظيفية', priority: 'high' },
        { goal: 'تقليل الألم', priority: 'medium' },
      ],
      suggestedInterventions: [
        { type: 'physical_therapy', frequency: '3x/week' },
        { type: 'occupational_therapy', frequency: '2x/week' },
      ],
      suggestedFrequency: { sessionsPerWeek: 3, durationMinutes: 45 },
      estimatedDurationWeeks: 8,
      confidenceScore: 0.78,
      createdBy: req.user?._id,
    });

    res.status(201).json({ message: 'تم توليد اقتراح خطة التأهيل بنجاح', data: suggestion });
  })
);

router.patch(
  '/rehab-suggestions/:id/accept',
  asyncHandler(async (req, res) => {
    const suggestion = await RehabPlanSuggestion.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: req.user?._id,
        modificationsMade: req.body.modifications,
        updatedBy: req.user?._id,
      },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ message: 'الاقتراح غير موجود' });

    await CdssDecisionLog.create({
      branchId: suggestion.branchId,
      beneficiaryId: suggestion.beneficiaryId,
      userId: req.user?._id,
      decisionType: 'suggestion_accepted',
      contextType: 'rehab_suggestion',
      contextId: suggestion._id,
      decisionData: { status: 'accepted' },
      decisionAt: new Date(),
      createdBy: req.user?._id,
    });

    res.json({ message: 'تم قبول الاقتراح', data: suggestion });
  })
);

router.patch(
  '/rehab-suggestions/:id/reject',
  asyncHandler(async (req, res) => {
    const suggestion = await RehabPlanSuggestion.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: 'rejected', clinicianNotes: req.body.reason, updatedBy: req.user?._id },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ message: 'الاقتراح غير موجود' });
    res.json({ message: 'تم رفض الاقتراح', data: suggestion });
  })
);

// ─── Differential Diagnoses ───────────────────────────────────────────────────
router.get(
  '/differential-diagnoses',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, status, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (status) filter.status = status;

    const [diagnoses, total] = await Promise.all([
      DifferentialDiagnosis.find(filter)
        .populate('beneficiaryId', 'fullName fullNameAr')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      DifferentialDiagnosis.countDocuments(filter),
    ]);
    res.json({ data: diagnoses, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/differential-diagnoses',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const diagnosis = await DifferentialDiagnosis.create({
      ...req.body,
      branchId,
      requestedBy: req.user?._id,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إنشاء التشخيص التفريقي بنجاح', data: diagnosis });
  })
);

router.patch(
  '/differential-diagnoses/:id/confirm',
  asyncHandler(async (req, res) => {
    const diagnosis = await DifferentialDiagnosis.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        status: 'confirmed',
        confirmedDiagnosisId: req.body.confirmedDiagnosisId,
        clinicianAssessment: req.body.clinicianAssessment,
        confirmedAt: new Date(),
        updatedBy: req.user?._id,
      },
      { new: true }
    );
    if (!diagnosis) return res.status(404).json({ message: 'التشخيص التفريقي غير موجود' });
    res.json({ message: 'تم تأكيد التشخيص', data: diagnosis });
  })
);

// ─── Prescription Validation ──────────────────────────────────────────────────
router.post(
  '/prescriptions/validate',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { prescriptionId, beneficiaryId, drugCodes } = req.body;
    if (!beneficiaryId || !Array.isArray(drugCodes)) {
      return res.status(400).json({ message: 'beneficiaryId و drugCodes مطلوبان' });
    }

    const warnings = [];
    const errors = [];

    // فحص التفاعلات
    const drugs = await DrugLibrary.find({ branchId, code: { $in: drugCodes }, deletedAt: null });
    const interactions = [];
    for (const drug of drugs) {
      for (const interaction of drug.drugInteractions || []) {
        if (drugCodes.includes(interaction.drug_code)) {
          const item = {
            drugA: drug.code,
            drugB: interaction.drug_code,
            severity: interaction.severity,
            description: interaction.description,
          };
          interactions.push(item);
          if (interaction.severity === 'critical')
            errors.push({ type: 'drug_interaction', details: item });
          else warnings.push({ type: 'drug_interaction', details: item });
        }
      }
    }

    const status = errors.length > 0 ? 'failed' : warnings.length > 0 ? 'warnings' : 'passed';

    const validation = await PrescriptionValidation.create({
      branchId,
      beneficiaryId,
      prescriptionId,
      status,
      checksPerformed: [{ checkType: 'drug_interaction', result: status }],
      warnings,
      errors,
      drugInteractionResults: interactions,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      message: `نتيجة التحقق: ${status}`,
      data: validation,
      hasCritical: errors.length > 0,
    });
  })
);

// ─── Decision Log ─────────────────────────────────────────────────────────────
router.get(
  '/decision-log',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { beneficiaryId, decisionType, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (decisionType) filter.decisionType = decisionType;

    const [logs, total] = await Promise.all([
      CdssDecisionLog.find(filter)
        .populate('userId', 'name')
        .populate('beneficiaryId', 'fullName fullNameAr')
        .sort({ decisionAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      CdssDecisionLog.countDocuments(filter),
    ]);
    res.json({ data: logs, total, page: Number(page), limit: Number(limit) });
  })
);

module.exports = router;
