'use strict';

/**
 * prosthetic-orthotic.routes.js — Wave 680.
 *
 * Prosthetics, Orthotics & Seating (P&O) fabrication/fitting clinic.
 * Mounted via dualMountAuth at /api/(v1/)?prosthetic-orthotic.
 *
 * Distinct from /assistive-device (W359 — loan + maintenance inventory):
 * this surface tracks the CLINICAL ORDER lifecycle (prescribe → measure
 * → fabricate → fit → deliver → follow-up) for custom-made devices.
 *
 * Endpoints (11):
 *   GET    /overdue-followups        — delivered devices past review date
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id        — per-beneficiary order history
 *   GET    /stats                    — pipeline analytics for a range
 *   GET    /:id
 *   POST   /                         — prescribe (create order)
 *   POST   /:id/transition           — advance stage (state machine)
 *   POST   /:id/follow-up            — append a follow-up/adjustment entry
 *   POST   /:id/notify-parent
 *   PATCH  /:id                      — correct (only while not terminal)
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ProstheticOrthoticOrder = require('../models/ProstheticOrthoticOrder');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W445 doctrine: branch-scope every endpoint. Model carries `branchId`;
// instance loads use findOne({ _id, ...branchFilter(req) }) to block
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physiotherapist',
  'occupational_therapist',
  'physician',
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
  'occupational_therapist',
  'physician',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  CATEGORIES,
  STAGES,
  TRANSITIONS,
  LATERALITY,
  FABRICATION_TYPES,
  FIT_OUTCOMES: _FIT_OUTCOMES,
  FUNDING_SOURCES,
} = ProstheticOrthoticOrder;

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

// Fields a stage transition may carry into the document. Keyed by target
// stage so a transition can only write the data appropriate to that step.
const STAGE_FIELDS = {
  measured: [
    'measurementDate',
    'measuredByName',
    'castingRequired',
    'castingDate',
    'measurementNotes',
    'scanFileRef',
    'posturalAssessment',
    'pressureMappingDone',
  ],
  fabrication: [
    'fabricationType',
    'vendorName',
    'fabricationStartDate',
    'estimatedCost',
    'fundingSource',
  ],
  fitting: [
    'fittingDate',
    'fittedByName',
    'fitOutcome',
    'fittingNotes',
    'comfortScore',
    'pressureAreasNoted',
    'fabricationCompletedDate',
  ],
  delivered: [
    'deliveredDate',
    'deliveredToName',
    'wearingSchedule',
    'warrantyMonths',
    'followUpDueDate',
    'reviewIntervalMonths',
  ],
  follow_up: ['followUpDueDate', 'reviewIntervalMonths'],
  completed: ['completedDate', 'outcomeNotes', 'abandoned', 'abandonReason'],
  cancelled: ['cancelReason'],
};

// ── GET /overdue-followups ─────────────────────────────────────────────
router.get('/overdue-followups', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req),
      stage: { $nin: ['completed', 'cancelled'] },
      followUpDueDate: { $ne: null, $lt: new Date() },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await ProstheticOrthoticOrder.find(filter)
      .sort({ followUpDueDate: 1 })
      .limit(200)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'pando.overdueFollowups');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.deviceCategory && CATEGORIES.includes(String(req.query.deviceCategory))) {
      filter.deviceCategory = String(req.query.deviceCategory);
    }
    if (req.query.stage && STAGES.includes(String(req.query.stage))) {
      filter.stage = String(req.query.stage);
    }
    if (req.query.laterality && LATERALITY.includes(String(req.query.laterality))) {
      filter.laterality = String(req.query.laterality);
    }
    if (req.query.from || req.query.to) {
      filter.prescribedDate = {};
      if (req.query.from) filter.prescribedDate.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.prescribedDate.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      ProstheticOrthoticOrder.find(filter)
        .sort({ prescribedDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      ProstheticOrthoticOrder.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'pando.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await ProstheticOrthoticOrder.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ prescribedDate: -1 })
      .limit(100)
      .lean();
    const active = items.filter(r => !['completed', 'cancelled'].includes(r.stage)).length;
    const overdue = items.filter(
      r =>
        r.followUpDueDate &&
        !['completed', 'cancelled'].includes(r.stage) &&
        new Date(r.followUpDueDate).getTime() < Date.now()
    ).length;
    res.json({
      success: true,
      items,
      count: items.length,
      activeCount: active,
      overdueCount: overdue,
    });
  } catch (err) {
    return safeError(res, err, 'pando.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), prescribedDate: { $gte: from, $lte: to } };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await ProstheticOrthoticOrder.find(filter)
      .select('deviceCategory stage followUpDueDate fitOutcome estimatedCost')
      .lean();
    const byCategory = CATEGORIES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const byStage = STAGES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let active = 0;
    let overdueFollowUps = 0;
    let refabricateCount = 0;
    const now = Date.now();
    for (const r of raw) {
      byCategory[r.deviceCategory] = (byCategory[r.deviceCategory] || 0) + 1;
      byStage[r.stage] = (byStage[r.stage] || 0) + 1;
      if (!['completed', 'cancelled'].includes(r.stage)) active++;
      if (
        r.followUpDueDate &&
        !['completed', 'cancelled'].includes(r.stage) &&
        new Date(r.followUpDueDate).getTime() < now
      ) {
        overdueFollowUps++;
      }
      if (r.fitOutcome === 'refabricate') refabricateCount++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      active,
      overdueFollowUps,
      refabricateCount,
      byCategory,
      byStage,
    });
  } catch (err) {
    return safeError(res, err, 'pando.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ProstheticOrthoticOrder.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'pando.get');
  }
});

// ── POST / — prescribe (create order) ──────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!CATEGORIES.includes(String(body.deviceCategory))) {
      return res
        .status(400)
        .json({ success: false, message: `نوع الجهاز يجب أن يكون: ${CATEGORIES.join(' | ')}` });
    }
    const doc = await ProstheticOrthoticOrder.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      deviceCategory: body.deviceCategory,
      laterality: LATERALITY.includes(String(body.laterality))
        ? String(body.laterality)
        : 'not_applicable',
      diagnosis: String(body.diagnosis || '').slice(0, 300),
      clinicalGoal: String(body.clinicalGoal || '').slice(0, 500),
      prescribedBy: req.user?.id || null,
      prescribedByName: req.user?.name || String(body.prescribedByName || '').slice(0, 100),
      prescribedDate: body.prescribedDate ? new Date(body.prescribedDate) : new Date(),
      castingRequired: !!body.castingRequired,
      fabricationType: FABRICATION_TYPES.includes(String(body.fabricationType))
        ? String(body.fabricationType)
        : 'in_house',
      fundingSource: FUNDING_SOURCES.includes(String(body.fundingSource))
        ? String(body.fundingSource)
        : null,
      notes: String(body.notes || '').slice(0, 1000),
      stage: 'prescribed',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'pando.create');
  }
});

// ── POST /:id/transition — advance stage (state machine) ───────────────
router.post('/:id/transition', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const toStage = String(req.body?.toStage || '');
    if (!STAGES.includes(toStage)) {
      return res.status(400).json({ success: false, message: `مرحلة غير معروفة: ${toStage}` });
    }
    const row = await ProstheticOrthoticOrder.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    const allowed = TRANSITIONS[row.stage] || [];
    if (!allowed.includes(toStage)) {
      return res.status(409).json({
        success: false,
        message: `لا يمكن الانتقال من ${row.stage} إلى ${toStage}`,
        allowed,
      });
    }

    // Apply only the fields appropriate to the target stage.
    const fields = STAGE_FIELDS[toStage] || [];
    for (const k of fields) {
      if (k in (req.body || {})) row[k] = req.body[k];
    }
    // Auto-stamp the canonical date for stages that imply one.
    if (toStage === 'measured' && !row.measurementDate) row.measurementDate = new Date();
    if (toStage === 'fabrication' && !row.fabricationStartDate)
      row.fabricationStartDate = new Date();
    if (toStage === 'fitting' && !row.fittingDate) row.fittingDate = new Date();
    if (toStage === 'delivered' && !row.deliveredDate) row.deliveredDate = new Date();
    if (toStage === 'completed' && !row.completedDate) row.completedDate = new Date();

    row.stage = toStage;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pando.transition');
  }
});

// ── POST /:id/follow-up — append a follow-up/adjustment entry ───────────
router.post('/:id/follow-up', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ProstheticOrthoticOrder.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (['completed', 'cancelled'].includes(row.stage)) {
      return res.status(409).json({ success: false, message: 'لا يمكن إضافة متابعة لطلب منتهٍ' });
    }
    const b = req.body || {};
    row.followUps.push({
      date: b.date ? new Date(b.date) : new Date(),
      by: req.user?.id || null,
      byName: req.user?.name || String(b.byName || '').slice(0, 100),
      outcome: String(b.outcome || '').slice(0, 500),
      adjustmentMade: !!b.adjustmentMade,
      nextDueDate: b.nextDueDate ? new Date(b.nextDueDate) : null,
      notes: String(b.notes || '').slice(0, 1000),
    });
    // Advance the review clock if a next date was supplied.
    if (b.nextDueDate) row.followUpDueDate = new Date(b.nextDueDate);
    if (row.stage === 'delivered') row.stage = 'follow_up';
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pando.followUp');
  }
});

// ── POST /:id/notify-parent ────────────────────────────────────────────
router.post('/:id/notify-parent', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ProstheticOrthoticOrder.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    row.parentNotifiedAt = req.body?.at ? new Date(req.body.at) : new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pando.notifyParent');
  }
});

// ── PATCH /:id — correct while not terminal ────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ProstheticOrthoticOrder.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (['completed', 'cancelled'].includes(row.stage)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل طلب منتهٍ' });
    }
    const editable = [
      'laterality',
      'diagnosis',
      'clinicalGoal',
      'measurementNotes',
      'scanFileRef',
      'castingRequired',
      'castingDate',
      'vendorName',
      'fabricationType',
      'estimatedCost',
      'fundingSource',
      'fittingNotes',
      'fitOutcome',
      'comfortScore',
      'posturalAssessment',
      'pressureMappingDone',
      'pressureAreasNoted',
      'wearingSchedule',
      'warrantyMonths',
      'followUpDueDate',
      'reviewIntervalMonths',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pando.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ProstheticOrthoticOrder.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'pando.delete');
  }
});

module.exports = router;
