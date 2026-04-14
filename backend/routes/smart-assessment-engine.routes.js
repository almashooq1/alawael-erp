/**
 * smart-assessment-engine.routes.js
 * ═══════════════════════════════════════════════════════════════
 * محرك التقييم الذكي — Smart Clinical Assessment Engine API
 *
 * نظام متكامل يشمل:
 *   — 12 مقياس سريري حقيقي (M-CHAT, CARS-2, Sensory Profile, BRIEF-2, ...)
 *   — تصحيح تلقائي ذكي مع جداول معيارية
 *   — نظام دعم القرار السريري (بروتوكولات مبنية على الأدلة)
 *   — تحليل تقدم إحصائي احترافي (Cohen's d, RCI, اتجاهات)
 *   — بطارية تقييم مقترحة حسب العمر والتشخيص
 *   — جمع بيانات سلوك ABC في الوقت الحقيقي
 *   — تقييم جاهزية التخريج والانتقال
 *
 * ═══════════════════════════════════════════════════════════════
 * Endpoints:
 * ═══════════════════════════════════════════════════════════════
 *
 * Assessment CRUD:
 *   POST   /mchat                 — إنشاء تقييم M-CHAT-R/F (تصحيح تلقائي)
 *   POST   /cars2                 — إنشاء تقييم CARS-2 (تصحيح + تحليل أنماط)
 *   POST   /sensory-profile       — إنشاء تقييم الملف الحسي
 *   POST   /brief2                — إنشاء تقييم BRIEF-2
 *   POST   /srs2                  — إنشاء تقييم SRS-2
 *   POST   /portage               — إنشاء تقييم بورتاج
 *   POST   /abc-data              — إنشاء جلسة جمع بيانات ABC
 *   POST   /abc-data/:id/record   — إضافة سجل ABC
 *   POST   /abc-data/:id/analyze  — تحليل وظيفي للبيانات
 *   POST   /family-needs          — استبيان احتياجات الأسرة
 *   POST   /quality-of-life       — تقييم جودة الحياة
 *   POST   /transition            — تقييم جاهزية الانتقال
 *   POST   /saudi-screening       — الفحص النمائي السعودي
 *   POST   /behavioral-function   — تقييم وظيفة السلوك (FBA)
 *   POST   /caregiver-burden      — مقياس عبء مقدم الرعاية
 *
 * Smart Services:
 *   POST   /score/:scaleType      — تصحيح تلقائي لأي مقياس
 *   GET    /protocol/:diagnosis   — بروتوكول علاجي مبني على الأدلة
 *   GET    /battery/:ageMonths/:diagnosis — بطارية التقييم المقترحة
 *   POST   /goal-recommendations  — توصيات الأهداف بناءً على النتائج
 *   POST   /risk-check            — فحص المخاطر والتنبيهات
 *   POST   /discharge-readiness   — تقييم جاهزية التخريج
 *
 * Analytics:
 *   POST   /analytics/effect-size         — حجم الأثر (Cohen's d)
 *   POST   /analytics/rci                 — مؤشر التغيير الموثوق
 *   POST   /analytics/clinical-significance — الدلالة السريرية
 *   POST   /analytics/trend               — تحليل الاتجاه
 *   POST   /analytics/predict-goal        — التنبؤ بوصول الهدف
 *   POST   /analytics/benchmark           — المقارنة المعيارية
 *   POST   /analytics/progress-report     — تقرير تقدم شامل
 *   POST   /analytics/roi                 — عائد الاستثمار العلاجي
 *
 * Scale Library:
 *   GET    /scales                         — قائمة جميع المقاييس
 *   GET    /scales/:scaleId/items          — بنود مقياس محدد
 *
 * History:
 *   GET    /history/:beneficiaryId         — سجل جميع التقييمات
 *   GET    /history/:beneficiaryId/:type   — سجل مقياس محدد
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/* ─── Services ─────────────────────────────────────────────────────────── */
const SmartAssessmentEngine = require('../services/smart-assessment-engine');
const ClinicalDecisionSupport = require('../services/clinical-decision-support');
const ProgressAnalytics = require('../services/progress-analytics');
const AssessmentReportGenerator = require('../services/assessment-report-generator');

/* ─── Models ───────────────────────────────────────────────────────────── */
const {
  MChatAssessment,
  SensoryProfileAssessment,
  BRIEF2Assessment,
  SRS2Assessment,
  PortageAssessment,
  ABCDataCollection,
  FamilyNeedsSurvey,
  QualityOfLifeAssessment,
  TransitionReadinessAssessment,
  SaudiDevelopmentalScreening,
  BehavioralFunctionAssessment,
  CaregiverBurdenAssessment,
} = require('../models/clinical-assessment-battery.model');

