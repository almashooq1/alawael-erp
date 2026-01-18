const express = require('express');
const router = express.Router();
const SmartGamificationService = require('../services/smartGamification.service');
const { BeneficiaryWallet, Badge } = require('../models/Gamification');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Auto-seed - Skipped in Test Env or Mock DB
if (process.env.NODE_ENV !== 'test' && process.env.USE_MOCK_DB !== 'true') {
  SmartGamificationService.seedBadges();
}

/**
 * @route GET /api/gamification-smart/wallet
 * @desc Get points/badges for a child
 */
router.get('/wallet', async (req, res) => {
  try {
    const { beneficiaryId } = req.query;
    if (!beneficiaryId) return res.status(400).json({ message: 'Beneficiary ID required' });

    const wallet = await BeneficiaryWallet.findOne({ beneficiary: beneficiaryId }).populate('badges.badgeId');

    res.json({ success: true, data: wallet || { totalPoints: 0, badges: [] } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/gamification-smart/manual-award
 * @desc Therapist manually gives points (e.g. for "Good Behavior")
 */
router.post('/manual-award', async (req, res) => {
  try {
    const { beneficiaryId, points, reason } = req.body;
    const wallet = await SmartGamificationService.awardAction(beneficiaryId, reason || 'MANUAL_BONUS', points || 10);
    res.json({ success: true, message: 'Points awarded', wallet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/gamification-smart/leaderboard
 * @desc Top 5 motivated kids (Anonymous: shows First Name only)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const top5 = await BeneficiaryWallet.find().sort({ totalPoints: -1 }).limit(5).populate('beneficiary', 'firstName');

    const safeData = top5.map(w => ({
      name: w.beneficiary ? w.beneficiary.firstName : 'Unknown',
      points: w.totalPoints,
      level: w.currentLevel,
    }));

    res.json({ success: true, data: safeData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
