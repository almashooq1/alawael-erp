'use strict';

/**
 * orientation-mobility.routes.js — Wave 1021.
 *
 * Orientation & Mobility (O&M) assessment + training-plan admin surface.
 * Mounted via dualMountAuth at /api/(v1/)?orientation-mobility.
 *
 * Endpoints:
 *   GET    /needs-support            — low-independence cohort (latest finalized per beneficiary)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + latest
 *   GET    /stats                    — independence-level distribution for a range
 *   GET    /due                      — overdue + upcoming reassessments
 *   GET    /:id
 *   POST   /                         — record assessment (server computes independence)
 *   POST   /:id/finalize             — finalize (immutable after)
 *   POST   /:id/add-goal             — append a training goal (while draft)
 *   PATCH  /:id                      — correct (only while status=draft)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const OrientationMobilityAssessment = require('../models/OrientationMobilityAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// Branch-scope every endpoint (W269/W445). Model carries `branchId`; all
// list filters + instance loads flow through branchFilter so cross-tenant
// IDOR is closed by construction.
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
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
  'teacher',
];
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  VISION_STATUSES,
  MOBILITY_AIDS,
  ASSESSMENT_TYPES,
  PROFICIENCY_LEVELS,
  INDEPENDENCE_LEVELS,
  DOMAINS,
  TRAINING_GOALS,
  computeIndependence,
} = OrientationMobilityAssessment;

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

// Pull the domain proficiency fields out of a body/doc (single source of
// truth so create + patch score identically).
function extractDomains(src) {
  const out = {};
  for (const d of DOMAINS) {
    out[d] = PROFICIENCY_LEVELS.includes(String(src[d])) ? String(src[d]) : 'not_assessed';
  }
  return out;
}

// ── GET /needs-support — low-independence cohort ──────────────────────
router.get('/needs-support', requireRole(READ_ROLES), async (req, res) => {
  try {
    const match = { ...branchFilter(req), status: 'finalized' };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const latest = await OrientationMobilityAssessment.aggregate([
      { $match: match },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: '$beneficiaryId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $match: { independenceLevel: { $in: ['dependent', 'emerging'] } } },
      { $sort: { independenceScore: 1, date: -1 } },
    ]);
    const items = await hydrate(latest);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'om.needsSupport');
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
    if (req.query.level && INDEPENDENCE_LEVELS.includes(String(req.query.level))) {
      filter.independenceLevel = String(req.query.level);
    }
    if (req.query.visionStatus && VISION_STATUSES.includes(String(req.query.visionStatus))) {
      filter.visionStatus = String(req.query.visionStatus);
    }
    if (req.query.status && ['draft', 'finalized'].includes(String(req.query.status))) {
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
      OrientationMobilityAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      OrientationMobilityAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'om.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await OrientationMobilityAssessment.find({
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
      currentIndependence: latestFinalized ? latestFinalized.independenceLevel : null,
    });
  } catch (err) {
    return safeError(res, err, 'om.byBeneficiary');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), date: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await OrientationMobilityAssessment.find(filter)
      .select('independenceLevel visionStatus status independenceScore')
      .lean();
    const byLevel = INDEPENDENCE_LEVELS.reduce((acc, lv) => ((acc[lv] = 0), acc), {});
    const byVision = VISION_STATUSES.reduce((acc, v) => ((acc[v] = 0), acc), {});
    let finalized = 0;
    let totalScore = 0;
    for (const r of raw) {
      if (r.independenceLevel) byLevel[r.independenceLevel] = (byLevel[r.independenceLevel] || 0) + 1;
      if (r.visionStatus) byVision[r.visionStatus] = (byVision[r.visionStatus] || 0) + 1;
      if (r.status === 'finalized') finalized++;
      if (typeof r.independenceScore === 'number') totalScore += r.independenceScore;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      finalized,
      byLevel,
      byVision,
      averageScore: raw.length ? Math.round(totalScore / raw.length) : 0,
    });
  } catch (err) {
    return safeError(res, err, 'om.stats');
  }
});

// ── GET /due — overdue + upcoming reassessments ───────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const windowDays = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const base = {
      ...branchFilter(req),
      status: 'finalized',
      nextReviewDue: { $ne: null, $lte: horizon },
    };
    const raw = await OrientationMobilityAssessment.find(base)
      .sort({ nextReviewDue: 1 })
      .limit(300)
      .lean();
    const overdue = [];
    const upcoming = [];
    for (const r of raw) {
      (new Date(r.nextReviewDue) < now ? overdue : upcoming).push(r);
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
    return safeError(res, err, 'om.due');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await OrientationMobilityAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'om.get');
  }
});

// ── POST / — record assessment ────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const domains = extractDomains(body);
    const computed = computeIndependence(domains);
    const date = body.date ? new Date(body.date) : new Date();
    const nextReviewDue = body.nextReviewDue ? new Date(body.nextReviewDue) : null;
    const goals = Array.isArray(body.trainingGoals)
      ? body.trainingGoals.map(s => String(s)).filter(s => TRAINING_GOALS.includes(s))
      : [];

    const doc = await OrientationMobilityAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      visionScreeningId:
        body.visionScreeningId && mongoose.isValidObjectId(body.visionScreeningId)
          ? body.visionScreeningId
          : null,
      date,
      assessmentType: ASSESSMENT_TYPES.includes(String(body.assessmentType))
        ? String(body.assessmentType)
        : 'initial',
      visionStatus: VISION_STATUSES.includes(String(body.visionStatus))
        ? String(body.visionStatus)
        : 'low_vision',
      primaryMobilityAid: MOBILITY_AIDS.includes(String(body.primaryMobilityAid))
        ? String(body.primaryMobilityAid)
        : 'long_cane',
      ...domains,
      independenceScore: computed.score,
      independenceLevel: computed.level,
      trainingGoals: goals,
      sessionsPerWeek:
        typeof body.sessionsPerWeek === 'number' && body.sessionsPerWeek >= 0
          ? Math.min(14, body.sessionsPerWeek)
          : null,
      planNotes: String(body.planNotes || '').slice(0, 1000),
      nextReviewDue,
      notes: String(body.notes || '').slice(0, 1000),
      assessedBy: req.user?.id || null,
      assessedByName: req.user?.name || String(body.assessedByName || '').slice(0, 100),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'om.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await OrientationMobilityAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
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
    return safeError(res, err, 'om.finalize');
  }
});

// ── POST /:id/add-goal — append a training goal ───────────────────────
router.post('/:id/add-goal', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const goal = String(req.body?.goal || '');
    if (!TRAINING_GOALS.includes(goal)) {
      return res
        .status(400)
        .json({ success: false, message: `goal يجب أن يكون: ${TRAINING_GOALS.join(' | ')}` });
    }
    const row = await OrientationMobilityAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if (!row.trainingGoals.includes(goal)) row.trainingGoals.push(goal);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'om.addGoal');
  }
});

// ── PATCH /:id — correct while still 'draft' ──────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await OrientationMobilityAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    let domainsTouched = false;
    for (const d of DOMAINS) {
      if (d in req.body) {
        row[d] = req.body[d];
        domainsTouched = true;
      }
    }
    const otherEditable = [
      'assessmentType',
      'visionStatus',
      'primaryMobilityAid',
      'trainingGoals',
      'sessionsPerWeek',
      'planNotes',
      'nextReviewDue',
      'notes',
    ];
    for (const k of otherEditable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if (domainsTouched) {
      const computed = computeIndependence(extractDomains(row.toObject()));
      row.independenceScore = computed.score;
      row.independenceLevel = computed.level;
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'om.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await OrientationMobilityAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'om.delete');
  }
});

module.exports = router;
