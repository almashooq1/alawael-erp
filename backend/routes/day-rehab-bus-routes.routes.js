'use strict';

/**
 * day-rehab-bus-routes.routes.js — Wave 183.
 *
 * Endpoints:
 *   GET    /                — list (filters: status, branch, beneficiary)
 *   GET    /:id             — detail w/ hydrated stop rosters
 *   POST   /                — create
 *   PATCH  /:id             — update (NOT stops — use /:id/stops endpoints)
 *   POST   /:id/stops       — add a stop
 *   PATCH  /:id/stops/:stopId — update a stop
 *   DELETE /:id/stops/:stopId
 *   POST   /:id/assign      — add beneficiary to a stop
 *   POST   /:id/unassign    — remove beneficiary from a stop
 *   DELETE /:id             — archive (?hard=1 to delete)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DayRehabBusRoute = require('../models/DayRehabBusRoute');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'transport_supervisor',
  'driver',
  'dispatcher',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'transport_supervisor',
  'dispatcher',
];

const { STATUSES } = DayRehabBusRoute;

async function hydrateStops(route) {
  if (!route) return route;
  const ids = new Set();
  for (const s of route.stops || []) {
    for (const b of s.beneficiaryIds || []) ids.add(String(b));
  }
  const idsArr = [...ids].filter(id => mongoose.isValidObjectId(id));
  const benefs = idsArr.length
    ? await Beneficiary.find({ _id: { $in: idsArr } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  const stops = (route.stops || []).map(s => ({
    ...s,
    beneficiaries: (s.beneficiaryIds || []).map(id => map.get(String(id))).filter(Boolean),
  }));
  return { ...route, stops };
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter['stops.beneficiaryIds'] = req.query.beneficiaryId;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      DayRehabBusRoute.find(filter)
        .sort({ name: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      DayRehabBusRoute.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'busRoutes.list');
  }
});

// ── GET /:id ────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id).lean({ virtuals: true });
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    const hydrated = await hydrateStops(route);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'busRoutes.get');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name?.trim() || !body.code?.trim()) {
      return res.status(400).json({ success: false, message: 'الاسم والرمز مطلوبان' });
    }
    const route = await DayRehabBusRoute.create({
      name: body.name.trim(),
      code: body.code.trim(),
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      direction: ['pickup', 'dropoff', 'both'].includes(body.direction) ? body.direction : 'both',
      stops: Array.isArray(body.stops) ? body.stops : [],
      driverId: body.driverId && mongoose.isValidObjectId(body.driverId) ? body.driverId : null,
      driverName: body.driverName || '',
      supervisorId:
        body.supervisorId && mongoose.isValidObjectId(body.supervisorId) ? body.supervisorId : null,
      supervisorName: body.supervisorName || '',
      vehicleId: body.vehicleId && mongoose.isValidObjectId(body.vehicleId) ? body.vehicleId : null,
      vehicleLabel: body.vehicleLabel || '',
      pickupStartTime: body.pickupStartTime || '06:30',
      pickupEndTime: body.pickupEndTime || '07:30',
      dropoffStartTime: body.dropoffStartTime || '13:30',
      dropoffEndTime: body.dropoffEndTime || '14:30',
      workingDays: Array.isArray(body.workingDays) ? body.workingDays : undefined,
      status: STATUSES.includes(body.status) ? body.status : 'active',
      color: body.color || '#f59e0b',
      notes: body.notes || '',
    });
    res.status(201).json({ success: true, data: route });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'الرمز موجود مسبقاً في هذا الفرع' });
    }
    return safeError(res, err, 'busRoutes.create');
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
    delete body.stops; // use /stops endpoints
    const route = await DayRehabBusRoute.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.patch');
  }
});

// ── POST /:id/stops — add a stop ───────────────────────────────────────
router.post('/:id/stops', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = req.body || {};
    if (!body.name?.trim()) {
      return res.status(400).json({ success: false, message: 'اسم المحطة مطلوب' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });

    const order = body.order ?? route.stops.length + 1;
    route.stops.push({
      order,
      name: body.name.trim(),
      area: body.area || '',
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      estimatedPickupTime: body.estimatedPickupTime || null,
      estimatedDropoffTime: body.estimatedDropoffTime || null,
      beneficiaryIds: Array.isArray(body.beneficiaryIds) ? body.beneficiaryIds : [],
      notes: body.notes || '',
    });
    await route.save();
    res.status(201).json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.addStop');
  }
});

// ── PATCH /:id/stops/:stopId ──────────────────────────────────────────
router.patch('/:id/stops/:stopId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.stopId)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    const stop = route.stops.id(req.params.stopId);
    if (!stop) return res.status(404).json({ success: false, message: 'المحطة غير موجودة' });
    const body = req.body || {};
    for (const k of [
      'name',
      'area',
      'order',
      'latitude',
      'longitude',
      'estimatedPickupTime',
      'estimatedDropoffTime',
      'notes',
    ]) {
      if (body[k] !== undefined) stop[k] = body[k];
    }
    await route.save();
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.patchStop');
  }
});

// ── DELETE /:id/stops/:stopId ─────────────────────────────────────────
router.delete('/:id/stops/:stopId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.stopId)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    const stop = route.stops.id(req.params.stopId);
    if (!stop) return res.status(404).json({ success: false, message: 'المحطة غير موجودة' });
    stop.deleteOne();
    await route.save();
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.deleteStop');
  }
});

// ── POST /:id/assign — add beneficiary to a stop ───────────────────────
router.post('/:id/assign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const { stopId, beneficiaryId } = req.body || {};
    if (!mongoose.isValidObjectId(stopId) || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'stopId و beneficiaryId مطلوبان' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    const stop = route.stops.id(stopId);
    if (!stop) return res.status(404).json({ success: false, message: 'المحطة غير موجودة' });
    const existing = new Set(stop.beneficiaryIds.map(String));
    existing.add(String(beneficiaryId));
    stop.beneficiaryIds = [...existing];
    await route.save();
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.assign');
  }
});

// ── POST /:id/unassign ────────────────────────────────────────────────
router.post('/:id/unassign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const { stopId, beneficiaryId } = req.body || {};
    if (!mongoose.isValidObjectId(stopId) || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'stopId و beneficiaryId مطلوبان' });
    }
    const route = await DayRehabBusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    const stop = route.stops.id(stopId);
    if (!stop) return res.status(404).json({ success: false, message: 'المحطة غير موجودة' });
    stop.beneficiaryIds = stop.beneficiaryIds.filter(b => String(b) !== String(beneficiaryId));
    await route.save();
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'busRoutes.unassign');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    if (req.query.hard === '1') {
      const row = await DayRehabBusRoute.findByIdAndDelete(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
      return res.json({ success: true, message: 'تم الحذف نهائياً' });
    }
    const row = await DayRehabBusRoute.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'الخط غير موجود' });
    res.json({ success: true, message: 'تم الأرشفة', data: row });
  } catch (err) {
    return safeError(res, err, 'busRoutes.delete');
  }
});

module.exports = router;
