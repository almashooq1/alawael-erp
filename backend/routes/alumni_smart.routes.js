const express = require('express');
const router = express.Router();
const SmartAlumniService = require('../services/smartAlumni.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/alumni-smart/followup
 * @desc Initiate a logic-based follow-up survey for a graduate
 */
router.post('/followup', authorizeRole(['ADMIN', 'CASE_MANAGER', 'SOCIAL_WORKER']), async (req, res) => {
  try {
    const result = await SmartAlumniService.conduclFollowUp(req.body.alumniId);
    res.json({ success: true, survey: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/alumni-smart/story
 * @desc Generate a success story draft
 */
router.post('/story', authorizeRole(['ADMIN', 'MARKETING']), async (req, res) => {
  try {
    const result = await SmartAlumniService.generateSuccessStory(req.body.alumniId);
    res.json({ success: true, story: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

