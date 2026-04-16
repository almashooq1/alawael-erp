/**
 * Event Management Routes — مسارات إدارة الفعاليات
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

const safeModel = n =>
  mongoose.models[n] ? mongoose.model(n) : require(`../models/EventManagement`)[n];

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', authenticate, requireBranchAccess, async (_req, res) => {
  try {
    const Ev = safeModel('Event');
    const Reg = safeModel('EventRegistration');
    const now = new Date();

    const [totalEvents, upcoming, inProgress, totalRegistrations] = await Promise.all([
      Ev.countDocuments().catch(() => 0),
      Ev.countDocuments({
        startDate: { $gt: now },
        status: { $in: ['approved', 'registration_open'] },
      }).catch(() => 0),
      Ev.countDocuments({ status: 'in_progress' }).catch(() => 0),
      Reg.countDocuments().catch(() => 0),
    ]);

    const byType = await Ev.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]).catch(
      () => []
    );
    const upcomingEvents = await Ev.find({ startDate: { $gt: now } })
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
    const filter = {};
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

router.post('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const doc = await Ev.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.put('/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    const doc = await Ev.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.delete('/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Ev = safeModel('Event');
    await Ev.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

// ── Registrations ────────────────────────────────────────────
router.get('/:eventId/registrations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Reg = safeModel('EventRegistration');
    const docs = await Reg.find({ event: req.params.eventId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

router.post('/:eventId/registrations', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Reg = safeModel('EventRegistration');
    const doc = await Reg.create({ ...req.body, event: req.params.eventId });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'events-management');
  }
});

module.exports = router;