/* ─── Middleware ────────────────────────────────────────────────────────── */
const { authenticateToken } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ══════════════════════════════════════════════════════════════
// ASSESSMENT CRUD ENDPOINTS
// ══════════════════════════════════════════════════════════════

// ─── M-CHAT-R/F ──────────────────────────────────────────────
router.post(
  '/mchat',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, informant, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreMCHAT(items);

    const assessment = await MChatAssessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      age_months,
      informant,
      items: scoring.items,
      total_risk_score: scoring.total_risk_score,
      critical_items_failed: scoring.critical_items_failed,
      risk_level: scoring.risk_level,
      risk_level_ar: scoring.risk_level_ar,
      auto_recommendations: scoring.auto_recommendations,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── CARS-2 ──────────────────────────────────────────────────
router.post(
  '/cars2',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, items, form_type, notes } = req.body;
    if (!beneficiary)
      return res.status(400).json({ success: false, message: 'حقل المستفيد مطلوب' });
    if (!items || typeof items !== 'object')
      return res.status(400).json({ success: false, message: 'بنود التقييم مطلوبة' });

    const scoring = SmartAssessmentEngine.scoreCARS2(items, form_type || 'ST');

    // ── حفظ في قاعدة البيانات (كان مفقوداً) ──
    const StandardAssessment = mongoose.models.StandardAssessment;
    let saved = null;
    if (StandardAssessment) {
      saved = await StandardAssessment.create({
        beneficiary,
        assessor: req.user?._id || req.user?.id,
        branch: req.user?.branch,
        assessment_type: 'CARS-2',
        form_type: form_type || 'ST',
        age_months,
        items,
        total_score: scoring.total_score,
        severity_classification: scoring.classification,
        severity_classification_ar: scoring.classification_ar,
        auto_scored: true,
        scoring_details: scoring,
        status: 'completed',
        notes,
      });
    }

    res.status(201).json({ success: true, data: saved, scoring });
  })
);

// ─── Sensory Profile 2 ──────────────────────────────────────
router.post(
  '/sensory-profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, respondent, form_type, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreSensoryProfile(items);

    const assessment = await SensoryProfileAssessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      age_months,
      respondent,
      form_type,
      items,
      section_scores: scoring.section_scores,
      quadrant_scores: scoring.quadrant_scores,
      sensory_profile_summary: scoring.sensory_profile_summary,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── BRIEF-2 ─────────────────────────────────────────────────
router.post(
  '/brief2',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, respondent, form_type, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreBRIEF2(items);

    const assessment = await BRIEF2Assessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      age_months,
      respondent,
      form_type,
      items,
      scale_scores: scoring.scale_scores,
      composite_scores: scoring.composite_scores,
      clinical_interpretation: scoring.clinical_interpretation,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── SRS-2 ───────────────────────────────────────────────────
router.post(
  '/srs2',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, respondent, form_type, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreSRS2(items);

    const assessment = await SRS2Assessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      age_months,
      respondent,
      form_type,
      items,
      subscale_scores: scoring.subscale_scores,
      total_raw_score: scoring.total_raw_score,
      total_t_score: scoring.total_t_score,
      severity_classification: scoring.severity_classification,
      severity_classification_ar: scoring.severity_classification_ar,
      dsm5_compatible: scoring.dsm5_compatible,
      auto_recommendations: scoring.auto_recommendations,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── Portage Guide ───────────────────────────────────────────
router.post(
  '/portage',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, age_months, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scorePortage(items, age_months);

    const assessment = await PortageAssessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      age_months,
      items,
      domain_summaries: scoring.domain_summaries,
      developmental_analysis: scoring.developmental_analysis,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── ABC Data Collection ─────────────────────────────────────
router.post(
  '/abc-data',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, target_behaviors, collection_period } = req.body;
    const collection = await ABCDataCollection.create({
      beneficiary,
      branch: req.user?.branch,
      target_behaviors,
      collection_period,
      records: [],
      status: 'active',
    });
    res.status(201).json({ success: true, data: collection });
  })
);

router.post(
  '/abc-data/:id/record',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const collection = await ABCDataCollection.findById(req.params.id);
    if (!collection)
      return res
        .status(404)
        .json({ success: false, message: 'لم يتم العثور على جلسة جمع البيانات' });

    collection.records.push({ ...req.body, recorded_by: req.user?._id || req.user?.id });
    await collection.save();
    res.json({ success: true, data: collection, records_count: collection.records.length });
  })
);

