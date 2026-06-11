'use strict';

/**
 * sleep-assessment.routes.js — Wave 1020.
 *
 * Sleep screening + sleep-hygiene plan admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?sleep-assessment.
 *
 * Endpoints:
 *   GET    /high-severity            — current high-severity cohort (latest finalized per beneficiary)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + latest
 *   GET    /stats                    — severity-level distribution for a range
 *   GET    /due                      — overdue + upcoming reassessments
 *   GET    /:id
 *   POST   /                         — record assessment (server computes severity)
 *   POST   /:id/finalize             — finalize (immutable after)
 *   POST   /:id/add-intervention     — append a sleep-hygiene intervention (while draft)
 *   PATCH  /:id                      — correct (only while status=draft)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SleepAssessment = require('../models/SleepAssessment');
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
  SEVERITY_LEVELS,
  ASSESSMENT_TYPES,
  REFERRAL_TARGETS,
  INTERVENTIONS,
  PROBLEM_FLAGS,
  computeSleepSeverity,
} = SleepAssessment;

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

// Pull the scoring factors out of a body (single source of truth so create
// + patch score identically).
function extractFactors(body) {
  const out = {
    sleepOnsetLatencyMinutes:
      typeof body.sleepOnsetLatencyMinutes === 'number' && body.sleepOnsetLatencyMinutes >= 0
        ? Math.min(600, body.sleepOnsetLatencyMinutes)
        : null,
    nightWakingsPerNight:
      typeof body.nightWakingsPerNight === 'number' && body.nightWakingsPerNight >= 0
        ? Math.min(30, body.nightWakingsPerNight)
        : null,
    totalSleepHours:
      typeof body.totalSleepHours === 'number' && body.totalSleepHours >= 0
        ? Math.min(24, body.totalSleepHours)
        : null,
  };
  for (const flag of PROBLEM_FLAGS) out[flag] = !!body[flag];
  return out;
}

// ── GET /high-severity — current high-severity cohort ─────────────────
router.get('/high-severity', requireRole(READ_ROLES), async (req, res) => {
  try {
    const match = { ...branchFilter(req), status: 'finalized' };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const latest = await SleepAssessment.aggregate([
      { $match: match },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: '$beneficiaryId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $match: { problemSeverity: 'severe' } },
      { $sort: { problemScore: -1, date: -1 } },
    ]);
    const items = await hydrate(latest);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'sleep.highSeverity');
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
    if (req.query.severity && SEVERITY_LEVELS.includes(String(req.query.severity))) {
      filter.problemSeverity = String(req.query.severity);
    }
    if (req.query.tool && TOOLS.includes(String(req.query.tool))) {
      filter.tool = String(req.query.tool);
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
      SleepAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SleepAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'sleep.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SleepAssessment.find({
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
      currentSeverity: latestFinalized ? latestFinalized.problemSeverity : null,
    });
  } catch (err) {
    return safeError(res, err, 'sleep.byBeneficiary');
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
    const raw = await SleepAssessment.find(filter)
      .select('problemSeverity tool status suspectedOSA problemScore')
      .lean();
    const bySeverity = SEVERITY_LEVELS.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byTool = TOOLS.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let finalized = 0;
    let suspectedOSA = 0;
    let totalScore = 0;
    for (const r of raw) {
      if (r.problemSeverity)
        bySeverity[r.problemSeverity] = (bySeverity[r.problemSeverity] || 0) + 1;
      if (r.tool) byTool[r.tool] = (byTool[r.tool] || 0) + 1;
      if (r.status === 'finalized') finalized++;
      if (r.suspectedOSA) suspectedOSA++;
      if (typeof r.problemScore === 'number') totalScore += r.problemScore;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      finalized,
      suspectedOSA,
      bySeverity,
      byTool,
      averageScore: raw.length ? Math.round((totalScore / raw.length) * 10) / 10 : 0,
    });
  } catch (err) {
    return safeError(res, err, 'sleep.stats');
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
    const raw = await SleepAssessment.find(base).sort({ nextReviewDue: 1 }).limit(300).lean();
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
    return safeError(res, err, 'sleep.due');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SleepAssessment.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'sleep.get');
  }
});

// ── POST / — record assessment ────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const factors = extractFactors(body);
    const computed = computeSleepSeverity(factors);
    // Server is authoritative on severity. OSA suspicion is derived from
    // snoring + daytime sleepiness, or set explicitly.
    const suspectedOSA = !!body.suspectedOSA || (factors.snoring && factors.daytimeSleepiness);

    const date = body.date ? new Date(body.date) : new Date();
    const nextReviewDue = body.nextReviewDue ? new Date(body.nextReviewDue) : null;
    const interventions = Array.isArray(body.sleepHygieneInterventions)
      ? body.sleepHygieneInterventions.map(s => String(s)).filter(s => INTERVENTIONS.includes(s))
      : [];

    const doc = await SleepAssessment.create({
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
      tool: TOOLS.includes(String(body.tool)) ? String(body.tool) : 'bears',
      bedtime: String(body.bedtime || '').slice(0, 10),
      wakeTime: String(body.wakeTime || '').slice(0, 10),
      ...factors,
      problemScore: computed.score,
      problemSeverity: computed.level,
      suspectedOSA,
      sleepHygieneInterventions: interventions,
      melatoninReviewed: !!body.melatoninReviewed,
      referralMade: !!body.referralMade,
      referralTarget: REFERRAL_TARGETS.includes(String(body.referralTarget))
        ? String(body.referralTarget)
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
    return safeError(res, err, 'sleep.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SleepAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
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
    return safeError(res, err, 'sleep.finalize');
  }
});

// ── POST /:id/add-intervention ────────────────────────────────────────
router.post('/:id/add-intervention', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const intervention = String(req.body?.intervention || '');
    if (!INTERVENTIONS.includes(intervention)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `intervention يجب أن يكون: ${INTERVENTIONS.join(' | ')}`,
        });
    }
    const row = await SleepAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if (!row.sleepHygieneInterventions.includes(intervention)) {
      row.sleepHygieneInterventions.push(intervention);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sleep.addIntervention');
  }
});

// ── PATCH /:id — correct while still 'draft' ──────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SleepAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    const factorKeys = [
      'sleepOnsetLatencyMinutes',
      'nightWakingsPerNight',
      'totalSleepHours',
    ].concat(PROBLEM_FLAGS);
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
      'bedtime',
      'wakeTime',
      'sleepHygieneInterventions',
      'melatoninReviewed',
      'referralMade',
      'referralTarget',
      'planNotes',
      'nextReviewDue',
      'notes',
    ];
    for (const k of otherEditable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if (factorsTouched) {
      const computed = computeSleepSeverity(extractFactors(row.toObject()));
      row.problemScore = computed.score;
      row.problemSeverity = computed.level;
      row.suspectedOSA = !!req.body.suspectedOSA || (row.snoring && row.daytimeSleepiness);
    } else if ('suspectedOSA' in req.body) {
      row.suspectedOSA = !!req.body.suspectedOSA;
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sleep.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SleepAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'sleep.delete');
  }
});

module.exports = router;
