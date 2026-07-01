'use strict';

/**
 * respite.routes.js — Wave 363.
 *
 * Respite booking admin surface. Mounted at /api/(v1/)?respite.
 *
 * Endpoints:
 *   GET    /                       — list w/ filters
 *   GET    /by-beneficiary/:id
 *   GET    /upcoming               — approved/confirmed with startAt in future
 *   GET    /active                 — currently checked_in
 *   GET    /day/:date              — bookings active on a given calendar date
 *   GET    /stats                  — counts by type/status + nightCount sum
 *   GET    /:id
 *   POST   /                       — request booking
 *   POST   /:id/approve
 *   POST   /:id/reject
 *   POST   /:id/confirm
 *   POST   /:id/check-in
 *   POST   /:id/check-out
 *   POST   /:id/cancel
 *   POST   /:id/no-show
 *   PATCH  /:id                    — corrections (blocked once completed/cancelled)
 *   DELETE /:id                    — admin
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Booking = require('../models/RespiteBooking');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W445: branch-scope every endpoint. Model carries `branchId`; pre-W445
// list filters were optional + instance loads bare findById, opening
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'social_worker',
  'nurse',
  'parent',
  'guardian',
  'quality',
];
// Booking write is permissive on intake (any clinical staff can lodge
// on behalf of family); approve/reject narrower.
const INTAKE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'social_worker',
  'therapist',
  'teacher',
  'nurse',
  'parent',
  'guardian',
];
const APPROVE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
];
const OPS_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'nurse',
  'social_worker',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, STATUSES, FUNDING_SOURCES } = Booking;

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

// ── GET / ──────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.bookingType && TYPES.includes(String(req.query.bookingType))) {
      filter.bookingType = String(req.query.bookingType);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.startAt = {};
      if (req.query.from) filter.startAt.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.startAt.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Booking.find(filter)
        .sort({ startAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Booking.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'respite.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Booking.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ startAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'respite.byBeneficiary');
  }
});

// ── GET /upcoming ──────────────────────────────────────────────────
router.get('/upcoming', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W445
      status: { $in: ['approved', 'confirmed'] },
      startAt: { $gt: new Date() },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Booking.find(filter).sort({ startAt: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'respite.upcoming');
  }
});

// ── GET /active ────────────────────────────────────────────────────
router.get('/active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), status: 'checked_in' }; /* W445 */
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Booking.find(filter).sort({ checkedInAt: -1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'respite.active');
  }
});

// ── GET /day/:date ─────────────────────────────────────────────────
router.get('/day/:date', requireRole(READ_ROLES), async (req, res) => {
  try {
    const target = new Date(req.params.date);
    if (isNaN(target.getTime())) {
      return res.status(400).json({ success: false, message: 'تاريخ غير صالح' });
    }
    const dayStart = startOfDay(target);
    const dayEnd = endOfDay(target);
    // Active on this day = startAt <= dayEnd AND endAt >= dayStart
    const filter = {
      ...branchFilter(req), // W445
      startAt: { $lte: dayEnd },
      endAt: { $gte: dayStart },
      status: { $in: ['approved', 'confirmed', 'checked_in', 'completed'] },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Booking.find(filter).sort({ startAt: 1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: dayStart });
  } catch (err) {
    return safeError(res, err, 'respite.day');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      startAt: { $gte: from, $lte: to },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Booking.find(filter)
      .select('bookingType status nightCount actualCost fundingSource')
      .lean();
    const byType = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let totalNights = 0;
    let totalActualCost = 0;
    for (const b of raw) {
      byType[b.bookingType] = (byType[b.bookingType] || 0) + 1;
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (typeof b.nightCount === 'number') totalNights += b.nightCount;
      if (typeof b.actualCost === 'number') totalActualCost += b.actualCost;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byType,
      byStatus,
      totalNights,
      totalActualCost,
    });
  } catch (err) {
    return safeError(res, err, 'respite.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W445 */
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'respite.get');
  }
});

