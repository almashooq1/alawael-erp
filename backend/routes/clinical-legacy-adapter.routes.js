'use strict';

/**
 * Clinical Legacy Adapter Routes
 * ══════════════════════════════════════════════════════════════════
 * Bridges the legacy web-admin OpenAPI paths (`/api/v1/measures`,
 * `/api/v1/outcomes`, etc.) to the real W210/W211/W229 clinical
 * services and models. Mounted BEFORE `stub-missing.routes.js` so
 * these adapters win over the stub catch-alls.
 *
 * Endpoints:
 *   GET    /api/v1/measures
 *   GET    /api/v1/measure-categories
 *   GET    /api/v1/measures/:id
 *   GET    /api/v1/measures/:id/items
 *   GET    /api/v1/measures/:id/cutoffs
 *   GET    /api/v1/measure-recommendations
 *   GET    /api/v1/outcomes
 *   GET    /api/v1/outcomes/:id
 *   GET    /api/v1/outcomes/:id/timeline
 *   POST   /api/v1/outcomes
 *   PATCH  /api/v1/outcomes/:id/target
 *   POST   /api/v1/outcomes/:id/notes
 *   PATCH  /api/v1/outcomes/:id/archive
 *   PATCH  /api/v1/outcomes/:id/reactivate
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const measuresLibrarySvc = require('../services/measuresLibrary.service');
const measureOutcomesAggregator = require('../services/measureOutcomesAggregator.service');
const measureClinicalReport = require('../services/measureClinicalReport.service');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const { authenticate: authenticateToken } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

// ── Lazy model loaders ────────────────────────────────────────────
function getModel(name, fallbackPaths = []) {
  try {
    return mongoose.model(name);
  } catch {
    for (const p of fallbackPaths) {
      try {
        require(p);
        return mongoose.model(name);
      } catch {
        /* continue */
      }
    }
    return null;
  }
}

const Models = {
  Measure: () => getModel('Measure', ['../domains/goals/models/Measure']),
  MeasureApplication: () =>
    getModel('MeasureApplication', ['../domains/goals/models/MeasureApplication']),
  TherapeuticGoal: () => getModel('TherapeuticGoal', ['../domains/goals/models/TherapeuticGoal']),
  Beneficiary: () => getModel('Beneficiary', ['../models/Beneficiary']),
  EpisodeOfCare: () => getModel('EpisodeOfCare', ['../domains/episodes/models/EpisodeOfCare']),
  User: () => getModel('User', ['../models/User']),
};

// ── Async handler wrapper ─────────────────────────────────────────
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Mapping helpers ───────────────────────────────────────────────
function mapScoringMethod(type) {
  const map = {
    numeric: 'raw_score',
    likert: 'likert',
    binary: 'binary',
    percentage: 'percentage',
    percentile: 'percentile',
    standard_score: 'standard_score',
    age_equivalent: 'age_equivalent',
    composite: 'composite',
  };
  return map[type] || type || 'raw_score';
}

function mapResponseType(type) {
  const map = {
    numeric: 'numeric',
    likert: 'likert',
    binary: 'boolean',
    percentage: 'percentage',
    rating: 'rating',
  };
  return map[type] || type || 'numeric';
}

function mapSeverity(sev) {
  const map = {
    normal: 'none',
    mild: 'mild',
    moderate: 'moderate',
    severe: 'severe',
    critical: 'critical',
  };
  return map[sev] || sev || 'none';
}

function trendFromClassification(classification) {
  const map = {
    linear_improvement: 'improving',
    slow_improvement: 'improving',
    plateau: 'stable',
    regression: 'declining',
    mixed: 'mixed',
    insufficient_data: 'insufficient_data',
  };
  return map[classification] || classification || 'insufficient_data';
}

function ageRangeToMonths(ageRange) {
  if (!ageRange || ageRange.min == null) return { min: null, max: null };
  const unit = ageRange.unit || 'years';
  const factor = unit === 'years' ? 12 : 1;
  return {
    min: Math.floor(ageRange.min * factor),
    max: ageRange.max != null ? Math.floor(ageRange.max * factor) : null,
  };
}

function mapOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o, idx) => ({
    value: Number.isFinite(o.value) ? o.value : idx,
    labelAr: o.label_ar || o.label || String(o.value || idx),
    labelEn: o.label || o.label_ar || String(o.value || idx),
  }));
}

