'use strict';
/**
 * Student Events Routes — إدارة الفعاليات والأنشطة للطلاب
 * ══════════════════════════════════════════════════════════════════════════
 * Event management: create, publish, registration, attendance tracking,
 * feedback, and reporting.
 *
 *   GET    /                    list events
 *   POST   /                    create event
 *   GET    /:id                 get event details
 *   PUT    /:id                 update event
 *   DELETE /:id                 cancel event
 *   PATCH  /:id/publish         publish event
 *   POST   /:id/register        register student for event
 *   DELETE /:id/register        cancel registration
 *   GET    /:id/registrations   list event registrations
 *   POST   /:id/attendance      mark attendance
 *   GET    /:id/attendance      get attendance list
 *   POST   /:id/feedback        submit event feedback
 *   GET    /calendar            events calendar view
 *   GET    /stats               event statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, status, type, from, to } = req.query;
    const filter = { branchId: req.user.branchId, activityType: 'event' };
    if (status) filter['data.status'] = status;
    if (type) filter['data.eventType'] = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StudentActivity.find(filter).sort({ date: 1 }).skip(skip).limit(Number(limit)).lean(),
      StudentActivity.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list events');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      maxCapacity,
      targetAudience = 'all',
    } = req.body;
    if (!title || !startDate)
      return res.status(400).json({ success: false, message: 'title and startDate are required' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.create({
      activityType: 'event',
      data: {
        title,
        description,
        eventType,
        endDate,
        location,
        maxCapacity,
        targetAudience,
        status: 'draft',
        registrations: [],
        attendance: [],
      },
      date: new Date(startDate),
      branchId: req.user.branchId,
      recordedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create event');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'event',
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get event');
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        activityType: 'event',
        'data.status': { $ne: 'cancelled' },
      },
      { $set: { data: req.body } },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Event not found or cancelled' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update event');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, activityType: 'event' },
      {
        'data.status': 'cancelled',
        'data.cancelledAt': new Date(),
        'data.cancelledBy': req.user._id,
      }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event cancelled' });
  } catch (err) {
    safeError(res, err, 'cancel event');
  }
});

// ── PATCH /:id/publish ─────────────────────────────────────────────────────
router.patch('/:id/publish', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        activityType: 'event',
        'data.status': 'draft',
      },
      {
        'data.status': 'published',
        'data.publishedAt': new Date(),
        'data.publishedBy': req.user._id,
      },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Draft event not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'publish event');
  }
});

// ── POST /:id/register ─────────────────────────────────────────────────────
router.post('/:id/register', async (req, res) => {
  try {
    const { studentId = req.user._id } = req.body;
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const event = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'event',
      'data.status': 'published',
    }).lean();
    if (!event)
      return res.status(404).json({ success: false, message: 'Published event not found' });
    const regCount = (event.data?.registrations || []).length;
    if (event.data?.maxCapacity && regCount >= event.data.maxCapacity)
      return res.status(400).json({ success: false, message: 'Event is at full capacity' });
    const doc = await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      {
        $addToSet: {
          'data.registrations': { studentId, registeredAt: new Date(), registeredBy: req.user._id },
        },
      },
      { returnDocument: 'after' }
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'register for event');
  }
});

// ── DELETE /:id/register ───────────────────────────────────────────────────
router.delete('/:id/register', async (req, res) => {
  try {
    const { studentId = req.user._id } = req.body;
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { $pull: { 'data.registrations': { studentId } } }
    );
    res.json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    safeError(res, err, 'cancel registration');
  }
});

// ── GET /:id/registrations ─────────────────────────────────────────────────
router.get(
  '/:id/registrations',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const StudentActivity = safeModel('StudentActivity');
      if (!StudentActivity)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await StudentActivity.findOne({
        _id: req.params.id,
        branchId: req.user.branchId,
        activityType: 'event',
      })
        .select('data.registrations data.maxCapacity')
        .lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });
      res.json({
        success: true,
        data: doc.data?.registrations || [],
        total: (doc.data?.registrations || []).length,
        maxCapacity: doc.data?.maxCapacity,
      });
    } catch (err) {
      safeError(res, err, 'get registrations');
    }
  }
);

// ── POST /:id/attendance ───────────────────────────────────────────────────
router.post(
  '/:id/attendance',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const { studentId, attended = true } = req.body;
      if (!studentId)
        return res.status(400).json({ success: false, message: 'studentId is required' });
      const StudentActivity = safeModel('StudentActivity');
      if (!StudentActivity)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await StudentActivity.findOneAndUpdate(
        { _id: req.params.id, branchId: req.user.branchId, activityType: 'event' },
        {
          $addToSet: {
            'data.attendance': {
              studentId,
              attended,
              markedAt: new Date(),
              markedBy: req.user._id,
            },
          },
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'mark attendance');
    }
  }
);

// ── GET /:id/attendance ────────────────────────────────────────────────────
router.get('/:id/attendance', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'event',
    })
      .select('data.attendance')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: doc.data?.attendance || [] });
  } catch (err) {
    safeError(res, err, 'get attendance');
  }
});

// ── POST /:id/feedback ─────────────────────────────────────────────────────
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'rating must be 1-5' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, activityType: 'event' },
      {
        $push: {
          'data.feedback': { userId: req.user._id, rating, comment, submittedAt: new Date() },
        },
      }
    );
    res.json({ success: true, message: 'Feedback submitted' });
  } catch (err) {
    safeError(res, err, 'event feedback');
  }
});

// ── GET /calendar ──────────────────────────────────────────────────────────
router.get('/calendar', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { month, year } = req.query;
    const now = new Date();
    const y = parseInt(year || now.getFullYear());
    const m = parseInt(month || now.getMonth() + 1);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const data = await StudentActivity.find({
      branchId: req.user.branchId,
      activityType: 'event',
      date: { $gte: start, $lte: end },
      'data.status': { $ne: 'cancelled' },
    })
      .select('date data.title data.eventType data.status data.maxCapacity data.registrations')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'events calendar');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({ success: true, data: { total: 0, published: 0, upcoming: 0 } });
    const base = { branchId: req.user.branchId, activityType: 'event' };
    const [total, published, cancelled] = await Promise.all([
      StudentActivity.countDocuments(base),
      StudentActivity.countDocuments({ ...base, 'data.status': 'published' }),
      StudentActivity.countDocuments({ ...base, 'data.status': 'cancelled' }),
    ]);
    res.json({ success: true, data: { total, published, cancelled, upcoming: published } });
  } catch (err) {
    safeError(res, err, 'event stats');
  }
});

module.exports = router;