router.post(
  '/abc-data/:id/analyze',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const collection = await ABCDataCollection.findById(req.params.id);
    if (!collection)
      return res
        .status(404)
        .json({ success: false, message: 'لم يتم العثور على جلسة جمع البيانات' });

    const analysis = SmartAssessmentEngine.analyzeABCData(collection.records);
    collection.functional_analysis = analysis;
    collection.status = 'analyzed';
    collection.analyst = req.user?._id || req.user?.id;
    await collection.save();

    res.json({ success: true, data: collection, analysis });
  })
);

// ─── Family Needs Survey ─────────────────────────────────────
router.post(
  '/family-needs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const survey = await FamilyNeedsSurvey.create({
      ...req.body,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      status: 'completed',
    });
    res.status(201).json({ success: true, data: survey });
  })
);

// ─── Quality of Life ─────────────────────────────────────────
router.post(
  '/quality-of-life',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, respondent, domains, overall_qol, overall_health_satisfaction, notes } =
      req.body;
    const scoring = SmartAssessmentEngine.scoreQualityOfLife(domains);

    const assessment = await QualityOfLifeAssessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      respondent,
      domains,
      overall_qol,
      overall_health_satisfaction,
      total_transformed_score: scoring.total_transformed_score,
      interpretation: scoring.interpretation,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── Transition Readiness ────────────────────────────────────
router.post(
  '/transition',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, transition_type, domains, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreTransitionReadiness(domains);

    const assessment = await TransitionReadinessAssessment.create({
      beneficiary,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      transition_type,
      domains: scoring.domains,
      overall_readiness: scoring.overall_readiness,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ─── Saudi Developmental Screening ───────────────────────────
router.post(
  '/saudi-screening',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const screening = await SaudiDevelopmentalScreening.create({
      ...req.body,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      status: 'completed',
    });
    res.status(201).json({ success: true, data: screening });
  })
);

// ─── Behavioral Function Assessment (FBA) ────────────────────
router.post(
  '/behavioral-function',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const assessment = await BehavioralFunctionAssessment.create({
      ...req.body,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
    });
    res.status(201).json({ success: true, data: assessment });
  })
);

// ─── Caregiver Burden ────────────────────────────────────────
router.post(
  '/caregiver-burden',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiary, caregiver_name, caregiver_relationship, items, notes } = req.body;
    const scoring = SmartAssessmentEngine.scoreCaregiverBurden(items);

    const assessment = await CaregiverBurdenAssessment.create({
      beneficiary,
      caregiver_name,
      caregiver_relationship,
      assessor: req.user?._id || req.user?.id,
      branch: req.user?.branch,
      items,
      dimension_scores: scoring.dimension_scores,
      total_score: scoring.total_score,
      burden_level: scoring.burden_level,
      burden_level_ar: scoring.burden_level_ar,
      support_recommendations: scoring.support_recommendations,
      status: 'completed',
      notes,
    });

    res.status(201).json({ success: true, data: assessment, scoring });
  })
);

// ══════════════════════════════════════════════════════════════
// SMART SCORING (Generic endpoint)
// ══════════════════════════════════════════════════════════════

router.post(
  '/score/:scaleType',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { scaleType } = req.params;
    const { items, age_months, form_type, chronological_age_months, raw_scores } = req.body;

    let result;
    switch (scaleType) {
      case 'mchat':
        result = SmartAssessmentEngine.scoreMCHAT(items);
        break;
      case 'cars2':
        result = SmartAssessmentEngine.scoreCARS2(items, form_type);
        break;
      case 'sensory-profile':
        result = SmartAssessmentEngine.scoreSensoryProfile(items);
        break;
      case 'brief2':
        result = SmartAssessmentEngine.scoreBRIEF2(items);
        break;
      case 'srs2':
        result = SmartAssessmentEngine.scoreSRS2(items);
        break;
      case 'portage':
        result = SmartAssessmentEngine.scorePortage(items, age_months || chronological_age_months);
        break;
      case 'vineland3':
        result = SmartAssessmentEngine.scoreVineland3(raw_scores, chronological_age_months);
        break;
      case 'abc':
        result = SmartAssessmentEngine.analyzeABCData(items);
        break;
      case 'caregiver-burden':
        result = SmartAssessmentEngine.scoreCaregiverBurden(items);
        break;
      case 'quality-of-life':
        result = SmartAssessmentEngine.scoreQualityOfLife(req.body.domains);
        break;
      case 'transition':
        result = SmartAssessmentEngine.scoreTransitionReadiness(req.body.domains);
        break;
      default:
        return res.status(400).json({ success: false, message: `مقياس غير معروف: ${scaleType}` });
    }

    res.json({ success: true, scale: scaleType, scoring: result });
  })
);

// ══════════════════════════════════════════════════════════════
// CLINICAL DECISION SUPPORT
// ══════════════════════════════════════════════════════════════

