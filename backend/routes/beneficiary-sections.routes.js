'use strict';

/**
 * beneficiary-sections.routes.js — Wave 175.
 *
 * Manage program-based sections (الفصول التخصصية) for day-rehab centers.
 * Mounted via dualMountAuth at /api/(v1/)?beneficiary-sections.
 *
 * Endpoints:
 *   GET    /            — list with filters (program/branch/status) + paginated
 *   GET    /:id         — section detail (hydrated with beneficiary names)
 *   POST   /            — create
 *   PATCH  /:id         — update
 *   POST   /:id/assign  — assign beneficiaries (idempotent, dedup)
 *   POST   /:id/unassign — unassign
 *   DELETE /:id         — soft-archive (status=archived); ?hard=1 to delete
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const BeneficiarySection = require('../models/BeneficiarySection');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'receptionist',
  'therapist',
  'teacher',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];

const { PROGRAMS, STATUSES } = BeneficiarySection;

function asObjectIds(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter(v => mongoose.isValidObjectId(v)).map(v => String(v)))];
}

async function hydrateRoster(section) {
  if (!section) return section;
  const ids = (section.beneficiaryIds || []).map(String);
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  return { ...section, roster: benefs };
}

// ── GET / ───────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.program && PROGRAMS.includes(String(req.query.program))) {
      filter.program = String(req.query.program);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryIds = req.query.beneficiaryId;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      BeneficiarySection.find(filter)
        .sort({ program: 1, name: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      BeneficiarySection.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'sections.list');
  }
});

// ── GET /:id ────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const section = await BeneficiarySection.findById(req.params.id).lean({ virtuals: true });
    if (!section) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    const hydrated = await hydrateRoster(section);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'sections.get');
  }
});

// ── POST / ──────────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name?.trim()) {
      return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
    }
    if (!body.code?.trim()) {
      return res.status(400).json({ success: false, message: 'الرمز مطلوب' });
    }
    if (!PROGRAMS.includes(String(body.program))) {
      return res
        .status(400)
        .json({ success: false, message: `البرنامج يجب أن يكون: ${PROGRAMS.join(' | ')}` });
    }
    const doc = await BeneficiarySection.create({
      name: body.name.trim(),
      nameEn: body.nameEn?.trim() || '',
      code: body.code.trim(),
      program: body.program,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      classroomId:
        body.classroomId && mongoose.isValidObjectId(body.classroomId) ? body.classroomId : null,
      primaryTherapistId:
        body.primaryTherapistId && mongoose.isValidObjectId(body.primaryTherapistId)
          ? body.primaryTherapistId
          : null,
      assistantIds: asObjectIds(body.assistantIds),
      beneficiaryIds: asObjectIds(body.beneficiaryIds),
      ageRange: body.ageRange || {},
      capacity: body.capacity ?? 8,
      schedule: body.schedule || {},
      status: STATUSES.includes(body.status) ? body.status : 'active',
      color: body.color || '#3b82f6',
      notes: body.notes || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'الرمز موجود مسبقاً في هذا الفرع' });
    }
    return safeError(res, err, 'sections.create');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body._id;
    // Don't allow assigning beneficiaries via PATCH — use /assign endpoint.
    delete body.beneficiaryIds;
    if (body.program && !PROGRAMS.includes(body.program)) {
      return res.status(400).json({ success: false, message: 'البرنامج غير صالح' });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return res.status(400).json({ success: false, message: 'الحالة غير صالحة' });
    }
    const doc = await BeneficiarySection.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'sections.patch');
  }
});

// ── POST /:id/assign ───────────────────────────────────────────────────
router.post('/:id/assign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const ids = asObjectIds(req.body?.beneficiaryIds);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: 'beneficiaryIds مطلوبة' });
    }
    const section = await BeneficiarySection.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    const existing = new Set((section.beneficiaryIds || []).map(String));
    for (const id of ids) existing.add(id);
    const next = [...existing];
    if (next.length > section.capacity) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن إضافة ${ids.length} — الفصل سعة ${section.capacity} (الحالي ${section.beneficiaryIds.length})`,
      });
    }
    section.beneficiaryIds = next;
    await section.save();
    res.json({ success: true, data: section });
  } catch (err) {
    return safeError(res, err, 'sections.assign');
  }
});

// ── POST /:id/unassign ─────────────────────────────────────────────────
router.post('/:id/unassign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const ids = new Set(asObjectIds(req.body?.beneficiaryIds));
    if (!ids.size) {
      return res.status(400).json({ success: false, message: 'beneficiaryIds مطلوبة' });
    }
    const section = await BeneficiarySection.findById(req.params.id);
    if (!section) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    section.beneficiaryIds = (section.beneficiaryIds || []).filter(b => !ids.has(String(b)));
    await section.save();
    res.json({ success: true, data: section });
  } catch (err) {
    return safeError(res, err, 'sections.unassign');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    if (req.query.hard === '1') {
      const row = await BeneficiarySection.findByIdAndDelete(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
      return res.json({ success: true, message: 'تم الحذف نهائياً' });
    }
    const row = await BeneficiarySection.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    res.json({ success: true, message: 'تم الأرشفة', data: row });
  } catch (err) {
    return safeError(res, err, 'sections.delete');
  }
});

module.exports = router;
