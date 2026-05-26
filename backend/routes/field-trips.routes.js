'use strict';

/**
 * field-trips.routes.js — Wave 202b.
 *
 * Endpoints:
 *   GET    /                  — list w/ filters
 *   GET    /upcoming          — approved + in_progress trips (next 30d)
 *   GET    /:id               — detail w/ hydrated enrollments
 *   POST   /                  — create planning trip
 *   PATCH  /:id               — edit details (blocked when in_progress/completed)
 *   POST   /:id/enroll        — add a beneficiary (creates pending consent)
 *   POST   /:id/unenroll      — remove a beneficiary
 *   POST   /:id/consent       — record consent (signed or declined)
 *   POST   /:id/staff         — add staff name
 *   POST   /:id/transition    — move status (state machine)
 *   POST   /:id/depart        — record actual departure → in_progress
 *   POST   /:id/return        — record actual return + post-notes → completed
 *   POST   /:id/attendance    — mark per-beneficiary attended at trip end
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const FieldTrip = require('../models/FieldTrip');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W446: branch-scope every endpoint. Model carries `branchId`; pre-W446
// list filters were optional + instance loads bare findById, opening
// cross-tenant IDOR (read/modify/delete any branch by ObjectId guess).
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'receptionist',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
];
const APPROVE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, STATUSES, CONSENT_STATUSES } = FieldTrip;

const TRANSITIONS = {
  planning: ['consents_pending', 'cancelled'],
  consents_pending: ['planning', 'approved', 'cancelled'],
  approved: ['in_progress', 'consents_pending', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

async function hydrateTrip(trip) {
  if (!trip || !Array.isArray(trip.enrollments)) return trip;
  const ids = trip.enrollments
    .map(e => String(e.beneficiaryId))
    .filter(id => mongoose.isValidObjectId(id));
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  const enrollments = trip.enrollments.map(e => ({
    ...e,
    beneficiary: map.get(String(e.beneficiaryId)) || null,
  }));
  return { ...trip, enrollments };
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W446 */
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.tripType && TYPES.includes(String(req.query.tripType))) {
      filter.tripType = String(req.query.tripType);
    }
    if (req.query.from || req.query.to) {
      filter.tripDate = {};
      if (req.query.from) filter.tripDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.tripDate.$lte = new Date(req.query.to);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      FieldTrip.find(filter)
        .sort({ tripDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      FieldTrip.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'trips.list');
  }
});

// ── GET /upcoming ─────────────────────────────────────────────────────
router.get('/upcoming', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const items = await FieldTrip.find({
      ...branchFilter(req),
      /* W446 */ status: { $in: ['approved', 'in_progress'] },
      tripDate: { $gte: now, $lte: horizon },
    })
      .sort({ tripDate: 1 })
      .lean({ virtuals: true });
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'trips.upcoming');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const trip = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }) /* W446 */
      .lean({ virtuals: true });
    if (!trip) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    const hydrated = await hydrateTrip(trip);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'trips.get');
  }
});

// ── POST / — create ────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!String(body.title || '').trim() || !String(body.destination || '').trim()) {
      return res.status(400).json({ success: false, message: 'العنوان والوجهة مطلوبان' });
    }
    if (!body.tripDate) {
      return res.status(400).json({ success: false, message: 'تاريخ الرحلة مطلوب' });
    }
    const doc = await FieldTrip.create({
      title: String(body.title).trim().slice(0, 150),
      destination: String(body.destination).trim().slice(0, 200),
      address: String(body.address || '').slice(0, 300),
      tripType: TYPES.includes(body.tripType) ? body.tripType : 'educational',
      tripDate: new Date(body.tripDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      departureTime: body.departureTime || '08:00',
      returnTime: body.returnTime || '13:00',
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      leadStaffName: String(body.leadStaffName || '').slice(0, 100),
      staffParticipants: Array.isArray(body.staffParticipants)
        ? body.staffParticipants.slice(0, 20)
        : [],
      requiredStaffRatio: typeof body.requiredStaffRatio === 'number' ? body.requiredStaffRatio : 3,
      transportMethod: body.transportMethod || 'center_bus',
      estimatedCostSAR: typeof body.estimatedCostSAR === 'number' ? body.estimatedCostSAR : null,
      riskAssessment: String(body.riskAssessment || '').slice(0, 2000),
      emergencyPlan: String(body.emergencyPlan || '').slice(0, 1000),
      emergencyContactName: String(body.emergencyContactName || '').slice(0, 100),
      emergencyContactPhone: String(body.emergencyContactPhone || '').slice(0, 20),
      suppliesNeeded: Array.isArray(body.suppliesNeeded) ? body.suppliesNeeded : [],
      status: 'planning',
      createdByName: req.user?.name || body.createdByName || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'trips.create');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status === 'in_progress' || row.status === 'completed') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل رحلة بحالة ' + row.status });
    }
    const body = { ...(req.body || {}) };
    delete body.status;
    delete body.enrollments;
    delete body.staffParticipants; // use /staff
    delete body.actualDepartureTime;
    delete body.actualReturnTime;
    if (body.tripDate) body.tripDate = new Date(body.tripDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    Object.assign(row, body);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.patch');
  }
});

