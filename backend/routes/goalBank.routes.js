/**
 * Goal Bank Routes — مسارات بنك الأهداف التأهيلية
 * CRUD for pre-defined SMART rehabilitation goals
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const GoalBank = require('../models/GoalBank');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

// ── List / Search ────────────────────────────────────────────────

/** GET /api/goal-bank — list goals (filter by domain, category, difficulty, age) */
router.get('/', requireAuth, async (req, res) => {
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
    const filter = {};
    if (domain) filter.domain = domain;
    if (category) filter.category = { $regex: category, $options: 'i' };
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
    logger.error('goalBank list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/goal-bank/domains — list distinct domains with counts */
router.get('/domains', requireAuth, async (req, res) => {
  try {
    const domains = await GoalBank.aggregate([
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: domains });
  } catch (err) {
    logger.error('goalBank domains error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/goal-bank/categories — list distinct categories per domain */
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const { domain } = req.query;
    const match = domain ? { domain } : {};
    const categories = await GoalBank.aggregate([
      { $match: match },
      { $group: { _id: { domain: '$domain', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { '_id.domain': 1, '_id.category': 1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (err) {
    logger.error('goalBank categories error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/goal-bank/:id — get single goal */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const goal = await GoalBank.findById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (err) {
    logger.error('goalBank get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── Create / Update / Delete ─────────────────────────────────────

/** POST /api/goal-bank — create goal (admin / therapist) */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const goal = await GoalBank.create(req.body);
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
  requireRole(['admin', 'supervisor', 'therapist']),
  async (req, res) => {
    try {
      const goal = await GoalBank.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
      res.json({ success: true, data: goal });
    } catch (err) {
      logger.error('goalBank update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/goal-bank/:id — delete goal (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const goal = await GoalBank.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    logger.error('goalBank delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/goal-bank/bulk — bulk import goals (admin) */
router.post('/bulk', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { goals } = req.body;
    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({ success: false, message: 'goals array is required' });
    }
    const result = await GoalBank.insertMany(goals, { ordered: false });
    res.status(201).json({ success: true, inserted: result.length });
  } catch (err) {
    logger.error('goalBank bulk error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
