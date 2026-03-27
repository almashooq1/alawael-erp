/**
 * Activities Routes — مسارات الأنشطة
 * CRUD for program activities (session, workshop, assessment, exercise, meeting)
 */

const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { requireAuth, _requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── GET / — list activities (filter by program, type, status, date range) ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const { programId, type, status, dateFrom, dateTo, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (programId) filter.programId = programId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Activity.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('programId', 'name')
        .populate('createdBy', 'name')
        .populate('participants', 'name')
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('Activities GET / error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /stats — activity statistics ───────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { programId } = req.query;
    const match = {};
    if (programId) match.programId = require('mongoose').Types.ObjectId(programId);

    const [byStatus, byType] = await Promise.all([
      Activity.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Activity.aggregate([
        { $match: match },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const total = await Activity.countDocuments(match);

    res.json({
      success: true,
      data: { total, byStatus, byType },
    });
  } catch (err) {
    logger.error('Activities GET /stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /program/:programId — activities for a specific program ────────
router.get('/program/:programId', requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    const filter = { programId: req.params.programId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Activity.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name')
        .populate('participants', 'name')
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('Activities GET /program/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /upcoming — upcoming scheduled activities ──────────────────────
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(days));

    const data = await Activity.find({
      status: 'scheduled',
      date: { $gte: new Date(), $lte: endDate },
    })
      .sort({ date: 1 })
      .populate('programId', 'name')
      .populate('createdBy', 'name')
      .populate('participants', 'name')
      .lean();

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('Activities GET /upcoming error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /:id — single activity ─────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Activity.findById(req.params.id)
      .populate('programId', 'name')
      .populate('createdBy', 'name')
      .populate('participants', 'name');
    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities GET /:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST / — create activity ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const doc = await Activity.create({
      ...req.body,
      createdBy: req.body.createdBy || req.user?._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities POST / error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /:id — update activity ─────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities PUT /:id error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /:id — remove activity ──────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Activity.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (err) {
    logger.error('Activities DELETE /:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /:id/status — update activity status ────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
      });
    }

    const doc = await Activity.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities PATCH /:id/status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /:id/participants — add participants ─────────────────────────
router.post('/:id/participants', requireAuth, async (req, res) => {
  try {
    const { participantIds } = req.body;
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'participantIds array is required' });
    }

    const doc = await Activity.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { participants: { $each: participantIds } } },
      { new: true }
    ).populate('participants', 'name');

    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities POST /:id/participants error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /:id/participants/:participantId — remove participant ───────
router.delete('/:id/participants/:participantId', requireAuth, async (req, res) => {
  try {
    const doc = await Activity.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: req.params.participantId } },
      { new: true }
    ).populate('participants', 'name');

    if (!doc) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Activities DELETE /:id/participants/:pid error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
