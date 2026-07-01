'use strict';

/**
 * seat-allocation.routes.js — Wave 681.
 *
 * Daily occupancy + seat-allocation surface for a day-rehab center.
 * Mounted via dualMountAuth at /api/(v1/)?seat-allocation.
 *
 * Capacity = Branch.capacity.max_patients; occupancy = count(active
 * allocations). POST gates on capacity (409 when full) so the branch is
 * never over-subscribed; release frees a seat and surfaces the next
 * waitlist candidate(s) so staff can offer the open place.
 *
 * Endpoints (11):
 *   GET    /occupancy                — capacity vs allocated per branch
 *   GET    /                         — list allocations w/ filters
 *   GET    /by-beneficiary/:id
 *   GET    /:id
 *   POST   /                         — allocate a seat (capacity gate)
 *   POST   /:id/hold
 *   POST   /:id/release              — free seat + suggest next from waitlist
 *   POST   /:id/reactivate
 *   PATCH  /:id
 *   DELETE /:id                      — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SeatAllocation = require('../models/SeatAllocation');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'receptionist',
  'coordinator',
  'social_worker',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'coordinator',
  'social_worker',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STATUSES, PERIODS } = SeatAllocation;

function lazyModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
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

// ── GET /occupancy — capacity vs allocated per branch ──────────────────
router.get('/occupancy', requireRole(READ_ROLES), async (req, res) => {
  try {
    const Branch = lazyModel('Branch');
    // Resolve which branches the caller may see (ignores ?branchId spoofing
    // for restricted users via effectiveBranchScope).
    const scoped = effectiveBranchScope(req);
    let branchIds = [];
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      // explicit single branch (assertBranchMatch-equivalent: must be in scope)
      if (!scoped || String(scoped) === String(req.query.branchId)) {
        branchIds = [req.query.branchId];
      } else {
        return res.status(403).json({ success: false, message: 'لا تملك صلاحية هذا الفرع' });
      }
    } else if (scoped) {
      branchIds = [scoped];
    } else if (Branch) {
      const all = await Branch.find({}).select('_id').lean();
      branchIds = all.map(b => b._id);
    }

    const rows = [];
    for (const bId of branchIds) {
      const [branch, allocated, onHold] = await Promise.all([
        Branch ? Branch.findById(bId).select('name name_ar capacity').lean() : null,
        SeatAllocation.countDocuments({ branchId: bId, status: 'active' }),
        SeatAllocation.countDocuments({ branchId: bId, status: 'on_hold' }),
      ]);
      const capacity = branch?.capacity?.max_patients || 0;
      rows.push({
        branchId: bId,
        branchName: branch?.name_ar || branch?.name || String(bId),
        capacity,
        allocated,
        onHold,
        available: capacity > 0 ? Math.max(0, capacity - allocated) : null,
        occupancyRate: capacity > 0 ? Math.round((allocated / capacity) * 100) : null,
        isFull: capacity > 0 && allocated >= capacity,
      });
    }
    res.json({ success: true, branches: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'seat.occupancy');
  }
});

// ── GET / — list allocations ───────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.sectionId && mongoose.isValidObjectId(req.query.sectionId)) {
      filter.sectionId = req.query.sectionId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      SeatAllocation.find(filter)
        .sort({ status: 1, effectiveFrom: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SeatAllocation.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'seat.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SeatAllocation.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ effectiveFrom: -1 })
      .limit(100)
      .lean();
    const activeSeat = items.find(r => r.status === 'active') || null;
    res.json({ success: true, items, count: items.length, activeSeat });
  } catch (err) {
    return safeError(res, err, 'seat.byBeneficiary');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatAllocation.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'seat.get');
  }
});

// ── POST / — allocate a seat (capacity gate) ───────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!body.branchId || !mongoose.isValidObjectId(body.branchId)) {
      return res.status(400).json({ success: false, message: 'branchId مطلوب' });
    }

    // Guard: a beneficiary may hold only one active seat at a branch.
    const existing = await SeatAllocation.findOne({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId,
      status: 'active',
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'للمستفيد مقعد نشط بالفعل في هذا الفرع',
        existingAllocationId: existing._id,
      });
    }

    // Capacity gate: never over-subscribe a branch.
    const Branch = lazyModel('Branch');
    const branch = Branch ? await Branch.findById(body.branchId).select('capacity').lean() : null;
    const capacity = branch?.capacity?.max_patients || 0;
    if (capacity > 0) {
      const allocated = await SeatAllocation.countDocuments({
        branchId: body.branchId,
        status: 'active',
      });
      if (allocated >= capacity) {
        return res.status(409).json({
          success: false,
          message: `الفرع ممتلئ (${allocated}/${capacity}). أضف المستفيد إلى قائمة الانتظار.`,
          capacity,
          allocated,
        });
      }
    }

    const doc = await SeatAllocation.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      seatLabel: String(body.seatLabel || '').slice(0, 50),
      daysOfWeek: Array.isArray(body.daysOfWeek)
        ? body.daysOfWeek.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
        : [],
      period: PERIODS.includes(String(body.period)) ? String(body.period) : 'full_day',
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      waitlistEntryId:
        body.waitlistEntryId && mongoose.isValidObjectId(body.waitlistEntryId)
          ? body.waitlistEntryId
          : null,
      allocatedBy: req.user?.id || null,
      allocatedByName: req.user?.name || String(body.allocatedByName || '').slice(0, 100),
      notes: String(body.notes || '').slice(0, 1000),
      status: 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'seat.create');
  }
});

// ── POST /:id/hold ─────────────────────────────────────────────────────
router.post('/:id/hold', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.holdReason || '').slice(0, 300);
    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'سبب التعليق مطلوب' });
    }
    const row = await SeatAllocation.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    if (row.status === 'released') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعليق تخصيص مُحرَّر' });
    }
    row.status = 'on_hold';
    row.holdReason = reason;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seat.hold');
  }
});

// ── POST /:id/release — free seat + suggest next from waitlist ─────────
router.post('/:id/release', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.releaseReason || '').slice(0, 300);
    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'سبب التحرير مطلوب' });
    }
    const row = await SeatAllocation.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    if (row.status === 'released') {
      return res.status(409).json({ success: false, message: 'التخصيص مُحرَّر بالفعل' });
    }
    row.status = 'released';
    row.releasedAt = new Date();
    row.releaseReason = reason;
    if (!row.effectiveTo) row.effectiveTo = row.releasedAt;
    await row.save();

    // Surface the next waitlist candidate(s) for this branch so staff can
    // offer the now-open seat. We suggest only — the waitlist lifecycle
    // (WaitlistEntry.contact/approve/enroll) stays authoritative.
    let suggestedFromWaitlist = [];
    const WaitlistEntry = lazyModel('WaitlistEntry');
    if (WaitlistEntry) {
      suggestedFromWaitlist = await WaitlistEntry.find({
        branch: row.branchId,
        status: { $nin: ['enrolled', 'rejected', 'cancelled', 'withdrawn'] },
      })
        .sort({ priorityLevel: 1, createdAt: 1 })
        .limit(5)
        .select('applicantName priorityLevel requestedServices createdAt status')
        .lean()
        .catch(() => []);
    }
    res.json({ success: true, data: row, suggestedFromWaitlist });
  } catch (err) {
    return safeError(res, err, 'seat.release');
  }
});

// ── POST /:id/reactivate ───────────────────────────────────────────────
router.post('/:id/reactivate', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatAllocation.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    if (row.status === 'active') {
      return res.status(409).json({ success: false, message: 'التخصيص نشط بالفعل' });
    }
    // Re-check capacity before re-activating (a released seat may have been
    // re-filled in the meantime).
    const Branch = lazyModel('Branch');
    const branch = Branch ? await Branch.findById(row.branchId).select('capacity').lean() : null;
    const capacity = branch?.capacity?.max_patients || 0;
    if (capacity > 0) {
      const allocated = await SeatAllocation.countDocuments({
        branchId: row.branchId,
        status: 'active',
      });
      if (allocated >= capacity) {
        return res.status(409).json({
          success: false,
          message: `الفرع ممتلئ (${allocated}/${capacity}).`,
        });
      }
    }
    row.status = 'active';
    row.holdReason = '';
    row.releasedAt = null;
    row.releaseReason = '';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seat.reactivate');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatAllocation.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    const editable = [
      'seatLabel',
      'daysOfWeek',
      'period',
      'sectionId',
      'effectiveFrom',
      'effectiveTo',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seat.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatAllocation.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'التخصيص غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'seat.delete');
  }
});

module.exports = router;
