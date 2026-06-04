/**
 * icf-assessments.routes.js
 * ══════════════════════════════════════════════════════════════════
 * International Classification of Functioning (ICF) Assessments API
 * تقييمات التصنيف الدولي للأداء الوظيفي والإعاقة والصحة
 *
 * Mounted at: /api/v1/icf-assessments
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../middleware/assertBranchMatch');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { fetchScopedByBeneficiary } = require('../utils/beneficiaryBranchGate');
const Beneficiary = require('../models/Beneficiary');
const { stripUpdateMeta } = require('../utils/sanitize');

// W440: auto-enforce branch ownership on every :beneficiaryId param.
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

async function icfTenantMatch(req) {
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return {};
  const ids = await Beneficiary.find(scope).select('_id').lean();
  return { beneficiaryId: { $in: ids.map(r => r._id) } };
}

// ── Canonical ICF assessment model (W850: drop IcfAssessment fallback — use ICFAssessment) ──
function getIcfAssessmentModel() {
  try {
    return mongoose.model('ICFAssessment');
  } catch (_e) {
    return require('../models/icf/ICFAssessment.model');
  }
}

// ── ICF code-reference model (W448 catalog, seeded via npm run seed:icf-codes) ──
// W692: /codes + /codes/tree were placeholders returning 5 hard-coded entries
// that SHADOWED the real DB-backed controller (this file mounts at
// _registry.js:663, before clinical-assessment.registry's controller route, so
// Express first-match wins). Both now query the canonical ICFCodeReference
// collection. The model registers itself on require; fall back gracefully when
// the model file is unavailable so the route never 500s on a cold module.
function IcfCodeReference() {
  try {
    return mongoose.model('ICFCodeReference');
  } catch (_e) {
    try {
      return require('../models/icf/ICFCodeReference.model');
    } catch (_e2) {
      return null;
    }
  }
}

// ── ICF normative-benchmark model (W706 — was a stub returning []/null) ──────
function IcfBenchmark() {
  try {
    return mongoose.model('ICFBenchmark');
  } catch (_e) {
    try {
      return require('../models/icf/ICFBenchmark.model');
    } catch (_e2) {
      return null;
    }
  }
}

// Empirical-rule z-score → percentile rank (matches icfAssessment.service).
function zToPercentile(z) {
  if (z <= -2) return 2;
  if (z <= -1) return 16;
  if (z <= 0) return 50;
  if (z <= 1) return 84;
  if (z <= 2) return 98;
  return 99;
}

/** Flatten canonical nested ICF chapter arrays + legacy flat arrays for benchmark join. */
function collectIcfQualifierItems(doc) {
  const items = [];
  const pushEntry = (entry, component) => {
    if (entry && entry.code && entry.qualifier != null && entry.qualifier < 8) {
      items.push({ code: entry.code, qualifier: entry.qualifier, component });
    }
  };
  for (const comp of [
    'bodyFunctions',
    'bodyStructures',
    'activities',
    'participation',
    'environmentalFactors',
  ]) {
    const val = doc[comp];
    if (Array.isArray(val)) {
      for (const entry of val) pushEntry(entry, comp);
    } else if (val && typeof val === 'object') {
      for (const chapterItems of Object.values(val)) {
        if (Array.isArray(chapterItems)) {
          for (const entry of chapterItems) pushEntry(entry, comp);
        }
      }
    }
  }
  for (const comp of ['activitiesParticipation']) {
    const val = doc[comp];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const chapterItems of Object.values(val)) {
        if (Array.isArray(chapterItems)) {
          for (const entry of chapterItems) pushEntry(entry, comp);
        }
      }
    }
  }
  return items;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ══════════════════════ CRUD ═══════════════════════════════════════════════ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { beneficiaryId, episodeId, status, limit = 20, skip = 0 } = req.query;
    const q = { isDeleted: { $ne: true }, ...(await icfTenantMatch(req)) };
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);
    if (episodeId) q.episodeId = new mongoose.Types.ObjectId(episodeId);
    if (status) q.status = status;
    const [data, total] = await Promise.all([
      M.find(q).sort({ assessmentDate: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const doc = await M.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const tenant = await icfTenantMatch(req);
    const [total, byStatus] = await Promise.all([
      M.countDocuments({ isDeleted: { $ne: true }, ...tenant }),
      M.aggregate([
        { $match: { isDeleted: { $ne: true }, ...tenant } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      success: true,
      data: { total, byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])) },
    });
  })
);

router.get(
  '/domain-distribution',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const tenant = await icfTenantMatch(req);
    const dist = await M.aggregate([
      { $match: { isDeleted: { $ne: true }, ...tenant } },
      {
        $project: {
          bodyFunctionsCount: { $size: { $ifNull: ['$bodyFunctions', []] } },
          activitiesCount: { $size: { $ifNull: ['$activities', []] } },
          participationCount: { $size: { $ifNull: ['$participation', []] } },
          environmentCount: { $size: { $ifNull: ['$environmentalFactors', []] } },
        },
      },
      {
        $group: {
          _id: null,
          avgBodyFunctions: { $avg: '$bodyFunctionsCount' },
          avgActivities: { $avg: '$activitiesCount' },
          avgParticipation: { $avg: '$participationCount' },
          avgEnvironment: { $avg: '$environmentCount' },
        },
      },
    ]);
    res.json({ success: true, data: dist[0] || {} });
  })
);

