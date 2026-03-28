/**
 * Gamification Routes — مسارات اللعبية
 * Manage badges, wallets, and point awards
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const SmartGamificationService = require('../services/smartGamification.service');
const { Badge, BeneficiaryWallet } = require('../models/Gamification');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

// ── Badges CRUD ──────────────────────────────────────────────────

/** GET /api/gamification/badges — list all badges */
router.get('/badges', requireAuth, async (req, res) => {
  try {
    const badges = await Badge.find().sort({ category: 1, threshold: 1 });
    res.json({ success: true, data: badges, count: badges.length });
  } catch (err) {
    logger.error('gamification badges list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/gamification/badges — create badge (admin) */
router.post('/badges', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const badge = await Badge.create(req.body);
    res.status(201).json({ success: true, data: badge });
  } catch (err) {
    logger.error('gamification badge create error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/** PUT /api/gamification/badges/:id — update badge (admin) */
router.put('/badges/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const badge = await Badge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, data: badge });
  } catch (err) {
    logger.error('gamification badge update error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/** DELETE /api/gamification/badges/:id — delete badge (admin) */
router.delete('/badges/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const badge = await Badge.findByIdAndDelete(req.params.id);
    if (!badge) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, message: 'Badge deleted' });
  } catch (err) {
    logger.error('gamification badge delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/gamification/badges/seed — seed default badges (admin) */
router.post('/badges/seed', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    await SmartGamificationService.seedBadges();
    const count = await Badge.countDocuments();
    res.json({ success: true, message: 'Badges seeded', count });
  } catch (err) {
    logger.error('gamification seed error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── Wallets ──────────────────────────────────────────────────────

/** GET /api/gamification/wallets — list all wallets */
router.get('/wallets', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [wallets, total] = await Promise.all([
      BeneficiaryWallet.find()
        .populate('beneficiary', 'name fileNumber')
        .sort({ totalPoints: -1 })
        .skip(skip)
        .limit(+limit),
      BeneficiaryWallet.countDocuments(),
    ]);
    res.json({ success: true, data: wallets, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('gamification wallets list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/gamification/wallets/:beneficiaryId — get wallet by beneficiary */
router.get('/wallets/:beneficiaryId', requireAuth, async (req, res) => {
  try {
    const wallet = await BeneficiaryWallet.findOne({ beneficiary: req.params.beneficiaryId })
      .populate('beneficiary', 'name fileNumber')
      .populate('badges.badge');
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, data: wallet });
  } catch (err) {
    logger.error('gamification wallet get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/gamification/award — award points to beneficiary */
router.post('/award', requireAuth, async (req, res) => {
  try {
    const { beneficiaryId, actionType, points } = req.body;
    if (!beneficiaryId || !actionType) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and actionType required' });
    }
    const result = await SmartGamificationService.awardAction(
      beneficiaryId,
      actionType,
      points || 10
    );
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('gamification award error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/gamification/leaderboard — top wallets */
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaders = await BeneficiaryWallet.find()
      .populate('beneficiary', 'name fileNumber')
      .sort({ totalPoints: -1 })
      .limit(+limit);
    res.json({ success: true, data: leaders });
  } catch (err) {
    logger.error('gamification leaderboard error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