router.get(
  '/protocol/:diagnosis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { diagnosis } = req.params;
    const ageMonths = parseInt(req.query.age_months) || 48;
    const severity = req.query.severity || 'moderate';
    const protocol = ClinicalDecisionSupport.getProtocol(diagnosis, ageMonths, severity);
    res.json({ success: true, data: protocol });
  })
);

router.get(
  '/battery/:ageMonths/:diagnosis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const ageMonths = parseInt(req.params.ageMonths) || 48;
    const diagnosis = req.params.diagnosis || 'default';
    const battery = ClinicalDecisionSupport.getRecommendedAssessments(ageMonths, diagnosis);
    res.json({
      success: true,
      data: { age_months: ageMonths, diagnosis, recommended_assessments: battery },
    });
  })
);

router.post(
  '/goal-recommendations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const recommendations = ClinicalDecisionSupport.generateGoalRecommendations(req.body);
    res.json({ success: true, data: recommendations });
  })
);

router.post(
  '/risk-check',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const alerts = ClinicalDecisionSupport.checkRisks(req.body);
    res.json({
      success: true,
      data: { alerts, count: alerts.length, has_critical: alerts.some(a => a.severity === 'high') },
    });
  })
);

router.post(
  '/discharge-readiness',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = ClinicalDecisionSupport.evaluateDischargeReadiness(req.body);
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ══════════════════════════════════════════════════════════════

router.post(
  '/analytics/effect-size',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { pre_score, post_score, sd } = req.body;
    const result = ProgressAnalytics.cohenD(pre_score, post_score, sd);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/rci',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { pre_score, post_score, sd, reliability } = req.body;
    const result = ProgressAnalytics.reliableChangeIndex(pre_score, post_score, sd, reliability);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/clinical-significance',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { pre_score, post_score, ...params } = req.body;
    const result = ProgressAnalytics.clinicalSignificance(pre_score, post_score, params);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/trend',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { data_points } = req.body;
    const result = ProgressAnalytics.trendAnalysis(data_points);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/predict-goal',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { data_points, target_score } = req.body;
    const result = ProgressAnalytics.predictGoalAttainment(data_points, target_score);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/benchmark',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { current_score, ...params } = req.body;
    const result = ProgressAnalytics.benchmark(current_score, params);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/analytics/progress-report',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const report = ProgressAnalytics.generateProgressReport(req.body);
    res.json({ success: true, data: report });
  })
);

router.post(
  '/analytics/roi',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = ProgressAnalytics.therapeuticROI(req.body);
    res.json({ success: true, data: result });
  })
);

// ══════════════════════════════════════════════════════════════
// SCALE LIBRARY
// ══════════════════════════════════════════════════════════════

router.get(
  '/scales',
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      const ClinicalScaleItem = mongoose.models.ClinicalScaleItem;
      if (!ClinicalScaleItem) {
        return res.json({
          success: true,
          data: [],
          message: 'جدول المقاييس غير موجود — شغّل البذور أولاً',
        });
      }
      const scales = await ClinicalScaleItem.find(
        {},
        'scale_id scale_name_ar scale_name_en category metadata'
      ).lean();
      res.json({ success: true, data: scales });
    } catch (e) {
      res.json({ success: true, data: [], message: 'شغّل البذور أولاً: npm run db:seed' });
    }
  })
);

router.get(
  '/scales/:scaleId/items',
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      const ClinicalScaleItem = mongoose.models.ClinicalScaleItem;
      if (!ClinicalScaleItem) return res.status(404).json({ success: false, message: 'غير موجود' });
      const scale = await ClinicalScaleItem.findOne({ scale_id: req.params.scaleId }).lean();
      if (!scale)
        return res
          .status(404)
          .json({ success: false, message: `مقياس ${req.params.scaleId} غير موجود` });
      res.json({ success: true, data: scale });
    } catch (e) {
      res.status(404).json({ success: false, message: 'شغّل البذور أولاً' });
    }
  })
);

// ══════════════════════════════════════════════════════════════
// ASSESSMENT HISTORY
// ══════════════════════════════════════════════════════════════

const ASSESSMENT_MODELS = {
  mchat: MChatAssessment,
  'sensory-profile': SensoryProfileAssessment,
  brief2: BRIEF2Assessment,
  srs2: SRS2Assessment,
  portage: PortageAssessment,
  'abc-data': ABCDataCollection,
  'family-needs': FamilyNeedsSurvey,
  'quality-of-life': QualityOfLifeAssessment,
  transition: TransitionReadinessAssessment,
  'saudi-screening': SaudiDevelopmentalScreening,
  'behavioral-function': BehavioralFunctionAssessment,
  'caregiver-burden': CaregiverBurdenAssessment,
};

