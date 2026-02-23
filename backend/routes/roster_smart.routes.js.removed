const express = require('express');
const router = express.Router();
const SmartRosterService = require('../services/smartRoster.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/roster-smart/generate
 * @desc Generate optimal schedule for a department
 */
router.post('/generate', authorizeRole(['ADMIN', 'HR', 'MANAGER']), async (req, res) => {
  try {
    const result = await SmartRosterService.generateSchedule(req.body.department, req.body.week);
    res.json({ success: true, schedule: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/roster-smart/fatigue
 * @desc Check for burnout risks
 */
router.get('/fatigue', authorizeRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const result = await SmartRosterService.analyzeFatigueRisk();
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

