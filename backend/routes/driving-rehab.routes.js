'use strict';

/**
 * driving-rehab.routes.js — Wave 1022.
 *
 * Driving-rehabilitation / fitness-to-drive admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?driving-rehab.
 *
 * Endpoints:
 *   GET    /fit-to-drive             — cleared-to-drive cohort (latest finalized per beneficiary)
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + latest
 *   GET    /stats                    — recommendation distribution for a range
 *   GET    /due                      — overdue + upcoming reassessments
 *   GET    /:id
 *   POST   /                         — record assessment (server computes readiness)
 *   POST   /:id/finalize             — finalize (immutable after)
 *   POST   /:id/add-equipment        — append an adaptive-equipment item (while draft)
 *   PATCH  /:id                      — correct (only while status=draft)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DrivingRehabAssessment = require('../models/DrivingRehabAssessment');
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
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
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
  ASSESSMENT_TYPES,
  LICENSE_STATUSES,
  COGNITIVE_LEVELS,
  PHYSICAL_LEVELS,
  SEATING_LEVELS,
  ONROAD_OUTCOMES,
  RECOMMENDATIONS,
  ADAPTIVE_EQUIPMENT,
  RESTRICTIONS,
  computeReadiness,
} = DrivingRehabAssessment;

const FIT_RECOMMENDATIONS = ['fit_to_drive', 'fit_with_adaptations'];

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

// Pull the clinical-screen levels out of a body/doc (single source of truth
// so create + patch derive readiness identically).
function extractScreen(src) {
  return {
    visionAdequate: !!src.visionAdequate,
    cognitiveScreenLevel: COGNITIVE_LEVELS.includes(String(src.cognitiveScreenLevel))
      ? String(src.cognitiveScreenLevel)
      : null,
    physicalControlLevel: PHYSICAL_LEVELS.includes(String(src.physicalControlLevel))
      ? String(src.physicalControlLevel)
      : null,
    seatingTransfersLevel: SEATING_LEVELS.includes(String(src.seatingTransfersLevel))
      ? String(src.seatingTransfersLevel)
      : null,
  };
}

// ── GET /fit-to-drive — cleared cohort ────────────────────────────────
router.get('/fit-to-drive', requireRole(READ_ROLES), async (req, res) => {
  try {
    const match = { ...branchFilter(req), status: 'finalized' };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const latest = await DrivingRehabAssessment.aggregate([
      { $match: match },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: '$beneficiaryId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $match: { recommendation: { $in: FIT_RECOMMENDATIONS } } },
      { $sort: { date: -1 } },
    ]);
    const items = await hydrate(latest);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.fitToDrive');
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
    if (req.query.recommendation && RECOMMENDATIONS.includes(String(req.query.recommendation))) {
      filter.recommendation = String(req.query.recommendation);
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
      DrivingRehabAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      DrivingRehabAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.list');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await DrivingRehabAssessment.find({
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
      currentRecommendation: latestFinalized ? latestFinalized.recommendation : null,
    });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.byBeneficiary');
  }
});

// ── GET /stats ────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), date: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await DrivingRehabAssessment.find(filter)
      .select('recommendation readinessLevel status')
      .lean();
    const byRecommendation = RECOMMENDATIONS.reduce((acc, r) => ((acc[r] = 0), acc), {});
    let finalized = 0;
    let fitToDrive = 0;
    for (const r of raw) {
      if (r.recommendation)
        byRecommendation[r.recommendation] = (byRecommendation[r.recommendation] || 0) + 1;
      if (r.status === 'finalized') finalized++;
      if (FIT_RECOMMENDATIONS.includes(r.recommendation)) fitToDrive++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      finalized,
      fitToDrive,
      byRecommendation,
    });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.stats');
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
    const raw = await DrivingRehabAssessment.find(base)
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
    return safeError(res, err, 'drivingRehab.due');
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DrivingRehabAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.get');
  }
});

// ── POST / — record assessment ────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const screen = extractScreen(body);
    const readinessLevel = computeReadiness(screen);
    const date = body.date ? new Date(body.date) : new Date();
    const nextReviewDue = body.nextReviewDue ? new Date(body.nextReviewDue) : null;
    const equipment = Array.isArray(body.adaptiveEquipmentNeeded)
      ? body.adaptiveEquipmentNeeded.map(s => String(s)).filter(s => ADAPTIVE_EQUIPMENT.includes(s))
      : [];
    const restrictions = Array.isArray(body.restrictions)
      ? body.restrictions.map(s => String(s)).filter(s => RESTRICTIONS.includes(s))
      : [];

    const doc = await DrivingRehabAssessment.create({
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
      licenseStatus: LICENSE_STATUSES.includes(String(body.licenseStatus))
        ? String(body.licenseStatus)
        : 'none',
      ...screen,
      readinessLevel,
      adaptiveEquipmentNeeded: equipment,
      onRoadAssessment: ONROAD_OUTCOMES.includes(String(body.onRoadAssessment))
        ? String(body.onRoadAssessment)
        : 'not_done',
      recommendation: RECOMMENDATIONS.includes(String(body.recommendation))
        ? String(body.recommendation)
        : 'further_training',
      restrictions,
      planNotes: String(body.planNotes || '').slice(0, 1000),
      nextReviewDue,
      notes: String(body.notes || '').slice(0, 1000),
      assessedBy: req.user?.id || null,
      assessedByName: req.user?.name || String(body.assessedByName || '').slice(0, 100),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DrivingRehabAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
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
    return safeError(res, err, 'drivingRehab.finalize');
  }
});

// ── POST /:id/add-equipment — append an adaptive-equipment item ───────
router.post('/:id/add-equipment', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const equipment = String(req.body?.equipment || '');
    if (!ADAPTIVE_EQUIPMENT.includes(equipment)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `equipment يجب أن يكون: ${ADAPTIVE_EQUIPMENT.join(' | ')}`,
        });
    }
    const row = await DrivingRehabAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if (!row.adaptiveEquipmentNeeded.includes(equipment)) {
      row.adaptiveEquipmentNeeded.push(equipment);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.addEquipment');
  }
});

// ── PATCH /:id — correct while still 'draft' ──────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DrivingRehabAssessment.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    const screenKeys = [
      'visionAdequate',
      'cognitiveScreenLevel',
      'physicalControlLevel',
      'seatingTransfersLevel',
    ];
    let screenTouched = false;
    for (const k of screenKeys) {
      if (k in req.body) {
        row[k] = req.body[k];
        screenTouched = true;
      }
    }
    const otherEditable = [
      'assessmentType',
      'licenseStatus',
      'adaptiveEquipmentNeeded',
      'onRoadAssessment',
      'recommendation',
      'restrictions',
      'planNotes',
      'nextReviewDue',
      'notes',
    ];
    for (const k of otherEditable) {
      if (k in req.body) row[k] = req.body[k];
    }
    if (screenTouched) {
      row.readinessLevel = computeReadiness(extractScreen(row.toObject()));
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DrivingRehabAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'drivingRehab.delete');
  }
});

module.exports = router;
