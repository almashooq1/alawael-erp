/**
 * Event Management Routes — مسارات إدارة الفعاليات
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// Coordinator-only gate for create/edit/delete event endpoints. The
// registration endpoint stays open (community members register
// themselves for events). Mass-assignment risk on Event.create remains
// for HR/admin only after this — they're already trusted to set fields.
const requireEventAdmin = authorize(
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'hr_manager',
  'event_coordinator'
);

const safeModel = n => {
  if (mongoose.models[n]) return mongoose.model(n);
  try {
    return require('../models/EventManagement')[n];
  } catch {
    return require('../_archived/dead-models/EventManagement')[n];
  }
};

function listScope(req, base = {}) {
  const scope = { ...branchFilter(req) };
  if (!scope.branchId && req.query?.branchId && mongoose.isValidObjectId(req.query.branchId)) {
    scope.branchId = req.query.branchId;
  }
  return { ...base, ...scope };
}

function scopedById(req, id) {
  return { _id: id, ...branchFilter(req) };
}

async function assertEventInScope(req, res, eventId) {
  if (!mongoose.isValidObjectId(eventId)) {
    res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    return false;
  }
  const Ev = safeModel('Event');
  const hit = await Ev.findOne(scopedById(req, eventId)).select('_id').lean();
  if (!hit) {
    res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    return false;
  }
  return true;
}

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const Reg = safeModel('EventRegistration');
    const scope = listScope(req, {});
    const now = new Date();

    const [totalEvents, upcoming, inProgress, totalRegistrations] = await Promise.all([
      Ev.countDocuments(scope).catch(() => 0),
      Ev.countDocuments({
        ...scope,
        startDate: { $gt: now },
        status: { $in: ['approved', 'registration_open'] },
      }).catch(() => 0),
      Ev.countDocuments({ ...scope, status: 'in_progress' }).catch(() => 0),
      Reg.countDocuments(
        scope.branchId ? { event: { $in: await Ev.find(scope).distinct('_id') } } : {}
      ).catch(() => 0),
    ]);

    const byType = await Ev.aggregate([
      { $match: scope },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]).catch(() => []);
    const upcomingEvents = await Ev.find({ ...scope, startDate: { $gt: now } })
      .sort({ startDate: 1 })
      .limit(5)
      .lean()
      .catch(() => []);

    res.json({
      success: true,
      data: {
        summary: { totalEvents, upcoming, inProgress, totalRegistrations },
        eventsByType: byType.map(t => ({ type: t._id, count: t.count })),
        upcomingEvents,
      },
    });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

// ── Events CRUD ──────────────────────────────────────────────
router.get('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = listScope(req, {});
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Ev.find(filter).sort({ startDate: -1 }).skip(skip).limit(Number(limit)).lean(),
      Ev.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.post('/', authenticate, requireBranchAccess, requireEventAdmin, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const doc = await Ev.create({
      ...req.body,
      branchId: req.branchScope?.branchId || req.body.branchId || null,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.put('/:id', authenticate, requireBranchAccess, requireEventAdmin, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const doc = await Ev.findOneAndUpdate(
      scopedById(req, req.params.id),
      stripUpdateMeta(req.body),
      {
        returnDocument: 'after',
      }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.delete('/:id', authenticate, requireBranchAccess, requireEventAdmin, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const doc = await Ev.findOneAndDelete(scopedById(req, req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

// ── Registrations ────────────────────────────────────────────
router.get('/:eventId/registrations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    if (!(await assertEventInScope(req, res, req.params.eventId))) return;
    const Reg = safeModel('EventRegistration');
    const docs = await Reg.find({ event: req.params.eventId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.post('/:eventId/registrations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    if (!(await assertEventInScope(req, res, req.params.eventId))) return;
    const Reg = safeModel('EventRegistration');
    const doc = await Reg.create({ ...req.body, event: req.params.eventId });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

module.exports = router;