// ── POST /:id/enroll ──────────────────────────────────────────────────
router.post('/:id/enroll', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const beneficiaryId = req.body?.beneficiaryId;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status === 'in_progress' || row.status === 'completed' || row.status === 'cancelled') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إضافة مستفيد لرحلة بحالة ' + row.status });
    }
    if (row.enrollments.some(e => String(e.beneficiaryId) === String(beneficiaryId))) {
      return res.status(409).json({ success: false, message: 'المستفيد مسجّل مسبقاً' });
    }
    row.enrollments.push({ beneficiaryId, consentStatus: 'pending' });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.enroll');
  }
});

// ── POST /:id/unenroll ────────────────────────────────────────────────
router.post('/:id/unenroll', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const beneficiaryId = req.body?.beneficiaryId;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status === 'in_progress' || row.status === 'completed') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إزالة مستفيد من رحلة بحالة ' + row.status });
    }
    row.enrollments = row.enrollments.filter(
      e => String(e.beneficiaryId) !== String(beneficiaryId)
    );
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.unenroll');
  }
});

// ── POST /:id/consent ─────────────────────────────────────────────────
router.post('/:id/consent', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, status, signedBy, declineReason } = req.body || {};
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!CONSENT_STATUSES.includes(status) || status === 'pending') {
      return res.status(400).json({ success: false, message: 'status يجب signed أو declined' });
    }
    if (status === 'declined' && !String(declineReason || '').trim()) {
      return res.status(400).json({ success: false, message: 'declineReason مطلوب' });
    }
    if (status === 'signed' && !String(signedBy || '').trim()) {
      return res.status(400).json({ success: false, message: 'signedBy مطلوب' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    const enroll = row.enrollments.find(e => String(e.beneficiaryId) === String(beneficiaryId));
    if (!enroll) {
      return res.status(404).json({ success: false, message: 'المستفيد غير مسجّل في الرحلة' });
    }
    enroll.consentStatus = status;
    if (status === 'signed') {
      enroll.consentSignedBy = String(signedBy).trim().slice(0, 100);
      enroll.consentSignedAt = new Date();
    } else {
      enroll.declineReason = String(declineReason).trim().slice(0, 300);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.consent');
  }
});

// ── POST /:id/staff — append staff name ───────────────────────────────
router.post('/:id/staff', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status === 'completed' || row.status === 'cancelled') {
      return res.status(409).json({ success: false, message: 'الرحلة منتهية' });
    }
    if (!row.staffParticipants.includes(name)) row.staffParticipants.push(name.slice(0, 100));
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.staff');
  }
});

// ── POST /:id/transition ──────────────────────────────────────────────
router.post('/:id/transition', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    const next = String(req.body?.to || '');
    if (!STATUSES.includes(next)) {
      return res.status(400).json({ success: false, message: 'to غير صالح' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    const allowed = TRANSITIONS[row.status] || [];
    if (!allowed.includes(next)) {
      return res
        .status(409)
        .json({ success: false, message: `لا يمكن الانتقال من ${row.status} إلى ${next}` });
    }
    // Approval requires every enrollment signed
    if (next === 'approved') {
      const pending = row.enrollments.filter(e => e.consentStatus !== 'signed');
      if (pending.length > 0) {
        return res.status(409).json({
          success: false,
          message: `${pending.length} موافقة لم تُوقَّع بعد`,
        });
      }
      // Ratio check
      const ratio = row.enrollments.length / Math.max(1, row.staffParticipants.length);
      if (ratio > row.requiredStaffRatio) {
        return res.status(409).json({
          success: false,
          message: `النسبة الحالية 1:${ratio.toFixed(1)} تتجاوز الحد 1:${row.requiredStaffRatio}. أضف موظفين أو أزل مستفيدين.`,
        });
      }
      row.approvedByName = req.user?.name || String(req.body?.approvedByName || '');
      row.approvedAt = new Date();
    }
    row.status = next;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.transition');
  }
});

// ── POST /:id/depart ──────────────────────────────────────────────────
router.post('/:id/depart', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status !== 'approved') {
      return res
        .status(409)
        .json({ success: false, message: 'الرحلة يجب أن تكون معتمدة قبل المغادرة' });
    }
    row.actualDepartureTime = new Date();
    row.status = 'in_progress';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.depart');
  }
});

// ── POST /:id/return ──────────────────────────────────────────────────
router.post('/:id/return', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    if (row.status !== 'in_progress') {
      return res.status(409).json({ success: false, message: 'الرحلة غير جارية' });
    }
    row.actualReturnTime = new Date();
    if (req.body?.postTripNotes) {
      row.postTripNotes = String(req.body.postTripNotes).slice(0, 2000);
    }
    if (typeof req.body?.incidentsReported === 'boolean') {
      row.incidentsReported = req.body.incidentsReported;
    }
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.return');
  }
});

// ── POST /:id/attendance ──────────────────────────────────────────────
router.post('/:id/attendance', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, attended } = req.body || {};
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const row = await FieldTrip.findOne({ _id: req.params.id, ...branchFilter(req) }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    const enroll = row.enrollments.find(e => String(e.beneficiaryId) === String(beneficiaryId));
    if (!enroll) return res.status(404).json({ success: false, message: 'المستفيد غير مسجّل' });
    enroll.actualAttended = !!attended;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'trips.attendance');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    const row = await FieldTrip.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W446 */
    if (!row) return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'trips.delete');
  }
});

module.exports = router;
