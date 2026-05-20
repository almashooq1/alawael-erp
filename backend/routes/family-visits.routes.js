'use strict';

/**
 * family-visits.routes.js — Wave 201b.
 *
 * Endpoints:
 *   GET    /                  — list w/ filters (paginated)
 *   GET    /upcoming          — approved visits in the next 14 days
 *   GET    /by-beneficiary/:id — kid's visit history
 *   GET    /:id
 *   POST   /                  — create request (parent or admin)
 *   POST   /:id/approve       — manager approves
 *   POST   /:id/decline       — manager declines (requires reason)
 *   POST   /:id/check-in      — staff records actual arrival
 *   POST   /:id/check-out     — staff records actual departure + notes
 *   POST   /:id/mark-no-show
 *   POST   /:id/cancel        — parent cancels
 *   DELETE /:id               — admin-only
 *
 * Policy: max 2 approved visits per beneficiary per calendar month.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Visit = require('../models/FamilyVisitRequest');
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
  'parent',
  'guardian',
];
const CREATE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'parent',
  'guardian',
];
const APPROVE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];
const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'therapist',
  'teacher',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STATUSES, SLOTS } = Visit;
const MAX_APPROVED_PER_MONTH = 2;

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

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfNextMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.requestedDate = {};
      if (req.query.from) filter.requestedDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.requestedDate.$lte = new Date(req.query.to);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Visit.find(filter)
        .sort({ requestedDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Visit.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'visits.list');
  }
});

// ── GET /upcoming — approved in next 14 days ───────────────────────────
router.get('/upcoming', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const raw = await Visit.find({
      status: 'approved',
      requestedDate: { $gte: now, $lte: horizon },
    })
      .sort({ requestedDate: 1 })
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'visits.upcoming');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Visit.find({ beneficiaryId: req.params.id })
      .sort({ requestedDate: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'visits.byBeneficiary');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Visit.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'visits.get');
  }
});

// ── POST / — create request ────────────────────────────────────────────
router.post('/', requireRole(CREATE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    for (const f of ['parentName', 'parentNationalId']) {
      if (!String(body[f] || '').trim()) {
        return res.status(400).json({ success: false, message: `${f} مطلوب` });
      }
    }
    if (!body.requestedDate) {
      return res.status(400).json({ success: false, message: 'تاريخ الزيارة المطلوب مطلوب' });
    }
    if (!SLOTS.includes(body.slot)) {
      return res
        .status(400)
        .json({ success: false, message: `slot يجب أن يكون: ${SLOTS.join(' | ')}` });
    }
    const requestedDate = new Date(body.requestedDate);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'تاريخ غير صالح' });
    }
    // Policy: max N approved/month
    const monthStart = startOfMonth(requestedDate);
    const monthEnd = startOfNextMonth(requestedDate);
    const approvedThisMonth = await Visit.countDocuments({
      beneficiaryId: body.beneficiaryId,
      status: 'approved',
      requestedDate: { $gte: monthStart, $lt: monthEnd },
    });
    if (approvedThisMonth >= MAX_APPROVED_PER_MONTH) {
      return res.status(409).json({
        success: false,
        message: `بلغ الحد الأقصى للزيارات هذا الشهر (${MAX_APPROVED_PER_MONTH}). يمكنك الطلب لاحقاً.`,
      });
    }

    const doc = await Visit.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      parentName: String(body.parentName).trim().slice(0, 100),
      parentNationalId: String(body.parentNationalId).trim().slice(0, 20),
      parentPhone: String(body.parentPhone || '')
        .trim()
        .slice(0, 20),
      relationship: String(body.relationship || '').slice(0, 50),
      requestedDate,
      slot: body.slot,
      sessionType: String(body.sessionType || 'classroom').slice(0, 100),
      reasonOrPurpose: String(body.reasonOrPurpose || '').slice(0, 500),
      status: 'requested',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'visits.create');
  }
});

// ── POST /:id/approve ─────────────────────────────────────────────────
router.post('/:id/approve', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (row.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن اعتماد طلب بحالة ' + row.status });
    }
    // Re-check policy at approval time (someone may have approved another visit since)
    const monthStart = startOfMonth(row.requestedDate);
    const monthEnd = startOfNextMonth(row.requestedDate);
    const approvedThisMonth = await Visit.countDocuments({
      beneficiaryId: row.beneficiaryId,
      status: 'approved',
      _id: { $ne: row._id },
      requestedDate: { $gte: monthStart, $lt: monthEnd },
    });
    if (approvedThisMonth >= MAX_APPROVED_PER_MONTH) {
      return res.status(409).json({
        success: false,
        message: `بلغ الحد الأقصى للزيارات المعتمدة هذا الشهر (${MAX_APPROVED_PER_MONTH})`,
      });
    }
    row.status = 'approved';
    row.approvedBy = req.user?.id || null;
    row.approvedByName = req.user?.name || String(req.body?.approvedByName || '');
    row.approvedAt = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.approve');
  }
});

// ── POST /:id/decline ─────────────────────────────────────────────────
router.post('/:id/decline', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });
    }
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (row.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن رفض طلب بحالة ' + row.status });
    }
    row.status = 'declined';
    row.declineReason = reason.slice(0, 500);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.decline');
  }
});

// ── POST /:id/check-in ────────────────────────────────────────────────
router.post('/:id/check-in', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (row.status !== 'approved') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تسجيل وصول لزيارة بحالة ' + row.status });
    }
    row.actualArrivalTime = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.checkIn');
  }
});

// ── POST /:id/check-out ───────────────────────────────────────────────
router.post('/:id/check-out', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (!row.actualArrivalTime) {
      return res.status(400).json({ success: false, message: 'يجب تسجيل وصول الأهل أولاً' });
    }
    row.actualDepartureTime = new Date();
    if (req.body?.staffObservationNotes) {
      row.staffObservationNotes = String(req.body.staffObservationNotes).slice(0, 1000);
    }
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.checkOut');
  }
});

// ── POST /:id/mark-no-show ────────────────────────────────────────────
router.post('/:id/mark-no-show', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (row.status !== 'approved') {
      return res.status(409).json({ success: false, message: 'الحالة غير صالحة لتسجيل عدم حضور' });
    }
    row.status = 'no_show';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.noShow');
  }
});

// ── POST /:id/cancel ──────────────────────────────────────────────────
router.post('/:id/cancel', requireRole(CREATE_ROLES), async (req, res) => {
  try {
    const row = await Visit.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (row.status === 'completed' || row.status === 'no_show') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إلغاء زيارة بحالة ' + row.status });
    }
    row.status = 'cancelled';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'visits.cancel');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    const row = await Visit.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'visits.delete');
  }
});

module.exports = router;
