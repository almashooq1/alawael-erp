'use strict';

/**
 * adjunct-therapy.routes.js — Wave 693.
 *
 * Adjunct therapy (hydrotherapy / hippotherapy / animal-assisted) session
 * surface with a medical-clearance gate. Mounted via dualMountAuth at
 * /api/(v1/)?adjunct-therapy.
 *
 * Endpoints (10):
 *   GET    /                  — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /stats
 *   GET    /:id
 *   POST   /                  — create session (scheduled)
 *   POST   /:id/clear         — record medical clearance (the safety gate)
 *   POST   /:id/complete      — record outcome (→ completed; needs clearance)
 *   POST   /:id/cancel
 *   PATCH  /:id
 *   DELETE /:id               — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const AdjunctTherapySession = require('../models/AdjunctTherapySession');
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
];
// Clearance is a clinical safety decision — restricted to clinicians.
const CLEAR_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'physiotherapist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { MODALITIES, STATUSES, READINESS_LEVELS, RESPONSES, ANIMAL_TYPES } = AdjunctTherapySession;

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

function cleanList(v, max, len) {
  return Array.isArray(v) ? v.slice(0, max).map(s => String(s).slice(0, len)) : [];
}

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
    if (req.query.modality && MODALITIES.includes(String(req.query.modality))) {
      filter.modality = String(req.query.modality);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.sessionDate = {};
      if (req.query.from) filter.sessionDate.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.sessionDate.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      AdjunctTherapySession.find(filter)
        .sort({ sessionDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      AdjunctTherapySession.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'adjunct.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await AdjunctTherapySession.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ sessionDate: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'adjunct.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = { ...branchFilter(req), sessionDate: { $gte: from, $lte: to } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await AdjunctTherapySession.find(filter)
      .select('modality status incidentDuringSession beneficiaryResponse')
      .lean();
    const byModality = MODALITIES.reduce((acc, m) => ((acc[m] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let completed = 0;
    let incidents = 0;
    let positiveResponses = 0;
    for (const r of raw) {
      byModality[r.modality] = (byModality[r.modality] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === 'completed') completed++;
      if (r.incidentDuringSession) incidents++;
      if (r.beneficiaryResponse === 'positive') positiveResponses++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      completed,
      incidents,
      positiveResponses,
      byModality,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'adjunct.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await AdjunctTherapySession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    const [hydrated] = await hydrate([row.toObject({ virtuals: true })]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'adjunct.get');
  }
});

// ── POST / — create session ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!MODALITIES.includes(String(body.modality))) {
      return res
        .status(400)
        .json({ success: false, message: `النمط يجب أن يكون: ${MODALITIES.join(' | ')}` });
    }
    const doc = await AdjunctTherapySession.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      therapistId: req.user?.id || null,
      therapistName: req.user?.name || String(body.therapistName || '').slice(0, 100),
      modality: body.modality,
      sessionDate: body.sessionDate ? new Date(body.sessionDate) : new Date(),
      durationMinutes:
        typeof body.durationMinutes === 'number'
          ? Math.min(240, Math.max(0, body.durationMinutes))
          : null,
      readinessLevel: READINESS_LEVELS.includes(String(body.readinessLevel))
        ? String(body.readinessLevel)
        : 'not_assessed',
      animalType: ANIMAL_TYPES.includes(String(body.animalType)) ? String(body.animalType) : 'none',
      animalName: String(body.animalName || '').slice(0, 80),
      status: 'scheduled',
      notes: String(body.notes || '').slice(0, 1000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'adjunct.create');
  }
});

// ── POST /:id/clear — record medical clearance ─────────────────────────
router.post('/:id/clear', requireRole(CLEAR_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await AdjunctTherapySession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'الجلسة منتهية' });
    }
    const b = req.body || {};
    row.medicalCleared = b.cleared !== false; // default true on this endpoint
    row.clearedByName = req.user?.name || String(b.clearedByName || '').slice(0, 100);
    row.clearedDate = new Date();
    if (b.contraindications != null)
      row.contraindications = String(b.contraindications).slice(0, 500);
    if (READINESS_LEVELS.includes(String(b.readinessLevel)))
      row.readinessLevel = String(b.readinessLevel);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'adjunct.clear');
  }
});

// ── POST /:id/complete — record outcome (needs clearance) ──────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await AdjunctTherapySession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'الجلسة منتهية بالفعل' });
    }
    if (!row.medicalCleared) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إكمال الجلسة قبل التصريح الطبي (/clear)' });
    }
    const b = req.body || {};
    if (Array.isArray(b.activities)) row.activities = cleanList(b.activities, 20, 150);
    if (Array.isArray(b.skillsTargeted)) row.skillsTargeted = cleanList(b.skillsTargeted, 20, 150);
    if (RESPONSES.includes(String(b.beneficiaryResponse)))
      row.beneficiaryResponse = String(b.beneficiaryResponse);
    if (b.outcomeNotes != null) row.outcomeNotes = String(b.outcomeNotes).slice(0, 1000);
    if (ANIMAL_TYPES.includes(String(b.animalType))) row.animalType = String(b.animalType);
    if (b.animalName != null) row.animalName = String(b.animalName).slice(0, 80);
    if (typeof b.waterTemperatureC === 'number') row.waterTemperatureC = b.waterTemperatureC;
    if (typeof b.heartRateBefore === 'number') row.heartRateBefore = b.heartRateBefore;
    if (typeof b.heartRateAfter === 'number') row.heartRateAfter = b.heartRateAfter;
    row.incidentDuringSession = !!b.incidentDuringSession;
    if (b.incidentNotes != null) row.incidentNotes = String(b.incidentNotes).slice(0, 500);
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'adjunct.complete');
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
    const row = await AdjunctTherapySession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء جلسة مكتملة' });
    }
    row.status = 'cancelled';
    row.cancelReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'adjunct.cancel');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await AdjunctTherapySession.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل جلسة منتهية' });
    }
    const editable = [
      'modality',
      'sessionDate',
      'durationMinutes',
      'readinessLevel',
      'animalType',
      'animalName',
      'waterTemperatureC',
      'poolDepthM',
      'flotationUsed',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'adjunct.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await AdjunctTherapySession.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'adjunct.delete');
  }
});

module.exports = router;
