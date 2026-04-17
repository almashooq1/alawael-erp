/**
 * Programs Routes — مسارات البرامج
 * CRUD for generic programs (physical, cognitive, occupational, speech, etc.)
 */

const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const { requireAuth, _requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ── GET / — list programs (filter by category, status, tags) ───────────
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { category, status, tag, search, page = 1, limit = 25 } = req.query;

    const filter = { ...branchFilter(req) };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(String(search)), $options: 'i' } },
        { description: { $regex: escapeRegex(String(search)), $options: 'i' } },
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
    safeError(res, err, 'Programs GET / error');
  }
});

// ── GET /stats — program statistics ────────────────────────────────────
router.get('/stats', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const [byCategory, byStatus] = await Promise.all([
      Program.aggregate([
        { $match: scope },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Program.aggregate([
        { $match: scope },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const total = await Program.countDocuments(scope);
    const totalParticipants = await Program.aggregate([
      { $match: scope },
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
    safeError(res, err, 'Programs GET /stats error');
  }
});

// ── GET /categories — list distinct categories ─────────────────────────
router.get('/categories', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const categories = await Program.distinct('category', scope);
    res.json({ success: true, data: categories });
  } catch (err) {
    safeError(res, err, 'Programs GET /categories error');
  }
});

// ── GET /active — active programs only ─────────────────────────────────
router.get('/active', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const data = await Program.find({ status: 'active', ...branchFilter(req) })
      .sort({ name: 1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'Programs GET /active error');
  }
});

// ── GET /:id — single program ──────────────────────────────────────────
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await Program.findOne({ _id: req.params.id, ...branchFilter(req) }).populate(
      'createdBy',
      'name'
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'Programs GET /:id error');
  }
});

// ── POST / — create program ───────────────────────────────────────────
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.body.createdBy || req.user?._id };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const doc = await Program.create(body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs POST / error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── PUT /:id — update program ──────────────────────────────────────────
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await Program.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('Programs PUT /:id error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── DELETE /:id — remove program ───────────────────────────────────────
router.delete('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const doc = await Program.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, message: 'Program deleted' });
  } catch (err) {
    safeError(res, err, 'Programs DELETE /:id error');
  }
});

// ── PATCH /:id/status — update program status ─────────────────────────
router.patch('/:id/status', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'completed', 'paused'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
      });
    }

    const doc = await Program.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      { status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'Programs PATCH /:id/status error');
  }
});

// ── PATCH /:id/participants — update current participants count ───────
router.patch('/:id/participants', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { increment } = req.body; // +1 or -1
    const doc = await Program.findOne({ _id: req.params.id, ...branchFilter(req) });
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
    safeError(res, err, 'Programs PATCH /:id/participants error');
  }
});

module.exports = router;
