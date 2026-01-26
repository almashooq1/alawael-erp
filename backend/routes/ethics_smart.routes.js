const express = require('express');
const router = express.Router();
const SmartEthicsService = require('../services/smartEthics.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/ethics-smart/consent
 * @desc Submit a digitally signed consent form
 */
router.post('/consent', authorizeRole(['ADMIN', 'SOCIAL_WORKER', 'PARENT']), async (req, res) => {
  try {
    const result = await SmartEthicsService.captureConsent(
      req.body.patientId,
      req.user.id, // Guardian is the logged in user
      req.body.formType,
      req.body.videoHash,
    );
    res.json({ success: true, record: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/ethics-smart/flag-ai
 * @desc Internal route for services to flag risky AI decisions
 */
router.post('/flag-ai', async (req, res) => {
  try {
    const result = await SmartEthicsService.flagForReview(req.body.decisionId, req.body.reason);
    res.json({ success: true, report: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