function referencesAr(raw) {
  const parts = [];
  if (raw.citation) parts.push(raw.citation);
  if (raw.referenceUrl) parts.push(raw.referenceUrl);
  return parts.join('\n') || null;
}

// ── Measure shape mappers ─────────────────────────────────────────
function toMeasureShape(raw) {
  const age = ageRangeToMonths(raw.ageRange);
  return {
    id: raw._id ? String(raw._id) : raw.code,
    code: raw.code || null,
    nameAr: raw.name_ar || raw.name || null,
    nameEn: raw.name || null,
    domain: raw.category || raw.domain || null,
    abbreviation: raw.abbreviation || null,
    version: raw.version || null,
    publisher: raw.publisher || null,
    publicationYear: null,
    targetAgeMinMonths: age.min,
    targetAgeMaxMonths: age.max,
    targetPopulation: Array.isArray(raw.targetPopulation) ? raw.targetPopulation : [],
    informant: Array.isArray(raw.administeredBy) ? raw.administeredBy : [],
    administrationMode: [],
    timeRequiredMin: raw.administrationTime || null,
    scoringMethod: mapScoringMethod(raw.scoringType),
    scoreMin: raw.minScore != null ? raw.minScore : null,
    scoreMax: raw.maxScore != null ? raw.maxScore : null,
    hasSubscales: Array.isArray(raw.domains) && raw.domains.length > 0,
    hasNorms: false,
    arabicValidated: true,
    requiresTraining: !!raw.trainingRequired,
    licenseRequired: !!raw.licenseRequired,
    instructionsAr: raw.description_ar || raw.description || null,
    instructionsEn: raw.description || null,
    referencesAr: referencesAr(raw),
    isActive: raw.status === 'active' || raw.isActive === true,
  };
}

function toSubscaleShape(domain, idx) {
  return {
    id: domain._id ? String(domain._id) : `domain-${idx}`,
    code: domain.key || `D${idx + 1}`,
    nameAr: domain.name_ar || domain.name || null,
    nameEn: domain.name || null,
    description: domain.description || null,
    scoreMin: null,
    scoreMax: domain.maxScore != null ? domain.maxScore : null,
    order: idx,
  };
}

function toCutoffShape(rule, idx, measureId) {
  return {
    id: rule._id ? String(rule._id) : `cutoff-${idx}`,
    measureId: measureId || null,
    subscaleId: null,
    scoreMin: rule.minScore != null ? rule.minScore : null,
    scoreMax: rule.maxScore != null ? rule.maxScore : null,
    labelAr: rule.rangeLabel_ar || rule.rangeLabel || null,
    labelEn: rule.rangeLabel || null,
    severityLevel: mapSeverity(rule.severity),
    color: rule.color || null,
    recommendationsAr: rule.interpretation_ar || rule.interpretation || null,
    order: idx,
  };
}

function toDetailShape(raw) {
  const base = toMeasureShape(raw);
  return {
    ...base,
    descriptionAr: raw.description_ar || raw.description || null,
    descriptionEn: raw.description || null,
    subscales: Array.isArray(raw.domains) ? raw.domains.map((d, i) => toSubscaleShape(d, i)) : [],
    cutoffs: Array.isArray(raw.scoringRules)
      ? raw.scoringRules.map((r, i) => toCutoffShape(r, i, base.id))
      : [],
  };
}

function toItemShape(item, domain, measureId, increment) {
  return {
    id: item._id ? String(item._id) : `${measureId}-item-${increment}`,
    measureId,
    subscaleId: domain._id ? String(domain._id) : null,
    itemNumber: increment,
    code: null,
    questionAr: item.label_ar || item.label || null,
    questionEn: item.label || null,
    instructions: null,
    responseType: mapResponseType(item.scoringType),
    options: mapOptions(item.options),
    scoreWeight: 1,
    reverseScored: false,
    isRequired: true,
    order: increment,
  };
}