router.get(
  '/history/:beneficiaryId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    const history = {};

    for (const [type, Model] of Object.entries(ASSESSMENT_MODELS)) {
      try {
        history[type] = await Model.find({ beneficiary: beneficiaryId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      } catch (e) {
        history[type] = [];
      }
    }

    res.json({ success: true, data: history });
  })
);

router.get(
  '/history/:beneficiaryId/:type',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, type } = req.params;
    const Model = ASSESSMENT_MODELS[type];
    if (!Model)
      return res.status(400).json({ success: false, message: `نوع تقييم غير معروف: ${type}` });

    const assessments = await Model.find({ beneficiary: beneficiaryId })
      .sort({ createdAt: -1 })
      .populate('assessor', 'name role')
      .lean();

    res.json({ success: true, data: assessments });
  })
);

// ══════════════════════════════════════════════════════════════
// GENERIC CRUD — GET / PUT / DELETE بمعرّف لأي نوع تقييم
// ══════════════════════════════════════════════════════════════

// ─── قائمة مع صفحات + فلترة + ترتيب ─────────────────────────
router.get(
  '/list/:type',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Model = ASSESSMENT_MODELS[req.params.type];
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `نوع تقييم غير معروف: ${req.params.type}` });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const sortField = req.query.sort || '-createdAt';

    // فلترة ديناميكية
    const filter = {};
    if (req.query.beneficiary) filter.beneficiary = req.query.beneficiary;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.branch) filter.branch = req.query.branch;
    else if (req.user?.branch) filter.branch = req.user.branch; // تقييد بالفرع
    if (req.query.assessor) filter.assessor = req.query.assessor;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [data, total] = await Promise.all([
      Model.find(filter)
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .populate('assessor', 'name role')
        .populate('beneficiary', 'name fileNumber')
        .lean(),
      Model.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  })
);

// ─── جلب تقييم واحد بالمعرّف ─────────────────────────────────
router.get(
  '/detail/:type/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Model = ASSESSMENT_MODELS[req.params.type];
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `نوع تقييم غير معروف: ${req.params.type}` });

    const doc = await Model.findById(req.params.id)
      .populate('assessor', 'name role email')
      .populate('beneficiary', 'name fileNumber diagnosis dateOfBirth')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'لم يتم العثور على التقييم' });
    res.json({ success: true, data: doc });
  })
);

// ─── تعديل تقييم ─────────────────────────────────────────────
router.put(
  '/detail/:type/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Model = ASSESSMENT_MODELS[req.params.type];
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `نوع تقييم غير معروف: ${req.params.type}` });

    // حماية الحقول الحساسة
    const { _id, __v, createdAt, assessor, branch, ...safeUpdate } = req.body;
    safeUpdate.updatedBy = req.user?._id || req.user?.id;
    safeUpdate.lastModified = new Date();

    const doc = await Model.findByIdAndUpdate(req.params.id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!doc) return res.status(404).json({ success: false, message: 'لم يتم العثور على التقييم' });
    res.json({ success: true, data: doc });
  })
);

// ─── حذف ناعم ────────────────────────────────────────────────
router.delete(
  '/detail/:type/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Model = ASSESSMENT_MODELS[req.params.type];
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `نوع تقييم غير معروف: ${req.params.type}` });

    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted', deletedAt: new Date(), deletedBy: req.user?._id || req.user?.id },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ success: false, message: 'لم يتم العثور على التقييم' });
    res.json({ success: true, message: 'تم الحذف بنجاح', data: { _id: doc._id } });
  })
);

// ══════════════════════════════════════════════════════════════
// إعادة التصحيح — إعادة حساب الدرجات لتقييم محفوظ
// ══════════════════════════════════════════════════════════════

router.post(
  '/rescore/:type/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Model = ASSESSMENT_MODELS[req.params.type];
    if (!Model)
      return res
        .status(400)
        .json({ success: false, message: `نوع تقييم غير معروف: ${req.params.type}` });

    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'لم يتم العثور على التقييم' });

    let scoring;
    const type = req.params.type;
    switch (type) {
      case 'mchat':
        scoring = SmartAssessmentEngine.scoreMCHAT(doc.items);
        break;
      case 'sensory-profile':
        scoring = SmartAssessmentEngine.scoreSensoryProfile(doc.items);
        break;
      case 'brief2':
        scoring = SmartAssessmentEngine.scoreBRIEF2(doc.items);
        break;
      case 'srs2':
        scoring = SmartAssessmentEngine.scoreSRS2(doc.items);
        break;
      case 'portage':
        scoring = SmartAssessmentEngine.scorePortage(doc.items, doc.age_months);
        break;
      case 'caregiver-burden':
        scoring = SmartAssessmentEngine.scoreCaregiverBurden(doc.items);
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: `إعادة التصحيح غير متاحة لـ ${type}` });
    }

    // تحديث الدرجات في المستند
    if (scoring) {
      Object.keys(scoring).forEach(k => {
        if (doc.schema.paths[k]) doc[k] = scoring[k];
      });
      doc.rescored_at = new Date();
      doc.rescored_by = req.user?._id || req.user?.id;
      await doc.save();
    }

    res.json({ success: true, data: doc, scoring });
  })
);