router.get(
  '/organization-report',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const tenant = await icfTenantMatch(req);
    const total = await M.countDocuments({ isDeleted: { $ne: true }, ...tenant });
    const recent = await M.find({ isDeleted: { $ne: true }, ...tenant })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, data: { total, recent } });
  })
);

// ── GET /codes — search the seeded ICF code catalog ─────────────────────────
// Filters: ?component=bodyFunctions|bodyStructures|activitiesParticipation|
//          environmentalFactors  ?chapter=N  ?level=1-4  ?parentCode=bN
//          ?coreSet=generic_brief  ?search=<text|code>  ?limit=N (default 200)
router.get(
  '/codes',
  asyncHandler(async (req, res) => {
    const M = IcfCodeReference();
    if (!M) return res.json({ success: true, data: [], total: 0 });

    const { component, chapter, level, parentCode, coreSet, search, limit = 200 } = req.query;
    const filter = { isActive: { $ne: false } };
    if (component) filter.component = component;
    if (chapter) filter.chapter = Number(chapter);
    if (level) filter.level = Number(level);
    if (parentCode) filter.parentCode = parentCode;
    if (coreSet) filter['coreSetMemberships.setName'] = coreSet;
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      filter.$or = [{ code: rx }, { title: rx }, { titleAr: rx }, { description: rx }];
    }

    const data = await M.find(filter)
      .sort({ code: 1 })
      .limit(Math.min(Number(limit) || 200, 2000))
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

// ── GET /codes/tree/:component — hierarchical tree (parentCode → children) ───
router.get(
  '/codes/tree/:component',
  asyncHandler(async (req, res) => {
    const M = IcfCodeReference();
    const { component } = req.params;
    if (!M) return res.json({ success: true, data: { component, codes: [] } });

    const codes = await M.find({ component, isActive: { $ne: false } })
      .sort({ code: 1 })
      .lean();

    const byCode = {};
    codes.forEach(c => {
      byCode[c.code] = { ...c, children: [] };
    });
    const roots = [];
    codes.forEach(c => {
      if (c.parentCode && byCode[c.parentCode]) byCode[c.parentCode].children.push(byCode[c.code]);
      else roots.push(byCode[c.code]);
    });
    res.json({ success: true, data: { component, codes: roots, total: codes.length } });
  })
);

// ── GET /benchmarks — list normative benchmarks (filters: code, component, ageGroup) ──
router.get(
  '/benchmarks',
  asyncHandler(async (req, res) => {
    const B = IcfBenchmark();
    if (!B) return res.json({ success: true, data: [], total: 0 });
    const { code, population, ageGroup, region } = req.query;
    const filter = { isActive: { $ne: false } };
    if (code) filter.code = code;
    if (population) filter.population = population;
    if (ageGroup) filter.ageGroup = ageGroup;
    if (region) filter.region = region;
    const data = await B.find(filter).sort({ code: 1 }).lean();
    res.json({ success: true, data, total: data.length });
  })
);

// ── POST /benchmarks — create one normative benchmark ───────────────────────
router.post(
  '/benchmarks',
  asyncHandler(async (req, res) => {
    const B = IcfBenchmark();
    if (!B) return res.status(503).json({ success: false, message: 'Benchmark store unavailable' });
    const doc = await B.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: doc });
  })
);

