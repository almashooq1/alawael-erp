'use strict';

/**
 * falls-risk-assessment.routes.js — Wave 1010.
 *
 * Falls-risk screening + prevention-plan admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?falls-risk-assessment.
 *
 * Endpoints:
 *   GET    /high-risk                — current high-risk cohort (latest finalized per beneficiary)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history (last 100) + latest
 *   GET    /stats                    — risk-level distribution for a range
 *   GET    /due                      — overdue + upcoming reassessments
 *   GET    /:id
 *   POST   /                         — record assessment (server computes score/level)
 *   POST   /:id/finalize             — finalize (immutable after)
 *   POST   /:id/add-intervention     — append a prevention intervention (while draft)
 *   PATCH  /:id                      — correct (only while status=draft)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const FallsRiskAssessment = require('../models/FallsRiskAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// Branch-scope every endpoint (W269/W445 doctrine). Model carries
// `branchId`; list filters + instance loads all flow through branchFilter
// so cross-tenant IDOR (read/modify/delete any branch by ObjectId guess)
// is closed by construction.
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physician',
  'nurse',
  'teacher',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physician',
  'nurse',
];
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  TOOLS,
  RISK_LEVELS,
  ASSESSMENT_TYPES,
  GAIT_LEVELS,
  MOBILITY_AIDS,
  SUPERVISION_LEVELS,
  STATUSES,
  INTERVENTIONS,
  computeRisk,
} = FallsRiskAssessment;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

// Pull just the scoring inputs out of a request body (single source of
// truth so create + patch score identically).
function extractFactors(body) {
  return {
    historyOfFalling: !!body.historyOfFalling,
    numberOfFallsLast6Months:
      typeof body.numberOfFallsLast6Months === 'number' && body.numberOfFallsLast6Months >= 0
        ? Math.min(500, Math.round(body.numberOfFallsLast6Months))
        : 0,
    gaitBalanceImpairment: GAIT_LEVELS.includes(String(body.gaitBalanceImpairment))
      ? String(body.gaitBalanceImpairment)
      : 'none',
    mobilityAid: MOBILITY_AIDS.includes(String(body.mobilityAid))
      ? String(body.mobilityAid)
      : 'none',
    visualImpairment: !!body.visualImpairment,
    cognitiveBehavioralImpairment: !!body.cognitiveBehavioralImpairment,
    seizureDisorder: !!body.seizureDisorder,
    highRiskMedication: !!body.highRiskMedication,
    continenceUrgency: !!body.continenceUrgency,
  };
}

// ── GET /high-risk — current high-risk cohort ─────────────────────────
router.get('/high-risk', requireRole(READ_ROLES), async (req, res) => {
  try {
    const match = { ...branchFilter(req), status: 'finalized' };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    // Latest finalized assessment per beneficiary, then keep only high.
    const latest = await FallsRiskAssessment.aggregate([
      { $match: match },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: '$beneficiaryId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $match: { riskLevel: 'high' } },
      { $sort: { riskScore: -1, date: -1 } },
    ]);
    const items = await hydrate(latest);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.highRisk');
  }
});

// ── GET / — list ──────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.riskLevel && RISK_LEVELS.includes(String(req.query.riskLevel))) {
      filter.riskLevel = String(req.query.riskLevel);
    }
    if (req.query.tool && TOOLS.includes(String(req.query.tool))) {
      filter.tool = String(req.query.tool);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      FallsRiskAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      FallsRiskAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await FallsRiskAssessment.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    const latestFinalized = items.find(r => r.status === 'finalized') || null;
    res.json({
      success: true,
      items,
      count: items.length,
      latest: items[0] || null,
      latestFinalized,
      currentRiskLevel: latestFinalized ? latestFinalized.riskLevel : null,
    });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.byBeneficiary');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), date: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await FallsRiskAssessment.find(filter)
      .select('riskLevel tool assessmentType status riskScore')
      .lean();
    const byLevel = RISK_LEVELS.reduce((acc, lv) => ((acc[lv] = 0), acc), {});
    const byTool = TOOLS.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let finalized = 0;
    let totalScore = 0;
    for (const r of raw) {
      if (r.riskLevel) byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1;
      if (r.tool) byTool[r.tool] = (byTool[r.tool] || 0) + 1;
      if (r.status === 'finalized') finalized++;
      if (typeof r.riskScore === 'number') totalScore += r.riskScore;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      finalized,
      byLevel,
      byTool,
      averageScore: raw.length ? Math.round(totalScore / raw.length) : 0,
    });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.stats');
  }
});

// ── GET /due — overdue + upcoming reassessments ───────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const windowDays = Math.min(180, Math.max(1, parseInt(req.query.days, 10) || 14));
    const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const base = {
      ...branchFilter(req),
      status: 'finalized',
      nextReviewDue: { $ne: null, $lte: horizon },
    };
    const raw = await FallsRiskAssessment.find(base).sort({ nextReviewDue: 1 }).limit(300).lean();
    const overdue = [];
    const upcoming = [];
    for (const r of raw) {
      const due = new Date(r.nextReviewDue);
      (due < now ? overdue : upcoming).push(r);
    }
    const [hydOverdue, hydUpcoming] = await Promise.all([hydrate(overdue), hydrate(upcoming)]);
    res.json({
      success: true,
      overdue: hydOverdue,
      upcoming: hydUpcoming,
      overdueCount: hydOverdue.length,
      upcomingCount: hydUpcoming.length,
      windowDays,
    });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.due');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await FallsRiskAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.get');
  }
});

// ── POST / — record assessment ────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const tool = TOOLS.includes(String(body.tool)) ? String(body.tool) : 'morse';
    const factors = extractFactors(body);
    const computed = computeRisk(factors);
    // Server is authoritative on score. Level is computed too, but a
    // structured clinical_judgment screen may override the level (the
    // additive bands don't model profound-ID presentations well).
    let riskLevel = computed.level;
    if (tool === 'clinical_judgment' && RISK_LEVELS.includes(String(body.riskLevel))) {
      riskLevel = String(body.riskLevel);
    }

    const date = body.date ? new Date(body.date) : new Date();
    const lastFallDate = body.lastFallDate ? new Date(body.lastFallDate) : null;
    const nextReviewDue = body.nextReviewDue ? new Date(body.nextReviewDue) : null;

    const interventions = Array.isArray(body.preventionInterventions)
      ? body.preventionInterventions
          .map(s => String(s))
          .filter(s => INTERVENTIONS.includes(s))
      : [];

    const doc = await FallsRiskAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date,
      assessmentType: ASSESSMENT_TYPES.includes(String(body.assessmentType))
        ? String(body.assessmentType)
        : 'initial',
      tool,
      ...factors,
      lastFallDate,
      environmentalHazards: Array.isArray(body.environmentalHazards)
        ? body.environmentalHazards.slice(0, 20).map(s => String(s).slice(0, 120))
        : [],
      riskScore: computed.score,
      riskLevel,
      preventionInterventions: interventions,
      supervisionLevel: SUPERVISION_LEVELS.includes(String(body.supervisionLevel))
        ? String(body.supervisionLevel)
        : 'independent',
      preventionNotes: String(body.preventionNotes || '').slice(0, 1000),
      nextReviewDue,
      notes: String(body.notes || '').slice(0, 1000),
      assessedBy: req.user?.id || null,
      assessedByName: req.user?.name || String(body.assessedByName || '').slice(0, 100),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await FallsRiskAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'التقييم سبق وأن تم اعتماده' });
    }
    row.finalizedBy = req.user?.id || null;
    row.finalizedByName = req.user?.name || String(req.body?.finalizerName || '').slice(0, 100);
    row.finalizedAt = new Date();
    row.status = 'finalized';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.finalize');
  }
});

// ── POST /:id/add-intervention — append a prevention intervention ─────
router.post('/:id/add-intervention', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const intervention = String(req.body?.intervention || '');
    if (!INTERVENTIONS.includes(intervention)) {
      return res
        .status(400)
        .json({ success: false, message: `intervention يجب أن يكون: ${INTERVENTIONS.join(' | ')}` });
    }
    const row = await FallsRiskAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if (!row.preventionInterventions.includes(intervention)) {
      row.preventionInterventions.push(intervention);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.addIntervention');
  }
});

// ── PATCH /:id — correct while still 'draft' ──────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await FallsRiskAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    // Mutate scoring factors, then re-derive the score so the stored
    // result never drifts from the inputs.
    const factorKeys = [
      'historyOfFalling',
      'numberOfFallsLast6Months',
      'gaitBalanceImpairment',
      'mobilityAid',
      'visualImpairment',
      'cognitiveBehavioralImpairment',
      'seizureDisorder',
      'highRiskMedication',
      'continenceUrgency',
    ];
    let factorsTouched = false;
    for (const k of factorKeys) {
      if (k in req.body) {
        row[k] = req.body[k];
        factorsTouched = true;
      }
    }
    const otherEditable = [
      'assessmentType',
      'tool',
      'lastFallDate',
      'environmentalHazards',
      'preventionInterventions',
      'supervisionLevel',
      'preventionNotes',
      'nextReviewDue',
      'notes',
    ];
    for (const k of otherEditable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if (factorsTouched || 'tool' in req.body) {
      const computed = computeRisk(extractFactors(row.toObject()));
      row.riskScore = computed.score;
      // Preserve clinical_judgment override only if the caller didn't
      // change factors and explicitly provided a level.
      if (!(row.tool === 'clinical_judgment' && RISK_LEVELS.includes(String(req.body.riskLevel)))) {
        row.riskLevel = computed.level;
      } else {
        row.riskLevel = String(req.body.riskLevel);
      }
    } else if (row.tool === 'clinical_judgment' && RISK_LEVELS.includes(String(req.body.riskLevel))) {
      row.riskLevel = String(req.body.riskLevel);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await FallsRiskAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'fallsRisk.delete');
  }
});

module.exports = router;
