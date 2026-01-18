const express = require('express');
const router = express.Router();
const SmartSleepService = require('../services/smartSleep.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/sleep-smart/log
 * @desc Log sleep data and check for alerts
 */
router.post('/log', authorizeRole(['PARENT', 'NURSE']), async (req, res) => {
  try {
    const result = await SmartSleepService.logSleep(req.body.patientId, req.body.date, req.body.hours, req.body.quality);
    res.json({ success: true, entry: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/sleep-smart/window/:patientId
 * @desc Get predicted best window for therapy
 */
router.get('/window/:patientId', authorizeRole(['THERAPIST', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartSleepService.predictAlertnessWindow(req.params.patientId);
    res.json({ success: true, predictions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
