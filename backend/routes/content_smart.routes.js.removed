const express = require('express');
const router = express.Router();
const SmartContentService = require('../services/smartContent.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/content-smart/social-story
 * @desc Generate a personalized social story PDF
 */
router.post('/social-story', authorizeRole(['THERAPIST', 'PARENT', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartContentService.generateSocialStory(req.body.name, req.body.scenario, req.body.level);
    res.json({ success: true, story: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/content-smart/worksheet
 * @desc Generate printable therapeutic worksheet
 */
router.post('/worksheet', authorizeRole(['THERAPIST', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartContentService.generateWorksheet(req.body.goalType, req.body.difficulty, req.body.theme);
    res.json({ success: true, worksheet: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

