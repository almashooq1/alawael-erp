/**
 * Goal Bank Routes — مسارات بنك الأهداف التأهيلية
 * CRUD for pre-defined SMART rehabilitation goals
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const GoalBank = require('../models/GoalBank');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ── List / Search ────────────────────────────────────────────────

/** GET /api/goal-bank — list goals (filter by domain, category, difficulty, age) */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      domain,
      category,
      difficulty,
      ageMin,
      ageMax,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = { ...branchFilter(req) };
    if (domain) filter.domain = domain;
    if (category) filter.category = { $regex: escapeRegex(String(category)), $options: 'i' };
    if (difficulty) filter.difficulty = difficulty;
    if (ageMin) filter.targetAgeMax = { $gte: Number(ageMin) };
    if (ageMax) filter.targetAgeMin = { $lte: Number(ageMax) };
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      GoalBank.find(filter)
        .sort({ domain: 1, category: 1, difficulty: 1 })
        .skip(skip)
        .limit(Number(limit)),
      GoalBank.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'goalBank list error');
  }
});

/** GET /api/goal-bank/domains — list distinct domains with counts */
router.get('/domains', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const domains = await GoalBank.aggregate([
      { $match: branchFilter(req) },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: domains });
  } catch (err) {
    safeError(res, err, 'goalBank domains error');
  }
});

/** GET /api/goal-bank/categories — list distinct categories per domain */
router.get('/categories', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { domain } = req.query;
    const match = domain ? { domain, ...branchFilter(req) } : { ...branchFilter(req) };
    const categories = await GoalBank.aggregate([
      { $match: match },
      { $group: { _id: { domain: '$domain', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { '_id.domain': 1, '_id.category': 1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (err) {
    safeError(res, err, 'goalBank categories error');
  }
});

/** GET /api/goal-bank/:id — get single goal */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const goal = await GoalBank.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (err) {
    safeError(res, err, 'goalBank get error');
  }
});

// ── Create / Update / Delete ─────────────────────────────────────

/** POST /api/goal-bank — create goal (admin / therapist) */
router.post(
  '/',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const goal = await GoalBank.create({ ...stripUpdateMeta(req.body), branchId: req.branchId });
      res.status(201).json({ success: true, data: goal });
    } catch (err) {
      logger.error('goalBank create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/goal-bank/:id — update goal */
router.put(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const goal = await GoalBank.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        stripUpdateMeta(req.body),
        {
          new: true,
          runValidators: true,
        }
      );
      if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
      res.json({ success: true, data: goal });
    } catch (err) {
      logger.error('goalBank update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/goal-bank/:id — delete goal (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const goal = await GoalBank.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
      if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
      res.json({ success: true, message: 'Goal deleted' });
    } catch (err) {
      safeError(res, err, 'goalBank delete error');
    }
  }
);

/** POST /api/goal-bank/bulk — bulk import goals (admin) */
router.post('/bulk', requireAuth, requireBranchAccess, requireRole(['admin']), async (req, res) => {
  try {
    const { goals } = req.body;
    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({ success: false, message: 'goals array is required' });
    }
    const result = await GoalBank.insertMany(
      goals.map(g => ({ ...g, branchId: req.branchId })),
      { ordered: false }
    );
    res.status(201).json({ success: true, inserted: result.length });
  } catch (err) {
    logger.error('goalBank bulk error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