// ══════════════════════════════════════════════════════════════
// مقارنة التقييمات — قبلي / بعدي
// ══════════════════════════════════════════════════════════════

router.post(
  '/compare',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { type, pre_id, post_id, beneficiary_id, scale_field } = req.body;
    const Model = ASSESSMENT_MODELS[type];
    if (!Model)
      return res.status(400).json({ success: false, message: `نوع تقييم غير معروف: ${type}` });

    let pre, post;

    if (pre_id && post_id) {
      [pre, post] = await Promise.all([
        Model.findById(pre_id).lean(),
        Model.findById(post_id).lean(),
      ]);
    } else if (beneficiary_id) {
      // آخر تقييمين للمستفيد
      const docs = await Model.find({ beneficiary: beneficiary_id })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();
      post = docs[0];
      pre = docs[1];
    }

    if (!pre || !post)
      return res
        .status(404)
        .json({ success: false, message: 'لم يتم العثور على تقييمين للمقارنة' });

    // ── حساب الفروقات ──
    const comparison = {
      pre: { _id: pre._id, date: pre.createdAt },
      post: { _id: post._id, date: post.createdAt },
      days_between: Math.round(
        (new Date(post.createdAt) - new Date(pre.createdAt)) / (1000 * 60 * 60 * 24)
      ),
      changes: {},
    };

    // مقارنة حسب النوع
    const numericFields = _getNumericFields(type);
    for (const field of numericFields) {
      const preVal = _deepGet(pre, field);
      const postVal = _deepGet(post, field);
      if (typeof preVal === 'number' && typeof postVal === 'number') {
        const change = postVal - preVal;
        const pct = preVal !== 0 ? ((change / Math.abs(preVal)) * 100).toFixed(1) : 'N/A';
        comparison.changes[field] = {
          pre: preVal,
          post: postVal,
          change,
          change_pct: pct,
          direction: change > 0 ? 'تحسن ↑' : change < 0 ? 'تراجع ↓' : 'ثبات →',
          direction_en: change > 0 ? 'improved' : change < 0 ? 'declined' : 'stable',
        };
      }
    }

    // حجم الأثر إذا توفر الانحراف المعياري
    if (req.body.sd && Object.keys(comparison.changes).length > 0) {
      const mainField = scale_field || numericFields[0];
      const preVal = _deepGet(pre, mainField);
      const postVal = _deepGet(post, mainField);
      if (typeof preVal === 'number' && typeof postVal === 'number') {
        comparison.effect_size = ProgressAnalytics.cohenD(preVal, postVal, req.body.sd);
      }
    }

    res.json({ success: true, data: comparison });
  })
);

// ══════════════════════════════════════════════════════════════
// إحصائيات لوحة التحكم — Dashboard Statistics
// ══════════════════════════════════════════════════════════════