// ── POST /benchmarks/import — bulk upsert by code (idempotent) ──────────────
router.post(
  '/benchmarks/import',
  asyncHandler(async (req, res) => {
    const B = IcfBenchmark();
    if (!B) return res.status(503).json({ success: false, message: 'Benchmark store unavailable' });
    const rows = Array.isArray(req.body) ? req.body : req.body.benchmarks || [];
    if (!rows.length) return res.json({ success: true, data: { imported: 0 } });
    const ops = rows.map(r => ({
      updateOne: {
        filter: { code: r.code, population: r.population, ageGroup: r.ageGroup || null },
        update: { $set: stripUpdateMeta(r) },
        upsert: true,
      },
    }));
    const result = await B.bulkWrite(ops, { ordered: false });
    res.json({
      success: true,
      data: { imported: (result.upsertedCount || 0) + (result.modifiedCount || 0) },
    });
  })
);

router.get(
  '/beneficiary/:beneficiaryId/timeline',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const data = await M.find({
      beneficiaryId: req.params.beneficiaryId,
      isDeleted: { $ne: true },
      ...(await icfTenantMatch(req)),
    })
      .sort({ assessmentDate: 1 })
      .lean();
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiary/:beneficiaryId/comparative-report',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const data = await M.find({
      beneficiaryId: req.params.beneficiaryId,
      isDeleted: { $ne: true },
      ...(await icfTenantMatch(req)),
    })
      .sort({ assessmentDate: -1 })
      .limit(5)
      .lean();
    res.json({ success: true, data: { assessments: data, total: data.length } });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { doc, denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      select: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    const doc = await M.findByIdAndUpdate(
      req.params.id,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      select: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    const doc = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: doc });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      select: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

router.get(
  '/:id/compare',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { doc, denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    res.json({ success: true, data: { current: doc, previous: null } });
  })
);

// ── GET /:id/benchmark — compare this assessment's qualifiers to ICF norms ───
// Self-contained: reads the assessment's own component arrays + joins ICFBenchmark
// by code (qualifier vs mean/SD → z-score → percentile). Empty when unseeded.
router.get(
  '/:id/benchmark',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const B = IcfBenchmark();
    const { doc, denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });

    const items = collectIcfQualifierItems(doc);

    if (!B || !items.length) {
      return res.json({ success: true, data: { comparisons: [], benchmarkedCount: 0 } });
    }

    const norms = await B.find({
      code: { $in: [...new Set(items.map(i => i.code))] },
      isActive: { $ne: false },
    }).lean();
    const normByCode = Object.fromEntries(norms.map(n => [n.code, n]));

    const comparisons = items
      .filter(i => normByCode[i.code])
      .map(i => {
        const n = normByCode[i.code];
        const sd = n.standardDeviation;
        const z = sd ? (i.qualifier - n.mean) / sd : null;
        return {
          code: i.code,
          component: i.component,
          qualifier: i.qualifier,
          normMean: n.mean,
          standardDeviation: sd ?? null,
          zScore: z != null ? Number(z.toFixed(2)) : null,
          percentileRank: z != null ? zToPercentile(z) : null,
          ageGroup: n.ageGroup || null,
          dataSource: n.dataSource || null,
        };
      });

    res.json({
      success: true,
      data: { comparisons, benchmarkedCount: comparisons.length, totalCodes: items.length },
    });
  })
);

router.get(
  '/:id/report',
  asyncHandler(async (req, res) => {
    const M = getIcfAssessmentModel();
    const { doc, denied } = await fetchScopedByBeneficiary(M, req.params.id, req, res, {
      beneficiaryField: 'beneficiaryId',
      lean: true,
    });
    if (denied) return;
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

module.exports = router;
