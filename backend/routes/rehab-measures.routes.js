/**
 * Rehab Measures & Smart Assessment Routes
 * مسارات مكتبة مقاييس التأهيل والتقييم الذكي
 *
 * Base: /api/v1/rehab-measures  OR  /api/rehab-measures
 *
 * GET    /catalog                    — قائمة جميع المقاييس
 * GET    /catalog/:key               — تفاصيل مقياس واحد
 * GET    /categories                 — فئات المقاييس
 * GET    /suggest                    — اقتراح مقاييس حسب التشخيص والعمر
 * POST   /score                      — حساب نتيجة مقياس
 * POST   /score-battery              — حساب بطارية مقاييس متعددة
 * POST   /progress/:measureKey       — تحليل التقدم الزمني
 * POST   /assessment-plan            — بناء خطة تقييم شاملة
 * POST   /clinical-summary           — توليد ملخص سريري
 * POST   /goals/:measureKey          — توليد أهداف SMART
 */

'use strict';

const express = require('express');

const router = express.Router();

const {
  listAllMeasures,
  getMeasure,
  getMeasuresByCategory,
  getMeasuresForPopulation,
  getCategories,
} = require('../rehabilitation-services/rehab-measures-library');

const {
  SmartAssessmentEngine,
  analyzeProgressTrend,
  buildAssessmentPlan,
  generateClinicalSummary,
  generateSMARTGoals,
} = require('../rehabilitation-services/smart-assessment-engine');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');
// W442: defense-in-depth on stateless scoring routes — `beneficiary`
// is currently a context object (name_ar/diagnosis/age), guard
// auto-skips non-ObjectId values. Future-proofs against regression.
router.use(bodyScopedBeneficiaryGuard);

// Lazy-instantiate engine (stateless, safe to reuse)
const engine = new SmartAssessmentEngine();

// ─── helpers ──────────────────────────────────────────────────────────────────

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /catalog
// ─────────────────────────────────────────────────────────────────────────────
router.get('/catalog', (req, res) => {
  try {
    const { category, population, search } = req.query;

    let measures = listAllMeasures();

    if (category) {
      measures = measures.filter(m => m.category === category);
    }
    if (population) {
      measures = measures.filter(
        m => m.targetPopulation && m.targetPopulation.some(p => p.includes(population))
      );
    }
    if (search) {
      const q = search.toLowerCase();
      measures = measures.filter(
        m =>
          (m.name_ar || '').toLowerCase().includes(q) ||
          (m.name_en || '').toLowerCase().includes(q) ||
          (m.abbreviation || '').toLowerCase().includes(q)
      );
    }

    // Return lightweight summary (omit items arrays to keep payload small)
    const summary = measures.map(m => ({
      key: m.key,
      id: m.id,
      name_ar: m.name_ar,
      name_en: m.name_en,
      abbreviation: m.abbreviation,
      version: m.version,
      category: m.category,
      categoryMeta: m.categoryMeta,
      targetPopulation: m.targetPopulation,
      ageRanges: m.ageRanges,
      adminTime: m.adminTime,
      adminMode: m.adminMode,
      scoringType: m.scoringType,
      totalItems: m.totalItems,
      reliability: m.reliability,
    }));

    return ok(res, { total: summary.length, measures: summary });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /catalog/:key
// ─────────────────────────────────────────────────────────────────────────────
router.get('/catalog/:key', (req, res) => {
  const measure = getMeasure(req.params.key);
  if (!measure) return fail(res, `المقياس '${req.params.key}' غير موجود`, 404);
  return ok(res, measure);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /categories
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', (_req, res) => {
  const categories = getCategories();
  const withCounts = Object.entries(categories).map(([key, meta]) => ({
    key,
    ...meta,
    count: getMeasuresByCategory(key).length,
  }));
  return ok(res, withCounts);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /suggest?diagnosis=&age=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/suggest', (req, res) => {
  const { diagnosis, age } = req.query;

  if (!diagnosis) return fail(res, 'حقل diagnosis مطلوب');
  if (!age || isNaN(Number(age))) return fail(res, 'حقل age (رقمي) مطلوب');

  const suggestions = engine.suggestMeasures(String(diagnosis), Number(age));
  return ok(res, { total: suggestions.length, measures: suggestions });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /score
// Body: { measureKey, responses, meta? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/score', (req, res) => {
  const { measureKey, responses, meta } = req.body;

  if (!measureKey) return fail(res, 'حقل measureKey مطلوب');
  if (!responses || typeof responses !== 'object') return fail(res, 'حقل responses (object) مطلوب');

  const result = engine.score(measureKey, responses, meta || {});

  if (result.error) return fail(res, result.error, 422);
  return ok(res, result);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /score-battery
// Body: { assessments: [{ measureKey, responses, meta }], beneficiary? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/score-battery', (req, res) => {
  const { assessments, beneficiary } = req.body;

  if (!Array.isArray(assessments) || assessments.length === 0) {
    return fail(res, 'حقل assessments (مصفوفة) مطلوب');
  }
  if (assessments.length > 20) {
    return fail(res, 'الحد الأقصى 20 مقياساً لكل طلب');
  }

  const batteryResult = engine.scoreBattery(assessments);

  // Optionally generate clinical summary
  let clinicalSummary = null;
  if (beneficiary) {
    clinicalSummary = generateClinicalSummary(batteryResult, beneficiary);
  }

  return ok(res, { ...batteryResult, clinicalSummary });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /progress/:measureKey
// Body: { sessions: [{ date, responses, meta }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/progress/:measureKey', (req, res) => {
  const { measureKey } = req.params;
  const { sessions } = req.body;

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return fail(res, 'حقل sessions (مصفوفة) مطلوب');
  }

  const result = engine.analyzeProgress(measureKey, sessions);
  if (result.error) return fail(res, result.error, 422);
  return ok(res, result);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /assessment-plan
// Body: { diagnosis, age, gmfcsLevel? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/assessment-plan', (req, res) => {
  const { diagnosis, age } = req.body;

  if (!diagnosis) return fail(res, 'حقل diagnosis مطلوب');
  if (!age || isNaN(Number(age))) return fail(res, 'حقل age (رقمي) مطلوب');

  const plan = buildAssessmentPlan({ ...req.body, age: Number(age) });
  return ok(res, plan);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /clinical-summary
// Body: { batteryResult, beneficiary }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/clinical-summary', (req, res) => {
  const { batteryResult, beneficiary } = req.body;

  if (!batteryResult) return fail(res, 'حقل batteryResult مطلوب');

  const summary = generateClinicalSummary(batteryResult, beneficiary || {});
  return ok(res, { summary });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /goals/:measureKey
// Body: { tier, context? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/goals/:measureKey', (req, res) => {
  const { measureKey } = req.params;
  const { tier, context } = req.body;

  if (!tier) return fail(res, 'حقل tier مطلوب');

  const goals = generateSMARTGoals(measureKey, String(tier), context || {});
  return ok(res, { measureKey, tier, goals });
});

module.exports = router;
