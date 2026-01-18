const express = require('express');
const router = express.Router();
const SmartSensoryDietService = require('../services/smartSensoryDiet.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/sensory-smart/diet/:patientId
 * @desc Get the Daily Sensory Diet for a child
 */
router.get('/diet/:patientId', authorizeRole(['THERAPIST', 'PARENT', 'NURSE']), async (req, res) => {
  try {
    // In real app, profileType is fetched from DB
    const profileType = req.query.profileType || 'SENSORY_SEEKER';
    const result = await SmartSensoryDietService.generateDailyDiet(req.params.patientId, profileType);
    res.json({ success: true, diet: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/sensory-smart/regulate
 * @desc Ask for help: "Child is doing X, what do I do?"
 */
router.post('/regulate', async (req, res) => {
  try {
    const result = await SmartSensoryDietService.suggestRegulation(req.body.patientId, req.body.behavior);
    res.json({ success: true, strategy: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
