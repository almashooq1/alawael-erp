const express = require('express');
const router = express.Router();
const SmartGlobalExpertService = require('../services/smartGlobalExpert.service');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/global-expert-smart/prepare-package
 * @desc Prepare a case for international review
 */
router.post('/prepare-package', requireRole(['DOCTOR', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const result = await SmartGlobalExpertService.prepareCasePackage(req.body.patientId);
    res.json({ success: true, package: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/global-expert-smart/match
 * @desc Find an expert for a diagnosis
 */
router.get('/match', async (req, res) => {
  try {
    const result = await SmartGlobalExpertService.matchSpecialist(req.query.diagnosis, req.query.budget);
    res.json({ success: true, experts: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/global-expert-smart/tele-robotics/init
 * @desc Start a remote robotics session
 */
router.post('/tele-robotics/init', requireRole(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { expertId, deviceId, patientId } = req.body;
    const result = await SmartGlobalExpertService.initiateTeleRobotics(expertId, deviceId, patientId);
    res.json({ success: true, startLink: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

