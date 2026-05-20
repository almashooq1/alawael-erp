'use strict';

/**
 * mar.routes.js — Wave 191b.
 *
 * Medication Administration Record (MAR) admin surface.
 * Mounted via dualMountAuth at /api/(v1/)?mar.
 *
 * Endpoints:
 *   GET    /today              — today's MAR list (sorted by scheduledTime)
 *   GET    /by-beneficiary/:id — kid's history (last 100)
 *   GET    /summary            — counts by status for today
 *   POST   /                   — schedule a dose (status=scheduled)
 *   POST   /:id/administer     — mark administered (sets actualTime + user)
 *   POST   /:id/refuse         — mark refused (requires reason)
 *   POST   /:id/hold           — mark held (clinical decision)
 *   PATCH  /:id                — correct
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const MAR = require('../models/MedicationAdministrationRecord');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'nurse',
  'caregiver',
];
const ADMINISTER_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'nurse'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];

const { STATUSES, ROUTES } = MAR;

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

// ── GET /today ────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const raw = await MAR.find(filter).sort({ scheduledTime: 1 }).lean();
    const items = await hydrate(raw);

    const summary = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    for (const r of raw) summary[r.status] = (summary[r.status] || 0) + 1;
    res.json({ success: true, items, count: items.length, summary, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'mar.today');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await MAR.find({ beneficiaryId: req.params.id })
      .sort({ scheduledTime: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'mar.byBeneficiary');
  }
});

// ── POST / — schedule a dose ───────────────────────────────────────────
router.post('/', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!String(body.medicationName || '').trim()) {
      return res.status(400).json({ success: false, message: 'اسم الدواء مطلوب' });
    }
    if (!body.scheduledTime) {
      return res.status(400).json({ success: false, message: 'وقت الجرعة المجدول مطلوب' });
    }
    const scheduledTime = new Date(body.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledTime غير صالح' });
    }
    const route = ROUTES.includes(body.route) ? body.route : 'oral';
    const doc = await MAR.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      medicationId:
        body.medicationId && mongoose.isValidObjectId(body.medicationId) ? body.medicationId : null,
      medicationName: String(body.medicationName).trim(),
      dose: String(body.dose || '').slice(0, 100),
      route,
      isControlled: !!body.isControlled,
      date: startOfDay(scheduledTime),
      scheduledTime,
      status: 'scheduled',
      notes: String(body.notes || '').slice(0, 500),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'mar.create');
  }
});

// ── POST /:id/administer ──────────────────────────────────────────────
router.post('/:id/administer', requireRole(ADMINISTER_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MAR.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'scheduled' && row.status !== 'held') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعاطي جرعة بحالة ' + row.status });
    }
    const body = req.body || {};
    if (row.isControlled && !body.witnessedByName?.trim() && !body.witnessedBy) {
      return res.status(400).json({
        success: false,
        message: 'الدواء المراقَب يتطلب شاهداً (witnessedBy/witnessedByName)',
      });
    }
    row.status = 'administered';
    row.actualTime = new Date();
    row.administeredBy = req.user?.id || null;
    row.administeredByName = req.user?.name || body.administeredByName || '';
    if (body.witnessedBy && mongoose.isValidObjectId(body.witnessedBy)) {
      row.witnessedBy = body.witnessedBy;
    }
    if (body.witnessedByName) row.witnessedByName = String(body.witnessedByName).slice(0, 100);
    if (body.sideEffects) row.sideEffects = String(body.sideEffects).slice(0, 500);
    if (body.notes) row.notes = String(body.notes).slice(0, 500);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'mar.administer');
  }
});

// ── POST /:id/refuse ──────────────────────────────────────────────────
router.post('/:id/refuse', requireRole(ADMINISTER_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.refusalReason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });
    }
    const row = await MAR.findByIdAndUpdate(
      req.params.id,
      {
        status: 'refused',
        actualTime: new Date(),
        administeredBy: req.user?.id || null,
        administeredByName: req.user?.name || '',
        refusalReason: reason.slice(0, 500),
      },
      { new: true, runValidators: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'mar.refuse');
  }
});

// ── POST /:id/hold ────────────────────────────────────────────────────
router.post('/:id/hold', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.notes || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب الإيقاف مطلوب' });
    }
    const row = await MAR.findByIdAndUpdate(
      req.params.id,
      { status: 'held', notes: reason.slice(0, 500) },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'mar.hold');
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────
router.patch('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.date;
    if (body.scheduledTime) body.scheduledTime = new Date(body.scheduledTime);
    const row = await MAR.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'mar.patch');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MAR.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'mar.delete');
  }
});

module.exports = router;