router.get(
  '/stats/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const branchFilter = req.user?.branch ? { branch: req.user.branch } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const results = {};
    let grandTotal = 0;
    let monthTotal = 0;
    let weekTotal = 0;

    for (const [type, Model] of Object.entries(ASSESSMENT_MODELS)) {
      try {
        const [total, thisMonth, thisWeek] = await Promise.all([
          Model.countDocuments({ ...branchFilter, status: { $ne: 'deleted' } }),
          Model.countDocuments({
            ...branchFilter,
            status: { $ne: 'deleted' },
            createdAt: { $gte: startOfMonth },
          }),
          Model.countDocuments({
            ...branchFilter,
            status: { $ne: 'deleted' },
            createdAt: { $gte: startOfWeek },
          }),
        ]);
        results[type] = { total, thisMonth, thisWeek };
        grandTotal += total;
        monthTotal += thisMonth;
        weekTotal += thisWeek;
      } catch (e) {
        results[type] = { total: 0, thisMonth: 0, thisWeek: 0 };
      }
    }

    // أحدث 10 تقييمات عبر جميع الأنواع
    const recentPromises = Object.entries(ASSESSMENT_MODELS).map(async ([type, Model]) => {
      try {
        const docs = await Model.find({ ...branchFilter, status: { $ne: 'deleted' } })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate('beneficiary', 'name fileNumber')
          .populate('assessor', 'name')
          .lean();
        return docs.map(d => ({ ...d, _assessment_type: type }));
      } catch {
        return [];
      }
    });
    const allRecent = (await Promise.all(recentPromises))
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: { total: grandTotal, thisMonth: monthTotal, thisWeek: weekTotal },
        by_type: results,
        recent: allRecent,
        generated_at: new Date(),
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════
// تصحيح دفعي — Batch Scoring
// ══════════════════════════════════════════════════════════════

router.post(
  '/batch-score',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { assessments } = req.body; // [{type, items, age_months, ...}, ...]
    if (!Array.isArray(assessments) || assessments.length === 0)
      return res.status(400).json({ success: false, message: 'أرسل مصفوفة assessments' });

    if (assessments.length > 50)
      return res.status(400).json({ success: false, message: 'الحد الأقصى 50 تقييم في الدفعة' });

    const results = assessments.map((a, i) => {
      try {
        let scoring;
        switch (a.type) {
          case 'mchat':
            scoring = SmartAssessmentEngine.scoreMCHAT(a.items);
            break;
          case 'cars2':
            scoring = SmartAssessmentEngine.scoreCARS2(a.items, a.form_type);
            break;
          case 'sensory-profile':
            scoring = SmartAssessmentEngine.scoreSensoryProfile(a.items);
            break;
          case 'brief2':
            scoring = SmartAssessmentEngine.scoreBRIEF2(a.items);
            break;
          case 'srs2':
            scoring = SmartAssessmentEngine.scoreSRS2(a.items);
            break;
          case 'portage':
            scoring = SmartAssessmentEngine.scorePortage(a.items, a.age_months);
            break;
          case 'caregiver-burden':
            scoring = SmartAssessmentEngine.scoreCaregiverBurden(a.items);
            break;
          default:
            return { index: i, type: a.type, success: false, error: 'نوع غير معروف' };
        }
        return { index: i, type: a.type, success: true, scoring };
      } catch (e) {
        return { index: i, type: a.type, success: false, error: e.message };
      }
    });

    const succeeded = results.filter(r => r.success).length;
    res.json({
      success: true,
      data: results,
      summary: { total: results.length, succeeded, failed: results.length - succeeded },
    });
  })
);

// ══════════════════════════════════════════════════════════════
// تقرير مستفيد شامل — Beneficiary Full Report
// ══════════════════════════════════════════════════════════════

router.get(
  '/report/:beneficiaryId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const bid = req.params.beneficiaryId;

    // جلب كل التقييمات لجميع الأنواع
    const allAssessments = {};
    const summaries = [];

    for (const [type, Model] of Object.entries(ASSESSMENT_MODELS)) {
      try {
        const docs = await Model.find({ beneficiary: bid, status: { $ne: 'deleted' } })
          .sort({ createdAt: -1 })
          .populate('assessor', 'name role')
          .lean();
        allAssessments[type] = docs;
        if (docs.length > 0) {
          summaries.push({
            type,
            count: docs.length,
            latest_date: docs[0].createdAt,
            first_date: docs[docs.length - 1].createdAt,
          });
        }
      } catch {
        allAssessments[type] = [];
      }
    }

    // ── تحليل التقدم لكل مقياس فيه بيانات كافية ──
    const progressAnalysis = {};
    for (const [type, docs] of Object.entries(allAssessments)) {
      if (docs.length >= 2) {
        const numericFields = _getNumericFields(type);
        if (numericFields.length > 0) {
          const mainField = numericFields[0];
          const points = docs
            .filter(d => typeof _deepGet(d, mainField) === 'number')
            .map(d => ({ date: d.createdAt, score: _deepGet(d, mainField) }))
            .reverse();

          if (points.length >= 2) {
            progressAnalysis[type] = {
              field: mainField,
              data_points: points,
              first_score: points[0].score,
              latest_score: points[points.length - 1].score,
              change: points[points.length - 1].score - points[0].score,
              trend:
                points[points.length - 1].score > points[0].score
                  ? 'تحسن ↑'
                  : points[points.length - 1].score < points[0].score
                    ? 'تراجع ↓'
                    : 'ثبات →',
            };
          }
        }
      }
    }

    // ── فحص المخاطر ──
    const riskAlerts = [];
    // افحص إذا كان أي مقياس لم يُعاد منذ 6 أشهر
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    for (const summary of summaries) {
      if (new Date(summary.latest_date) < sixMonthsAgo) {
        riskAlerts.push({
          type: 'overdue_reassessment',
          severity: 'warning',
          message_ar: `مقياس ${summary.type} لم يُعاد منذ ${Math.round((new Date() - new Date(summary.latest_date)) / (1000 * 60 * 60 * 24 * 30))} شهر`,
          assessment_type: summary.type,
        });
      }
    }

    res.json({
      success: true,
      data: {
        beneficiary: bid,
        total_assessments: Object.values(allAssessments).reduce((s, a) => s + a.length, 0),
        summaries,
        assessments: allAssessments,
        progress: progressAnalysis,
        risk_alerts: riskAlerts,
        generated_at: new Date(),
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════
// REPORT EXPORT ENDPOINTS
// ══════════════════════════════════════════════════════════════

// ─── تقرير تقييم واحد (نص أو HTML) ──────────────────────────
router.get(
  '/report/export/:type/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const format = req.query.format || 'text'; // text | html
    const Model = ASSESSMENT_MODELS[type];
    if (!Model)
      return res.status(400).json({ success: false, message: `نوع التقييم غير معروف: ${type}` });

    const doc = await Model.findById(id)
      .populate('beneficiary', 'name fileNumber dateOfBirth')
      .populate('assessor', 'name')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });

    const report = AssessmentReportGenerator.generateReport(type, doc, { format });

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(report);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(report);
  })
);

