'use strict';

/**
 * physiotherapy-assessment.routes.js — W672.
 *
 * PT assessment admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?physiotherapy-assessment.
 *
 * Endpoints:
 *   GET    /today                  — today's assessments (w/ branch filter)
 *   GET    /                       — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id     — per-kid history (last 100) + initial/latest pair
 *   GET    /due                    — reassessments due (branch)
 *   GET    /stats                  — type + mobility distribution
 *   GET    /:id
 *   POST   /                       — record assessment (draft)
 *   POST   /:id/finalize           — finalize (immutable after)
 *   PATCH  /:id                    — correct (only while status=draft)
 *   DELETE /:id                    — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const PhysiotherapyAssessment = require('../models/PhysiotherapyAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess); // W445
router.use(bodyScopedBeneficiaryGuard); // W441

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physiotherapist',
  'teacher',
  'nurse',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physiotherapist',
];
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physiotherapist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  ASSESSMENT_TYPES,
  ASHWORTH_SCORES,
  STRENGTH_GRADES,
  MOBILITY_STATUS,
  GAIT_PATTERNS,
  ASSISTIVE_GAIT_DEVICES,
} = PhysiotherapyAssessment;

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

function clampDeg(v) {
  if (typeof v !== 'number') return null;
  return Math.max(-30, Math.min(360, v));
}

function sanitizeRom(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 50).map(m => ({
    joint: String(m?.joint || '').slice(0, 40),
    movement: String(m?.movement || '').slice(0, 40),
    activeRomDeg: clampDeg(m?.activeRomDeg),
    passiveRomDeg: clampDeg(m?.passiveRomDeg),
    ashworth: ASHWORTH_SCORES.includes(String(m?.ashworth)) ? String(m.ashworth) : '',
    note: String(m?.note || '').slice(0, 120),
  }));
}

function sanitizeStrength(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 50).map(s => ({
    muscleGroup: String(s?.muscleGroup || '').slice(0, 40),
    side: String(s?.side || '').slice(0, 10),
    grade: STRENGTH_GRADES.includes(String(s?.grade)) ? String(s.grade) : '',
    note: String(s?.note || '').slice(0, 120),
  }));
}

function sanitizeStandardized(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(s => ({
    instrument: String(s?.instrument || '').slice(0, 40),
    score: String(s?.score || '').slice(0, 40),
    note: String(s?.note || '').slice(0, 120),
  }));
}

// ── GET /today ──────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: startOfDay(d), $lte: endOfDay(d) },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await PhysiotherapyAssessment.find(filter).sort({ date: -1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'physio.today');
  }
});

// ── GET / ────────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.assessmentType && ASSESSMENT_TYPES.includes(String(req.query.assessmentType))) {
      filter.assessmentType = String(req.query.assessmentType);
    }
    if (req.query.mobilityStatus && MOBILITY_STATUS.includes(String(req.query.mobilityStatus))) {
      filter.mobilityStatus = String(req.query.mobilityStatus);
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
      PhysiotherapyAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PhysiotherapyAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'physio.list');
  }
});

// ── GET /due — reassessments due across the branch ───────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const by = req.query.by ? endOfDay(new Date(req.query.by)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      reassessmentDue: { $ne: null, $lte: by },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await PhysiotherapyAssessment.find(filter)
      .sort({ reassessmentDue: 1 })
      .limit(300)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'physio.due');
  }
});

// ── GET /by-beneficiary/:id ──────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await PhysiotherapyAssessment.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    // Surface the pre/post pair: earliest 'initial' + latest finalized.
    const initial = [...items].reverse().find(r => r.assessmentType === 'initial') || null;
    const latest = items.find(r => r.status === 'finalized') || items[0] || null;
    res.json({
      success: true,
      items,
      count: items.length,
      initial: initial
        ? { id: initial._id, date: initial.date, mobilityStatus: initial.mobilityStatus }
        : null,
      latest: latest
        ? { id: latest._id, date: latest.date, mobilityStatus: latest.mobilityStatus }
        : null,
    });
  } catch (err) {
    return safeError(res, err, 'physio.byBeneficiary');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: from, $lte: to },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await PhysiotherapyAssessment.find(filter)
      .select('assessmentType mobilityStatus gaitAssessed homeProgramGiven')
      .lean();
    const byType = ASSESSMENT_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byMobility = MOBILITY_STATUS.reduce((acc, m) => ((acc[m] = 0), acc), {});
    let gaitAssessed = 0;
    let homePrograms = 0;
    for (const r of raw) {
      if (r.assessmentType) byType[r.assessmentType] = (byType[r.assessmentType] || 0) + 1;
      if (r.mobilityStatus) byMobility[r.mobilityStatus] = (byMobility[r.mobilityStatus] || 0) + 1;
      if (r.gaitAssessed) gaitAssessed++;
      if (r.homeProgramGiven) homePrograms++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byType,
      byMobility,
      gaitAssessed,
      homeProgramsGiven: homePrograms,
    });
  } catch (err) {
    return safeError(res, err, 'physio.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PhysiotherapyAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean(); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'physio.get');
  }
});

// ── POST / — record assessment (draft) ───────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const date = body.date ? new Date(body.date) : new Date();

    const doc = await PhysiotherapyAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date: startOfDay(date),
      assessmentType: ASSESSMENT_TYPES.includes(String(body.assessmentType))
        ? String(body.assessmentType)
        : 'initial',
      reason: String(body.reason || '').slice(0, 300),
      posturalObservation: String(body.posturalObservation || '').slice(0, 500),
      toneSummary: String(body.toneSummary || '').slice(0, 300),
      romMeasurements: sanitizeRom(body.romMeasurements),
      strength: sanitizeStrength(body.strength),
      sittingBalance: String(body.sittingBalance || '').slice(0, 40),
      standingBalance: String(body.standingBalance || '').slice(0, 40),
      mobilityStatus: MOBILITY_STATUS.includes(String(body.mobilityStatus))
        ? String(body.mobilityStatus)
        : 'non_ambulant',
      gaitAssessed: !!body.gaitAssessed,
      gaitPattern: GAIT_PATTERNS.includes(String(body.gaitPattern)) ? String(body.gaitPattern) : '',
      assistiveGaitDevice: ASSISTIVE_GAIT_DEVICES.includes(String(body.assistiveGaitDevice))
        ? String(body.assistiveGaitDevice)
        : 'none',
      gaitDeviations: Array.isArray(body.gaitDeviations)
        ? body.gaitDeviations.slice(0, 15).map(s => String(s).slice(0, 60))
        : [],
      walkingDistanceMeters:
        typeof body.walkingDistanceMeters === 'number' && body.walkingDistanceMeters >= 0
          ? Math.min(100000, body.walkingDistanceMeters)
          : null,
      standardizedScores: sanitizeStandardized(body.standardizedScores),
      goalsSummary: String(body.goalsSummary || '').slice(0, 1000),
      recommendations: String(body.recommendations || '').slice(0, 1000),
      homeProgramGiven: !!body.homeProgramGiven,
      reassessmentDue: body.reassessmentDue ? new Date(body.reassessmentDue) : null,
      notes: String(body.notes || '').slice(0, 1000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'physio.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PhysiotherapyAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'التقييم سبق وأن تم اعتماده' });
    }
    row.assessedBy = req.user?.id || null;
    row.assessedByName = req.user?.name || String(req.body?.assessorName || '').slice(0, 100);
    row.assessedAt = new Date();
    row.status = 'finalized';
    await row.save(); // __invariants enforce discharge⇒goalsSummary, grade value-sets, gait
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'physio.finalize');
  }
});

// ── PATCH /:id — correct while still 'draft' ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PhysiotherapyAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if ('romMeasurements' in req.body) row.romMeasurements = sanitizeRom(req.body.romMeasurements);
    if ('strength' in req.body) row.strength = sanitizeStrength(req.body.strength);
    if ('standardizedScores' in req.body)
      row.standardizedScores = sanitizeStandardized(req.body.standardizedScores);
    const editable = [
      'assessmentType',
      'reason',
      'posturalObservation',
      'toneSummary',
      'sittingBalance',
      'standingBalance',
      'mobilityStatus',
      'gaitAssessed',
      'gaitPattern',
      'assistiveGaitDevice',
      'gaitDeviations',
      'walkingDistanceMeters',
      'goalsSummary',
      'recommendations',
      'homeProgramGiven',
      'reassessmentDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'physio.patch');
  }
});

// ── DELETE /:id — admin-only ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PhysiotherapyAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'physio.delete');
  }
});

module.exports = router;
