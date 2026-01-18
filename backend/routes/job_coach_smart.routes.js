const express = require('express');
const router = express.Router();
const SmartJobCoachService = require('../services/smartJobCoach.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/job-coach-smart/visit
 * @desc Log on-site visit by job coach (GPS verified)
 */
router.post('/visit', authorizeRole(['JOB_COACH', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartJobCoachService.logSiteVisit(req.body.placementId, req.user.id, req.body.location, req.body.observation);
    res.json({ success: true, log: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/job-coach-smart/employer-feedback
 * @desc Employer submits simple rating
 */
router.post('/employer-feedback', async (req, res) => {
  // Usually secured by a one-time token sent to Employer's email
  try {
    const result = await SmartJobCoachService.submitEmployerFeedback(req.body.placementId, req.body.employerId, req.body.feedback);
    res.json({ success: true, feedbackReceived: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
