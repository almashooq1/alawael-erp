/**
 * Programs Routes — مسارات البرامج
 * CRUD for generic programs (physical, cognitive, occupational, speech, etc.)
 */

const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const { requireAuth, _requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── GET / — list programs (filter by category, status, tags) ───────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status, tag, search, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Program.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name')
        .lean(),
      Program.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('Programs GET / error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /stats — program statistics ────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [byCategory, byStatus] = await Promise.all([
      Program.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Program.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const total = await Program.countDocuments();
    const totalParticipants = await Program.aggregate([
      { $group: { _id: null, total: { $sum: '$currentParticipants' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        totalParticipants: totalParticipants[0]?.total || 0,
        byCategory,
        byStatus,
      },
    });
  } catch (err) {
    logger.error('Programs GET /stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /categories — list distinct categories ─────────────────────────
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await Program.distinct('category');
    res.json({ success: true, data: categories });
  } catch (err) {
    logger.error('Programs GET /categories error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /active — active programs only ─────────────────────────────────
router.get('/active', requireAuth, async (req, res) => {
  try {
    const data = await Program.find({ status: 'active' })
      .sort({ name: 1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('Programs GET /active error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /:id — single program ──────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Program.findById(req.params.id).populate('createdBy', 'name');
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs GET /:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST / — create program ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const doc = await Program.create({
      ...req.body,
      createdBy: req.body.createdBy || req.user?._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs POST / error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /:id — update program ──────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Program.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs PUT /:id error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /:id — remove program ───────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Program.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, message: 'Program deleted' });
  } catch (err) {
    logger.error('Programs DELETE /:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /:id/status — update program status ─────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'completed', 'paused'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
      });
    }

    const doc = await Program.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs PATCH /:id/status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /:id/participants — update current participants count ───────
router.patch('/:id/participants', requireAuth, async (req, res) => {
  try {
    const { increment } = req.body; // +1 or -1
    const doc = await Program.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });

    const delta = Number(increment) || 0;
    doc.currentParticipants = Math.max(0, (doc.currentParticipants || 0) + delta);

    if (doc.targetParticipants && doc.currentParticipants > doc.targetParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Cannot exceed target participants',
      });
    }

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs PATCH /:id/participants error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