// ── POST / — request booking ──────────────────────────────────────
router.post('/', requireRole(INTAKE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.bookingType))) {
      return res
        .status(400)
        .json({ success: false, message: `bookingType يجب أن يكون: ${TYPES.join(' | ')}` });
    }
    if (!body.startAt || !body.endAt) {
      return res.status(400).json({ success: false, message: 'startAt + endAt مطلوبان' });
    }
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (endAt <= startAt) {
      return res.status(400).json({ success: false, message: 'endAt يجب أن يكون بعد startAt' });
    }
    if (!String(body.emergencyContactName || '').trim()) {
      return res.status(400).json({ success: false, message: 'emergencyContactName مطلوب' });
    }
    if (!String(body.emergencyContactPhone || '').trim()) {
      return res.status(400).json({ success: false, message: 'emergencyContactPhone مطلوب' });
    }
    let nightCount = typeof body.nightCount === 'number' ? body.nightCount : 0;
    if (body.bookingType === 'day') nightCount = 0;
    else if (nightCount < 1) nightCount = 1;

    const doc = await Booking.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      bookingType: body.bookingType,
      startAt,
      endAt,
      nightCount: Math.min(90, nightCount),
      requestedBy: req.user?.id || null,
      requestedByName: req.user?.name || body.requestedByName || '',
      requestedByRelationship: String(body.requestedByRelationship || '').slice(0, 50),
      requestedAt: new Date(),
      reasonForRequest: String(body.reasonForRequest || '').slice(0, 1000),
      medicationsSummary: String(body.medicationsSummary || '').slice(0, 2000),
      dietarySummary: String(body.dietarySummary || '').slice(0, 1000),
      behavioralNotes: String(body.behavioralNotes || '').slice(0, 1000),
      sleepNeeds: String(body.sleepNeeds || '').slice(0, 500),
      equipmentRequired: Array.isArray(body.equipmentRequired)
        ? body.equipmentRequired.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      linkedCarePlanVersionId:
        body.linkedCarePlanVersionId && mongoose.isValidObjectId(body.linkedCarePlanVersionId)
          ? body.linkedCarePlanVersionId
          : null,
      emergencyContactName: String(body.emergencyContactName).slice(0, 100),
      emergencyContactPhone: String(body.emergencyContactPhone).slice(0, 30),
      emergencyContactRelationship: String(body.emergencyContactRelationship || '').slice(0, 50),
      estimatedCost: typeof body.estimatedCost === 'number' ? Math.max(0, body.estimatedCost) : 0,
      fundingSource: FUNDING_SOURCES.includes(String(body.fundingSource))
        ? String(body.fundingSource)
        : null,
      subsidyApprovalRef: String(body.subsidyApprovalRef || '').slice(0, 100),
      notes: String(body.notes || '').slice(0, 2000),
      status: 'requested',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'respite.create');
  }
});

// ── POST /:id/approve ─────────────────────────────────────────────
router.post('/:id/approve', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (row.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن اعتماد حجز بحالة ' + row.status });
    }
    row.approvedBy = req.user?.id || null;
    row.approvedByName = req.user?.name || '';
    row.approvedAt = new Date();
    row.status = 'approved';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.approve');
  }
});

// ── POST /:id/reject ──────────────────────────────────────────────
router.post('/:id/reject', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (row.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن رفض حجز بحالة ' + row.status });
    }
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });
    }
    row.rejectionReason = String(req.body.reason).slice(0, 500);
    row.status = 'rejected';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.reject');
  }
});

// ── POST /:id/confirm ─────────────────────────────────────────────
router.post('/:id/confirm', requireRole(OPS_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (row.status !== 'approved') {
      return res.status(409).json({
        success: false,
        message: 'يجب اعتماد الحجز قبل التأكيد (الحالة: ' + row.status + ')',
      });
    }
    row.status = 'confirmed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.confirm');
  }
});

// ── POST /:id/check-in ────────────────────────────────────────────
router.post('/:id/check-in', requireRole(OPS_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (!['approved', 'confirmed'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تسجيل دخول بحالة ' + row.status });
    }
    row.checkedInAt = req.body?.at ? new Date(req.body.at) : new Date();
    row.checkedInBy = req.user?.id || null;
    row.status = 'checked_in';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.checkIn');
  }
});

// ── POST /:id/check-out ───────────────────────────────────────────
router.post('/:id/check-out', requireRole(OPS_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (row.status !== 'checked_in') {
      return res.status(409).json({ success: false, message: 'الحجز ليس في حالة تسجيل دخول' });
    }
    row.checkedOutAt = req.body?.at ? new Date(req.body.at) : new Date();
    row.checkedOutBy = req.user?.id || null;
    row.checkOutHandoffNotes = String(req.body?.handoffNotes || '').slice(0, 2000);
    if (typeof req.body?.actualCost === 'number') {
      row.actualCost = Math.max(0, req.body.actualCost);
    }
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.checkOut');
  }
});

// ── POST /:id/cancel ──────────────────────────────────────────────
router.post('/:id/cancel', requireRole(INTAKE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (['completed', 'cancelled', 'no_show'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'الحجز سبق وأغلق (الحالة: ' + row.status + ')' });
    }
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإلغاء مطلوب' });
    }
    row.cancellationReason = String(req.body.reason).slice(0, 500);
    row.cancelledAt = new Date();
    row.cancelledBy = req.user?.id || null;
    row.status = 'cancelled';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.cancel');
  }
});

// ── POST /:id/no-show ─────────────────────────────────────────────
router.post('/:id/no-show', requireRole(OPS_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (!['approved', 'confirmed'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن وسم no_show من حالة ' + row.status });
    }
    row.status = 'no_show';
    row.notes = (row.notes || '') + `\n[no-show recorded ${new Date().toISOString()}]`;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.noShow');
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────
router.patch('/:id', requireRole(OPS_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    if (['completed', 'cancelled', 'rejected', 'no_show'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل حجز بحالة ' + row.status });
    }
    const editable = [
      'startAt',
      'endAt',
      'nightCount',
      'medicationsSummary',
      'dietarySummary',
      'behavioralNotes',
      'sleepNeeds',
      'equipmentRequired',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelationship',
      'estimatedCost',
      'fundingSource',
      'subsidyApprovalRef',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'respite.patch');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Booking.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'respite.delete');
  }
});

module.exports = router;