// ── Outcome shape mappers ─────────────────────────────────────────
function toOutcomeMeasure(row, beneficiaryId, goal = null) {
  const compositeId = `${beneficiaryId}:${row.measureId}`;
  const isActive = goal ? goal.status === 'active' : true;
  return {
    id: compositeId,
    beneficiaryId: String(beneficiaryId),
    measureId: row.measureId || null,
    measureCode: row.measureCode || null,
    measureNameAr: row.measureName_ar || null,
    measureNameEn: row.measureName_en || row.measureName || null,
    baselineScore: row.baselineScore != null ? row.baselineScore : null,
    baselineDate: row.baselineDate || null,
    latestScore: row.latestScore != null ? row.latestScore : null,
    latestDate: row.latestDate || null,
    targetScore: goal?.target?.value != null ? goal.target.value : null,
    targetDate: goal?.targetDate || null,
    deltaFromBaseline: row.deltaFromBaseline != null ? row.deltaFromBaseline : null,
    mcidValue: row.mcidValue || null,
    mcidAchieved: !!row.mcidAchieved,
    trend: trendFromClassification(row.trend),
    adminCount: row.adminCount || 0,
    isActive,
    status: goal?.status || 'active',
    goalId: goal?._id ? String(goal._id) : null,
  };
}

function toOutcomeDetail(row, beneficiaryId, adminHistory = [], notes = []) {
  const base = toOutcomeMeasure(row, beneficiaryId);
  return {
    ...base,
    assessments: Array.isArray(adminHistory)
      ? adminHistory.map(a => ({
          assessmentId: a.applicationId || (a._id ? String(a._id) : null),
          date: a.applicationDate || a.date || null,
          rawScore:
            a.totalRawScore != null ? a.totalRawScore : a.rawScore != null ? a.rawScore : null,
          standardScore: null,
          percentileScore: null,
          severityLevel: null,
          changeFromBaseline: a.changeFromBaseline != null ? a.changeFromBaseline : null,
          percentChangeFromBaseline: null,
        }))
      : [],
    notes: Array.isArray(notes) ? notes : [],
  };
}

// ── Goal helpers ──────────────────────────────────────────────────
async function _findOutcomeGoal(beneficiaryId, measureId) {
  const TherapeuticGoal = Models.TherapeuticGoal();
  if (!TherapeuticGoal) return null;

  const benId = mongoose.Types.ObjectId.isValid(beneficiaryId)
    ? new mongoose.Types.ObjectId(beneficiaryId)
    : beneficiaryId;
  const measId = mongoose.Types.ObjectId.isValid(measureId)
    ? new mongoose.Types.ObjectId(measureId)
    : measureId;

  const goals = await TherapeuticGoal.find({
    beneficiaryId: benId,
    isDeleted: { $ne: true },
    $or: [{ 'objectives.measureLinks.measureId': measId }, { 'objectives.measureId': measId }],
  })
    .sort({ createdAt: -1 })
    .lean()
    .catch(() => []);

  if (!goals.length) return null;
  const active = goals.find(g => g.status === 'active');
  return active || goals[0];
}

async function _findGoalsForOutcomes(beneficiaryId) {
  const TherapeuticGoal = Models.TherapeuticGoal();
  if (!TherapeuticGoal) return new Map();

  const benId = mongoose.Types.ObjectId.isValid(beneficiaryId)
    ? new mongoose.Types.ObjectId(beneficiaryId)
    : beneficiaryId;

  const goals = await TherapeuticGoal.find({
    beneficiaryId: benId,
    isDeleted: { $ne: true },
  })
    .lean()
    .catch(() => []);

  const map = new Map();
  for (const g of goals) {
    const measureIds = new Set();
    for (const obj of g.objectives || []) {
      if (obj.measureId) measureIds.add(String(obj.measureId));
      for (const link of obj.measureLinks || []) {
        if (link.measureId) measureIds.add(String(link.measureId));
      }
    }
    for (const mid of measureIds) {
      const key = `${String(beneficiaryId)}:${mid}`;
      if (!map.has(key) || (g.status === 'active' && map.get(key).status !== 'active')) {
        map.set(key, g);
      }
    }
  }
  return map;
}