// ─── تقرير مقارنة قبلي/بعدي ─────────────────────────────────
router.post(
  '/report/comparison',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { pre_id, post_id, type } = req.body;
    const Model = ASSESSMENT_MODELS[type];
    if (!Model)
      return res.status(400).json({ success: false, message: `نوع التقييم غير معروف: ${type}` });

    const pre = await Model.findById(pre_id).lean();
    const post = await Model.findById(post_id).lean();
    if (!pre || !post)
      return res.status(404).json({ success: false, message: 'أحد التقييمات غير موجود' });

    // حساب الفروقات
    const numericFields = _getNumericFields(type);
    const changes = {};
    numericFields.forEach(f => {
      const preVal = _deepGet(pre, f);
      const postVal = _deepGet(post, f);
      if (preVal !== undefined && postVal !== undefined) {
        changes[f] = {
          pre: preVal,
          post: postVal,
          change: +(postVal - preVal).toFixed(2),
          direction: postVal > preVal ? 'تحسن ↑' : postVal < preVal ? 'انخفاض ↓' : 'ثابت →',
        };
      }
    });

    const comparison = {
      type,
      days_between: Math.round((new Date(post.createdAt) - new Date(pre.createdAt)) / 86400000),
      changes,
    };

    const report = AssessmentReportGenerator.generateProgressComparisonReport(comparison);

    res.json({ success: true, data: { report, comparison } });
  })
);

// ─── تقرير شامل لمستفيد ─────────────────────────────────────
router.get(
  '/report/full/:beneficiaryId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    const allAssessments = {};

    for (const [type, Model] of Object.entries(ASSESSMENT_MODELS)) {
      try {
        allAssessments[type] = await Model.find({ beneficiary: beneficiaryId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
      } catch (_) {
        allAssessments[type] = [];
      }
    }

    // محاولة جلب بيانات المستفيد
    let beneficiaryInfo = {};
    try {
      const Beneficiary = mongoose.models.Beneficiary || mongoose.model('Beneficiary');
      beneficiaryInfo =
        (await Beneficiary.findById(beneficiaryId)
          .select('name fileNumber dateOfBirth diagnosis')
          .lean()) || {};
    } catch (_) {
      /* best-effort: proceed with empty beneficiaryInfo */
    }

    const report = AssessmentReportGenerator.generateBeneficiaryFullReport(
      allAssessments,
      beneficiaryInfo
    );

    res.json({
      success: true,
      data: {
        report,
        assessments_summary: Object.entries(allAssessments).reduce((acc, [k, v]) => {
          acc[k] = v.length;
          return acc;
        }, {}),
        beneficiary: beneficiaryInfo,
      },
    });
  })
);

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function _getNumericFields(type) {
  const fieldMap = {
    mchat: ['total_risk_score', 'critical_items_failed'],
    'sensory-profile': [
      'quadrant_scores.seeking',
      'quadrant_scores.avoiding',
      'quadrant_scores.sensitivity',
      'quadrant_scores.registration',
    ],
    brief2: [
      'composite_scores.BRI',
      'composite_scores.ERI',
      'composite_scores.CRI',
      'composite_scores.GEC',
    ],
    srs2: ['total_raw_score', 'total_t_score'],
    portage: [],
    'abc-data': [],
    'family-needs': [],
    'quality-of-life': ['total_transformed_score'],
    transition: ['overall_readiness'],
    'saudi-screening': [],
    'behavioral-function': [],
    'caregiver-burden': ['total_score'],
  };
  return fieldMap[type] || [];
}

function _deepGet(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

module.exports = router;
