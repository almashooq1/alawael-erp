const express = require('express');
const router = express.Router();
const SmartBiometriesService = require('../services/smartBiometrics.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/biometrics-smart/voice-auth
 * @desc Verify user identity via voice print
 */
router.post('/voice-auth', async (req, res) => {
  try {
    const result = await SmartBiometriesService.verifyVoicePrint(req.user.id, req.body.audioFingerprint);
    res.json({ success: true, verification: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/biometrics-smart/liveness
 * @desc Check if the user is physically present (liveness check)
 */
router.post('/liveness', async (req, res) => {
  try {
    const result = await SmartBiometriesService.checkLiveness(req.body.videoFrameData);
    res.json({ success: true, liveness: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