// ── Branch outcomes helper ────────────────────────────────────────
async function listBranchOutcomes(branchId, opts = {}) {
  const MeasureApplication = Models.MeasureApplication();
  const Measure = Models.Measure();
  const Beneficiary = Models.Beneficiary();
  if (!MeasureApplication) return [];

  const branchObj = mongoose.Types.ObjectId.isValid(branchId)
    ? new mongoose.Types.ObjectId(branchId)
    : branchId;

  const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 365 * 86400000);
  const to = opts.to ? new Date(opts.to) : new Date();

  const apps = await MeasureApplication.find({
    branchId: branchObj,
    status: { $in: ['completed', 'locked'] },
    applicationDate: { $gte: from, $lte: to },
  })
    .sort({ applicationDate: 1 })
    .lean()
    .catch(() => []);

  const pairMap = new Map();
  for (const a of apps) {
    const key = `${String(a.beneficiaryId)}:${String(a.measureId)}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, {
        beneficiaryId: String(a.beneficiaryId),
        measureId: String(a.measureId),
        admins: [],
      });
    }
    pairMap.get(key).admins.push(a);
  }

  const measureIds = [...new Set([...pairMap.values()].map(p => p.measureId))];
  const beneficiaryIds = [...new Set([...pairMap.values()].map(p => p.beneficiaryId))];

  const [measures, beneficiaries] = await Promise.all([
    Measure
      ? Measure.find({ _id: { $in: measureIds.map(id => new mongoose.Types.ObjectId(id)) } })
          .select('code name name_ar scoringDirection')
          .lean()
          .catch(() => [])
      : [],
    Beneficiary
      ? Beneficiary.find({
          _id: { $in: beneficiaryIds.map(id => new mongoose.Types.ObjectId(id)) },
        })
          .select('firstName_ar lastName_ar fullNameArabic')
          .lean()
          .catch(() => [])
      : [],
  ]);

  const measureById = new Map(measures.map(m => [String(m._id), m]));
  const beneficiaryById = new Map(beneficiaries.map(b => [String(b._id), b]));

  const trendEngine = require('../services/measureTrendEngine.service');
  const rows = [];

  for (const pair of pairMap.values()) {
    const { beneficiaryId, measureId, admins } = pair;
    const m = measureById.get(measureId);
    if (!m) continue;

    const first = admins[0];
    const last = admins[admins.length - 1];
    let trend = null;
    try {
      trend = await trendEngine.analyze(beneficiaryId, m);
    } catch (err) {
      logger.warn('[LegacyAdapter] trend failed for branch outcome %s: %s', measureId, err.message);
    }

    const direction = m.scoringDirection === 'lower_better' ? -1 : 1;
    const delta =
      last.totalRawScore != null && first.totalRawScore != null
        ? Math.round((last.totalRawScore - first.totalRawScore) * direction * 100) / 100
        : null;

    const beneficiary = beneficiaryById.get(beneficiaryId);
    rows.push({
      measureId,
      measureCode: m.code || null,
      measureName_ar: m.name_ar || m.name || null,
      measureName_en: m.name || null,
      beneficiaryId,
      beneficiaryNameAr:
        beneficiary?.fullNameArabic ||
        [beneficiary?.firstName_ar, beneficiary?.lastName_ar].filter(Boolean).join(' ') ||
        null,
      adminCount: admins.length,
      baselineScore: first.totalRawScore,
      baselineDate: first.applicationDate,
      latestScore: last.totalRawScore,
      latestDate: last.applicationDate,
      deltaFromBaseline: delta,
      mcidValue: last.mcidAtAdministration?.value || null,
      mcidAchieved: false,
      trend: trend?.classification || null,
    });
  }

  return rows;
}

// ── Authentication + branch isolation ─────────────────────────────
router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

// ═══════════════════════════════════════════════════════════════════
// Measures
// ═══════════════════════════════════════════════════════════════════

// GET /api/v1/measures
router.get(
  '/measures',
  wrap(async (req, res) => {
    const {
      domain,
      categoryId,
      ageMonths,
      targetPopulation,
      informant,
      arabicValidated,
      licenseRequired,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const data = await measuresLibrarySvc.list({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search: search || '',
      category: domain || '',
      type: categoryId || '',
      targetPopulation: targetPopulation || '',
      isActive: 'true',
      sort: 'name',
    });

    let measures = (data.items || []).map(toMeasureShape);

    // Client-side filters for fields the service doesn't fully cover
    if (ageMonths) {
      const am = parseInt(ageMonths, 10);
      if (Number.isFinite(am)) {
        measures = measures.filter(m => {
          if (m.targetAgeMinMonths != null && am < m.targetAgeMinMonths) return false;
          if (m.targetAgeMaxMonths != null && am > m.targetAgeMaxMonths) return false;
          return true;
        });
      }
    }
    if (informant) {
      measures = measures.filter(m => m.informant.includes(informant));
    }
    if (arabicValidated === 'false') {
      measures = measures.filter(m => !m.arabicValidated);
    } else if (arabicValidated === 'true') {
      measures = measures.filter(m => m.arabicValidated);
    }
    if (licenseRequired === 'true') {
      measures = measures.filter(m => m.licenseRequired);
    } else if (licenseRequired === 'false') {
      measures = measures.filter(m => !m.licenseRequired);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const total = data.total || measures.length;

    res.json({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: measures,
      total,
      page: pageNum,
      limit: limitNum,
    });
  })
);

// GET /api/v1/measure-categories
router.get(
  '/measure-categories',
  wrap(async (req, res) => {
    const data = await measuresLibrarySvc.list({ limit: 1000 });
    const categories = new Map();
    for (const m of data.items || []) {
      const cat = m.category;
      if (!cat || categories.has(cat)) continue;
      categories.set(cat, {
        id: cat,
        nameAr: cat,
        nameEn: cat,
        domain: cat,
        description: null,
        icon: null,
        order: categories.size,
        isActive: true,
      });
    }

    res.json({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: [...categories.values()],
    });
  })
);

// GET /api/v1/measures/:id
router.get(
  '/measures/:id',
  wrap(async (req, res) => {
    const raw = await measuresLibrarySvc.getOne(req.params.id);
    if (!raw) {
      return res
        .status(404)
        .json({ success: false, statusCode: 404, message: 'المقياس غير موجود' });
    }
    const detail = toDetailShape(raw);
    res.json({ success: true, statusCode: 200, message: 'OK', data: detail });
  })
);

// GET /api/v1/measures/:id/items
router.get(
  '/measures/:id/items',
  wrap(async (req, res) => {
    const raw = await measuresLibrarySvc.getScoringGuide(req.params.id);
    if (!raw) {
      return res.status(404).json({ data: [], total: 0, page: 1, limit: 20 });
    }

    let items = [];
    let increment = 1;
    const measureId = raw._id ? String(raw._id) : req.params.id;
    for (const domain of raw.domains || []) {
      for (const item of domain.items || []) {
        items.push(toItemShape(item, domain, measureId, increment++));
      }
    }

    if (req.query.subscaleId) {
      const sid = String(req.query.subscaleId);
      items = items.filter(it => it.subscaleId === sid);
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 1000);
    const total = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);

    res.json({ data: paged, total, page, limit });
  })
);

// GET /api/v1/measures/:id/cutoffs
router.get(
  '/measures/:id/cutoffs',
  wrap(async (req, res) => {
    const raw = await measuresLibrarySvc.getScoringGuide(req.params.id);
    if (!raw) return res.json([]);
    const measureId = raw._id ? String(raw._id) : req.params.id;
    const cutoffs = (raw.scoringRules || []).map((r, i) => toCutoffShape(r, i, measureId));
    res.json(cutoffs);
  })
);

// GET /api/v1/measure-recommendations
router.get(
  '/measure-recommendations',
  wrap(async (req, res) => {
    const { beneficiaryId, maxPriority } = req.query;
    const suggestions = await measuresLibrarySvc.suggest({ beneficiaryId });
    let mapped = (suggestions || []).map((m, idx) => ({
      measure: toMeasureShape(m),
      priority: idx + 1,
      reasonAr: 'مقترح بناءً على ملف المستفيد',
      matchedDisabilityType: 'general',
    }));

    if (maxPriority) {
      const mp = parseInt(maxPriority, 10);
      if (Number.isFinite(mp)) mapped = mapped.filter(r => r.priority <= mp);
    }

    res.json(mapped);
  })
);

// ═══════════════════════════════════════════════════════════════════
// Outcomes
// ═══════════════════════════════════════════════════════════════════

// GET /api/v1/outcomes
router.get(
  '/outcomes',
  wrap(async (req, res) => {
    const { beneficiaryId, measureId, isActive, trend, branchId } = req.query;
    let outcomes = [];

    if (beneficiaryId) {
      const rollup = await measureOutcomesAggregator.aggregateBeneficiary(beneficiaryId);
      if (rollup && rollup.error === 'models_unavailable') {
        return res
          .status(503)
          .json({ success: false, message: 'Required collections not registered yet' });
      }
      const goalMap = await _findGoalsForOutcomes(beneficiaryId);
      outcomes = (rollup.measures || []).map(row =>
        toOutcomeMeasure(row, beneficiaryId, goalMap.get(`${beneficiaryId}:${row.measureId}`))
      );
    } else {
      const effectiveBranchId = req.user?.branchId || branchId;
      if (!effectiveBranchId) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'branchId مطلوب',
        });
      }
      const rows = await listBranchOutcomes(effectiveBranchId);
      outcomes = rows.map(r => toOutcomeMeasure(r, r.beneficiaryId));
    }

    // Client-side filters
    if (measureId) {
      outcomes = outcomes.filter(o => o.measureId === measureId);
    }
    if (trend) {
      outcomes = outcomes.filter(o => o.trend === trend);
    }
    if (isActive === 'true') {
      outcomes = outcomes.filter(o => o.isActive);
    } else if (isActive === 'false') {
      outcomes = outcomes.filter(o => !o.isActive);
    }

    res.json({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: outcomes,
      total: outcomes.length,
    });
  })
);

// GET /api/v1/outcomes/:id
router.get(
  '/outcomes/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) {
      return res.status(404).json({ success: false, message: 'معرّف النتيجة غير صالح' });
    }
    const [beneficiaryId, measureId] = id.split(':');

    const Measure = Models.Measure();
    let measureCode = measureId;
    if (Measure) {
      const measure = await Measure.findById(measureId)
        .select('code')
        .lean()
        .catch(() => null);
      if (measure && measure.code) measureCode = measure.code;
    }

    const report = await measureClinicalReport.generate(beneficiaryId, {
      includeCorrections: false,
    });
    if (report && report.error === 'models_unavailable') {
      return res
        .status(503)
        .json({ success: false, message: 'Required collections not registered yet' });
    }

    const row = (report.measures || []).find(
      m => String(m.measureCode) === measureCode || String(m.measureCode) === measureId
    );
    if (!row) {
      // Fallback: try matching by measureId via the aggregator
      const aggregator = await measureOutcomesAggregator.aggregateBeneficiary(beneficiaryId);
      const aggRow = (aggregator.measures || []).find(m => String(m.measureId) === measureId);
      if (!aggRow) {
        return res.status(404).json({ success: false, message: 'النتيجة غير موجودة' });
      }
      return res.json({
        success: true,
        statusCode: 200,
        message: 'OK',
        data: toOutcomeDetail(aggRow, beneficiaryId, [], []),
      });
    }

    res.json({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: toOutcomeDetail(row, beneficiaryId, row.adminHistory, []),
    });
  })
);

// GET /api/v1/outcomes/:id/timeline
router.get(
  '/outcomes/:id/timeline',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) return res.json([]);
    const [beneficiaryId, measureId] = id.split(':');

    const Measure = Models.Measure();
    let measureCode = measureId;
    if (Measure) {
      const measure = await Measure.findById(measureId)
        .select('code')
        .lean()
        .catch(() => null);
      if (measure && measure.code) measureCode = measure.code;
    }

    const report = await measureClinicalReport.generate(beneficiaryId, {
      includeCorrections: false,
    });
    if (report && report.error === 'models_unavailable') return res.json([]);

    const row = (report.measures || []).find(
      m => String(m.measureCode) === measureCode || String(m.measureCode) === measureId
    );
    const history = row?.adminHistory || [];

    const timeline = history.map(a => ({
      assessmentId: a.applicationId || null,
      date: a.applicationDate || null,
      rawScore: a.totalRawScore != null ? a.totalRawScore : null,
      standardScore: null,
      percentileScore: null,
      severityLevel: null,
      changeFromBaseline: a.changeFromBaseline != null ? a.changeFromBaseline : null,
      percentChangeFromBaseline: null,
    }));

    res.json(timeline);
  })
);

// POST /api/v1/outcomes (initialize)
router.post(
  '/outcomes',
  wrap(async (req, res) => {
    const { beneficiaryId, measureId, baselineAssessmentId, targetScore, targetDate } = req.body;
    if (!beneficiaryId || !measureId) {
      return res.status(400).json({
        success: false,
        message: 'beneficiaryId و measureId مطلوبان',
      });
    }

    const Measure = Models.Measure();
    const EpisodeOfCare = Models.EpisodeOfCare();
    const TherapeuticGoal = Models.TherapeuticGoal();
    if (!Measure || !EpisodeOfCare || !TherapeuticGoal) {
      return res
        .status(503)
        .json({ success: false, message: 'Required collections not registered yet' });
    }

    const measure = await Measure.findById(measureId)
      .lean()
      .catch(() => null);
    if (!measure) {
      return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    }

    const benObjId = mongoose.Types.ObjectId.isValid(beneficiaryId)
      ? new mongoose.Types.ObjectId(beneficiaryId)
      : beneficiaryId;

    const episode = await EpisodeOfCare.findOne({
      beneficiaryId: benObjId,
      status: { $in: ['active', 'planned'] },
    })
      .sort({ startDate: -1 })
      .lean()
      .catch(() => null);

    if (!episode) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد حلقة رعاية نشطة للمستفيد',
      });
    }

    const userId = req.user?._id || req.user?.id;
    const branchId = req.user?.branchId || req.body.branchId || episode.branchId;
    const title = `${measure.name_ar || measure.code} - متابعة نتيجة`;

    // Resolve baseline from the referenced assessment/application.
    let baseline = null;
    if (baselineAssessmentId && mongoose.Types.ObjectId.isValid(baselineAssessmentId)) {
      const MeasureApplication = Models.MeasureApplication();
      const assessment = await MeasureApplication.findById(
        new mongoose.Types.ObjectId(baselineAssessmentId)
      )
        .lean()
        .catch(() => null);
      if (assessment && assessment.totalRawScore != null) {
        baseline = {
          value: assessment.totalRawScore,
          description: 'الدرجة الأساسية',
          date: assessment.applicationDate || null,
        };
      }
    }

    const effectiveTargetScore = targetScore != null ? Number(targetScore) : (baseline?.value ?? 0);

    const goal = new TherapeuticGoal({
      beneficiaryId: benObjId,
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : undefined,
      episodeId: episode._id,
      measureApplicationId:
        baselineAssessmentId && mongoose.Types.ObjectId.isValid(baselineAssessmentId)
          ? new mongoose.Types.ObjectId(baselineAssessmentId)
          : undefined,
      title,
      title_ar: title,
      type: 'short_term',
      startDate: new Date(),
      targetDate: targetDate ? new Date(targetDate) : null,
      baseline,
      target: {
        value: effectiveTargetScore,
        description: 'الهدف المستهدف من المقياس',
        criteria: 'تحقيق الهدف المحدد',
      },
      status: 'active',
      objectives: [
        {
          name: 'متابعة النتيجة',
          name_ar: 'متابعة النتيجة',
          order: 0,
          measureLinks: [
            {
              measureId: new mongoose.Types.ObjectId(measureId),
              measureCode: measure.code,
              linkType: 'PRIMARY',
              weight: 1,
              linkRationale: 'رابط أساسي لمتابعة نتيجة المقياس',
              interventionRefs: ['outcome-tracking'],
              expectedTarget: { value: effectiveTargetScore },
            },
          ],
        },
      ],
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await goal.save();

    const outcome = toOutcomeMeasure(
      {
        measureId,
        measureCode: measure.code,
        measureName_ar: measure.name_ar || measure.name,
        adminCount: 0,
        baselineScore: baseline?.value ?? null,
        baselineDate: baseline?.date ?? null,
        latestScore: null,
        deltaFromBaseline: null,
        trend: null,
      },
      beneficiaryId,
      goal.toObject()
    );

    res
      .status(201)
      .json({ success: true, statusCode: 201, message: 'تم إنشاء متابعة النتيجة', data: outcome });
  })
);

// PATCH /api/v1/outcomes/:id/target
router.patch(
  '/outcomes/:id/target',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) {
      return res.status(404).json({ success: false, message: 'معرّف النتيجة غير صالح' });
    }
    const [beneficiaryId, measureId] = id.split(':');
    const { targetScore, targetDate } = req.body;

    const goal = await _findOutcomeGoal(beneficiaryId, measureId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'متابعة النتيجة غير موجودة' });
    }

    const TherapeuticGoal = Models.TherapeuticGoal();
    const userId = req.user?._id || req.user?.id;
    const update = { updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined };
    if (targetScore != null) update['target.value'] = Number(targetScore);
    if (targetDate) update.targetDate = new Date(targetDate);

    const updated = await TherapeuticGoal.findByIdAndUpdate(
      goal._id,
      { $set: update },
      { new: true }
    )
      .lean()
      .catch(() => null);

    if (!updated) {
      return res.status(500).json({ success: false, message: 'فشل تحديث الهدف' });
    }

    const outcome = toOutcomeMeasure(
      {
        measureId,
        measureCode: goal.measureCode || null,
        measureName_ar: null,
        adminCount: 0,
        baselineScore: null,
        latestScore: null,
        deltaFromBaseline: null,
        trend: null,
      },
      beneficiaryId,
      updated
    );

    res.json({ success: true, statusCode: 200, message: 'OK', data: outcome });
  })
);

// POST /api/v1/outcomes/:id/notes
router.post(
  '/outcomes/:id/notes',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) {
      return res.status(404).json({ success: false, message: 'معرّف النتيجة غير صالح' });
    }
    const [beneficiaryId, measureId] = id.split(':');
    const { noteAr, assessmentId } = req.body;
    if (!noteAr) {
      return res.status(400).json({ success: false, message: 'noteAr مطلوب' });
    }

    const goal = await _findOutcomeGoal(beneficiaryId, measureId);
    const userId = req.user?._id || req.user?.id;
    const now = new Date();
    const noteLine = `[${now.toISOString()}] ${noteAr}`;

    let progressEntryId = null;
    if (goal) {
      const TherapeuticGoal = Models.TherapeuticGoal();
      const progressEntry = {
        date: now,
        value: goal.currentProgress || 0,
        notes: noteAr,
        recordedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      };
      const updated = await TherapeuticGoal.findByIdAndUpdate(
        goal._id,
        {
          $push: { progressHistory: progressEntry },
          $set: {
            notes: goal.notes ? `${noteLine}\n${goal.notes}` : noteLine,
            updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          },
        },
        { new: true }
      )
        .lean()
        .catch(() => null);
      if (updated && Array.isArray(updated.progressHistory) && updated.progressHistory.length) {
        progressEntryId = String(updated.progressHistory[updated.progressHistory.length - 1]._id);
      }
    }

    const note = {
      id: progressEntryId || new mongoose.Types.ObjectId().toString(),
      outcomeMeasureId: id,
      assessmentId: assessmentId || null,
      noteAr,
      authorId: userId || null,
      createdAt: now,
    };

    res
      .status(201)
      .json({ success: true, statusCode: 201, message: 'تمت إضافة الملاحظة', data: note });
  })
);

// PATCH /api/v1/outcomes/:id/archive
router.patch(
  '/outcomes/:id/archive',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) {
      return res.status(404).json({ success: false, message: 'معرّف النتيجة غير صالح' });
    }
    const [beneficiaryId, measureId] = id.split(':');

    const goal = await _findOutcomeGoal(beneficiaryId, measureId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'متابعة النتيجة غير موجودة' });
    }

    const TherapeuticGoal = Models.TherapeuticGoal();
    const userId = req.user?._id || req.user?.id;
    const updated = await TherapeuticGoal.findByIdAndUpdate(
      goal._id,
      {
        $set: {
          status: 'discontinued',
          updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        },
      },
      { new: true }
    )
      .lean()
      .catch(() => null);

    if (!updated) {
      return res.status(500).json({ success: false, message: 'فشل أرشفة النتيجة' });
    }

    const outcome = toOutcomeMeasure(
      {
        measureId,
        measureCode: goal.measureCode || null,
        measureName_ar: null,
        adminCount: 0,
        baselineScore: null,
        latestScore: null,
        deltaFromBaseline: null,
        trend: null,
      },
      beneficiaryId,
      updated
    );

    res.json({ success: true, statusCode: 200, message: 'OK', data: outcome });
  })
);

// PATCH /api/v1/outcomes/:id/reactivate
router.patch(
  '/outcomes/:id/reactivate',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (!id.includes(':')) {
      return res.status(404).json({ success: false, message: 'معرّف النتيجة غير صالح' });
    }
    const [beneficiaryId, measureId] = id.split(':');

    const goal = await _findOutcomeGoal(beneficiaryId, measureId);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'متابعة النتيجة غير موجودة' });
    }

    const TherapeuticGoal = Models.TherapeuticGoal();
    const userId = req.user?._id || req.user?.id;
    const updated = await TherapeuticGoal.findByIdAndUpdate(
      goal._id,
      {
        $set: {
          status: 'active',
          updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        },
      },
      { new: true }
    )
      .lean()
      .catch(() => null);

    if (!updated) {
      return res.status(500).json({ success: false, message: 'فشل إعادة تفعيل النتيجة' });
    }

    const outcome = toOutcomeMeasure(
      {
        measureId,
        measureCode: goal.measureCode || null,
        measureName_ar: null,
        adminCount: 0,
        baselineScore: null,
        latestScore: null,
        deltaFromBaseline: null,
        trend: null,
      },
      beneficiaryId,
      updated
    );

    res.json({ success: true, statusCode: 200, message: 'OK', data: outcome });
  })
);

// ── Error handler for this router ─────────────────────────────────
router.use((err, req, res, _next) => {
  logger.warn('[LegacyAdapter] unhandled route error: %s', err.message);
  safeError(res, err, 'clinical-legacy-adapter');
});

module.exports = router;
