const express = require('express');
const router = express.Router();
const SmartNutritionService = require('../services/smartNutrition.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/nutrition-smart/analyze-gut-brain
 * @desc Check correlations between food logs and behavior
 */
router.post('/analyze-gut-brain', authorizeRole(['DOCTOR', 'NUTRITIONIST', 'PARENT']), async (req, res) => {
  try {
    const analysis = await SmartNutritionService.analyzeGutBrainAxis(req.body.patientId);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/nutrition-smart/safe-menu
 * @desc Generate meal options based on allergies and sensory issues
 */
router.post('/safe-menu', async (req, res) => {
  try {
    // req.body: { textureAversion: 'Mushy', allergies: ['Nuts'] }
    const menu = SmartNutritionService.generateSafeMenu(req.body);
    res.json({ success: true, menu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
