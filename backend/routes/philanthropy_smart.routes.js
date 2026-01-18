const express = require('express');
const router = express.Router();
const SmartPhilanthropyService = require('../services/smartPhilanthropy.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/philanthropy-smart/match-sponsor
 * @desc Find cases matching donor criteria
 */
router.post('/match-sponsor', authorizeRole(['ADMIN', 'FUNDRAISING_MANAGER']), async (req, res) => {
  try {
    const result = await SmartPhilanthropyService.matchSponsorToCase(req.body.preferences);
    res.json({ success: true, matches: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/philanthropy-smart/impact-report
 * @desc Generate donor impact report
 */
router.get('/impact-report', async (req, res) => {
  try {
    const result = await SmartPhilanthropyService.generateImpactReport(req.query.sponsorId, req.query.range);
    res.json({ success: true, report: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
