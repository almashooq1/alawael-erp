/**
 * Gamification Routes — مسارات نظام التحفيز والشارات
 * Endpoints for gamification profile, points, badges, challenges, leaderboard
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
const gamificationService = require('../services/gamification.service');
const { Gamification } = require('../models/Gamification');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// ─── All routes require authentication + branch isolation ──────
// W269: branch-check every `:beneficiaryId` lookup (fail-open for cross-branch
// roles / unscoped callers; enforced for restricted staff).
router.use(authenticate);
router.use(requireBranchAccess);
router.param('beneficiaryId', branchScopedBeneficiaryParam);

// ─── GET /profile/:beneficiaryId ─────────────────────────────
router.get('/profile/:beneficiaryId', async (req, res) => {
  try {
    const profile = await gamificationService.getGamificationProfile(req.params.beneficiaryId);
    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('gamification profile error:', err);
    safeError(res, err, 'gamification profile error');
  }
});

// ─── POST /award-points ──────────────────────────────────────
router.post('/award-points', async (req, res) => {
  try {
    const { beneficiaryId, points, reason } = req.body;
    if (!beneficiaryId || points == null) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and points are required' });
    }
    const profile = await gamificationService.awardPoints(beneficiaryId, points, reason);
    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error('gamification award-points error:', err);
    safeError(res, err, 'gamification award-points error');
  }
});

// ─── GET /leaderboard ────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const { branchId, limit = 20 } = req.query;
    const leaders = await gamificationService.getLeaderboard(branchId || null, +limit);
    res.json({ success: true, data: leaders });
  } catch (err) {
    logger.error('gamification leaderboard error:', err);
    safeError(res, err, 'gamification leaderboard error');
  }
});

// ─── POST /challenges ────────────────────────────────────────
router.post('/challenges', async (req, res) => {
  try {
    const { beneficiaryId, ...challengeData } = req.body;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, message: 'beneficiaryId is required' });
    }
    const result = await gamificationService.createChallenge(beneficiaryId, challengeData);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error('gamification create-challenge error:', err);
    safeError(res, err, 'gamification create-challenge error');
  }
});

// ─── PATCH /challenges/:challengeId/progress ─────────────────
router.patch('/challenges/:challengeId/progress', async (req, res) => {
  try {
    const { beneficiaryId, progress } = req.body;
    if (!beneficiaryId || progress == null) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and progress are required' });
    }
    const result = await gamificationService.updateChallengeProgress(
      beneficiaryId,
      req.params.challengeId,
      +progress
    );
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('gamification challenge-progress error:', err);
    safeError(res, err, 'gamification challenge-progress error');
  }
});

// ─── GET /badges/:beneficiaryId ─────────────────────────────
router.get('/badges/:beneficiaryId', async (req, res) => {
  try {
    const profile = await Gamification.findOrCreate(req.params.beneficiaryId);
    res.json({ success: true, data: profile.badges });
  } catch (err) {
    logger.error('gamification badges error:', err);
    safeError(res, err, 'gamification badges error');
  }
});

// ─── POST /check-badges/:beneficiaryId ───────────────────────
router.post('/check-badges/:beneficiaryId', async (req, res) => {
  try {
    const result = await gamificationService.checkAndAwardBadges(req.params.beneficiaryId);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('gamification check-badges error:', err);
    safeError(res, err, 'gamification check-badges error');
  }
});

module.exports = router;
