'use strict';

/**
 * instrumental-swallow.routes.js — Wave 683.
 *
 * Instrumental swallow study (VFSS / FEES) results surface. Mounted via
 * dualMountAuth at /api/(v1/)?instrumental-swallow.
 *
 * Completes the W670 dysphagia chain: a bedside DysphagiaAssessment flags
 * `instrumentalAssessmentRecommended` → this records the actual study
 * findings (Penetration-Aspiration Scale, impaired phases, safe IDDSI
 * consistencies) → drives BeneficiaryDietPrescription (W368).
 *
 * Endpoints (10):
 *   GET    /pending-results          — ordered/scheduled studies awaiting findings
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /stats
 *   GET    /:id
 *   POST   /                         — order a study
 *   POST   /:id/schedule
 *   POST   /:id/record-result        — record findings (→ completed)
 *   POST   /:id/cancel
 *   PATCH  /:id                      — correct while not completed/cancelled
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const InstrumentalSwallowStudy = require('../models/InstrumentalSwallowStudy');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'speech_language_pathologist',
  'physician',
  'nurse',
  'dietitian',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'speech_language_pathologist',
  'physician',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STUDY_TYPES, STATUSES, PHASES, IDDSI_LEVELS } = InstrumentalSwallowStudy;

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

function sanitizeConsistencyResults(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(c => c && IDDSI_LEVELS.includes(String(c.iddsiLevel)))
    .slice(0, 8)
    .map(c => ({
      iddsiLevel: String(c.iddsiLevel),
      descriptor: String(c.descriptor || '').slice(0, 100),
      penetration: !!c.penetration,
      aspiration: !!c.aspiration,
      residue: ['none', 'mild', 'moderate', 'severe'].includes(String(c.residue))
        ? String(c.residue)
        : '',
      safe: c.safe !== false,
      notes: String(c.notes || '').slice(0, 300),
    }));
}

// ── GET /pending-results — ordered/scheduled awaiting findings ─────────
router.get('/pending-results', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req),
      status: { $in: ['ordered', 'scheduled'] },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await InstrumentalSwallowStudy.find(filter)
      .sort({ scheduledDate: 1, orderedDate: 1 })
      .limit(200)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'vfss.pendingResults');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.studyType && STUDY_TYPES.includes(String(req.query.studyType))) {
      filter.studyType = String(req.query.studyType);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      InstrumentalSwallowStudy.find(filter)
        .sort({ orderedDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      InstrumentalSwallowStudy.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'vfss.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await InstrumentalSwallowStudy.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ orderedDate: -1 })
      .limit(100)
      .lean();
    const latestCompleted = items.find(r => r.status === 'completed') || null;
    res.json({ success: true, items, count: items.length, latestCompleted });
  } catch (err) {
    return safeError(res, err, 'vfss.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await InstrumentalSwallowStudy.find(filter)
      .select('studyType status aspirationDetected silentAspiration npoRecommended')
      .lean();
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byType = STUDY_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let aspiration = 0;
    let silent = 0;
    let npo = 0;
    for (const r of raw) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.studyType] = (byType[r.studyType] || 0) + 1;
      if (r.aspirationDetected) aspiration++;
      if (r.silentAspiration) silent++;
      if (r.npoRecommended) npo++;
    }
    res.json({
      success: true,
      total: raw.length,
      pending: (byStatus.ordered || 0) + (byStatus.scheduled || 0),
      aspirationCount: aspiration,
      silentAspirationCount: silent,
      npoCount: npo,
      byStatus,
      byType,
    });
  } catch (err) {
    return safeError(res, err, 'vfss.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InstrumentalSwallowStudy.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'vfss.get');
  }
});

// ── POST / — order a study ─────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!STUDY_TYPES.includes(String(body.studyType))) {
      return res
        .status(400)
        .json({ success: false, message: `نوع الدراسة يجب أن يكون: ${STUDY_TYPES.join(' | ')}` });
    }
    const doc = await InstrumentalSwallowStudy.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      dysphagiaAssessmentId:
        body.dysphagiaAssessmentId && mongoose.isValidObjectId(body.dysphagiaAssessmentId)
          ? body.dysphagiaAssessmentId
          : null,
      studyType: body.studyType,
      orderedByName: req.user?.name || String(body.orderedByName || '').slice(0, 100),
      orderedDate: body.orderedDate ? new Date(body.orderedDate) : new Date(),
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      facilityName: String(body.facilityName || '').slice(0, 150),
      status: body.scheduledDate ? 'scheduled' : 'ordered',
      notes: String(body.notes || '').slice(0, 1000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'vfss.create');
  }
});

// ── POST /:id/schedule ─────────────────────────────────────────────────
router.post('/:id/schedule', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InstrumentalSwallowStudy.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن جدولة دراسة منتهية' });
    }
    row.scheduledDate = req.body?.scheduledDate ? new Date(req.body.scheduledDate) : new Date();
    if (req.body?.facilityName) row.facilityName = String(req.body.facilityName).slice(0, 150);
    row.status = 'scheduled';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'vfss.schedule');
  }
});

// ── POST /:id/record-result — record findings (→ completed) ────────────
router.post('/:id/record-result', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InstrumentalSwallowStudy.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    if (row.status === 'cancelled') {
      return res.status(409).json({ success: false, message: 'الدراسة ملغاة' });
    }
    const b = req.body || {};
    row.performedDate = b.performedDate ? new Date(b.performedDate) : new Date();
    row.performedBy = req.user?.id || null;
    row.performedByName = req.user?.name || String(b.performedByName || '').slice(0, 100);
    if (b.facilityName) row.facilityName = String(b.facilityName).slice(0, 150);
    row.impairedPhases = Array.isArray(b.impairedPhases)
      ? b.impairedPhases.filter(p => PHASES.includes(String(p)))
      : [];
    if (b.penetrationAspirationScale != null) {
      row.penetrationAspirationScale = Number(b.penetrationAspirationScale);
    }
    row.aspirationDetected = !!b.aspirationDetected;
    row.silentAspiration = !!b.silentAspiration;
    if (['none', 'mild', 'moderate', 'severe'].includes(String(b.pharyngealResidue))) {
      row.pharyngealResidue = String(b.pharyngealResidue);
    }
    row.consistencyResults = sanitizeConsistencyResults(b.consistencyResults);
    row.recommendedDietLevels = Array.isArray(b.recommendedDietLevels)
      ? b.recommendedDietLevels.filter(x => IDDSI_LEVELS.includes(String(x)))
      : [];
    row.npoRecommended = !!b.npoRecommended;
    row.compensatoryStrategies = Array.isArray(b.compensatoryStrategies)
      ? b.compensatoryStrategies.slice(0, 12).map(s => String(s).slice(0, 100))
      : [];
    row.overallFinding = String(b.overallFinding || '').slice(0, 1000);
    row.mediaRef = String(b.mediaRef || '').slice(0, 300);
    row.followUpRecommended = !!b.followUpRecommended;
    row.followUpDueDate = b.followUpDueDate ? new Date(b.followUpDueDate) : null;
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'vfss.recordResult');
  }
});

// ── POST /:id/cancel ───────────────────────────────────────────────────
router.post('/:id/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.cancelReason || '').slice(0, 300);
    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإلغاء مطلوب' });
    }
    const row = await InstrumentalSwallowStudy.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء دراسة مكتملة' });
    }
    row.status = 'cancelled';
    row.cancelReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'vfss.cancel');
  }
});

// ── PATCH /:id — correct while not terminal ────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InstrumentalSwallowStudy.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل دراسة منتهية' });
    }
    const editable = [
      'studyType',
      'scheduledDate',
      'facilityName',
      'dysphagiaAssessmentId',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'vfss.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await InstrumentalSwallowStudy.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الدراسة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'vfss.delete');
  }
});

module.exports = router;
