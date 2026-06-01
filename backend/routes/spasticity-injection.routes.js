'use strict';

/**
 * spasticity-injection.routes.js — Wave 715.
 *
 * Spasticity / botulinum-toxin tone-management clinic. Mounted via
 * dualMountAuth at /api/(v1/)?spasticity-injection.
 *
 * Endpoints (10):
 *   GET    /follow-up-due            — completed procedures past reassessment date
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /stats
 *   GET    /:id
 *   POST   /                         — plan a procedure
 *   POST   /:id/complete             — record the procedure (→ completed; consent gate)
 *   POST   /:id/cancel
 *   PATCH  /:id
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SpasticityInjection = require('../models/SpasticityInjection');
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
  'physician',
  'physiotherapist',
  'nurse',
  'quality',
];
// The injection is a physician procedure — writes restricted to clinicians.
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { AGENTS, STATUSES, SIDES, SEDATION, GUIDANCE, MAS } = SpasticityInjection;

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

function sanitizeMuscles(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 40)
    .filter(m => m && String(m.muscle || '').trim() && SIDES.includes(String(m.side)))
    .map(m => ({
      muscle: String(m.muscle).slice(0, 100),
      side: String(m.side),
      doseUnits: typeof m.doseUnits === 'number' ? Math.min(1000, Math.max(0, m.doseUnits)) : null,
      ashworthBefore: MAS.includes(String(m.ashworthBefore)) ? String(m.ashworthBefore) : null,
      guidanceMethod: GUIDANCE.includes(String(m.guidanceMethod)) ? String(m.guidanceMethod) : null,
    }));
}

// ── GET /follow-up-due ─────────────────────────────────────────────────
router.get('/follow-up-due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req),
      status: 'completed',
      followUpDueDate: { $ne: null, $lt: new Date() },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SpasticityInjection.find(filter)
      .sort({ followUpDueDate: 1 })
      .limit(200)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'spasticity.followUpDue');
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
    if (req.query.agent && AGENTS.includes(String(req.query.agent))) {
      filter.agent = String(req.query.agent);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.procedureDate = {};
      if (req.query.from) filter.procedureDate.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.procedureDate.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      SpasticityInjection.find(filter)
        .sort({ procedureDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SpasticityInjection.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'spasticity.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SpasticityInjection.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ procedureDate: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'spasticity.byBeneficiary');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await SpasticityInjection.find(filter)
      .select('agent status followUpDueDate')
      .lean();
    const byAgent = AGENTS.reduce((acc, a) => ((acc[a] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let followUpDue = 0;
    const now = Date.now();
    for (const r of raw) {
      byAgent[r.agent] = (byAgent[r.agent] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (
        r.status === 'completed' &&
        r.followUpDueDate &&
        new Date(r.followUpDueDate).getTime() < now
      ) {
        followUpDue++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      completed: byStatus.completed || 0,
      followUpDue,
      byAgent,
      byStatus,
    });
  } catch (err) {
    return safeError(res, err, 'spasticity.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SpasticityInjection.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    const [hydrated] = await hydrate([row.toObject({ virtuals: true })]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'spasticity.get');
  }
});

// ── POST / — plan a procedure ──────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!AGENTS.includes(String(body.agent))) {
      return res
        .status(400)
        .json({ success: false, message: `العامل يجب أن يكون: ${AGENTS.join(' | ')}` });
    }
    const doc = await SpasticityInjection.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      physicianId: req.user?.id || null,
      physicianName: req.user?.name || String(body.physicianName || '').slice(0, 100),
      agent: body.agent,
      brandName: String(body.brandName || '').slice(0, 80),
      procedureDate: body.procedureDate ? new Date(body.procedureDate) : new Date(),
      sedation: SEDATION.includes(String(body.sedation)) ? String(body.sedation) : 'none',
      goals: Array.isArray(body.goals)
        ? body.goals.slice(0, 12).map(s => String(s).slice(0, 100))
        : [],
      targetedMuscles: sanitizeMuscles(body.targetedMuscles),
      notes: String(body.notes || '').slice(0, 1000),
      status: 'planned',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'spasticity.create');
  }
});

// ── POST /:id/complete — record the procedure (consent gate) ───────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SpasticityInjection.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'الإجراء منتهٍ بالفعل' });
    }
    const b = req.body || {};
    if (!b.consentObtained && !row.consentObtained) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إكمال الإجراء قبل الحصول على الموافقة' });
    }
    if (Array.isArray(b.targetedMuscles)) row.targetedMuscles = sanitizeMuscles(b.targetedMuscles);
    if (b.consentObtained != null) row.consentObtained = !!b.consentObtained;
    if (typeof b.totalDoseUnits === 'number') row.totalDoseUnits = Math.max(0, b.totalDoseUnits);
    if (SEDATION.includes(String(b.sedation))) row.sedation = String(b.sedation);
    if (b.complications != null) row.complications = String(b.complications).slice(0, 500);
    if (b.followUpDueDate) row.followUpDueDate = new Date(b.followUpDueDate);
    if (b.reassessmentNotes != null)
      row.reassessmentNotes = String(b.reassessmentNotes).slice(0, 1000);
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row.toObject({ virtuals: true }) });
  } catch (err) {
    return safeError(res, err, 'spasticity.complete');
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
    const row = await SpasticityInjection.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    if (row.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء إجراء مكتمل' });
    }
    row.status = 'cancelled';
    row.cancelReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'spasticity.cancel');
  }
});

// ── PATCH /:id — edit while planned ────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SpasticityInjection.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل إجراء منتهٍ' });
    }
    const b = req.body || {};
    if (AGENTS.includes(String(b.agent))) row.agent = String(b.agent);
    if (b.brandName != null) row.brandName = String(b.brandName).slice(0, 80);
    if (b.procedureDate) row.procedureDate = new Date(b.procedureDate);
    if (SEDATION.includes(String(b.sedation))) row.sedation = String(b.sedation);
    if (Array.isArray(b.goals)) row.goals = b.goals.slice(0, 12).map(s => String(s).slice(0, 100));
    if (Array.isArray(b.targetedMuscles)) row.targetedMuscles = sanitizeMuscles(b.targetedMuscles);
    if (b.notes != null) row.notes = String(b.notes).slice(0, 1000);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'spasticity.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SpasticityInjection.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الإجراء غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'spasticity.delete');
  }
});

module.exports = router;
