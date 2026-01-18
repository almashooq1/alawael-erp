const express = require('express');
const router = express.Router();
const SmartSportsService = require('../services/smartSports.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/sports-smart/stats
 * @desc Log match data for an athlete
 */
router.post('/stats', authorizeRole(['COACH', 'THERAPIST']), async (req, res) => {
  try {
    const result = await SmartSportsService.logMatchPerformance(req.body.athleteId, req.body.matchId, req.body.metrics);
    res.json({ success: true, stats: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/sports-smart/scout
 * @desc Find talent for special olympics
 */
router.get('/scout', authorizeRole(['COACH', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartSportsService.scoutTalent();
    res.json({ success: true, report: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
