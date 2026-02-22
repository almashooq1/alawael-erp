const express = require('express');
const router = express.Router();
const SmartFamilyPortalService = require('../services/smartFamilyPortal.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/family-smart/daily-digest
 * @desc Get AI-generated daily summary for parents
 */
router.get('/daily-digest', async (req, res) => {
  try {
    const result = await SmartFamilyPortalService.getDailyDigest(req.query.studentId);
    res.json({ success: true, digest: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/family-smart/message
 * @desc Secure message to clinician
 */
router.post('/message', async (req, res) => {
  try {
    const result = await SmartFamilyPortalService.sendMessage(req.user.id, req.body.toId, req.body.content);
    res.json({ success: true, receipt: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

